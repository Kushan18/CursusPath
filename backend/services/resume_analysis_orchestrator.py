import logging
from langfuse.decorators import observe, langfuse_context
from services.resume_gemini_service import (
    analyze_resume,
    build_resume,
    GeminiAnalysisError,
)
from services.resume_groq_service import (
    analyze_resume_groq,
    build_resume_groq,
    GroqAnalysisError,
)

logger = logging.getLogger("cursuspath.resume_analysis")


class AllProvidersFailedError(Exception):
    pass


@observe()
def run_resume_analysis(resume_text: str, job_description: str = "", user_id: str = None) -> dict:
    if user_id:
        langfuse_context.update_current_observation(user_id=user_id)
    try:
        result = analyze_resume(resume_text, job_description)
        result["_provider"] = "gemini"
        return result
    except GeminiAnalysisError as e:
        logger.warning("Gemini resume analysis failed, falling back to Groq: %s", e)

    try:
        result = analyze_resume_groq(resume_text, job_description)
        result["_provider"] = "groq"
        return result
    except GroqAnalysisError as e:
        logger.error("Groq resume analysis fallback also failed: %s", e)
        raise AllProvidersFailedError(
            "Both Gemini and Groq failed to analyze this resume."
        ) from e


@observe()
def run_resume_build(resume_text: str, company_name: str = "", job_description: str = "", user_id: str = None) -> dict:
    if user_id:
        langfuse_context.update_current_observation(user_id=user_id)
    try:
        result = build_resume(resume_text, company_name, job_description)
        result["_provider"] = "gemini"
        return result
    except GeminiAnalysisError as e:
        logger.warning("Gemini resume build failed, falling back to Groq: %s", e)

    try:
        result = build_resume_groq(resume_text, company_name, job_description)
        result["_provider"] = "groq"
        return result
    except GroqAnalysisError as e:
        logger.error("Groq resume build fallback also failed: %s", e)
        raise AllProvidersFailedError(
            "Both Gemini and Groq failed to build a tailored resume."
        ) from e
