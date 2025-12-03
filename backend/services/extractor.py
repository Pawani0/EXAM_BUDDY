import re
import pytesseract
import fitz
from PIL import Image
from llm_smart_extractor import llm_questions_extraction as ext_ques, llm_syllabus_extraction as ext_syllabus

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    all_text = ""

    for page in doc:
        # Render page to image
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # OCR in English only
        text = pytesseract.image_to_string(img, lang="eng")
        all_text += text + "\n"
    
    return all_text

def clean_text(text):
    text = re.sub(r'\s+', ' ', text)   # collapse spaces/newlines
    return text.strip()

def extract_metadata(text):
    # Regex for month + year
    match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})', text, re.IGNORECASE)
    if match:
        return match.group(0).title()
    return "Unknown"

def process_pyqp_pdf(pdf_path):

    text = extract_text_from_pdf(pdf_path)

    # Remove Hindi (Devanagari Unicode block \u0900-\u097F)
    cleaned_text = re.sub(r'[\u0900-\u097F]+', ' ', text)
    cleaned_text = clean_text(cleaned_text)

    metadata = extract_metadata(text)

    return metadata, cleaned_text

def process_multiple_pyqp(pdf_files):
    seen_papers = set()

    for file in pdf_files:
        metadata, text = process_pyqp_pdf(file)


        # Skip duplicate papers (same month & year)
        if metadata in seen_papers:
            print(f"Skipping duplicate paper: {metadata} ({file})")
            continue
        seen_papers.add(metadata)

        print(f"Processed {file}: {metadata}")
        questions = ext_ques(text)
        return questions

def process_syllabus_pdf(pdf_path):
    text = extract_text_from_pdf(pdf_path)
    cleaned_text = clean_text(text)
    syllabus = ext_syllabus(cleaned_text)
    return syllabus