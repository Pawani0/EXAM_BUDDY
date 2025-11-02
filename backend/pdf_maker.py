from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem

def generate_pdf(clustered_data, filename="Clustered_Questions.pdf"):
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            rightMargin=40, leftMargin=40,
                            topMargin=60, bottomMargin=40)

    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    unit_style = ParagraphStyle(name='UnitStyle', parent=styles['Heading1'], fontSize=18, spaceAfter=12)
    topic_style = ParagraphStyle(name='TopicStyle', parent=styles['Heading2'], fontSize=14, spaceAfter=6, leftIndent=12)
    question_style = ParagraphStyle(name='QuestionStyle', parent=styles['Normal'], fontSize=12, leftIndent=24, spaceAfter=4)

    for unit_name, topics in clustered_data.items():
        # Unit heading
        story.append(Paragraph(unit_name, unit_style))
        story.append(Spacer(1, 6))

        for topic_name, questions in topics.items():
            if not questions:
                continue  # skip topics with no questions
            # Topic subheading
            story.append(Paragraph(topic_name, topic_style))
            # List of questions
            question_items = [ListItem(Paragraph(q, question_style)) for q in questions]
            story.append(ListFlowable(question_items, bulletType='1'))  # numbered list
            story.append(Spacer(1, 12))
        
        # Page break after each unit
        story.append(PageBreak())

    # Build PDF
    doc.build(story)
    print(f"PDF generated: {filename}")