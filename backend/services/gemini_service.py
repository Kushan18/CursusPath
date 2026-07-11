"""
Sends extracted offer-letter text to Gemini and gets back a structured
trust score + red flags. This is the actual "AI Logic Engine" from the
Phase 2 plan.
"""

import os
import json
from google import genai
from google.genai import types
from langfuse.decorators import observe

GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_INSTRUCTION = """You are a fraud-detection assistant for a career platform used by students
evaluating job offer letters. You will be given raw extracted text from an offer letter.

Analyze it for signs of a fake, scam, or low-quality offer. Look specifically for:
- Generic or suspicious email domains (not matching a real company domain)
- Unrealistic compensation for the stated role/experience level
- Missing standard legal elements (no company address, no signatory, no clear job title)
- Upfront payment or "training fee" requests (a major scam red flag)
- Poor formatting, inconsistent fonts/structure described in the text, spelling errors
- Vague or missing job responsibilities
- Pressure tactics ("respond within 2 hours" / urgency language)

Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "trust_score": <integer 0-100, where 100 is fully legitimate>,
  "company_name": "<best-guess company name, or 'Unknown' if not findable>",
  "red_flags": ["<short specific red flag>", ...],
  "positive_signals": ["<short specific reason this looks legitimate>", ...],
  "estimated_joining_timeline": "<a short phrase estimating how soon someone would typically join after accepting, based ONLY on what the letter itself states or implies. If the letter gives no clue at all, say 'Not specified in the letter' — never invent a number.>",
  "summary": "<one or two sentence plain-English verdict>"
}

If you find zero red flags, return an empty array for red_flags, not a fabricated one.
Be specific and cite what you actually saw in the text — never invent details not present."""


class GeminiAnalysisError(Exception):
    pass


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiAnalysisError(
            "GEMINI_API_KEY is not set in backend/.env"
        )
    return genai.Client(api_key=api_key, http_options={'timeout': 60.0})


@observe(as_type="generation")
def analyze_offer_letter(extracted_text: str) -> dict:
    """
    Returns a dict: { trust_score, company_name, red_flags, positive_signals, summary }
    Raises GeminiAnalysisError on failure (caller should handle Groq fallback).
    """
    client = _get_client()

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=extracted_text,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        raise GeminiAnalysisError(f"Gemini API call failed: {e}") from e

    raw = (response.text or "").strip()
    # Defensive: strip accidental markdown fences even though we asked for pure JSON
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise GeminiAnalysisError(
            f"Gemini returned non-JSON output: {raw[:200]}"
        ) from e

    # Basic shape validation so a malformed response doesn't silently corrupt the DB
    required_keys = {"trust_score", "company_name", "red_flags", "summary"}
    if not required_keys.issubset(parsed.keys()):
        raise GeminiAnalysisError(
            f"Gemini response missing expected keys: {parsed.keys()}"
        )

    parsed["trust_score"] = max(0, min(100, int(parsed["trust_score"])))
    parsed.setdefault("positive_signals", [])
    parsed.setdefault("estimated_joining_timeline", "Not specified in the letter")

    return parsed
