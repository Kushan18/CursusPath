from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from middleware.auth import get_current_user
from routes.offers import router as offers_router
from routes.resumes import router as resumes_router
from routes.builder import router as builder_router
from routes.profile import router as profile_router
from routes.opportunities import router as opportunities_router
from services.tracker import start_scheduler
from app.routers.interview_deck import router as interview_router

app = FastAPI(title="CursusPath API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex="https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "CursusPath API is running. Go to /docs for Swagger documentation."}

app.include_router(offers_router)
app.include_router(resumes_router)
app.include_router(builder_router)
app.include_router(profile_router)
app.include_router(opportunities_router)
app.include_router(interview_router)

@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend server is running smoothly"}

@app.get("/api/v1/user/profile")
def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "message": "Secure authentication handshake successful!"
    }
