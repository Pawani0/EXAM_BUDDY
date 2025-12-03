from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import logging

def generate_pdf(clustered_data, filename="Clustered_Questions.pdf"):
    """Generate a PDF from clustered questions data. Raises exception on failure."""
    try:
        if not clustered_data:
            raise ValueError("No clustered data provided for PDF generation")
        
        doc = SimpleDocTemplate(filename, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()

        # Custom Styles
        try:
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
        except Exception as e:
            logging.error(f"Error creating PDF styles: {str(e)}")
            raise

        try:
            story.append(Paragraph("Clustered Questions Report", title_style))
            story.append(Spacer(1, 12))

            for unit_name, topics in clustered_data.items():
                try:
                    # Unit Heading
                    story.append(Paragraph(str(unit_name), unit_style))
                    story.append(Spacer(1, 6))

                    for topic_name, questions in topics.items():
                        if not questions:
                            continue  # skip topics with no questions
                        
                        # Topic subheading
                        story.append(Paragraph(str(topic_name), topic_style))
                        
                        # List of questions
                        question_items = [ListItem(Paragraph(str(q), question_style)) for q in questions]
                        story.append(ListFlowable(question_items, bulletType='1', start=1))  # numbered list
                        story.append(Spacer(1, 12))
                except Exception as e:
                    logging.warning(f"Error processing unit {unit_name}: {str(e)}")
                    continue
                
                # Page break after each unit (optional, can remove if not needed)
                story.append(PageBreak())

            doc.build(story)
            logging.info(f"PDF generated successfully: {filename}")
            return filename
            
        except Exception as e:
            logging.error(f"Error building PDF content: {str(e)}")
            raise
            
    except Exception as e:
        logging.error(f"Error generating PDF: {str(e)}")
        raise

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