import os
from dataclasses import dataclass
from pathlib import Path


def _backend_root() -> Path:
    # backend/app/core/config.py -> backend
    return Path(__file__).resolve().parents[2]


def _default_db_url() -> str:
    return f"sqlite:///{(_backend_root() / 'ucar_etl.db').as_posix()}"


def _default_uploads_dir() -> str:
    return str((_backend_root() / "uploads").as_posix())


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "UCAR ETL Platform")
    app_version: str = os.getenv("APP_VERSION", "0.2.0")
    db_url: str = os.getenv("DB_URL", _default_db_url())
    uploads_dir: str = os.getenv("UPLOADS_DIR", _default_uploads_dir())
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change_me_in_production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    queue_backend: str = os.getenv("QUEUE_BACKEND", "background")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_queue_name: str = os.getenv("REDIS_QUEUE_NAME", "ingestion")
    # Platform bridge — push computed KPIs to hack4ucar-backend after storing
    main_platform_url: str = os.getenv("MAIN_PLATFORM_URL", "http://localhost:8000")
    etl_api_key: str = os.getenv("ETL_API_KEY", "")
    push_to_platform: bool = os.getenv("PUSH_TO_PLATFORM", "false").lower() == "true"


settings = Settings()
