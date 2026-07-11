"""
Two Gemini-powered functions for the Resume Suite:
- analyze_resume: ATS-style scoring against an optional job description
- build_resume: generates a tailored resume as structured JSON, later
  rendered to PDF by resume_pdf_generator.py
"""

import os
import json
from google import genai
from google.genai import types
from langfuse.decorators import observe

GEMINI_MODEL = "gemini-2.5-flash"

ANALYZER_SYSTEM_INSTRUCTION = """You are an ATS (Applicant Tracking System) resume analyzer for a career platform.
You will be given raw extracted resume text, and optionally a target job description.

MODE 1: JOB DESCRIPTION PROVIDED (Role-Matching Optimization)
If a job description is provided, evaluate the resume for:
- Keyword alignment with the job description — what's matched, what's missing
- Role-specific formatting or structural issues
- Relevancy of the experience to the targeted role

MODE 2: NO JOB DESCRIPTION PROVIDED (Global ATS Hardening Mode)
If no job description is provided, analyze the resume against universal high-scoring industry gold standards:
- Flag weak, passive verbs (e.g., "Responsible for...") and suggest strong action verbs (e.g., "Spearheaded," "Architected")
- Detect missing structural pillars (e.g., Summary, quantifiable metrics, clean contact section, complete projects structure)
- Identify formatting issues like bad whitespace or lack of clean text separation

IN ALL MODES, evaluate generic/weak phrasing vs specific, quantified accomplishments.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "ats_score": <integer 0-100>,
  "matched_keywords": ["<keyword found in both resume and JD>", ...],
  "missing_keywords": ["<important keyword from JD not found in resume>", ...],
  "formatting_issues": ["<specific formatting problem>", ...],
  "structure_issues": ["<specific structural/content problem>", ...],
  "suggested_additions": ["<suggested content, metrics, or action verbs to add>", ...],
  "irrelevant_sections": ["<sections or bullets that should be removed or shortened>", ...],
  "optimized_layout": "<a short text description of how the structural layout should be reorganized for maximum impact>",
  "summary": "<one or two sentence plain-English verdict>"
}

If no job description was provided, matched_keywords and missing_keywords should be empty arrays. Focus the suggestions, irrelevant sections, and summary on general resume quality and ATS hardening instead. Be specific — cite what you actually saw, never invent details not present in the text."""

BUILDER_SYSTEM_INSTRUCTION = """You are a professional resume writer for a career platform. You will be given:
1. The candidate's existing resume text (their real background — do not invent experience,
   employers, or dates that aren't implied by this text)
2. A target company name and/or job description to tailor toward (these may be omitted)

If a target company or job description IS provided, align the resume content with that target role/company.
If NO target company or job description is provided, rewrite the resume against universal high-scoring industry gold standards (Global ATS Hardening Mode).

In all cases: sharpen the professional summary, reorder and rephrase bullet points to emphasize relevant skills, tighten weak phrasing into specific, quantified language WHERE the original text supports it (e.g., replace passive verbs with strong action verbs). Do not fabricate metrics, job titles, employers, or dates that contradict the original resume.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "full_name": "<from original resume>",
  "contact_line": "<email / phone / location, whatever was in the original>",
  "professional_summary": "<2-3 sentence tailored summary>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company name>",
      "dates": "<date range as given>",
      "bullets": ["<tailored bullet point>", ...]
    }
  ],
  "skills": ["<skill>", ...],
  "education": ["<education entry as a single line>", ...]
}"""


class GeminiAnalysisError(Exception):
    pass


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiAnalysisError("GEMINI_API_KEY is not set in backend/.env")
    return genai.Client(api_key=api_key)


def _call_gemini(system_instruction: str, user_content: str) -> dict:
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        raise GeminiAnalysisError(f"Gemini API call failed: {e}") from e

    raw = (response.text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise GeminiAnalysisError(f"Gemini returned non-JSON output: {raw[:200]}") from e


@observe(as_type="generation")
def analyze_resume(resume_text: str, job_description: str = "") -> dict:
    user_content = f"RESUME TEXT:\n{resume_text}"
    if job_description.strip():
        user_content += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"

    parsed = _call_gemini(ANALYZER_SYSTEM_INSTRUCTION, user_content)

    required_keys = {"ats_score", "summary"}
    if not required_keys.issubset(parsed.keys()):
        raise GeminiAnalysisError(f"Gemini analyzer response missing keys: {parsed.keys()}")

    parsed["ats_score"] = max(0, min(100, int(parsed["ats_score"])))
    parsed.setdefault("matched_keywords", [])
    parsed.setdefault("missing_keywords", [])
    parsed.setdefault("formatting_issues", [])
    parsed.setdefault("structure_issues", [])
    parsed.setdefault("suggested_additions", [])
    parsed.setdefault("irrelevant_sections", [])
    parsed.setdefault("optimized_layout", "")

    return parsed


@observe(as_type="generation")
def build_resume(resume_text: str, company_name: str = "", job_description: str = "") -> dict:
    user_content = f"EXISTING RESUME TEXT:\n{resume_text}"
    if company_name.strip():
        user_content += f"\n\nTARGET COMPANY: {company_name}"
    if job_description.strip():
        user_content += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"

    parsed = _call_gemini(BUILDER_SYSTEM_INSTRUCTION, user_content)

    required_keys = {"full_name", "professional_summary", "experience", "skills"}
    if not required_keys.issubset(parsed.keys()):
        raise GeminiAnalysisError(f"Gemini builder response missing keys: {parsed.keys()}")

    parsed.setdefault("contact_line", "")
    parsed.setdefault("education", [])

    return parsed
