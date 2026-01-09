# Python FastAPI Backend Setup

> **Version:** 1.0.0
> **Last Updated:** 2026-01-06
> **Purpose:** Reference patterns for Python/FastAPI backend implementation

---

## Project Structure

```
project-root/
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependency injection
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # Main v1 router
│   │       ├── auth.py         # Auth endpoints
│   │       └── users.py        # User endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings (pydantic-settings)
│   │   ├── security.py         # JWT, password hashing
│   │   └── database.py         # DB session management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py             # SQLAlchemy Base
│   │   └── user.py             # User model
│   └── services/
│       ├── __init__.py
│       └── auth.py             # Auth business logic
├── specs/
│   ├── openapi.yaml
│   ├── database-schema.json
│   └── schemas/
│       ├── __init__.py
│       ├── auth.py
│       ├── user.py
│       └── common.py
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── api/
│       └── test_auth.py
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── Makefile
```

---

## Core Files

### 1. Configuration (`src/core/config.py`)

```python
# src/core/config.py
from functools import lru_cache
from typing import Optional

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "My API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: PostgresDsn

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
```

### 2. Database Setup (`src/core/database.py`)

```python
# src/core/database.py
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.core.config import settings

# Create engine
engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Type alias for dependency injection
DbSession = Annotated[Session, Depends(get_db)]
```

### 3. Security (`src/core/security.py`)

```python
# src/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
```

### 4. SQLAlchemy Base Model (`src/models/base.py`)

```python
# src/models/base.py
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    """Mixin for UUID primary key."""

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
```

### 5. User Model (`src/models/user.py`)

```python
# src/models/user.py
import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.session import Session


class UserRole(enum.Enum):
    """User role enumeration - matches database-schema.json."""
    USER = "USER"
    ADMIN = "ADMIN"


class User(Base, UUIDMixin, TimestampMixin):
    """User model - matches database-schema.json User definition."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.USER,
        nullable=False
    )

    # Relationships
    sessions: Mapped[list["Session"]] = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
```

### 6. Dependencies (`src/api/deps.py`)

```python
# src/api/deps.py
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.security import decode_token
from src.models.user import User

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_current_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require admin role."""
    from src.models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_current_admin)]
DbSession = Annotated[Session, Depends(get_db)]
```

### 7. Auth Endpoints (`src/api/v1/auth.py`)

```python
# src/api/v1/auth.py
from fastapi import APIRouter, HTTPException, status

from specs.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from specs.schemas.user import UserResponse
from src.api.deps import DbSession
from src.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from src.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
)
async def register(user_data: RegisterRequest, db: DbSession) -> User:
    """
    Register a new user account.

    - Validates email uniqueness
    - Hashes password with bcrypt
    - Returns created user (without password)
    """
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login",
)
async def login(credentials: LoginRequest, db: DbSession) -> TokenResponse:
    """
    Authenticate user and return JWT tokens.

    - Validates email/password
    - Returns access token + refresh token
    """
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token({"sub": user.id}),
        refresh_token=create_refresh_token({"sub": user.id}),
        token_type="bearer",
        expires_in=1800,  # 30 minutes
    )
```

### 8. Main Application (`src/main.py`)

```python
# src/main.py
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.router import api_router
from src.core.config import settings
from src.core.database import engine
from src.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    # Startup: Create tables (for development only - use migrations in production)
    # Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: Cleanup if needed


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
```

---

## Alembic Configuration

### `alembic.ini` (key settings)

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = driver://user:pass@localhost/dbname
```

### `alembic/env.py`

```python
# alembic/env.py
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from src.core.config import settings
from src.models.base import Base

# Import all models for autogenerate
from src.models import user  # noqa: F401

config = context.config

# Set database URL from settings
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## Testing Setup

### `tests/conftest.py`

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.database import get_db
from src.main import app
from src.models.base import Base

# Test database (in-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Test client with overridden database."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

### `tests/api/test_auth.py`

```python
# tests/api/test_auth.py
import pytest
from fastapi.testclient import TestClient


class TestRegister:
    """Test user registration endpoint."""

    def test_register_success(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "securepassword123",
                "name": "Test User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "password" not in data
        assert "passwordHash" not in data

    def test_register_duplicate_email(self, client: TestClient):
        # First registration
        client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )
        # Duplicate
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "password456"},
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_weak_password(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "short"},
        )
        assert response.status_code == 422  # Validation error


class TestLogin:
    """Test user login endpoint."""

    def test_login_success(self, client: TestClient):
        # Register first
        client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "securepassword123"},
        )
        # Login
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "securepassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "accessToken" in data
        assert "refreshToken" in data
        assert data["tokenType"] == "bearer"

    def test_login_wrong_password(self, client: TestClient):
        # Register first
        client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "securepassword123"},
        )
        # Wrong password
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
```

---

## Makefile

```makefile
.PHONY: install dev test lint format migrate

# Install dependencies
install:
	pip install -r requirements.txt

# Run development server
dev:
	uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
test:
	pytest -v

# Run tests with coverage
test-cov:
	pytest --cov=src --cov-report=term-missing

# Lint code
lint:
	ruff check src/ tests/
	mypy src/

# Format code
format:
	ruff format src/ tests/
	ruff check --fix src/ tests/

# Database migrations
migrate:
	alembic upgrade head

migrate-new:
	alembic revision --autogenerate -m "$(msg)"

# Validate specs
validate-specs:
	swagger-cli validate specs/openapi.yaml
	python -c "from src.models import *; print('SQLAlchemy models OK')"
	python -c "from specs.schemas import *; print('Pydantic schemas OK')"

# Full verification (matches backend-dev.md self-healing)
verify:
	ruff check src/ && mypy src/ && pytest && alembic check
```

---

## `pyproject.toml`

```toml
[project]
name = "my-api"
version = "1.0.0"
requires-python = ">=3.11"

[tool.ruff]
target-version = "py311"
line-length = 100
select = ["E", "F", "I", "UP", "B", "SIM"]
ignore = ["E501"]

[tool.ruff.isort]
known-first-party = ["src", "specs"]

[tool.mypy]
python_version = "3.11"
strict = true
plugins = ["pydantic.mypy"]

[[tool.mypy.overrides]]
module = ["passlib.*", "jose.*"]
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
addopts = "-v --tb=short"
```

---

## `requirements.txt`

```
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# Database
sqlalchemy>=2.0.0
alembic>=1.13.0
psycopg2-binary>=2.9.0  # or asyncpg for async

# Auth
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Dev/Test
pytest>=7.4.0
pytest-cov>=4.1.0
httpx>=0.26.0  # For TestClient
ruff>=0.1.0
mypy>=1.8.0
```

---

## Environment Variables (`.env.example`)

```bash
# App
APP_NAME="My API"
APP_VERSION="1.0.0"
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Key Differences from Node.js

| Aspect | Node.js (Express) | Python (FastAPI) |
|--------|-------------------|------------------|
| Dependency Injection | Middleware/manual | Built-in `Depends()` |
| Validation | Zod schemas | Pydantic models |
| ORM | Prisma | SQLAlchemy |
| Migrations | `prisma migrate` | Alembic |
| Type Safety | TypeScript | Type hints + mypy |
| Testing | Vitest/Jest | pytest |
| Linting | ESLint + Prettier | Ruff |
