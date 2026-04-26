from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.models import UserAccount

# Use pbkdf2_sha256 to avoid bcrypt backend incompatibilities on some Windows envs.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


DEFAULT_USERS = [
    {"username": "admin1", "password": "admin123", "role": "admin", "institution": "UCAR"},
    {"username": "dean_isi", "password": "dean123", "role": "dean", "institution": "ISITCOM"},
    {"username": "prof_math", "password": "prof123", "role": "professor", "institution": "ISITCOM"},
    {"username": "data_mgr", "password": "data123", "role": "data_officer", "institution": "UCAR"},
    {"username": "auditor1", "password": "audit123", "role": "auditor", "institution": "UCAR"},
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        return False


def ensure_default_users(db: Session):
    for item in DEFAULT_USERS:
        exists = db.query(UserAccount).filter(UserAccount.username == item["username"]).first()
        if exists:
            continue
        db.add(
            UserAccount(
                username=item["username"],
                password_hash=hash_password(item["password"]),
                role=item["role"],
                institution=item["institution"],
                is_active=True,
            )
        )
    db.commit()


def authenticate_user(
    db: Session, username: str, password: str, role: str | None = None, institution: str | None = None
) -> UserAccount | None:
    user = db.query(UserAccount).filter(UserAccount.username == username).first()
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if role and user.role != role.lower():
        return None
    if institution and (user.institution or "").lower() != institution.lower():
        return None
    return user


def create_access_token(*, username: str, role: str, institution: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode = {
        "sub": username,
        "role": role,
        "institution": institution,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("invalid_jwt") from exc


def list_users(db: Session) -> list[UserAccount]:
    return db.query(UserAccount).order_by(UserAccount.username.asc()).all()


def create_user(
    db: Session, *, username: str, password: str, role: str, institution: str | None
) -> UserAccount:
    exists = db.query(UserAccount).filter(UserAccount.username == username).first()
    if exists:
        raise ValueError("user_exists")
    user = UserAccount(
        username=username,
        password_hash=hash_password(password),
        role=role.lower(),
        institution=institution,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, *, username: str, current_password: str, new_password: str):
    user = db.query(UserAccount).filter(UserAccount.username == username).first()
    if not user:
        raise ValueError("user_not_found")
    if not verify_password(current_password, user.password_hash):
        raise ValueError("invalid_current_password")
    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()


def update_user(
    db: Session,
    *,
    username: str,
    role: str | None = None,
    institution: str | None = None,
    is_active: bool | None = None,
) -> UserAccount:
    user = db.query(UserAccount).filter(UserAccount.username == username).first()
    if not user:
        raise ValueError("user_not_found")

    if role is not None:
        user.role = role.lower()
    if institution is not None:
        user.institution = institution
    if is_active is not None:
        user.is_active = is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
