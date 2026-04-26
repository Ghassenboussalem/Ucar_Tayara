from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import AuthUser, get_current_user
from app.schemas.auth import (
    ChangePasswordRequest,
    CreateUserRequest,
    LoginRequest,
    LoginResponse,
    UpdateUserRequest,
    UserProfileResponse,
    RegisterRequest,
)
from app.services.auth_service import (
    authenticate_user,
    change_password,
    create_access_token,
    create_user,
    list_users,
    update_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(
        db=db,
        username=payload.username,
        password=payload.password,
        role=payload.role,
        institution=payload.institution,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        username=user.username, role=user.role, institution=user.institution
    )
    return LoginResponse(
        access_token=access_token,
        user=UserProfileResponse(
            username=user.username,
            role=user.role,
            institution=user.institution,
        ),
    )


@router.post("/register", response_model=UserProfileResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = create_user(
            db,
            username=payload.username,
            password=payload.password,
            role=payload.role,
            institution=payload.institution,
        )
    except ValueError as exc:
        if str(exc) == "user_exists":
            raise HTTPException(status_code=409, detail="Un utilisateur avec ce nom existe déjà") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return UserProfileResponse(
        username=user.username, 
        role=user.role, 
        institution=user.institution
    )


@router.get("/me", response_model=UserProfileResponse)
def me(current_user: AuthUser = Depends(get_current_user)):
    return UserProfileResponse(
        username=current_user.username,
        role=current_user.role,
        institution=current_user.institution,
    )


@router.get("/users", response_model=list[UserProfileResponse])
def users(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    items = list_users(db)
    return [
        UserProfileResponse(username=item.username, role=item.role, institution=item.institution)
        for item in items
    ]


@router.post("/users", response_model=UserProfileResponse)
def users_create(
    payload: CreateUserRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        user = create_user(
            db,
            username=payload.username,
            password=payload.password,
            role=payload.role,
            institution=payload.institution,
        )
    except ValueError as exc:
        if str(exc) == "user_exists":
            raise HTTPException(status_code=409, detail="User already exists") from exc
        raise

    return UserProfileResponse(username=user.username, role=user.role, institution=user.institution)


@router.patch("/users/{username}", response_model=UserProfileResponse)
def users_update(
    username: str,
    payload: UpdateUserRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        user = update_user(
            db,
            username=username,
            role=payload.role,
            institution=payload.institution,
            is_active=payload.is_active,
        )
    except ValueError as exc:
        if str(exc) == "user_not_found":
            raise HTTPException(status_code=404, detail="User not found") from exc
        raise

    return UserProfileResponse(username=user.username, role=user.role, institution=user.institution)


@router.post("/change-password")
def my_change_password(
    payload: ChangePasswordRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        change_password(
            db,
            username=current_user.username,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except ValueError as exc:
        if str(exc) == "invalid_current_password":
            raise HTTPException(status_code=401, detail="Invalid current password") from exc
        raise
    return {"status": "password_updated"}
