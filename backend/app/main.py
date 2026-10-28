import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import engine, Base, get_db, SessionLocal
from app.seed_data import seed_demo_database

from app.routers import (
    health, auth, brand_kit, content, findings, workflow, comments, analytics, audit
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist and seed demo database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Explainable, human-controlled brand governance platform for Team Dashing Cars.",
    lifespan=lifespan
)

# Enable CORS for development and cross-origin deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(brand_kit.router)
app.include_router(content.router)
app.include_router(findings.router)
app.include_router(workflow.router)
app.include_router(comments.router)
app.include_router(analytics.router)
app.include_router(audit.router)

@app.post("/api/demo/seed")
def trigger_demo_seed(db: Session = Depends(get_db)):
    """Reload or populate demo data explicitly."""
    result = seed_demo_database(db)
    return result

# Serve Frontend static assets if built
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    assets_dir = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Do not intercept API, docs, or OpenAPI routes
        clean_path = full_path.lstrip("/")
        if clean_path.startswith("api") or clean_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail=f"Endpoint '/{clean_path}' not found")

        # Serve static file if it exists in dist (e.g. favicon.svg, icons.svg)
        if clean_path:
            file_path = os.path.join(frontend_dist_path, clean_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)

        # Fallback to index.html for client-side routing
        index_file = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"service": settings.PROJECT_NAME, "status": "online"}
else:
    @app.get("/")
    def root():
        return {
            "service": settings.PROJECT_NAME,
            "status": "online",
            "docs_url": "/docs",
            "health_url": "/api/health"
        }
