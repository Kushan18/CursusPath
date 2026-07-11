import uuid
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from middleware.auth import get_user_and_scoped_client
from services.document_extraction import extract_text, ExtractionError
from services.offer_analysis import run_offer_analysis, AllProvidersFailedError

logger = logging.getLogger("cursuspath.offers")

router = APIRouter(prefix="/api/v1/offers", tags=["offers"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
STORAGE_BUCKET = "offer-letters"


@router.post("/verify")
async def verify_offer(
    file: UploadFile = File(...),
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
        analysis = run_offer_analysis(extracted_text)
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

    row = {
        "user_id": current_user.id,
        "company_name": analysis.get("company_name", "Unknown"),
        "file_url": file_url or "upload_failed",
        "trust_score": analysis["trust_score"],
        "red_flags": analysis.get("red_flags", []),
        "summary": analysis.get("summary", ""),
        "positive_signals": analysis.get("positive_signals", []),
        "estimated_joining_timeline": analysis.get(
            "estimated_joining_timeline", "Not specified in the letter"
        ),
    }
    try:
        insert_response = supabase.table("offers").insert(row).execute()
        saved_row = insert_response.data[0] if insert_response.data else row
    except Exception as e:
        logger.error("Supabase DB insert failed: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Analysis succeeded but saving failed: {e}"
        )

    return {
        "id": saved_row.get("id"),
        "trust_score": analysis["trust_score"],
        "company_name": analysis.get("company_name", "Unknown"),
        "red_flags": analysis.get("red_flags", []),
        "positive_signals": analysis.get("positive_signals", []),
        "estimated_joining_timeline": analysis.get(
            "estimated_joining_timeline", "Not specified in the letter"
        ),
        "summary": analysis.get("summary", ""),
        "provider_used": analysis.get("_provider"),
    }


@router.get("/history")
async def get_offer_history(user_and_client=Depends(get_user_and_scoped_client)):
    current_user, supabase = user_and_client
    try:
        response = (
            supabase.table("offers")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("Supabase history fetch failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not fetch history: {e}")


@router.delete("/{offer_id}")
async def delete_offer(
    offer_id: str, user_and_client=Depends(get_user_and_scoped_client)
):
    current_user, supabase = user_and_client
    try:
        existing = (
            supabase.table("offers")
            .select("file_url")
            .eq("id", offer_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Offer not found.")

        file_path = existing.data[0].get("file_url")
        if file_path and file_path != "upload_failed":
            try:
                supabase.storage.from_(STORAGE_BUCKET).remove([file_path])
            except Exception as e:
                logger.warning("Could not remove storage file %s: %s", file_path, e)

        supabase.table("offers").delete().eq("id", offer_id).eq(
            "user_id", current_user.id
        ).execute()

        return {"deleted": True, "id": offer_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase delete failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Could not delete offer: {e}")
