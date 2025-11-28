
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from starlette.background import BackgroundTask
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, subqueryload
from llm_smart_extractor import llm_syllabus_extraction as ext_syll, generate_question_bank, generate_assignment, llm_questions_extraction
from text_extractor import extract_text_from_pdf, clean_text
import tempfile
import os
import logging
from typing import Dict, List, Literal, Optional

from database import Base, engine, get_db
from models import User, Category, Class, Subject, Material, Notification, University, Degree, Branch, Year, Semester
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
    importance: Dict[str, int]


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


@app.post("/extract_questions/")
async def extract_questions(file: UploadFile = File(...)):
    """Extract questions from a PYQ PDF file."""
    if file.content_type != "application/pdf":
        return JSONResponse(content={"error": "Only PDF files are allowed"}, status_code=400)

    temp_file_path = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            temp_file_path = tmp.name

        # Extract raw text
        raw_text = extract_text_from_pdf(temp_file_path)
        if not raw_text.strip():
            return JSONResponse(content={"error": "Could not extract text from PDF"}, status_code=422)

        # Extract questions using LLM
        questions = llm_questions_extraction(raw_text)

        logging.info("Extracted %d questions", len(questions))
        
        return JSONResponse(content={"questions": questions}, status_code=200)

    except Exception as e:
        logging.error("Error in question extraction: %s", str(e))
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
        clusters, importance = cluster_questions(syllabus_payload, questions, threshold)
    except Exception as exc:
        logging.error("Failed to cluster PYQ questions: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to cluster questions right now. Please try again later.")

    return ClusterResponse(clusters=clusters, importance=importance)


class PDFRequest(BaseModel):
    clusters: Dict[str, Dict[str, List[str]]]


@app.post("/pyq/generate-pdf")
async def generate_pdf_endpoint(payload: PDFRequest):
    """Generate a PDF from clustered questions."""
    try:
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            temp_pdf_path = tmp.name
            
        # Generate PDF using the helper function
        from pdf_maker import generate_pdf
        generate_pdf(payload.clusters, temp_pdf_path)
        
        # Return the file as a downloadable response
        return FileResponse(
            path=temp_pdf_path,
            filename="Exam_Buddy_Clustered_Questions.pdf",
            media_type="application/pdf",
            background=BackgroundTask(lambda: os.remove(temp_pdf_path)) # Cleanup after sending
        )
    except Exception as e:
        logging.error("Error generating PDF: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate PDF")


# ==================== TEACHER API ENDPOINTS ====================

class QuestionBankRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"


