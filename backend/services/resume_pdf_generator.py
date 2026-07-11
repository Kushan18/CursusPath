"""
Renders the structured resume JSON (from resume_gemini_service.build_resume)
into a clean, single-column, ATS-friendly PDF. Deliberately avoids tables,
columns, or graphics — the exact things that confuse ATS parsers.
"""

import io
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    ListFlowable,
    ListItem,
)
from reportlab.lib import colors
from xml.sax.saxutils import escape

def safe_text(text: str) -> str:
    """Escapes XML reserved characters to prevent ReportLab parsing crashes."""
    return escape(str(text)) if text else ""


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ResumeName",
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ResumeContact",
            fontName="Helvetica",
            fontSize=9.5,
            textColor=colors.HexColor("#444444"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            fontName="Helvetica-Bold",
            fontSize=11.5,
            textColor=colors.HexColor("#0A0D12"),
            spaceBefore=12,
            spaceAfter=4,
            borderPadding=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="JobTitle",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            spaceAfter=1,
        )
    )
    styles.add(
        ParagraphStyle(
            name="JobMeta",
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            textColor=colors.HexColor("#555555"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyTextTight",
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            alignment=TA_LEFT,
        )
    )
    return styles


def generate_resume_pdf(resume_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        title=resume_data.get("full_name", "Resume"),
    )
    styles = _build_styles()
    story = []

    story.append(Paragraph(safe_text(resume_data.get("full_name", "")), styles["ResumeName"]))
    if resume_data.get("contact_line"):
        story.append(Paragraph(safe_text(resume_data["contact_line"]), styles["ResumeContact"]))

    if resume_data.get("professional_summary"):
        story.append(Paragraph("PROFESSIONAL SUMMARY", styles["SectionHeading"]))
        story.append(
            Paragraph(safe_text(resume_data["professional_summary"]), styles["BodyTextTight"])
        )

    experience = resume_data.get("experience", [])
    if experience:
        story.append(Paragraph("EXPERIENCE", styles["SectionHeading"]))
        for job in experience:
            title_line = job.get("title", "")
            if job.get("company"):
                title_line += f" — {job['company']}"
            story.append(Paragraph(safe_text(title_line), styles["JobTitle"]))
            if job.get("dates"):
                story.append(Paragraph(safe_text(job["dates"]), styles["JobMeta"]))
            bullets = job.get("bullets", [])
            if bullets:
                story.append(
                    ListFlowable(
                        [
                            ListItem(
                                Paragraph(safe_text(b), styles["BodyTextTight"]),
                                leftIndent=14,
                                bulletColor=colors.HexColor("#333333"),
                            )
                            for b in bullets
                        ],
                        bulletType="bullet",
                        start="•",
                        spaceAfter=6,
                    )
                )

    skills = resume_data.get("skills", [])
    if skills:
        story.append(Paragraph("SKILLS", styles["SectionHeading"]))
        story.append(Paragraph(safe_text(", ".join(skills)), styles["BodyTextTight"]))

    education = resume_data.get("education", [])
    if education:
        story.append(Paragraph("EDUCATION", styles["SectionHeading"]))
        for edu_line in education:
            story.append(Paragraph(safe_text(edu_line), styles["BodyTextTight"]))
            story.append(Spacer(1, 2))

    doc.build(story)
    return buffer.getvalue()
