
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from starlette.background import BackgroundTask
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, subqueryload
from services.llm_smart_extractor import (
    llm_syllabus_extraction as ext_syll, 
    generate_question_bank, 
    generate_assignment, 
    llm_questions_extraction,
    generate_practice_paper
)
from services.extractor import extract_text_from_pdf, clean_text
from services.pdf_maker import generate_pdf
import tempfile
import os
import logging
from typing import Dict, List, Literal, Optional

from database import Base, engine, get_db
from models import (
    User, Category, Class, Subject, Material, Notification,
    University, Degree, Branch, Year, UniversitySubject, UniversityMaterial
)
from services.pyq_clustring import cluster_questions

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
    trial_used: Optional[int] = 0

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
    temp_file_path = None
    try:
        if file.content_type != "application/pdf":
            return JSONResponse(content={"error": "Only PDF files are allowed"}, status_code=400)

        # Save uploaded file temporarily
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                if not content:
                    return JSONResponse(content={"error": "Empty file uploaded"}, status_code=400)
                tmp.write(content)
                temp_file_path = tmp.name
        except Exception as e:
            logging.error("Error saving uploaded file: %s", str(e))
            return JSONResponse(content={"error": "Failed to process uploaded file"}, status_code=500)

        # Extract raw text
        try:
            syllabus = extract_text_from_pdf(temp_file_path)
            if not syllabus or not syllabus.strip():
                return JSONResponse(content={"error": "Could not extract text from PDF. The file may be corrupted or image-based."}, status_code=422)
        except Exception as e:
            logging.error("Error extracting text from PDF: %s", str(e))
            return JSONResponse(content={"error": "Failed to extract text from PDF"}, status_code=500)

        # Clean text & extract structured syllabus
        try:
            cleaned_syllabus = clean_text(syllabus)
            extracted_units = ext_syll(cleaned_syllabus)
            
            if not extracted_units:
                return JSONResponse(content={"error": "Could not identify syllabus structure"}, status_code=422)
            
            logging.info("Extraction successful: %d units found", len(extracted_units))
            return JSONResponse(content=extracted_units, status_code=200)
        except Exception as e:
            logging.error("Error processing syllabus structure: %s", str(e))
            return JSONResponse(content={"error": "Failed to analyze syllabus structure"}, status_code=500)

    except Exception as e:
        logging.error("Unexpected error in extract_syllabus: %s", str(e))
        return JSONResponse(content={"error": "An unexpected error occurred"}, status_code=500)

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logging.warning("Failed to cleanup temp file %s: %s", temp_file_path, str(e))


@app.post("/extract_questions/")
async def extract_questions(file: UploadFile = File(...)):
    """Extract questions from a PYQ PDF file."""
    temp_file_path = None
    try:
        if file.content_type != "application/pdf":
            return JSONResponse(content={"error": "Only PDF files are allowed"}, status_code=400)

        # Save uploaded file temporarily
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                if not content:
                    return JSONResponse(content={"error": "Empty file uploaded"}, status_code=400)
                tmp.write(content)
                temp_file_path = tmp.name
        except Exception as e:
            logging.error("Error saving uploaded file: %s", str(e))
            return JSONResponse(content={"error": "Failed to process uploaded file"}, status_code=500)

        # Extract raw text
        try:
            raw_text = extract_text_from_pdf(temp_file_path)
            if not raw_text or not raw_text.strip():
                return JSONResponse(content={"error": "Could not extract text from PDF. The file may be corrupted or image-based."}, status_code=422)
        except Exception as e:
            logging.error("Error extracting text from PDF: %s", str(e))
            return JSONResponse(content={"error": "Failed to extract text from PDF"}, status_code=500)

        # Extract questions using LLM
        try:
            questions = llm_questions_extraction(raw_text)
            
            if not questions:
                return JSONResponse(content={"error": "No questions could be identified in the PDF"}, status_code=422)
            
            logging.info("Extracted %d questions", len(questions))
            return JSONResponse(content={"questions": questions}, status_code=200)
        except Exception as e:
            logging.error("Error extracting questions with LLM: %s", str(e))
            return JSONResponse(content={"error": "Failed to analyze questions from the PDF"}, status_code=500)

    except Exception as e:
        logging.error("Unexpected error in extract_questions: %s", str(e))
        return JSONResponse(content={"error": "An unexpected error occurred"}, status_code=500)

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logging.warning("Failed to cleanup temp file %s: %s", temp_file_path, str(e))


