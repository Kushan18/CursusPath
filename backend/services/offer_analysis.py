"""
Single entry point the route calls. Tries Gemini first (primary, per plan);
falls back to Groq automatically if Gemini fails for any reason
(quota hit, transient error, etc). Caller doesn't need to know which
provider actually answered.
"""

import logging
from langfuse.decorators import observe, langfuse_context
from services.gemini_service import analyze_offer_letter, GeminiAnalysisError
from services.groq_service import analyze_offer_letter_groq, GroqAnalysisError

logger = logging.getLogger("cursuspath.offer_analysis")


class AllProvidersFailedError(Exception):
    pass


@observe()
def run_offer_analysis(extracted_text: str, user_id: str) -> dict:
    """
    Returns the analysis dict plus which provider produced it, e.g.:
    { trust_score, company_name, red_flags, positive_signals, summary, _provider }
    """
    langfuse_context.update_current_observation(user_id=user_id)
    try:
        result = analyze_offer_letter(extracted_text)
        result["_provider"] = "gemini"
        return result
    except GeminiAnalysisError as gemini_error:
        logger.warning("Gemini analysis failed, falling back to Groq: %s", gemini_error)
        langfuse_context.update_current_observation(tags=["fallback_triggered"])

    try:
        result = analyze_offer_letter_groq(extracted_text)
        result["_provider"] = "groq"
        return result
    except GroqAnalysisError as groq_error:
        logger.error("Groq fallback also failed: %s", groq_error)
        raise AllProvidersFailedError(
            "Both Gemini and Groq failed to analyze this offer letter. "
            "Check API keys and quotas."
        ) from groq_error
