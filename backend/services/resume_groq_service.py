"""
Groq fallback mirror of resume_gemini_service.py — same prompts, same
JSON contract, used automatically if Gemini fails or hits quota.
"""

import os
import json
from groq import Groq
from services.resume_gemini_service import (
    ANALYZER_SYSTEM_INSTRUCTION,
    BUILDER_SYSTEM_INSTRUCTION,
)
from langfuse.decorators import observe

GROQ_MODEL = "llama-3.3-70b-versatile"


class GroqAnalysisError(Exception):
    pass


def _call_groq(system_instruction: str, user_content: str) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqAnalysisError("GROQ_API_KEY is not set in backend/.env")

    client = Groq(api_key=api_key)

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise GroqAnalysisError(f"Groq API call failed: {e}") from e

    raw = (completion.choices[0].message.content or "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise GroqAnalysisError(f"Groq returned non-JSON output: {raw[:200]}") from e


@observe(as_type="generation")
def analyze_resume_groq(resume_text: str, job_description: str = "") -> dict:
    user_content = f"RESUME TEXT:\n{resume_text}"
    if job_description.strip():
        user_content += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"

    parsed = _call_groq(ANALYZER_SYSTEM_INSTRUCTION, user_content)

    required_keys = {"ats_score", "summary"}
    if not required_keys.issubset(parsed.keys()):
        raise GroqAnalysisError(f"Groq analyzer response missing keys: {parsed.keys()}")

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
def build_resume_groq(resume_text: str, company_name: str = "", job_description: str = "") -> dict:
    user_content = f"EXISTING RESUME TEXT:\n{resume_text}"
    if company_name.strip():
        user_content += f"\n\nTARGET COMPANY: {company_name}"
    if job_description.strip():
        user_content += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"

    parsed = _call_groq(BUILDER_SYSTEM_INSTRUCTION, user_content)

    required_keys = {"full_name", "professional_summary", "experience", "skills"}
    if not required_keys.issubset(parsed.keys()):
        raise GroqAnalysisError(f"Groq builder response missing keys: {parsed.keys()}")

    parsed.setdefault("contact_line", "")
    parsed.setdefault("education", [])

    return parsed