class AssignmentRequest(BaseModel):
    topics: List[str] = Field(..., min_length=1)
    blooms_level: Literal["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
    question_types: List[str] = Field(..., min_length=1)
    quantity: int = Field(default=5, ge=1, le=20)


@app.post("/teacher/question-bank")
def create_question_bank(payload: QuestionBankRequest):
    try:
        questions = generate_question_bank(payload.topic, payload.quantity, payload.difficulty)
        return {"questions": questions}
    except Exception as e:
        logging.error("Error generating question bank: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate question bank")


@app.post("/teacher/assignment")
def create_assignment(payload: AssignmentRequest):
    try:
        assignment = generate_assignment(payload.topics, payload.blooms_level, payload.question_types, payload.quantity)
        return assignment
    except Exception as e:
        logging.error("Error generating assignment: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate assignment")


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
    class_id: Optional[int] = None
    semester_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: int = Field(default=0)


class SubjectUpdate(BaseModel):
    class_id: Optional[int] = None
    semester_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    icon_name: Optional[str] = Field(default=None, max_length=100)
    display_order: Optional[int] = None


class SubjectResponse(BaseModel):
    id: int
    class_id: Optional[int]
    semester_id: Optional[int]
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


class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    link_url: Optional[str] = Field(default=None, max_length=500)
    link_text: Optional[str] = Field(default=None, max_length=100)
    is_active: int = Field(default=1, ge=0, le=1)
    priority: Literal["info", "warning", "urgent"] = Field(default="info")
    display_order: int = Field(default=0)


class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    message: Optional[str] = Field(default=None, min_length=1)
    link_url: Optional[str] = Field(default=None, max_length=500)
    link_text: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[int] = Field(default=None, ge=0, le=1)
    priority: Optional[Literal["info", "warning", "urgent"]] = None
    display_order: Optional[int] = None


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    link_url: Optional[str]
    link_text: Optional[str]
    is_active: int
    priority: str
    display_order: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        """Custom conversion to handle datetime objects"""
        data = {
            "id": obj.id,
            "title": obj.title,
            "message": obj.message,
            "is_active": obj.is_active,
            "priority": obj.priority,
            "display_order": obj.display_order,
            "created_at": obj.created_at.isoformat() if hasattr(obj.created_at, 'isoformat') else str(obj.created_at),
            "updated_at": obj.updated_at.isoformat() if hasattr(obj.updated_at, 'isoformat') else str(obj.updated_at),
        }
        return cls(**data)


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
    if not payload.class_id and not payload.semester_id:
        raise HTTPException(status_code=400, detail="Either class_id or semester_id must be provided")

    # Verify class exists if provided
    if payload.class_id:
        class_obj = db.query(Class).filter(Class.id == payload.class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
            
    # Verify semester exists if provided
    if payload.semester_id:
        semester_obj = db.query(Semester).filter(Semester.id == payload.semester_id).first()
        if not semester_obj:
            raise HTTPException(status_code=404, detail="Semester not found")
    
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
            
    # Verify semester if updating
    if payload.semester_id:
        semester_obj = db.query(Semester).filter(Semester.id == payload.semester_id).first()
        if not semester_obj:
            raise HTTPException(status_code=404, detail="Semester not found")
    
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



# ==================== UNIVERSITY HIERARCHY API ENDPOINTS ====================

# Pydantic Models for Creation and Updates

class UniversityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon_name: Optional[str] = None
    display_order: int = Field(default=0)

class UniversityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon_name: Optional[str] = None
    display_order: Optional[int] = None

class DegreeCreate(BaseModel):
    university_id: int
    name: str = Field(..., min_length=1, max_length=255)
    display_order: int = Field(default=0)

class DegreeUpdate(BaseModel):
    university_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    display_order: Optional[int] = None

class BranchCreate(BaseModel):
    degree_id: int
    name: str = Field(..., min_length=1, max_length=255)
    display_order: int = Field(default=0)

class BranchUpdate(BaseModel):
    degree_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    display_order: Optional[int] = None

class YearCreate(BaseModel):
    branch_id: int
    name: str = Field(..., min_length=1, max_length=50)
    display_order: int = Field(default=0)

class YearUpdate(BaseModel):
    branch_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    display_order: Optional[int] = None

class SemesterCreate(BaseModel):
    year_id: int
    name: str = Field(..., min_length=1, max_length=50)
    display_order: int = Field(default=0)

class SemesterUpdate(BaseModel):
    year_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    display_order: Optional[int] = None

# Response Models

class UniversityResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon_name: Optional[str]
    display_order: int

    class Config:
        from_attributes = True

class DegreeResponse(BaseModel):
    id: int
    university_id: int
    name: str
    display_order: int

    class Config:
        from_attributes = True

class BranchResponse(BaseModel):
    id: int
    degree_id: int
    name: str
    display_order: int

    class Config:
        from_attributes = True

class YearResponse(BaseModel):
    id: int
    branch_id: int
    name: str
    display_order: int

    class Config:
        from_attributes = True

class SemesterResponse(BaseModel):
    id: int
    year_id: int
    name: str
    display_order: int

    class Config:
        from_attributes = True


# --- University CRUD ---

@app.get("/api/universities", response_model=List[UniversityResponse])
def get_universities(response: Response, db: Session = Depends(get_db)):
    universities = db.query(University).order_by(University.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return universities

@app.post("/admin/universities", response_model=UniversityResponse, status_code=201)
def create_university(payload: UniversityCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    uni = University(**payload.model_dump())
    db.add(uni)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="University with this name already exists")
    db.refresh(uni)
    return uni

@app.put("/admin/universities/{uni_id}", response_model=UniversityResponse)
def update_university(uni_id: int, payload: UniversityUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(uni, key, value)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="University name conflict")
    db.refresh(uni)
    return uni

@app.delete("/admin/universities/{uni_id}", status_code=204)
def delete_university(uni_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    db.delete(uni)
    db.commit()
    return None


# --- Degree CRUD ---

@app.get("/api/universities/{university_id}/degrees", response_model=List[DegreeResponse])
def get_degrees(university_id: int, response: Response, db: Session = Depends(get_db)):
    degrees = db.query(Degree).filter(Degree.university_id == university_id).order_by(Degree.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return degrees

@app.post("/admin/degrees", response_model=DegreeResponse, status_code=201)
def create_degree(payload: DegreeCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    degree = Degree(**payload.model_dump())
    db.add(degree)
    db.commit()
    db.refresh(degree)
    return degree

@app.put("/admin/degrees/{degree_id}", response_model=DegreeResponse)
def update_degree(degree_id: int, payload: DegreeUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(degree, key, value)
    
    db.commit()
    db.refresh(degree)
    return degree

@app.delete("/admin/degrees/{degree_id}", status_code=204)
def delete_degree(degree_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")
    db.delete(degree)
    db.commit()
    return None


# --- Branch CRUD ---

@app.get("/api/degrees/{degree_id}/branches", response_model=List[BranchResponse])
def get_branches(degree_id: int, response: Response, db: Session = Depends(get_db)):
    branches = db.query(Branch).filter(Branch.degree_id == degree_id).order_by(Branch.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return branches

@app.post("/admin/branches", response_model=BranchResponse, status_code=201)
def create_branch(payload: BranchCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    branch = Branch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch

@app.put("/admin/branches/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: int, payload: BranchUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(branch, key, value)
    
    db.commit()
    db.refresh(branch)
    return branch

@app.delete("/admin/branches/{branch_id}", status_code=204)
def delete_branch(branch_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    db.delete(branch)
    db.commit()
    return None


# --- Year CRUD ---

@app.get("/api/branches/{branch_id}/years", response_model=List[YearResponse])
def get_years(branch_id: int, response: Response, db: Session = Depends(get_db)):
    years = db.query(Year).filter(Year.branch_id == branch_id).order_by(Year.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return years

@app.post("/admin/years", response_model=YearResponse, status_code=201)
def create_year(payload: YearCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    year = Year(**payload.model_dump())
    db.add(year)
    db.commit()
    db.refresh(year)
    return year

@app.put("/admin/years/{year_id}", response_model=YearResponse)
def update_year(year_id: int, payload: YearUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    year = db.query(Year).filter(Year.id == year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Year not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(year, key, value)
    
    db.commit()
    db.refresh(year)
    return year

@app.delete("/admin/years/{year_id}", status_code=204)
def delete_year(year_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    year = db.query(Year).filter(Year.id == year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Year not found")
    db.delete(year)
    db.commit()
    return None


# --- Semester CRUD ---

@app.get("/api/years/{year_id}/semesters", response_model=List[SemesterResponse])
def get_semesters(year_id: int, response: Response, db: Session = Depends(get_db)):
    semesters = db.query(Semester).filter(Semester.year_id == year_id).order_by(Semester.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return semesters

@app.post("/admin/semesters", response_model=SemesterResponse, status_code=201)
def create_semester(payload: SemesterCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    semester = Semester(**payload.model_dump())
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester

@app.put("/admin/semesters/{semester_id}", response_model=SemesterResponse)
def update_semester(semester_id: int, payload: SemesterUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(semester, key, value)
    
    db.commit()
    db.refresh(semester)
    return semester

@app.delete("/admin/semesters/{semester_id}", status_code=204)
def delete_semester(semester_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    db.delete(semester)
    db.commit()
    return None


@app.get("/api/semesters/{semester_id}/subjects", response_model=List[SubjectResponse])
def get_semester_subjects(semester_id: int, response: Response, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.semester_id == semester_id).order_by(Subject.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return subjects

# ==================== PUBLIC API ENDPOINTS ====================
# These endpoints fetch data for Index and Class pages

class ClassWithSubjects(ClassResponse):
    subjects: List[SubjectResponse] = []


class CategoryWithClasses(CategoryResponse):
    classes: List[ClassWithSubjects] = []


@app.get("/api/categories", response_model=List[CategoryWithClasses])
def get_public_categories(response: Response, db: Session = Depends(get_db)):
    categories = db.query(Category).options(
        joinedload(Category.classes).subqueryload(Class.subjects)
    ).order_by(Category.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300" # 5 minutes
    return categories


@app.get("/api/classes/{class_id}", response_model=ClassWithSubjects)
def get_public_class(class_id: int, response: Response, db: Session = Depends(get_db)):
    class_obj = db.query(Class).options(joinedload(Class.subjects)).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    response.headers["Cache-Control"] = "public, max-age=600" # 10 minutes
    return class_obj


@app.get("/api/classes/{class_id}/subjects", response_model=List[SubjectResponse])
def get_public_subjects(class_id: int, response: Response, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.class_id == class_id).order_by(Subject.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=600" # 10 minutes
    return subjects


@app.get("/api/classes/{class_id}/subjects/{subject_slug}")
def get_subject_by_slug(class_id: int, subject_slug: str, response: Response, db: Session = Depends(get_db)):
    """Find subject by class ID and subject name slug."""
    # Convert slug back to name (capitalize words)
    # Optimization: Instead of ilike which is slow on unindexed name,
    # we fetch all subjects for the class (usually small number) and match in python.
    # This leverages the (future) index on class_id.
    
    subjects = db.query(Subject).filter(Subject.class_id == class_id).all()
    
    normalized_slug = subject_slug.lower().replace("-", " ")
    
    subject = None
    for sub in subjects:
        if sub.name.lower() == normalized_slug:
            subject = sub
            break
        # Fallback for partial matches if needed, or stick to exact logic
        if sub.name.lower().replace(" ", "-") == subject_slug.lower():
            subject = sub
            break
            
    if not subject:
        # Try the old fuzzy match as a fallback if exact match fails
        subject_name = subject_slug.replace("-", " ").title()
        subject = db.query(Subject).filter(
            Subject.class_id == class_id,
            Subject.name.ilike(f"%{subject_name}%")
        ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    response.headers["Cache-Control"] = "public, max-age=600" # 10 minutes
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


# ==================== NOTIFICATION ADMIN ENDPOINTS ====================

@app.get("/admin/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    notifications = db.query(Notification).order_by(Notification.display_order.desc(), Notification.created_at.desc()).all()
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            link_url=n.link_url,
            link_text=n.link_text,
            is_active=n.is_active,
            priority=n.priority,
            display_order=n.display_order,
            created_at=n.created_at.isoformat() if n.created_at else "",
            updated_at=n.updated_at.isoformat() if n.updated_at else "",
        )
        for n in notifications
    ]


@app.post("/admin/notifications", response_model=NotificationResponse, status_code=201)
async def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    notification = Notification(**payload.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    # Convert datetime to string for response
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        link_url=notification.link_url,
        link_text=notification.link_text,
        is_active=notification.is_active,
        priority=notification.priority,
        display_order=notification.display_order,
        created_at=notification.created_at.isoformat() if notification.created_at else "",
        updated_at=notification.updated_at.isoformat() if notification.updated_at else "",
    )


@app.put("/admin/notifications/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(notification, key, value)
    
    db.commit()
    db.refresh(notification)
    # Convert datetime to string for response
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        link_url=notification.link_url,
        link_text=notification.link_text,
        is_active=notification.is_active,
        priority=notification.priority,
        display_order=notification.display_order,
        created_at=notification.created_at.isoformat() if notification.created_at else "",
        updated_at=notification.updated_at.isoformat() if notification.updated_at else "",
    )


@app.delete("/admin/notifications/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return None


# ==================== PUBLIC NOTIFICATION ENDPOINT ====================

@app.get("/api/notifications")
async def get_public_notifications(db: Session = Depends(get_db)):
    """Get all active notifications for display on the frontend"""
    notifications = db.query(Notification).filter(
        Notification.is_active == 1
    ).order_by(
        Notification.display_order.desc(), 
        Notification.created_at.desc()
    ).all()
    
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            link_url=n.link_url,
            link_text=n.link_text,
            is_active=n.is_active,
            priority=n.priority,
            display_order=n.display_order,
            created_at=n.created_at.isoformat() if n.created_at else "",
            updated_at=n.updated_at.isoformat() if n.updated_at else "",
        ).model_dump()
        for n in notifications
    ]
