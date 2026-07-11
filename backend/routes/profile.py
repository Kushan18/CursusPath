import logging
import fitz
import io
import json
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from middleware.auth import get_user_and_scoped_client
from langfuse.decorators import langfuse_context
from services.resume_gemini_service import _call_gemini, GeminiAnalysisError
from services.resume_groq_service import _call_groq, GroqAnalysisError

logger = logging.getLogger("cursuspath.profile")
router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

def _run_ai_generation(sys_prompt: str, user_prompt: str) -> dict:
    try:
        return _call_gemini(sys_prompt, user_prompt)
    except GeminiAnalysisError as e:
        logger.warning(f"Gemini failed: {e}, falling back to Groq")
        try:
            return _call_groq(sys_prompt, user_prompt)
        except GroqAnalysisError as e2:
            raise Exception("Both AI providers failed.") from e2

@router.get("/onboarded")
async def check_onboarded(user_and_client=Depends(get_user_and_scoped_client)):
    current_user, supabase = user_and_client
    try:
        res = supabase.table("client_profiles").select("is_onboarded").eq("id", current_user.id).execute()
        if not res.data:
            return {"is_onboarded": False}
        return {"is_onboarded": res.data[0].get("is_onboarded", False)}
    except Exception as e:
        logger.error(f"Error checking onboarded status: {e}")
        return {"is_onboarded": False}

@router.post("/setup-from-resume")
async def setup_from_resume(
    file: UploadFile = File(...),
    user_and_client=Depends(get_user_and_scoped_client)
):
    current_user, _ = user_and_client
    langfuse_context.update_current_observation(user_id=current_user.id)
    
    file_bytes = await file.read()
    text = ""
    try:
        if file.filename.lower().endswith(".pdf"):
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf_doc:
                text += page.get_text() + "\n"
        else:
            text = file_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error("Failed to parse file text: %s", e)
        raise HTTPException(status_code=400, detail="Could not extract text from file.")

    sys_prompt = (
        "You are an expert resume parser. Extract the user's information from the text "
        "into a structured JSON format that exactly matches the following schema:\n"
        "{\n"
        '  "full_name": "",\n'
        '  "phone": "",\n'
        '  "email": "",\n'
        '  "summary": "",\n'
        '  "college_name": "",\n'
        '  "certifications": [ { "title": "", "issuer": "", "issue_date": "YYYY-MM-DD", "credential_url": "" } ],\n'
        '  "projects": [ { "title": "", "description": "", "github_url": "", "tech_stack": ["", ""] } ]\n'
        "}\n"
        "Return ONLY the valid JSON object without any markdown wrapping or extra text."
    )
    user_prompt = f"RESUME TEXT:\n{text[:20000]}"

    try:
        result = _run_ai_generation(sys_prompt, user_prompt)
        langfuse_context.flush()
        return result
    except Exception as e:
        logger.error(f"AI parsing failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to parse resume with AI.")

class CertInput(BaseModel):
    title: str
    issuer: str
    issue_date: Optional[str] = None
    credential_url: Optional[str] = None

class ProjectInput(BaseModel):
    title: str
    description: str
    github_url: Optional[str] = None
    tech_stack: List[str] = []

class ProfileConfirmInput(BaseModel):
    full_name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    summary: Optional[str] = ""
    photo_url: Optional[str] = ""
    college_name: Optional[str] = ""
    certifications: List[CertInput] = []
    projects: List[ProjectInput] = []

@router.post("/confirm")
async def confirm_profile(data: ProfileConfirmInput, user_and_client=Depends(get_user_and_scoped_client)):
    current_user, supabase = user_and_client
    
    # Check if profile exists
    existing = supabase.table("client_profiles").select("id").eq("id", current_user.id).execute()
    
    profile_data = {
        "full_name": data.full_name,
        "phone": data.phone,
        "email": data.email,
        "summary": data.summary,
        "summary_source": "manual" if not data.summary else "ai_generated",
        "college_name": data.college_name,
        "photo_url": data.photo_url,
        "is_onboarded": True
    }
    
    try:
        if existing.data:
            supabase.table("client_profiles").update(profile_data).eq("id", current_user.id).execute()
        else:
            profile_data["id"] = current_user.id
            supabase.table("client_profiles").insert(profile_data).execute()
            
        # Handle Certs
        supabase.table("user_certifications").delete().eq("user_id", current_user.id).execute()
        if data.certifications:
            certs_data = [
                {
                    "user_id": current_user.id,
                    "title": c.title,
                    "issuer": c.issuer,
                    "issue_date": c.issue_date if c.issue_date else None,
                    "credential_url": c.credential_url
                } for c in data.certifications
            ]
            supabase.table("user_certifications").insert(certs_data).execute()

        # Handle Projects
        supabase.table("user_projects").delete().eq("user_id", current_user.id).execute()
        if data.projects:
            projs_data = [
                {
                    "user_id": current_user.id,
                    "title": p.title,
                    "description": p.description,
                    "github_url": p.github_url,
                    "tech_stack": p.tech_stack
                } for p in data.projects
            ]
            supabase.table("user_projects").insert(projs_data).execute()
            
        return {"success": True}
    except Exception as e:
        logger.error(f"Error saving profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to save profile.")

class GenerateSummaryInput(BaseModel):
    resume_text: str
    projects_text: str

@router.post("/generate-summary")
async def generate_summary(data: GenerateSummaryInput, user_and_client=Depends(get_user_and_scoped_client)):
    current_user, _ = user_and_client
    sys_prompt = (
        "You are an expert profile writer. Write a compelling, professional 3-sentence summary for this user "
        "based on their resume and projects. Respond with ONLY a JSON object: {\"summary\": \"...\"}"
    )
    user_prompt = f"RESUME/PROJECTS TEXT:\n{data.resume_text}\n{data.projects_text}"
    
    try:
        res = _run_ai_generation(sys_prompt, user_prompt)
        return res
    except Exception as e:
        raise HTTPException(status_code=502, detail="AI generation failed.")

@router.get("/full")
async def get_full_profile(user_and_client=Depends(get_user_and_scoped_client)):
    current_user, supabase = user_and_client
    try:
        profile_res = supabase.table("client_profiles").select("*").eq("id", current_user.id).execute()
        certs_res = supabase.table("user_certifications").select("*").eq("user_id", current_user.id).execute()
        projs_res = supabase.table("user_projects").select("*").eq("user_id", current_user.id).execute()
        
        return {
            "profile": profile_res.data[0] if profile_res.data else None,
            "certifications": certs_res.data if certs_res.data else [],
            "projects": projs_res.data if projs_res.data else []
        }
    except Exception as e:
        logger.error(f"Error fetching full profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile.")
