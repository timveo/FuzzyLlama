# specs/schemas/__init__.py
"""
Pydantic validation schemas for [PROJECT_NAME].

These schemas define the contract for API request/response validation.
Import these in your FastAPI routes - do NOT recreate validation logic.

Usage:
    from specs.schemas.user import CreateUserSchema, UserResponse
    from specs.schemas.auth import LoginRequest, TokenResponse
"""

from .user import (
    CreateUserSchema,
    UpdateUserSchema,
    UserResponse,
    UserListResponse,
)
from .auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshTokenRequest,
)
from .common import (
    PaginationParams,
    PaginatedResponse,
    ErrorResponse,
    HealthResponse,
)

__all__ = [
    # User schemas
    "CreateUserSchema",
    "UpdateUserSchema",
    "UserResponse",
    "UserListResponse",
    # Auth schemas
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    # Common schemas
    "PaginationParams",
    "PaginatedResponse",
    "ErrorResponse",
    "HealthResponse",
]
