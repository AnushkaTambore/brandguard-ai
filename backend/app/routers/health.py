from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_connected": db_ok,
        "ai_configured": bool(settings.AI_API_KEY.strip()),
        "ai_model": settings.AI_MODEL if settings.AI_API_KEY.strip() else "Deterministic Engine (Rule-based Fallback)"
    }
