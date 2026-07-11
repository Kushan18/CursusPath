import uuid
import io
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from middleware.auth import get_user_and_scoped_client
from services.document_extraction import extract_text, ExtractionError
from services.resume_analysis_orchestrator import (
    run_resume_analysis,
    run_resume_build,
    AllProvidersFailedError,
)
from services.resume_pdf_generator import generate_resume_pdf
from langfuse.decorators import langfuse_context

logger = logging.getLogger("cursuspath.resumes")

router = APIRouter(prefix="/api/v1/resumes", tags=["resumes"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
STORAGE_BUCKET = "resumes"


@router.post("/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    job_description: str = Form(""),
    user_and_client=Depends(get_user_and_scoped_client),
):
    current_user, supabase = user_and_client
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        extracted_text = extract_text(
            file_bytes, file.content_type or "", file.filename or ""
        )
    except ExtractionError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        analysis = run_resume_analysis(
            resume_text=extracted_text,
            job_description=job_description,
            user_id=current_user.id,
        )
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=502, detail=str(e))

    file_ext = (file.filename or "upload").split(".")[-1]
    storage_path = f"{current_user.id}/{uuid.uuid4()}.{file_ext}"
    file_url = None
    try:
        supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
        file_url = storage_path
    except Exception as e:
        logger.error("Supabase Storage upload failed: %s", e)

    analysis_report = {
        "matched_keywords": analysis.get("matched_keywords", []),
        "missing_keywords": analysis.get("missing_keywords", []),
        "formatting_issues": analysis.get("formatting_issues", []),
        "structure_issues": analysis.get("structure_issues", []),
        "summary": analysis.get("summary", ""),
        "job_description_provided": bool(job_description.strip()),
    }

    row = {
        "user_id": current_user.id,
        "file_url": file_url or "upload_failed",
        "ats_score": analysis["ats_score"],
        "analysis_report": analysis_report,
    }
    try:
        insert_response = supabase.table("resumes").insert(row).execute()
        saved_row = insert_response.data[0] if insert_response.data else row
    except Exception as e:
        logger.error("Supabase resumes insert failed: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Analysis succeeded but saving failed: {e}"
        )

    langfuse_context.flush()

    return {
        "id": saved_row.get("id"),
        "ats_score": analysis["ats_score"],
        **analysis_report,
        "provider_used": analysis.get("_provider"),
    }


@router.get("/history")
async def get_resume_history(user_and_client=Depends(get_user_and_scoped_client)):
    current_user, supabase = user_and_client
    try:
        response = (
            supabase.table("resumes")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("Supabase resume history fetch failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not fetch history: {e}")


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str, user_and_client=Depends(get_user_and_scoped_client)
):
    current_user, supabase = user_and_client
    try:
        existing = (
            supabase.table("resumes")
            .select("file_url")
            .eq("id", resume_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Resume not found.")

        file_path = existing.data[0].get("file_url")
        if file_path and file_path != "upload_failed":
            try:
                supabase.storage.from_(STORAGE_BUCKET).remove([file_path])
            except Exception as e:
                logger.warning("Could not remove storage file %s: %s", file_path, e)

        supabase.table("resumes").delete().eq("id", resume_id).eq(
            "user_id", current_user.id
        ).execute()

        return {"deleted": True, "id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase resume delete failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not delete resume: {e}")


@router.post("/build")
async def build_resume_endpoint(
    file: UploadFile = File(...),
    company_name: str = Form(""),
    job_description: str = Form(""),
    user_and_client=Depends(get_user_and_scoped_client),
):
    """
    Takes an existing resume upload + target company/job description,
    returns a freshly generated, tailored PDF as a direct download.
    Not saved to the database — this is a generation tool, not a history item.
    """
    _current_user, _supabase = user_and_client
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        extracted_text = extract_text(
            file_bytes, file.content_type or "", file.filename or ""
        )
    except ExtractionError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        resume_data = run_resume_build(
            resume_text=extracted_text,
            company_name=company_name,
            job_description=job_description,
            user_id=_current_user.id,
        )
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        pdf_bytes = generate_resume_pdf(resume_data)
    except Exception as e:
        logger.error("PDF generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not generate PDF: {e}")

    safe_name = (resume_data.get("full_name") or "resume").replace(" ", "_")
    filename = f"{safe_name}_tailored.pdf"

    langfuse_context.flush()
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
