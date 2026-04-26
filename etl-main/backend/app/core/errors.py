"""
Global error handling for the FastAPI application.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


def create_error_response(code: str, message: str, details: dict = None, status_code: int = 500):
    """Create a standardized error response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {}
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with standardized format."""
    return create_error_response(
        code=f"HTTP_{exc.status_code}",
        message=exc.detail,
        details={"path": str(request.url.path)},
        status_code=exc.status_code
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    return create_error_response(
        code="REQUEST_VALIDATION_ERROR",
        message="Request validation failed",
        details={
            "path": str(request.url.path),
            "errors": exc.errors()
        },
        status_code=422
    )


async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors."""
    return create_error_response(
        code="PYDANTIC_VALIDATION_ERROR",
        message="Data validation failed",
        details={
            "path": str(request.url.path),
            "errors": exc.errors()
        },
        status_code=422
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    
    return create_error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An internal server error occurred",
        details={"path": str(request.url.path)},
        status_code=500
    )


def register_exception_handlers(app: FastAPI):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)