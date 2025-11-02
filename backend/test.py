from extractor import process_multiple_pyqp, process_syllabus_pdf
from pyq_clustring import cluster_questions
from pdf_maker import generate_pdf

syll_pdf = input("Enter syllabus PDF path: ")
print("\n")
n = int(input("Enter number of question PDFs: "))
que_pdfs = []
for i in range(n):
    pdf_path = input(f"Enter path for question PDF {i+1}: ")
    que_pdfs.append(pdf_path)

print("Extracting Syllabus...")
syllabus = process_syllabus_pdf(syll_pdf)
print("Syllabus Extracted")

print("Extracting Questions...")
questions = process_multiple_pyqp(que_pdfs)
print("Questions Extracted")

print("Clustering Questions...")
question_bank = cluster_questions(syllabus, questions)
print("Questions Clustered")

generate_pdf(question_bank)