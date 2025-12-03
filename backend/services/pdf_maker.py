from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_pdf(clustered_data, filename="Clustered_Questions.pdf"):
    doc = SimpleDocTemplate(filename, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        alignment=TA_CENTER,
        spaceAfter=20
    )
    unit_style = ParagraphStyle(
        'Unit',
        parent=styles['Heading2'],
        spaceBefore=15,
        spaceAfter=10
    )
    topic_style = ParagraphStyle(
        'Topic',
        parent=styles['Heading3'],
        spaceBefore=10,
        spaceAfter=5
    )
    question_style = ParagraphStyle(
        'Question',
        parent=styles['BodyText'],
        leftIndent=20
    )

    story.append(Paragraph("Clustered Questions Report", title_style))
    story.append(Spacer(1, 12))

    for unit_name, topics in clustered_data.items():
        # Unit Heading
        story.append(Paragraph(unit_name, unit_style))
        story.append(Spacer(1, 6))

        for topic_name, questions in topics.items():
            if not questions:
                continue  # skip topics with no questions
            
            # Topic subheading
            story.append(Paragraph(topic_name, topic_style))
            
            # List of questions
            question_items = [ListItem(Paragraph(q, question_style)) for q in questions]
            story.append(ListFlowable(question_items, bulletType='1', start=1))  # numbered list
            story.append(Spacer(1, 12))
        
        # Page break after each unit (optional, can remove if not needed)
        story.append(PageBreak())

    doc.build(story)
    return filename