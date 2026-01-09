# specs/schemas/user.py
"""
User domain Pydantic schemas.

These schemas match the database-schema.json contract.
DO NOT modify without updating the source of truth.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRole(str, Enum):
    """User role enumeration - must match database-schema.json UserRole"""
    USER = "USER"
    ADMIN = "ADMIN"


# =============================================================================
# Request Schemas (what clients send)
# =============================================================================

class CreateUserSchema(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 characters)"
    )
    name: Optional[str] = Field(
        None,
        max_length=100,
        description="Display name"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "name": "John Doe"
            }
        }
    )


class UpdateUserSchema(BaseModel):
    """Schema for updating user profile (partial update)."""
    email: Optional[EmailStr] = Field(None, description="New email address")
    name: Optional[str] = Field(None, max_length=100, description="New display name")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Jane Doe"
            }
        }
    )


# =============================================================================
# Response Schemas (what API returns)
# =============================================================================

class UserResponse(BaseModel):
    """User response schema - excludes sensitive fields like password_hash."""
    id: str = Field(..., description="User UUID")
    email: EmailStr = Field(..., description="User email")
    name: Optional[str] = Field(None, description="Display name")
    role: UserRole = Field(..., description="User role")
    created_at: datetime = Field(..., alias="createdAt", description="Account creation time")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update time")

    model_config = ConfigDict(
        from_attributes=True,  # Enables ORM mode (SQLAlchemy model -> Pydantic)
        populate_by_name=True,  # Allow both snake_case and camelCase
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "USER",
                "createdAt": "2024-01-15T10:30:00Z",
                "updatedAt": "2024-01-15T10:30:00Z"
            }
        }
    )


class UserListResponse(BaseModel):
    """Paginated list of users."""
    items: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., alias="pageSize", description="Items per page")
    has_more: bool = Field(..., alias="hasMore", description="More pages available")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "pageSize": 20,
                "hasMore": True
            }
        }
    )
