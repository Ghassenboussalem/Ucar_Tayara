from pathlib import Path
import sys

# Allow direct execution: `python main.py` from `backend/app`.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Load environment variables from .env file
try:
    from load_env import load_env_file
    load_env_file()
except ImportError:
    # Fallback: try to load with python-dotenv if available
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("⚠️  No environment loader found. Consider installing python-dotenv or using load_env.py")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes_auth import router as auth_router
from app.api.routes_email import router as email_router
from app.api.routes_ingestion import router as ingestion_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.errors import register_exception_handlers
from app.services.auth_service import ensure_default_users

Base.metadata.create_all(bind=engine)
with SessionLocal() as seed_db:
    ensure_default_users(seed_db)

web_dir = Path(__file__).resolve().parent / "web"

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="UCAR Data Hub - Plateforme intelligente de gestion des données universitaires",
)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ingestion_router)
app.include_router(email_router)
if web_dir.exists():
    app.mount("/ui", StaticFiles(directory=str(web_dir), html=True), name="ui")


@app.on_event("startup")
async def startup_email_listener():
    import asyncio
    from app.services.email_service import email_polling_loop
    asyncio.create_task(email_polling_loop())


@app.get("/health")
def healthcheck():
    return {"status": "ok", "version": settings.app_version}


@app.get("/")
def root():
    index_path = web_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "UCAR Data Hub API is running. Visit /docs for API documentation."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
