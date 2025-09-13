import pytesseract
import fitz
import re
from PIL import Image

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
