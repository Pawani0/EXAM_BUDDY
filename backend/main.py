from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from llm_smart_extractor import llm_syllabus_extraction as ext_syll
from text_extractor import extract_text_from_pdf, clean_text
import tempfile
import os
import logging
from typing import Dict, List, Literal, Optional

from database import Base, engine, get_db
from models import User, Category, Class, Subject, Material
from pyq_clustring import cluster_questions

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Exam Buddy")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["student", "teacher", "admin"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: Literal["student", "teacher", "admin"]

    class Config:
        from_attributes = True


class SyllabusUnit(BaseModel):
    unit: str = Field(..., min_length=1, max_length=255)
    unit_name: Optional[str] = Field(default=None, max_length=255)
    topics: List[str] = Field(..., min_length=1)


class ClusterRequest(BaseModel):
    syllabus: List[SyllabusUnit] = Field(..., min_length=1)
    questions: List[str] = Field(..., min_length=1)
    threshold: Optional[float] = Field(default=0.65, ge=0.0, le=1.0)


class ClusterResponse(BaseModel):
    clusters: Dict[str, Dict[str, List[str]]]


Base.metadata.create_all(bind=engine)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin authentication helper (simple user_id check - can be enhanced with JWT later)
async def get_current_admin(
    user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
) -> User:
    """Verify admin user. For now, we'll use user_id header from frontend."""
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


