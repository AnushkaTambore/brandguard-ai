import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "BrandGuard AI"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./brandguard.db")
    
    # LLM Configuration (Provider-agnostic)
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_API_BASE: str = os.getenv("AI_API_BASE", "https://api.openai.com/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    AI_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", "15.0"))
    
    # Security & Roles
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brandguard-hackathon-2026-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for demo ease

    # Upload configuration
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list[str] = [".txt", ".pdf", ".docx", ".md"]

settings = Settings()
