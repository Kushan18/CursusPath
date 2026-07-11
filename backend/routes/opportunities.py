import json
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict
import google.generativeai as genai
from config.supabase_config import supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/opportunities", tags=["opportunities"])

@router.get("/stats/overview")
async def get_opportunity_stats():
    """Returns dynamic counts for each opportunity category from the database."""
    counts = {}
    categories = ['internship', 'certification', 'hackathon', 'job']
    for cat in categories:
        try:
            res = supabase.table("global_opportunities").select("id", count="exact").eq("listing_type", cat).execute()
            counts[cat] = res.count if hasattr(res, 'count') and res.count is not None else len(res.data)
        except Exception:
            counts[cat] = 0
    return counts

# ENDPOINT 1: FAST DATA ROW FETCH (Raw Database Speeds)
@router.get("/{category}", response_model=List[Dict])
async def get_opportunities_by_category(category: str):
    if category not in ['internship', 'certification', 'hackathon', 'job']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category requested")
        
    response = supabase.table("global_opportunities")\
        .select("id, title, provider, compensation_type, deadline_date, apply_url, listing_type, description")\
        .eq("listing_type", category)\
        .order("deadline_date", desc=False)\
        .execute()
        
    return response.data

# ENDPOINT 2: ON-DEMAND AI PREDICTION DRAWER (Lazy Evaluation Core)
@router.get("/analyze/{item_id}")
async def analyze_opportunity(item_id: str):
    record = supabase.table("global_opportunities").select("*").eq("id", item_id).execute()
    if not record.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target opportunity profile not found")
        
    target = record.data[0]
    
    ai_prompt = f"""
    You are an expert AI Career Coach. Analyze this listing and return raw JSON data only.
    Do not wrap the response in markdown blocks or include conversational text.
    
    TITLE: {target['title']}
    PROVIDER: {target['provider']}
    DESCRIPTION: {target['description']}
    TYPE: {target['listing_type']}
    
    Return exactly this JSON format:
    {{
      "historical_cadence": "Sentence predicting how/when this opportunity recurs based on historical patterns.",
      "market_valuation": "Percentage score (e.g., '92%') followed by career impact analysis.",
      "industry_validity": "Verification status detailing the credibility of the issuer.",
      "key_skills_extracted": ["Skill1", "Skill2", "Skill3"]
    }}
    """
    
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(
            ai_prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Clean the response string if wrapped in markdown formatting by accident
        clean_text = response.text.strip().replace("```json", "").replace("```", "")
        ai_metrics = json.loads(clean_text)
    except Exception as e:
        ai_metrics = {
            "historical_cadence": "Prediction metrics temporarily unavailable.",
            "market_valuation": "Analysis delayed due to processing queue.",
            "industry_validity": "Pending manual validation check.",
            "key_skills_extracted": []
        }
        
    return {
        "details": target,
        "ai_analysis": ai_metrics
    }

# ENDPOINT 3: WATCHLIST / INTERESTED
@router.post("/interested/{item_id}")
async def toggle_interested(item_id: str, current_user=Depends(get_current_user)):
    # Check if opportunity exists
    record = supabase.table("global_opportunities").select("id").eq("id", item_id).execute()
    if not record.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
        
    # Check if already tracked
    tracked = supabase.table("user_opportunity_watchlist").select("*").eq("user_id", current_user.id).eq("opportunity_id", item_id).execute()
    
    if tracked.data:
        # Delete if it exists (Toggle OFF)
        supabase.table("user_opportunity_watchlist").delete().eq("user_id", current_user.id).eq("opportunity_id", item_id).execute()
        return {"status": "removed"}
    else:
        # Insert if it doesn't exist (Toggle ON)
        supabase.table("user_opportunity_watchlist").insert({
            "user_id": current_user.id,
            "opportunity_id": item_id,
            "status": "interested"
        }).execute()
        return {"status": "added"}

@router.get("/user/watchlist", response_model=List[Dict])
async def get_watchlist(current_user=Depends(get_current_user)):
    # Fetch watchlist with joined details
    response = supabase.table("user_opportunity_watchlist")\
        .select("*, global_opportunities(*)")\
        .eq("user_id", current_user.id)\
        .execute()
    
    return [item["global_opportunities"] for item in response.data if item.get("global_opportunities")]
