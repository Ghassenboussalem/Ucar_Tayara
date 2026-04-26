"""
Security utilities for authentication and authorization.
"""

from functools import wraps
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.services.auth_service import decode_access_token


class AuthUser(BaseModel):
    """Authenticated user information extracted from JWT token."""
    username: str
    role: str
    institution: str | None = None


# HTTP Bearer token scheme
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthUser:
    """
    Extract and validate the current user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials from request header
        
    Returns:
        AuthUser: Authenticated user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Decode the JWT token
        payload = decode_access_token(credentials.credentials)
        
        # Extract user information
        username = payload.get("sub")
        role = payload.get("role")
        institution = payload.get("institution")
        
        if not username or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return AuthUser(
            username=username,
            role=role,
            institution=institution
        )
        
    except ValueError as e:
        if str(e) == "invalid_jwt":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_roles(*allowed_roles: str):
    """
    Decorator factory to require specific roles for endpoint access.
    
    Args:
        *allowed_roles: List of roles that are allowed to access the endpoint
        
    Returns:
        Dependency function that validates user role
        
    Example:
        @router.get("/admin-only")
        def admin_endpoint(user: AuthUser = Depends(require_roles("admin"))):
            pass
    """
    def role_checker(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


def check_institution_access(user: AuthUser, target_institution: str) -> bool:
    """
    Check if a user has access to a specific institution's data.
    
    Args:
        user: Authenticated user
        target_institution: Institution to check access for
        
    Returns:
        bool: True if user has access, False otherwise
    """
    # Admin users have access to all institutions
    if user.role == "admin":
        return True
    
    # Other users can only access their own institution
    return user.institution == target_institution


def require_institution_access(target_institution: str, user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """
    Dependency to require access to a specific institution.
    
    Args:
        target_institution: Institution that must be accessible
        user: Current authenticated user
        
    Returns:
        AuthUser: The authenticated user (if access is allowed)
        
    Raises:
        HTTPException: If user doesn't have access to the institution
    """
    if not check_institution_access(user, target_institution):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to institution: {target_institution}"
        )
    return user