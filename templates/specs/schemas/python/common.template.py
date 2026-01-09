# specs/schemas/common.py
"""
Common/shared Pydantic schemas used across domains.

These schemas provide reusable patterns for pagination, errors, etc.
"""

from datetime import datetime
from typing import Generic, List, Optional, TypeVar, Any

from pydantic import BaseModel, Field, ConfigDict


# Generic type for paginated responses
T = TypeVar("T")


# =============================================================================
# Pagination
# =============================================================================

class PaginationParams(BaseModel):
    """Query parameters for pagination."""
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        alias="pageSize",
        description="Items per page (max 100)"
    )

    model_config = ConfigDict(populate_by_name=True)

    @property
    def offset(self) -> int:
        """Calculate SQL offset from page number."""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """Alias for page_size for SQL queries."""
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total count of items")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., alias="pageSize", description="Items per page")
    has_more: bool = Field(..., alias="hasMore", description="More pages available")

    model_config = ConfigDict(populate_by_name=True)

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ) -> "PaginatedResponse[T]":
        """Factory method to create paginated response."""
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=(page * page_size) < total
        )


# =============================================================================
# Error Responses
# =============================================================================

class ErrorDetail(BaseModel):
    """Detailed error information."""
    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: str = Field(..., description="Error type/category")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[List[ErrorDetail]] = Field(
        None,
        description="Detailed error information"
    )
    request_id: Optional[str] = Field(
        None,
        alias="requestId",
        description="Request ID for tracing"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Error timestamp"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "error": "ValidationError",
                "message": "Request validation failed",
                "details": [
                    {"field": "email", "message": "Invalid email format", "code": "invalid_format"}
                ],
                "requestId": "req_abc123",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }
    )


# =============================================================================
# Health & Status
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )
    services: Optional[dict[str, str]] = Field(
        None,
        description="Status of dependent services"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": "2024-01-15T10:30:00Z",
                "services": {
                    "database": "healthy",
                    "cache": "healthy"
                }
            }
        }
    )


# =============================================================================
# Success Responses
# =============================================================================

class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = Field(default=True, description="Operation successful")
    message: Optional[str] = Field(None, description="Success message")


class DeleteResponse(BaseModel):
    """Response for delete operations."""
    deleted: bool = Field(..., description="Was resource deleted")
    id: str = Field(..., description="ID of deleted resource")


# =============================================================================
# ID Parameters
# =============================================================================

class IdParam(BaseModel):
    """Path parameter for resource ID."""
    id: str = Field(..., description="Resource UUID")