@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup_user(payload: SignupRequest, db: Session = Depends(get_db)):
    try:
        normalized_email = payload.email.lower()

        # Check for existing user
        try:
            existing_user = db.query(User).filter(User.email == normalized_email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="An account with this email already exists.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Database error checking existing user: %s", str(e))
            raise HTTPException(status_code=500, detail="Database error occurred")

        # Create new user
        try:
            new_user = User(
                full_name=payload.full_name.strip(),
                email=normalized_email,
                password_hash=pwd_context.hash(payload.password),
                role=payload.role,
            )
        except Exception as e:
            logging.error("Error creating user object: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to create user account")

        db.add(new_user)

        try:
            db.commit()
            db.refresh(new_user)
            logging.info("New user created: %s", normalized_email)
            return UserResponse.model_validate(new_user)
        except IntegrityError as e:
            db.rollback()
            logging.warning("Integrity error during signup: %s", str(e))
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        except Exception as e:
            db.rollback()
            logging.error("Database error during signup: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to create account")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in signup: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@app.post("/auth/login", response_model=UserResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        normalized_email = payload.email.lower()
        
        # Query user from database
        try:
            user = db.query(User).filter(User.email == normalized_email).first()
        except Exception as e:
            logging.error("Database error during login query: %s", str(e))
            raise HTTPException(status_code=500, detail="Database error occurred")

        # Verify credentials
        try:
            if not user or not pwd_context.verify(payload.password, user.password_hash):
                logging.warning("Failed login attempt for email: %s", normalized_email)
                raise HTTPException(status_code=401, detail="Invalid email or password.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error verifying password: %s", str(e))
            raise HTTPException(status_code=500, detail="Authentication error occurred")

        logging.info("Successful login: %s", normalized_email)
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in login: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@app.get("/users/{user_id}", response_model=UserResponse)
@app.get("/auth/user/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@app.post("/pyq/cluster", response_model=ClusterResponse)
def cluster_pyq_questions(payload: ClusterRequest):
    try:
        # Validate input
        if not payload.syllabus:
            raise HTTPException(status_code=400, detail="Syllabus data is required for clustering.")

        if not payload.questions:
            raise HTTPException(status_code=400, detail="Please provide at least one question to cluster.")

        questions = [q.strip() for q in payload.questions if q.strip()]
        if not questions:
            raise HTTPException(status_code=400, detail="Please provide at least one valid question to cluster.")

        # Prepare syllabus data
        try:
            syllabus_payload = [unit.model_dump() for unit in payload.syllabus]
        except Exception as e:
            logging.error("Error preparing syllabus data: %s", str(e))
            raise HTTPException(status_code=400, detail="Invalid syllabus data format")

        # Perform clustering
        try:
            threshold = payload.threshold if payload.threshold is not None else 0.65
            clusters, importance = cluster_questions(syllabus_payload, questions, threshold)
            
            if not clusters:
                raise HTTPException(status_code=422, detail="Could not cluster questions. Please check your syllabus and questions.")
                
            logging.info("Successfully clustered %d questions into %d units", len(questions), len(clusters))
            return ClusterResponse(clusters=clusters, importance=importance)
            
        except HTTPException:
            raise
        except Exception as exc:
            logging.error("Failed to cluster PYQ questions: %s", exc)
            raise HTTPException(status_code=500, detail="Unable to cluster questions. Please try again later.")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in cluster_pyq_questions: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


class PDFRequest(BaseModel):
    clusters: Dict[str, Dict[str, List[str]]]


@app.post("/pyq/generate-pdf")
async def generate_pdf_endpoint(payload: PDFRequest):
    """Generate a PDF from clustered questions."""
    temp_pdf_path = None
    try:
        # Validate input
        if not payload.clusters:
            raise HTTPException(status_code=400, detail="No clusters provided for PDF generation")
        
        # Create a temporary file for the PDF
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                temp_pdf_path = tmp.name
        except Exception as e:
            logging.error("Error creating temp PDF file: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to create PDF file")
            
        # Generate PDF using the helper function
        try:
            generate_pdf(payload.clusters, temp_pdf_path)
            
            if not os.path.exists(temp_pdf_path):
                raise Exception("PDF file was not created")
                
            logging.info("PDF generated successfully at %s", temp_pdf_path)
        except Exception as e:
            logging.error("Error generating PDF content: %s", str(e))
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
            raise HTTPException(status_code=500, detail="Failed to generate PDF content")
        
        # Return the file as a downloadable response
        try:
            return FileResponse(
                path=temp_pdf_path,
                filename="Exam_Buddy_Clustered_Questions.pdf",
                media_type="application/pdf",
                background=BackgroundTask(lambda: os.remove(temp_pdf_path) if os.path.exists(temp_pdf_path) else None)
            )
        except Exception as e:
            logging.error("Error sending PDF response: %s", str(e))
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
            raise HTTPException(status_code=500, detail="Failed to send PDF file")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in generate_pdf_endpoint: %s", str(e))
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except:
                pass
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


# ==================== TEACHER API ENDPOINTS ====================

class QuestionBankRequest(BaseModel):
    unit: str = Field(..., min_length=1, max_length=255)
    topics: str = Field(..., min_length=1)
    quantity: int = Field(default=5, ge=1, le=20)
    blooms_level: Literal["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"] = "Apply"


class AssignmentRequest(BaseModel):
    unit: str = Field(..., min_length=1, max_length=255)
    topics: str = Field(..., min_length=1)
    blooms_level: Literal["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
    question_types: str = Field(..., min_length=1)
    quantity: int = Field(default=5, ge=1, le=20)


class HotTopicsRequest(BaseModel):
    pass  # Files will be uploaded as multipart


async def increment_trial(user_id: int, db: Session):
    """Helper to increment user trial count"""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.trial_used = (user.trial_used or 0) + 1
        db.commit()
        db.refresh(user)


@app.post("/teacher/extract-units")
async def extract_units_from_syllabus(
    syllabus: UploadFile = File(...),
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Extract units and topics from syllabus PDF"""
    temp_path = None
    try:
        # Validate user
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Database error validating user: %s", str(e))
            raise HTTPException(status_code=500, detail="Database error occurred")
        
        # Save uploaded file temporarily
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                content = await syllabus.read()
                if not content:
                    raise HTTPException(status_code=400, detail="Empty file uploaded")
                temp_file.write(content)
                temp_path = temp_file.name
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error saving uploaded file: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to process uploaded file")
        
        # Extract text from PDF
        try:
            text = extract_text_from_pdf(temp_path)
            if not text or not text.strip():
                raise HTTPException(status_code=422, detail="Could not extract text from PDF")
            cleaned = clean_text(text)
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error extracting text: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
        
        # Extract units using LLM
        try:
            units = ext_syll(cleaned)
            if not units:
                raise HTTPException(status_code=422, detail="Could not identify units in the syllabus")
            
            logging.info("Successfully extracted %d units for user %d", len(units), user_id)
            return {"units": units}
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error extracting units with LLM: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to analyze syllabus structure")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in extract_units_from_syllabus: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logging.warning("Failed to cleanup temp file %s: %s", temp_path, str(e))


@app.post("/teacher/hot-topics")
async def extract_hot_topics(
    syllabus: UploadFile = File(...),
    pyq_files: List[UploadFile] = File(...),
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Extract hot topics from syllabus and PYQ files"""
    try:
        # Check trial limit
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.role == "teacher" and (user.trial_used or 0) >= 3:
            raise HTTPException(status_code=403, detail="Trial limit reached")
        
        # Save syllabus temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await syllabus.read()
            temp_file.write(content)
            syllabus_path = temp_file.name
        
        # Extract syllabus text
        syllabus_text = extract_text_from_pdf(syllabus_path)
        cleaned_syllabus = clean_text(syllabus_text)
        
        # Extract units from syllabus
        units = ext_syll(cleaned_syllabus)
        
        # Extract questions from PYQ files
        all_questions = []
        pyq_paths = []
        
        for pyq_file in pyq_files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                content = await pyq_file.read()
                temp_file.write(content)
                pyq_path = temp_file.name
                pyq_paths.append(pyq_path)
            
            # Extract questions from PDF
            pyq_text = extract_text_from_pdf(pyq_path)
            questions = llm_questions_extraction(pyq_text)
            all_questions.extend(questions)
            logging.info(f"Extracted {len(questions)} questions from {pyq_file.filename}")
        
        # Cluster questions by topics
        clusters, importance = cluster_questions(units, all_questions, threshold=0.65)
        
        # Clean up temp files
        os.remove(syllabus_path)
        for path in pyq_paths:
            os.remove(path)
        
        # Increment trial count
        await increment_trial(user_id, db)
        
        return {
            "hot_topics": importance,
            "clusters": clusters
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logging.error("Error extracting hot topics: %s", str(e))
        logging.error("Traceback: %s", traceback.format_exc())
        # Clean up temp files on error
        if 'syllabus_path' in locals() and os.path.exists(syllabus_path):
            os.remove(syllabus_path)
        if 'pyq_paths' in locals():
            for path in pyq_paths:
                if os.path.exists(path):
                    os.remove(path)
        raise HTTPException(status_code=500, detail=f"Failed to extract hot topics: {str(e)}")


@app.post("/student/hot-topics")
async def extract_hot_topics_student(
    syllabus: UploadFile = File(...),
    pyq_files: List[UploadFile] = File(...),
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Extract hot topics from syllabus and PYQ files for students"""
    # Same implementation as teacher endpoint
    return await extract_hot_topics(syllabus, pyq_files, user_id, db)


class PracticePaperRequest(BaseModel):
    syllabus: List[dict]
    difficulty: str = Field(default="Medium")
    quantity: int = Field(default=10, ge=1, le=30)


@app.post("/student/practice-paper")
async def generate_student_practice_paper(
    payload: PracticePaperRequest,
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Generate practice paper for students based on selected syllabus units"""
    try:
        # Check trial limit for students
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.role == "student" and (user.trial_used or 0) >= 3:
            raise HTTPException(status_code=403, detail="Trial limit reached")
        
        # Extract topics from selected units
        all_topics = []
        for unit in payload.syllabus:
            if "topics" in unit and isinstance(unit["topics"], list):
                all_topics.extend(unit["topics"])
        
        if not all_topics:
            raise HTTPException(status_code=400, detail="No topics found in selected units")
        
        # Generate practice paper
        paper = generate_practice_paper(
            syllabus_topics=all_topics,
            hot_topics=None,
            difficulty=payload.difficulty,
            quantity=payload.quantity
        )
        
        if not paper:
            raise HTTPException(status_code=500, detail="Failed to generate practice paper")
        
        # Increment trial count
        await increment_trial(user_id, db)
        
        return paper
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logging.error("Error generating practice paper: %s", str(e))
        logging.error("Traceback: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate practice paper: {str(e)}")


@app.post("/teacher/question-bank")
async def create_question_bank(
    payload: QuestionBankRequest,
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    try:
        # Check trial limit
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if user.role == "teacher" and (user.trial_used or 0) >= 3:
                raise HTTPException(status_code=403, detail="Trial limit reached. Please upgrade your account.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Database error checking user: %s", str(e))
            raise HTTPException(status_code=500, detail="Database error occurred")
        
        # Generate question bank
        try:
            questions = generate_question_bank(payload.topics, payload.quantity, "Medium")
            
            if not questions:
                raise HTTPException(status_code=422, detail="Could not generate questions. Please try different topics.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error generating question bank: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to generate question bank")
        
        # Increment trial count
        try:
            await increment_trial(user_id, db)
            logging.info("Generated %d questions for user %d", len(questions), user_id)
        except Exception as e:
            logging.error("Error incrementing trial count: %s", str(e))
            # Don't fail the request if trial increment fails
        
        return {"questions": questions}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in create_question_bank: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@app.post("/teacher/assignment")
async def create_assignment(
    payload: AssignmentRequest,
    user_id: int = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    try:
        # Check trial limit
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if user.role == "teacher" and (user.trial_used or 0) >= 3:
                raise HTTPException(status_code=403, detail="Trial limit reached. Please upgrade your account.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Database error checking user: %s", str(e))
            raise HTTPException(status_code=500, detail="Database error occurred")
        
        # Parse and validate topics
        try:
            topics_list = [t.strip() for t in payload.topics.split(",") if t.strip()]
            if not topics_list:
                raise HTTPException(status_code=400, detail="Please provide at least one topic")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error parsing topics: %s", str(e))
            raise HTTPException(status_code=400, detail="Invalid topics format")
        
        # Generate assignment
        try:
            assignment = generate_assignment(topics_list, payload.blooms_level, [payload.question_types], payload.quantity)
            
            if not assignment:
                raise HTTPException(status_code=422, detail="Could not generate assignment. Please try different parameters.")
        except HTTPException:
            raise
        except Exception as e:
            logging.error("Error generating assignment: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to generate assignment")
        
        # Increment trial count
        try:
            await increment_trial(user_id, db)
            logging.info("Generated assignment for user %d", user_id)
        except Exception as e:
            logging.error("Error incrementing trial count: %s", str(e))
            # Don't fail the request if trial increment fails
        
        return assignment
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Unexpected error in create_assignment: %s", str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


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
    class_id: Optional[int]
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



# ==================== UNIVERSITY HIERARCHY API ENDPOINTS ====================

# Pydantic Models for Creation and Updates

class UniversityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    display_order: int = Field(default=0)

class UniversityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
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

class UniversitySubjectCreate(BaseModel):
    year_id: int
    name: str = Field(..., min_length=1, max_length=255)
    icon_name: Optional[str] = None
    display_order: int = Field(default=0)

class UniversitySubjectUpdate(BaseModel):
    year_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    icon_name: Optional[str] = None
    display_order: Optional[int] = None

class UniversityMaterialCreate(BaseModel):
    uni_subject_id: int
    material_type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    year: Optional[str] = None
    embed_url: Optional[str] = None
    download_url: Optional[str] = None
    display_order: int = Field(default=0)

class UniversityMaterialUpdate(BaseModel):
    uni_subject_id: Optional[int] = None
    material_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    year: Optional[str] = None
    embed_url: Optional[str] = None
    download_url: Optional[str] = None
    display_order: Optional[int] = None

# Response Models

class UniversityResponse(BaseModel):
    id: int
    name: str
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

class UniversitySubjectResponse(BaseModel):
    id: int
    year_id: int
    name: str
    icon_name: Optional[str]
    display_order: int

    class Config:
        from_attributes = True

class UniversityMaterialResponse(BaseModel):
    id: int
    uni_subject_id: int
    material_type: str
    title: str
    year: Optional[str]
    embed_url: Optional[str]
    download_url: Optional[str]
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

@app.get("/admin/degrees", response_model=List[DegreeResponse])
def get_all_degrees(response: Response, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    degrees = db.query(Degree).order_by(Degree.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return degrees

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

@app.get("/admin/branches", response_model=List[BranchResponse])
def get_all_branches(response: Response, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    branches = db.query(Branch).order_by(Branch.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return branches

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

@app.get("/admin/years", response_model=List[YearResponse])
def get_all_years(response: Response, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    years = db.query(Year).order_by(Year.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return years

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


# --- UniversitySubject CRUD ---

@app.get("/admin/university-subjects", response_model=List[UniversitySubjectResponse])
def get_all_university_subjects(response: Response, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    subjects = db.query(UniversitySubject).order_by(UniversitySubject.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return subjects

@app.get("/api/years/{year_id}/university-subjects", response_model=List[UniversitySubjectResponse])
def get_university_subjects(year_id: int, response: Response, db: Session = Depends(get_db)):
    subjects = db.query(UniversitySubject).filter(UniversitySubject.year_id == year_id).order_by(UniversitySubject.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return subjects

@app.post("/admin/university-subjects", response_model=UniversitySubjectResponse, status_code=201)
def create_university_subject(payload: UniversitySubjectCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    subject = UniversitySubject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@app.put("/admin/university-subjects/{subject_id}", response_model=UniversitySubjectResponse)
def update_university_subject(subject_id: int, payload: UniversitySubjectUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    subject = db.query(UniversitySubject).filter(UniversitySubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="University Subject not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)
    
    db.commit()
    db.refresh(subject)
    return subject

@app.delete("/admin/university-subjects/{subject_id}", status_code=204)
def delete_university_subject(subject_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    subject = db.query(UniversitySubject).filter(UniversitySubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="University Subject not found")
    db.delete(subject)
    db.commit()
    return None


# --- UniversityMaterial CRUD ---

@app.get("/admin/university-materials", response_model=List[UniversityMaterialResponse])
def get_all_university_materials(response: Response, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    materials = db.query(UniversityMaterial).order_by(UniversityMaterial.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return materials

@app.get("/api/university-subjects/{subject_id}/materials", response_model=List[UniversityMaterialResponse])
def get_university_materials(subject_id: int, response: Response, db: Session = Depends(get_db)):
    materials = db.query(UniversityMaterial).filter(UniversityMaterial.uni_subject_id == subject_id).order_by(UniversityMaterial.display_order).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return materials

@app.post("/admin/university-materials", response_model=UniversityMaterialResponse, status_code=201)
def create_university_material(payload: UniversityMaterialCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    material = UniversityMaterial(**payload.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@app.put("/admin/university-materials/{material_id}", response_model=UniversityMaterialResponse)
def update_university_material(material_id: int, payload: UniversityMaterialUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    material = db.query(UniversityMaterial).filter(UniversityMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="University Material not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)
    
    db.commit()
    db.refresh(material)
    return material

@app.delete("/admin/university-materials/{material_id}", status_code=204)
def delete_university_material(material_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    material = db.query(UniversityMaterial).filter(UniversityMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="University Material not found")
    db.delete(material)
    db.commit()
    return None


# # --- Semester CRUD ---

# @app.get("/api/years/{year_id}/semesters", response_model=List[SemesterResponse])
# def get_semesters(year_id: int, response: Response, db: Session = Depends(get_db)):
#     semesters = db.query(Semester).filter(Semester.year_id == year_id).order_by(Semester.display_order).all()
#     response.headers["Cache-Control"] = "public, max-age=300"
#     return semesters

# @app.post("/admin/semesters", response_model=SemesterResponse, status_code=201)
# def create_semester(payload: SemesterCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
#     semester = Semester(**payload.model_dump())
#     db.add(semester)
#     db.commit()
#     db.refresh(semester)
#     return semester

# @app.put("/admin/semesters/{semester_id}", response_model=SemesterResponse)
# def update_semester(semester_id: int, payload: SemesterUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
#     semester = db.query(Semester).filter(Semester.id == semester_id).first()
#     if not semester:
#         raise HTTPException(status_code=404, detail="Semester not found")
    
#     update_data = payload.model_dump(exclude_unset=True)
#     for key, value in update_data.items():
#         setattr(semester, key, value)
    
#     db.commit()
#     db.refresh(semester)
#     return semester

# @app.delete("/admin/semesters/{semester_id}", status_code=204)
# def delete_semester(semester_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
#     semester = db.query(Semester).filter(Semester.id == semester_id).first()
#     if not semester:
#         raise HTTPException(status_code=404, detail="Semester not found")
#     db.delete(semester)
#     db.commit()
#     return None


# @app.get("/api/semesters/{semester_id}/subjects", response_model=List[SubjectResponse])
# def get_semester_subjects(semester_id: int, response: Response, db: Session = Depends(get_db)):
#     subjects = db.query(Subject).filter(Subject.semester_id == semester_id).order_by(Subject.display_order).all()
#     response.headers["Cache-Control"] = "public, max-age=300"
#     return subjects

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


@app.get("/universities")
def get_universities(db: Session = Depends(get_db)):
    from models import University
    universities = db.query(University).order_by(University.display_order).all()
    return universities


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
