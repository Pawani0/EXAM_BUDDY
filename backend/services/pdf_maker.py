from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from xml.sax.saxutils import escape
import tempfile
import os
import re
import logging

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


LATEX_INLINE_PATTERN = re.compile(r"\$(.+?)\$")


def _extract_question_text(question):
    if question is None:
        return ""
    if isinstance(question, dict):
        latex_text = question.get("latex")
        plain_text = question.get("question")
        return str(latex_text or plain_text or "").strip()
    return str(question).strip()


def _split_text_and_latex_blocks(text):
    """Split text into plain and latex blocks based on $...$ delimiters."""
    parts = []
    last_index = 0
    for match in LATEX_INLINE_PATTERN.finditer(text):
        start, end = match.span()
        if start > last_index:
            parts.append(("text", text[last_index:start]))
        parts.append(("latex", match.group(1)))
        last_index = end

    if last_index < len(text):
        parts.append(("text", text[last_index:]))

    return parts if parts else [("text", text)]


def _render_latex_to_image(expr, temp_dir, max_width_pts=440):
    """Render a LaTeX expression to a PNG and return a reportlab Image flowable."""
    try:
        fig = plt.figure(figsize=(1, 1), dpi=220)
        text_artist = fig.text(0.02, 0.55, f"${expr}$", fontsize=12)
        fig.canvas.draw()
        bbox = text_artist.get_window_extent(renderer=fig.canvas.get_renderer())

        width_in = max((bbox.width + 24) / fig.dpi, 0.5)
        height_in = max((bbox.height + 20) / fig.dpi, 0.3)

        fig.set_size_inches(width_in, height_in)
        text_artist.set_position((0.02, 0.5))

        img_path = os.path.join(temp_dir, f"latex_{next(tempfile._get_candidate_names())}.png")
        fig.savefig(img_path, dpi=220, transparent=True, bbox_inches="tight", pad_inches=0.05)
        plt.close(fig)

        image = Image(img_path)
        if image.drawWidth > max_width_pts:
            ratio = max_width_pts / float(image.drawWidth)
            image.drawWidth = max_width_pts
            image.drawHeight = image.drawHeight * ratio
        return image
    except Exception as e:
        logging.warning("Failed to render LaTeX expression '%s': %s", expr, str(e))
        try:
            plt.close("all")
        except Exception:
            pass
        return None

def add_header_footer(canvas, doc):
    """Add header and footer to each page."""
    canvas.saveState()
    
    # Footer - Page Number
    page_num = canvas.getPageNumber()
    text = f"Page {page_num}"
    canvas.setFont("Helvetica", 9)
    # Center the page number at the bottom
    canvas.drawCentredString(A4[0]/2, 10*mm, text)
    
    # Header - Exam Buddy
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(20*mm, A4[1] - 15*mm, "Exam Buddy - Clustered Questions Report")
    canvas.line(20*mm, A4[1] - 17*mm, A4[0] - 20*mm, A4[1] - 17*mm)
    
    canvas.restoreState()

def generate_pdf(clustered_data, filename="Clustered_Questions.pdf"):
    """Generate a PDF from clustered questions data. Raises exception on failure."""
    try:
        if not clustered_data:
            raise ValueError("No clustered data provided for PDF generation")
        
        # Create document with margins
        doc = SimpleDocTemplate(
            filename, 
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=25*mm,
            bottomMargin=25*mm
        )
        
        story = []
        styles = getSampleStyleSheet()
        temp_dir = tempfile.mkdtemp(prefix="exam_buddy_latex_")

        # Custom Styles
        try:
            # Title Style - Centered, Large, Bold, Dark Blue
            title_style = ParagraphStyle(
                'TitleCustom',
                parent=styles['Heading1'],
                alignment=TA_CENTER,
                fontSize=24,
                spaceAfter=20,
                textColor=colors.darkblue
            )
            
            # Unit Style - Heading 2, Bold, with spacing
            unit_style = ParagraphStyle(
                'UnitCustom',
                parent=styles['Heading2'],
                fontSize=16,
                spaceBefore=20,
                spaceAfter=10,
                textColor=colors.black,
                keepWithNext=True
            )
            
            # Topic Style - Heading 3, slightly indented
            topic_style = ParagraphStyle(
                'TopicCustom',
                parent=styles['Heading3'],
                fontSize=13,
                spaceBefore=12,
                spaceAfter=6,
                textColor=colors.darkslategray,
                keepWithNext=True
            )
            
            # Question Style - Normal text
            question_style = ParagraphStyle(
                'QuestionCustom',
                parent=styles['Normal'],
                fontSize=11,
                leading=14  # Line spacing
            )

            question_number_style = ParagraphStyle(
                'QuestionNumberCustom',
                parent=styles['Normal'],
                fontSize=11,
                leading=14,
                spaceBefore=5,
                leftIndent=0,
                textColor=colors.black
            )

            question_block_style = ParagraphStyle(
                'QuestionBlockCustom',
                parent=styles['Normal'],
                fontSize=11,
                leading=14,
                leftIndent=18,
                spaceAfter=4
            )
            
        except Exception as e:
            logging.error(f"Error creating PDF styles: {str(e)}")
            raise

        try:
            # Document Title
            story.append(Paragraph("Clustered Questions Report", title_style))
            story.append(Spacer(1, 12))

            is_first_unit = True
            
            for unit_name, topics in clustered_data.items():
                if not topics:
                    continue
                
                # Add PageBreak before new units (except the first one)
                if not is_first_unit:
                    story.append(PageBreak())
                is_first_unit = False
                
                # Unit Heading
                story.append(Paragraph(str(unit_name), unit_style))
                story.append(Spacer(1, 6))

                for topic_name, questions in topics.items():
                    if not questions:
                        continue
                    
                    # Topic subheading
                    story.append(Paragraph(str(topic_name), topic_style))
                    
                    for index, q in enumerate(questions, start=1):
                        q_text = _extract_question_text(q)
                        if not q_text:
                            continue

                        story.append(Paragraph(f"{index}.", question_number_style))

                        segments = _split_text_and_latex_blocks(q_text)
                        has_latex = any(kind == "latex" for kind, _ in segments)

                        if not has_latex:
                            story.append(Paragraph(escape(q_text), question_block_style))
                            continue

                        for kind, content in segments:
                            if not content.strip():
                                continue

                            if kind == "text":
                                story.append(Paragraph(escape(content), question_block_style))
                            else:
                                image = _render_latex_to_image(content.strip(), temp_dir)
                                if image is not None:
                                    image.hAlign = "LEFT"
                                    story.append(image)
                                    story.append(Spacer(1, 2))
                                else:
                                    story.append(Paragraph(escape(f"${content}$"), question_block_style))

                        story.append(Spacer(1, 4))

                    story.append(Spacer(1, 10))

            # Build the PDF using the custom header/footer function
            doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
            logging.info(f"PDF generated successfully: {filename}")
            return filename
            
        except Exception as e:
            logging.error(f"Error building PDF content: {str(e)}")
            raise
        finally:
            try:
                if os.path.isdir(temp_dir):
                    for file_name in os.listdir(temp_dir):
                        path = os.path.join(temp_dir, file_name)
                        if os.path.isfile(path):
                            os.remove(path)
                    os.rmdir(temp_dir)
            except Exception as cleanup_error:
                logging.warning("Failed to cleanup temp LaTeX images: %s", str(cleanup_error))
            
    except Exception as e:
        logging.error(f"Error generating PDF: {str(e)}")
        raise