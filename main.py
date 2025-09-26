from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from llm_smart_extractor import llm_syllabus_extraction as ext_syll
from text_extractor import extract_text_from_pdf, clean_text
import tempfile
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Exam Buddy")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
