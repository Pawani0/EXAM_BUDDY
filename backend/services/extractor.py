import re
import pytesseract
import fitz
from PIL import Image
import logging
import os
import platform
from services.llm_smart_extractor import llm_questions_extraction as ext_ques, llm_syllabus_extraction as ext_syllabus

# Set Tesseract path based on environment
# Check environment variable first (for Docker), then use OS-specific defaults
tesseract_cmd = os.getenv('TESSERACT_CMD')
if not tesseract_cmd:
    # Local development paths
    if platform.system() == 'Windows':
        tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    else:  # Linux/Mac
        tesseract_cmd = '/usr/bin/tesseract'

pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using OCR. Raises exception on failure."""
    try:
        doc = fitz.open(pdf_path)
        all_text = ""

        for page_num, page in enumerate(doc):
            try:
                # Render page to image
                pix = page.get_pixmap(dpi=300)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # OCR in English only
                text = pytesseract.image_to_string(img, lang="eng")
                all_text += text + "\n"
            except Exception as e:
                logging.warning(f"Error processing page {page_num + 1}: {str(e)}")
                continue
        
        doc.close()
        return all_text
    except Exception as e:
        logging.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
        raise

def clean_text(text):
    """Clean and normalize text. Returns empty string if input is None."""
    try:
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)   # collapse spaces/newlines
        return text.strip()
    except Exception as e:
        logging.error(f"Error cleaning text: {str(e)}")
        return ""

def extract_metadata(text):
    """Extract month and year from text. Returns 'Unknown' if not found."""
    try:
        if not text:
            return "Unknown"
        # Regex for month + year
        match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})', text, re.IGNORECASE)
        if match:
            return match.group(0).title()
        return "Unknown"
    except Exception as e:
        logging.error(f"Error extracting metadata: {str(e)}")
        return "Unknown"

def process_pyqp_pdf(pdf_path):
    """Process a PYQ PDF and extract metadata and cleaned text. Raises exception on failure."""
    try:
        text = extract_text_from_pdf(pdf_path)

        # Remove Hindi (Devanagari Unicode block \u0900-\u097F)
        cleaned_text = re.sub(r'[\u0900-\u097F]+', ' ', text)
        cleaned_text = clean_text(cleaned_text)

        metadata = extract_metadata(text)

        return metadata, cleaned_text
    except Exception as e:
        logging.error(f"Error processing PYQ PDF {pdf_path}: {str(e)}")
        raise

def process_multiple_pyqp(pdf_files):
    """Process multiple PYQ PDFs and extract questions. Returns list of questions."""
    seen_papers = set()
    all_questions = []

    for file in pdf_files:
        try:
            metadata, text = process_pyqp_pdf(file)

            # Skip duplicate papers (same month & year)
            if metadata in seen_papers:
                logging.info(f"Skipping duplicate paper: {metadata} ({file})")
                continue
            seen_papers.add(metadata)

            logging.info(f"Processed {file}: {metadata}")
            questions = ext_ques(text)
            if questions:
                all_questions.extend(questions)
        except Exception as e:
            logging.error(f"Error processing file {file}: {str(e)}")
            continue
    
    return all_questions

def process_syllabus_pdf(pdf_path):
    """Process syllabus PDF and extract structured units. Raises exception on failure."""
    try:
        text = extract_text_from_pdf(pdf_path)
        cleaned_text = clean_text(text)
        syllabus = ext_syllabus(cleaned_text)
        return syllabus
    except Exception as e:
        logging.error(f"Error processing syllabus PDF {pdf_path}: {str(e)}")
        raise