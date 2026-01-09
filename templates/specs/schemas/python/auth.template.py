# specs/schemas/auth.py
"""
Authentication domain Pydantic schemas.

These schemas define the contract for auth-related API endpoints.
DO NOT modify without updating the source of truth.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# =============================================================================
# Request Schemas
# =============================================================================

class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 characters)"
    )
    name: Optional[str] = Field(None, max_length=100, description="Display name")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "newuser@example.com",
                "password": "securepassword123",
                "name": "New User"
            }
        }
    )


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }
    )


class RefreshTokenRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str = Field(..., alias="refreshToken", description="Refresh token")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
    )


class ChangePasswordRequest(BaseModel):
    """Password change request."""
    current_password: str = Field(
        ...,
        alias="currentPassword",
        description="Current password"
    )
    new_password: str = Field(
        ...,
        alias="newPassword",
        min_length=8,
        max_length=128,
        description="New password (min 8 characters)"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "currentPassword": "oldpassword123",
                "newPassword": "newsecurepassword456"
            }
        }
    )


# =============================================================================
# Response Schemas
# =============================================================================

class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str = Field(..., alias="accessToken", description="JWT access token")
    refresh_token: str = Field(..., alias="refreshToken", description="Refresh token")
    token_type: str = Field(default="bearer", alias="tokenType", description="Token type")
    expires_in: int = Field(..., alias="expiresIn", description="Token expiry in seconds")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "tokenType": "bearer",
                "expiresIn": 3600
            }
        }
    )


class AuthStatusResponse(BaseModel):
    """Authentication status response."""
    authenticated: bool = Field(..., description="Is user authenticated")
    user_id: Optional[str] = Field(None, alias="userId", description="User ID if authenticated")
    expires_at: Optional[datetime] = Field(
        None,
        alias="expiresAt",
        description="Token expiration time"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "authenticated": True,
                "userId": "550e8400-e29b-41d4-a716-446655440000",
                "expiresAt": "2024-01-15T11:30:00Z"
            }
        }
    )