@app.post("/extract_syllabus/")
async def extract_syllabus(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return JSONResponse(content={"error": "Only PDF files are allowed"}, status_code=400)

    temp_file_path = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            temp_file_path = tmp.name

        # Extract raw text
        syllabus = extract_text_from_pdf(temp_file_path)
        if not syllabus.strip():
            return JSONResponse(content={"error": "Could not extract text from PDF"}, status_code=422)

        # Clean text & extract structured syllabus
        cleaned_syllabus = clean_text(syllabus)
        extracted_units = ext_syll(cleaned_syllabus)

        logging.info("Extraction successful: %s", extracted_units)
        
        return JSONResponse(content=extracted_units, status_code=200)

    except Exception as e:
        logging.error("Error in extraction: %s", str(e))
        return JSONResponse(content={"error": str(e)}, status_code=500)

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup_user(payload: SignupRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        full_name=payload.full_name.strip(),
        email=normalized_email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    db.refresh(new_user)
    return UserResponse.model_validate(new_user)


@app.post("/auth/login", response_model=UserResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return UserResponse.model_validate(user)


@app.post("/pyq/cluster", response_model=ClusterResponse)
def cluster_pyq_questions(payload: ClusterRequest):
    if not payload.syllabus:
        raise HTTPException(status_code=400, detail="Syllabus data is required for clustering.")

    if not payload.questions:
        raise HTTPException(status_code=400, detail="Please provide at least one question to cluster.")

    questions = [q.strip() for q in payload.questions if q.strip()]
    if not questions:
        raise HTTPException(status_code=400, detail="Please provide at least one valid question to cluster.")

    syllabus_payload = [unit.model_dump() for unit in payload.syllabus]

    try:
        threshold = payload.threshold if payload.threshold is not None else 0.65
        clusters = cluster_questions(syllabus_payload, questions, threshold)
    except Exception as exc:
        logging.error("Failed to cluster PYQ questions: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to cluster questions right now. Please try again later.")

    return ClusterResponse(clusters=clusters)


# ==================== ADMIN API ENDPOINTS ====================

# Pydantic models for admin operations
class CategoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: int = Field(default=0)


class CategoryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    icon_name: Optional[str]
    display_order: int

    class Config:
        from_attributes = True


class ClassCreate(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=255)
    display_order: int = Field(default=0)


class ClassUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    display_order: Optional[int] = None


class ClassResponse(BaseModel):
    id: int
    category_id: int
    name: str
    display_order: int

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    class_id: int
    name: str = Field(..., min_length=1, max_length=255)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: int = Field(default=0)


class SubjectUpdate(BaseModel):
    class_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: Optional[int] = None


class SubjectResponse(BaseModel):
    id: int
    class_id: int
    name: str
    icon_name: Optional[str]
    display_order: int

    class Config:
        from_attributes = True


class MaterialCreate(BaseModel):
    subject_id: int
    material_type: Literal["pyq", "syllabus"]
    title: str = Field(..., min_length=1, max_length=255)
    year: Optional[str] = Field(default=None, max_length=50)
    embed_url: Optional[str] = None
    download_url: Optional[str] = None
    display_order: int = Field(default=0)


class MaterialUpdate(BaseModel):
    subject_id: Optional[int] = None
    material_type: Optional[Literal["pyq", "syllabus"]] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    year: Optional[str] = Field(default=None, max_length=50)
    embed_url: Optional[str] = None
    download_url: Optional[str] = None
    display_order: Optional[int] = None


class MaterialResponse(BaseModel):
    id: int
    subject_id: int
    material_type: str
    title: str
    year: Optional[str]
    embed_url: Optional[str]
    download_url: Optional[str]
    display_order: int

    class Config:
        from_attributes = True


# Categories CRUD
@app.get("/admin/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    categories = db.query(Category).order_by(Category.display_order).all()
    return categories


@app.post("/admin/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@app.put("/admin/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    return category


@app.delete("/admin/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return None


# Classes CRUD
@app.get("/admin/classes", response_model=List[ClassResponse])
async def get_classes(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(Class)
    if category_id:
        query = query.filter(Class.category_id == category_id)
    classes = query.order_by(Class.display_order).all()
    return classes


@app.post("/admin/classes", response_model=ClassResponse, status_code=201)
async def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Verify category exists
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    class_obj = Class(**payload.model_dump())
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    return class_obj


@app.put("/admin/classes/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    payload: ClassUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Verify category if updating
    if payload.category_id:
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(class_obj, key, value)
    
    db.commit()
    db.refresh(class_obj)
    return class_obj


@app.delete("/admin/classes/{class_id}", status_code=204)
async def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    db.delete(class_obj)
    db.commit()
    return None


# Subjects CRUD
@app.get("/admin/subjects", response_model=List[SubjectResponse])
async def get_subjects(
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(Subject)
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    subjects = query.order_by(Subject.display_order).all()
    return subjects


@app.post("/admin/subjects", response_model=SubjectResponse, status_code=201)
async def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Verify class exists
    class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@app.put("/admin/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Verify class if updating
    if payload.class_id:
        class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)
    
    db.commit()
    db.refresh(subject)
    return subject


@app.delete("/admin/subjects/{subject_id}", status_code=204)
async def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    db.delete(subject)
    db.commit()
    return None


# Materials CRUD
@app.get("/admin/materials", response_model=List[MaterialResponse])
async def get_materials(
    subject_id: Optional[int] = None,
    material_type: Optional[Literal["pyq", "syllabus"]] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(Material)
    if subject_id:
        query = query.filter(Material.subject_id == subject_id)
    if material_type:
        query = query.filter(Material.material_type == material_type)
    materials = query.order_by(Material.display_order).all()
    return materials


@app.post("/admin/materials", response_model=MaterialResponse, status_code=201)
async def create_material(
    payload: MaterialCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    material = Material(**payload.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@app.put("/admin/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    payload: MaterialUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Verify subject if updating
    if payload.subject_id:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)
    
    db.commit()
    db.refresh(material)
    return material


@app.delete("/admin/materials/{material_id}", status_code=204)
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.delete(material)
    db.commit()
    return None


# ==================== PUBLIC API ENDPOINTS ====================
# These endpoints fetch data for Index and Class pages

class CategoryWithClasses(CategoryResponse):
    classes: List[ClassResponse] = []


@app.get("/api/categories", response_model=List[CategoryWithClasses])
def get_public_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).options(joinedload(Category.classes)).order_by(Category.display_order).all()
    return categories


class ClassWithSubjects(ClassResponse):
    subjects: List[SubjectResponse] = []


@app.get("/api/classes/{class_id}", response_model=ClassWithSubjects)
def get_public_class(class_id: int, db: Session = Depends(get_db)):
    class_obj = db.query(Class).options(joinedload(Class.subjects)).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_obj


@app.get("/api/classes/{class_id}/subjects", response_model=List[SubjectResponse])
def get_public_subjects(class_id: int, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.class_id == class_id).order_by(Subject.display_order).all()
    return subjects


@app.get("/api/classes/{class_id}/subjects/{subject_slug}")
def get_subject_by_slug(class_id: int, subject_slug: str, db: Session = Depends(get_db)):
    """Find subject by class ID and subject name slug."""
    # Convert slug back to name (capitalize words)
    subject_name = subject_slug.replace("-", " ").title()
    
    # Try exact match first
    subject = db.query(Subject).filter(
        Subject.class_id == class_id,
        Subject.name.ilike(f"%{subject_name}%")
    ).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return SubjectResponse.model_validate(subject)


@app.get("/api/subjects/{subject_id}/materials")
def get_public_materials(
    subject_id: int,
    material_type: Optional[Literal["pyq", "syllabus"]] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Material).filter(Material.subject_id == subject_id)
    if material_type:
        query = query.filter(Material.material_type == material_type)
    materials = query.order_by(Material.display_order).all()
    
    # Format for Resources page
    if material_type == "pyq":
        return {
            "pyqs": [{
                "id": m.id,
                "title": m.title,
                "year": m.year or "",
                "embedUrl": m.embed_url or "",
                "downloadUrl": m.download_url or ""
            } for m in materials]
        }
    elif material_type == "syllabus":
        syllabus = materials[0] if materials else None
        if syllabus:
            return {"syllabusUrl": syllabus.download_url or syllabus.embed_url or ""}
        return {"syllabusUrl": ""}
    
    return {"materials": [MaterialResponse.model_validate(m).model_dump() for m in materials]}
