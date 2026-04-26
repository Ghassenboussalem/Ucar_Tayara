from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from routes.api import router
from routes.ingest import router as ingest_router, scan_all_institutions
from database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    with SessionLocal() as db:
        # Resync PK sequence in case seeded data used explicit IDs
        db.execute(text(
            "SELECT setval('alerts_id_seq', COALESCE((SELECT MAX(id) FROM alerts), 1))"
        ))
        db.commit()
        # Sync alert state with current KPI data
        stats = scan_all_institutions(db)
        print(
            f"[Alert Engine] Startup scan: {stats['institutions']} institutions, "
            f"{stats['created']} alerts created, {stats['resolved']} auto-resolved."
        )
    yield


app = FastAPI(
    title="UCAR Intelligence Platform",
    description="Plateforme intelligente de gestion universitaire — Université de Carthage",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(ingest_router, prefix="/api", tags=["ETL Import"])


@app.get("/")
def root():
    return {
        "platform": "UCAR Intelligence",
        "status": "operational",
        "version": "1.0.0",
        "endpoints": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "ok"}