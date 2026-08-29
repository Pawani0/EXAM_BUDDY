import argparse
import json
import re
import warnings
from pathlib import Path

import easyocr
import fitz
import numpy as np


MATH_KEYWORDS = {
	"algebra",
	"geometry",
	"calculus",
	"equation",
	"factor",
	"fraction",
	"integer",
	"polynomial",
	"trigonometry",
	"matrix",
	"probability",
	"statistics",
	"derivative",
	"integral",
	"quadratic",
	"theorem",
}

MATH_SYMBOL_RE = re.compile(r"[=+\-*/^%<>√π∑∫∆∞≈≠≤≥]\s*|\d+\s*[xXyY]\b|\b\d+(?:\.\d+)?\b")
WORD_RE = re.compile(r"[A-Za-z]+")

warnings.filterwarnings(
	"ignore",
	message=r"'pin_memory' argument is set as true but no accelerator is found",
	category=UserWarning,
)


def render_pdf_page_to_image(page: fitz.Page, zoom: float = 2.0) -> np.ndarray:
	matrix = fitz.Matrix(zoom, zoom)
	pix = page.get_pixmap(matrix=matrix, alpha=False)
	img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
	if pix.n == 4:
		img = img[:, :, :3]
	return img


def classify_text(line: str) -> str:
	words = {word.lower() for word in WORD_RE.findall(line)}
	keyword_hits = len(words.intersection(MATH_KEYWORDS))
	symbol_hits = len(MATH_SYMBOL_RE.findall(line))

	if keyword_hits > 0 or symbol_hits >= 2:
		return "mathematics"
	return "english"


def extract_subject_text_from_pdf(
	pdf_path: Path,
	min_confidence: float = 0.3,
	zoom: float = 2.0,
) -> dict:
	if not pdf_path.exists():
		raise FileNotFoundError(f"PDF not found: {pdf_path}")

	reader = easyocr.Reader(["en"], gpu=False, verbose=False)
	doc = fitz.open(pdf_path)

	result = {
		"english": [],
		"mathematics": [],
	}

	for page_index in range(len(doc)):
		page = doc[page_index]
		image = render_pdf_page_to_image(page, zoom=zoom)
		detections = reader.readtext(image, detail=1, paragraph=False)

		for detection in detections:
			_, text, confidence = detection
			if confidence < min_confidence:
				continue

			clean_text = text.strip()
			if not clean_text:
				continue

			subject = classify_text(clean_text)
			result[subject].append(
				{
					"page": page_index + 1,
					"text": clean_text,
					"confidence": round(float(confidence), 4),
				}
			)

	doc.close()
	return result


def main() -> None:
	parser = argparse.ArgumentParser(
		description="Extract English and Mathematics text from a PDF using EasyOCR."
	)
	parser.add_argument(
		"pdf",
		type=Path,
		nargs="?",
		help="Path to the input PDF file (optional; prompts if omitted)",
	)
	parser.add_argument(
		"--min-confidence",
		type=float,
		default=0.3,
		help="Minimum OCR confidence threshold (default: 0.3)",
	)
	parser.add_argument(
		"--zoom",
		type=float,
		default=2.0,
		help="PDF render zoom factor for OCR (default: 2.0)",
	)
	parser.add_argument(
		"--output",
		type=Path,
		help="Optional output JSON path. If omitted, prints to console.",
	)

	args = parser.parse_args()
	pdf_path = args.pdf

	if pdf_path is None:
		entered_path = input("Enter PDF path: ").strip().strip('"').strip("'")
		if not entered_path:
			raise SystemExit("No PDF path provided.")
		pdf_path = Path(entered_path)

	output = extract_subject_text_from_pdf(
		pdf_path=pdf_path,
		min_confidence=args.min_confidence,
		zoom=args.zoom,
	)

	if args.output:
		args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
		print(f"Saved output to {args.output}")
	else:
		print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
	main()
