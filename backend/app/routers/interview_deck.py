from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from app.services.campus_engine import get_dynamic_college_intel, get_dynamic_company_questions
from app.services.interview_prep import InterviewSessionState, process_interview_turn

router = APIRouter(prefix="/api/v1")

# Persistent mock session store (in production this points directly to Supabase)
session_db: Dict[str, InterviewSessionState] = {}

class TurnRequest(BaseModel):
    session_id: str
    target_role: str
    resume_text: str
    current_turn: int
    user_answer: str

@router.post("/interview/next-turn")
async def next_turn(req: TurnRequest):
    # Stateful persistence logic
    if req.session_id in session_db:
        session = session_db[req.session_id]
        if req.current_turn > session.current_turn:
            session.current_turn = req.current_turn
    else:
        session = InterviewSessionState(
            session_id=req.session_id,
            target_role=req.target_role,
            resume_text=req.resume_text,
            current_turn=req.current_turn,
            chat_history=[]
        )
    
    result = await process_interview_turn(session, req.user_answer)
    
    # Cache session to memory (Simulating Supabase update)
    session_db[req.session_id] = session
    
    return result

@router.get("/interview/resume-session")
async def resume_session(session_id: str):
    """Allow users to recover gracefully from browser refreshes or dropped connections."""
    if session_id in session_db:
        session = session_db[session_id]
        return {
            "status": "found", 
            "session": {
                "session_id": session.session_id,
                "current_turn": session.current_turn,
                "target_role": session.target_role,
                "resume_text": session.resume_text
            }
        }
    return {"status": "not_found"}

@router.get("/placement/questions/{company_name}/{round_type}")
async def get_questions(company_name: str, round_type: str):
    """Dynamically generates aptitude and technical questions mimicking IndiaBix using LLM."""
    questions = await get_dynamic_company_questions(company_name, round_type)
    if not questions:
        return {"questions": []}
    return {"questions": questions}

@router.get("/placement/college-intel")
async def get_college_intel(college_name: Optional[str] = None):
    """Uses LLM models to dynamically evaluate top company metrics and hierarchies."""
    if not college_name:
        return {"status": "missing_profile", "message": "College name required to load analytics."}
    
    data = await get_dynamic_college_intel(college_name)
    data["status"] = "success"
    return data
