"""
Fallback analysis path when Gemini's free-tier quota is hit.
Same prompt contract as gemini_service.py so callers get an identical
JSON shape regardless of which provider actually answered.
"""

import os
import json
from groq import Groq
from langfuse.decorators import observe

GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_INSTRUCTION = """You are a fraud-detection assistant for a career platform used by students
evaluating job offer letters. You will be given raw extracted text from an offer letter.

Analyze it for signs of a fake, scam, or low-quality offer: generic/suspicious email domains,
unrealistic compensation, missing legal elements (address, signatory, job title), upfront
payment/training-fee requests, poor formatting or spelling errors described in the text, vague
responsibilities, and urgency/pressure language.

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


class GroqAnalysisError(Exception):
    pass


@observe(as_type="generation")
def analyze_offer_letter_groq(extracted_text: str) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqAnalysisError("GROQ_API_KEY is not set in backend/.env")

    client = Groq(api_key=api_key, timeout=60.0)

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": extracted_text},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise GroqAnalysisError(f"Groq API call failed: {e}") from e

    raw = (completion.choices[0].message.content or "").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise GroqAnalysisError(f"Groq returned non-JSON output: {raw[:200]}") from e

    required_keys = {"trust_score", "company_name", "red_flags", "summary"}
    if not required_keys.issubset(parsed.keys()):
        raise GroqAnalysisError(f"Groq response missing expected keys: {parsed.keys()}")

    parsed["trust_score"] = max(0, min(100, int(parsed["trust_score"])))
    parsed.setdefault("positive_signals", [])
    parsed.setdefault("estimated_joining_timeline", "Not specified in the letter")

    return parsed
