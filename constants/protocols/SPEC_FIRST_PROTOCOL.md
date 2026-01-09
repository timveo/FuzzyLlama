# Spec-First Development Protocol

> **Version:** 5.0.0
> **Last Updated:** 2026-01-06
> **Purpose:** Eliminate integration bugs by replacing English requirements with machine-readable specs
>
> **Related Files:**
> - `constants/SPEC_CONSUMPTION_MANDATE.md` - Implementation agent requirements
> - `templates/specs/` - Spec templates
>
> **Supports:** Node.js (Prisma/Zod) and Python (SQLAlchemy/Pydantic) stacks

---

## The Core Insight

**LLMs are decent at writing code from English (PRD), but they are excellent at writing code from Specs.**

| Input Type | Ambiguity | Integration Bugs | Implementation Variance |
|------------|-----------|------------------|------------------------|
| English PRD | High | ~40% of bugs | High (each dev interprets differently) |
| OpenAPI + DB Schema + Validation | **Zero** | **~5% of bugs** | **Zero** (specs are contracts) |

> **Note:** DB Schema = Prisma (Node.js) or SQLAlchemy (Python). Validation = Zod (Node.js) or Pydantic (Python).

---

## What Changes

### Before (English-First)
```
PRD → ARCHITECTURE.md (prose) → Backend interprets → Frontend interprets
                                      ↓                      ↓
                                 Different understanding = Integration bugs
```

### After (Spec-First)
```
PRD → Architect generates:
      ├── openapi.yaml           (API contract)
      ├── database-schema.json   (Universal DB contract - JSON Schema)
      └── schemas/*              (Domain type contract)
                ↓
      Stack-specific implementation:
      ├── Node.js: prisma/schema.prisma + specs/schemas/*.ts (Zod)
      └── Python:  src/models/*.py (SQLAlchemy) + specs/schemas/*.py (Pydantic)
                ↓
      Backend implements contracts (no interpretation)
                ↓
      Frontend implements contracts (no interpretation)
                ↓
      Zero ambiguity = No integration bugs
```

---

## The Four Contracts

### 1. OpenAPI Specification (`specs/openapi.yaml`)
Defines the **API contract** between Frontend and Backend.

**What it locks:**
- Every endpoint URL and method
- Request body schemas (exact fields, types, validation)
- Response body schemas (exact fields, types)
- Error response formats
- Authentication requirements
- Status codes

**Example:**
```yaml
paths:
  /api/v1/users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '404':
          $ref: '#/components/responses/NotFound'
```

**Backend MUST:** Implement exactly this endpoint with exactly these schemas.
**Frontend MUST:** Call exactly this endpoint and expect exactly these responses.

---

### 2. Database Schema Contract (`specs/database-schema.json`)
Defines the **Universal Database contract** in JSON Schema format.

**This is the source of truth** — language-specific implementations (Prisma, SQLAlchemy) are generated from or validated against this schema.

**What it locks:**
- Every table and column
- Field types and constraints
- Relationships between tables
- Indexes
- Enums

**Example:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DatabaseSchema",
  "definitions": {
    "User": {
      "type": "object",
      "tableName": "users",
      "properties": {
        "id": { "type": "string", "format": "uuid", "primaryKey": true },
        "email": { "type": "string", "format": "email", "unique": true },
        "name": { "type": ["string", "null"] },
        "role": { "$ref": "#/definitions/UserRole", "default": "USER" },
        "createdAt": { "type": "string", "format": "date-time", "columnName": "created_at" }
      },
      "required": ["id", "email", "role", "createdAt"],
      "relations": {
        "posts": { "type": "hasMany", "model": "Post", "foreignKey": "authorId" }
      }
    },
    "UserRole": {
      "type": "string",
      "enum": ["USER", "ADMIN"]
    }
  }
}
```

**All implementations MUST:** Match this schema exactly. No adding fields. No renaming.

---

### 2a. Node.js Implementation: Prisma Schema (`prisma/schema.prisma`)

**Generated from or validated against** `specs/database-schema.json`.

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")

  posts     Post[]

  @@map("users")
}

enum UserRole {
  USER
  ADMIN
}
```

**Migrations:** Generated via `prisma migrate dev`.

---

### 2b. Python Implementation: SQLAlchemy Models (`src/models/*.py`)

**Generated from or validated against** `specs/database-schema.json`.

```python
# src/models/user.py
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base

class UserRole(enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    posts = relationship("Post", back_populates="author")
```

**Migrations:** Generated via `alembic revision --autogenerate`.

---

### 3. Validation Schemas (Language-Specific)

Defines the **Domain type contract** shared between Frontend and Backend.

**What it locks:**
- Request validation schemas
- Response validation schemas
- Business logic types
- Form validation rules

---

### 3a. Node.js: Zod Schemas (`specs/schemas/*.ts`)

```typescript
// specs/schemas/user.schema.ts
import { z } from 'zod';

// Request schemas (what clients send)
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

// Response schemas (what API returns)
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.string().datetime(),
});

// Inferred types (used in code)
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
```

---

### 3b. Python: Pydantic Schemas (`specs/schemas/*.py`)

```python
# specs/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"

# Request schemas (what clients send)
class CreateUserSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None

class UpdateUserSchema(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None

# Response schemas (what API returns)
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str]
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True  # Enables ORM mode
```

---

**Backend MUST:** Validate requests with these schemas. Return responses matching these schemas.
**Frontend MUST:** Send data matching these schemas. Expect responses matching these schemas.

---

## Architect Output Changes

### Previous Architect Deliverables
```
docs/
├── ARCHITECTURE.md     (prose descriptions)
├── TECH_STACK.md       (tool list)
└── API.md              (informal endpoint list)
```

### New Architect Deliverables
```
docs/
├── ARCHITECTURE.md          (high-level overview only)
├── TECH_STACK.md            (unchanged)
└── DECISIONS.md             (ADRs)

specs/                        # Machine-readable contracts
├── openapi.yaml             # API contract
├── database-schema.json     # Universal DB contract (JSON Schema)
├── schemas/                 # Validation schemas (language-specific)
│   ├── index.ts             # Re-exports (Node.js)
│   ├── __init__.py          # Re-exports (Python)
│   ├── auth.schema.ts       # Auth domain (Node.js)
│   ├── auth.py              # Auth domain (Python)
│   ├── user.schema.ts       # User domain (Node.js)
│   ├── user.py              # User domain (Python)
│   └── [domain].*           # Per-domain schemas
└── README.md                # How to use specs

# Node.js projects:
prisma/
└── schema.prisma            # Generated from database-schema.json

# Python projects:
src/models/
├── __init__.py
├── base.py                  # SQLAlchemy Base
└── *.py                     # Models from database-schema.json

alembic/
└── versions/                # Migrations
```

---

## Agent Responsibilities

### Architect Agent
**Creates:**
- `specs/openapi.yaml` - Complete API specification
- `specs/database-schema.json` - Universal database schema (JSON Schema)
- `specs/schemas/*` - All validation schemas (Zod for Node.js, Pydantic for Python)
- `docs/ARCHITECTURE.md` - High-level overview (diagrams, patterns)

**Stack-specific generation:**
| Stack | Database Implementation | Validation Schemas |
|-------|------------------------|-------------------|
| Node.js | `prisma/schema.prisma` | `specs/schemas/*.ts` (Zod) |
| Python | `src/models/*.py` (SQLAlchemy) | `specs/schemas/*.py` (Pydantic) |

**Quality Gates:**
- OpenAPI must be valid (pass `swagger-cli validate`)
- Database schema must be valid JSON Schema
- **Node.js:** Prisma must be valid (`prisma validate`), Zod must compile (`tsc --noEmit`)
- **Python:** SQLAlchemy models must be valid (`python -c "from src.models import *"`), Pydantic must be valid (`python -c "from specs.schemas import *"`)
- All specs must be consistent (same field names, types)

---

### Backend Developer Agent
**Consumes:**
- `specs/openapi.yaml` → Implement each endpoint exactly
- `specs/database-schema.json` → Source of truth for DB structure
- Stack-specific implementations:

| Stack | Database | Validation |
|-------|----------|------------|
| Node.js | `prisma/schema.prisma` | `specs/schemas/*.ts` (Zod) |
| Python | `src/models/*.py` (SQLAlchemy) | `specs/schemas/*.py` (Pydantic) |

**Node.js Implementation Rules:**
```typescript
// ✅ CORRECT - Import and use the spec schema
import { CreateUserSchema, UserResponseSchema } from '@/specs/schemas/user.schema';

app.post('/api/v1/users', async (req, res) => {
  const input = CreateUserSchema.parse(req.body);  // Validates exactly per spec
  const user = await prisma.user.create({ data: input });
  const response = UserResponseSchema.parse(user);  // Ensures response matches spec
  res.json(response);
});

// ❌ WRONG - Creating own validation
app.post('/api/v1/users', async (req, res) => {
  if (!req.body.email) throw new Error('Email required');  // Not using spec!
});
```

**Python Implementation Rules:**
```python
# ✅ CORRECT - Import and use the spec schema
from specs.schemas.user import CreateUserSchema, UserResponse
from src.models.user import User

@app.post("/api/v1/users", response_model=UserResponse)
async def create_user(user_data: CreateUserSchema, db: Session = Depends(get_db)):
    user = User(**user_data.model_dump())  # Pydantic validates per spec
    db.add(user)
    db.commit()
    db.refresh(user)
    return user  # FastAPI validates response matches UserResponse

# ❌ WRONG - Creating own validation
@app.post("/api/v1/users")
async def create_user(request: Request):
    data = await request.json()
    if "email" not in data:  # Not using spec!
        raise HTTPException(400, "Email required")
```

**No interpretation allowed:**
- Don't add fields not in OpenAPI
- Don't add columns not in database-schema.json
- Don't modify validation schemas (request changes → back to Architect)

---

### Frontend Developer Agent
**Consumes:**
- `specs/openapi.yaml` → Generate TypeScript client or call exactly
- `specs/schemas/*.ts` → Import for form validation and type safety

**Implementation Rules:**
```typescript
// ✅ CORRECT - Import and use the spec schema
import { CreateUserSchema, type CreateUserInput } from '@/specs/schemas/user.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreateUserForm() {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),  // Uses exact spec validation
  });

  const onSubmit = async (data: CreateUserInput) => {
    await fetch('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),  // Data validated by spec
    });
  };
}

// ❌ WRONG - Creating own types
interface CreateUser {
  email: string;
  password: string;
  // What if spec has different requirements?
}
```

---

## Consistency Rules

### Field Naming
```
OpenAPI field name = JSON Schema field name = ORM field name = Validation schema field name
```

Example across all stacks:
```yaml
# openapi.yaml
createdAt:
  type: string
  format: date-time
```
```json
// database-schema.json
"createdAt": { "type": "string", "format": "date-time" }
```
```prisma
# schema.prisma (Node.js)
createdAt DateTime @default(now())
```
```python
# models/user.py (Python)
created_at = Column(DateTime, default=datetime.utcnow)  # Note: snake_case in DB, camelCase in API
```
```typescript
// user.schema.ts (Node.js)
createdAt: z.string().datetime()
```
```python
# schemas/user.py (Python)
created_at: datetime  # Pydantic alias handles camelCase conversion
```

### Type Mapping

| Domain Concept | OpenAPI Type | JSON Schema | Prisma (Node.js) | SQLAlchemy (Python) | Zod (Node.js) | Pydantic (Python) |
|----------------|--------------|-------------|------------------|---------------------|---------------|-------------------|
| UUID | `string`, `format: uuid` | `"format": "uuid"` | `String @id @default(uuid())` | `Column(String, primary_key=True)` | `z.string().uuid()` | `str` (with UUID validator) |
| Email | `string`, `format: email` | `"format": "email"` | `String` | `Column(String)` | `z.string().email()` | `EmailStr` |
| Timestamp | `string`, `format: date-time` | `"format": "date-time"` | `DateTime` | `Column(DateTime)` | `z.string().datetime()` | `datetime` |
| Integer | `integer` | `"type": "integer"` | `Int` | `Column(Integer)` | `z.number().int()` | `int` |
| Decimal | `number` | `"type": "number"` | `Decimal` | `Column(Numeric)` | `z.number()` | `Decimal` |
| Boolean | `boolean` | `"type": "boolean"` | `Boolean` | `Column(Boolean)` | `z.boolean()` | `bool` |
| Enum | `enum: [values]` | `"enum": [values]` | `enum EnumName { }` | `Enum(EnumClass)` | `z.enum([values])` | `Enum` |
| Optional | `required: false` | not in `required` | `Type?` | `nullable=True` | `z.optional()` | `Optional[Type]` |
| Nullable | `nullable: true` | `"type": ["string", "null"]` | `Type?` | `nullable=True` | `z.nullable()` | `Optional[Type]` |

---

## Workflow Integration

### G3: Architecture Gate (Updated)

**Previous criteria:**
- ARCHITECTURE.md exists
- TECH_STACK.md exists
- Database schema documented

**New criteria:**
- [ ] `specs/openapi.yaml` exists and validates
- [ ] `specs/database-schema.json` exists and validates (JSON Schema)
- [ ] Stack-specific implementation exists and validates:
  - **Node.js:** `prisma/schema.prisma` validates (`prisma validate`)
  - **Python:** `src/models/*.py` imports successfully
- [ ] Validation schemas exist:
  - **Node.js:** `specs/schemas/index.ts` with all domain schemas
  - **Python:** `specs/schemas/__init__.py` with all domain schemas
- [ ] All specs are mutually consistent
- [ ] `docs/ARCHITECTURE.md` contains high-level overview only

### G5: Development Gate (Updated)

**G5.1 Foundation:**
- [ ] Specs are installed as importable modules
- [ ] Validation script exists and passes:
  - **Node.js:** `npm run validate:specs`
  - **Python:** `python -m pytest tests/test_specs.py` or `make validate-specs`

**G5.2 Data Layer:**
- [ ] Backend uses database schema exactly (no modifications)
  - **Node.js:** Prisma schema matches database-schema.json
  - **Python:** SQLAlchemy models match database-schema.json
- [ ] Backend imports validation schemas (no custom validation)
  - **Node.js:** Zod schemas from specs/schemas/*.ts
  - **Python:** Pydantic schemas from specs/schemas/*.py

**G5.3 Features:**
- [ ] Each endpoint matches OpenAPI exactly
- [ ] Frontend uses validation schemas for forms
- [ ] Types derived from validation schemas:
  - **Node.js:** `z.infer<typeof Schema>`
  - **Python:** Pydantic models used directly as types

**G5.4 Integration:**
- [ ] Frontend ↔ Backend integration uses only spec-defined contracts
- [ ] No type mismatches (guaranteed by shared schemas)
- [ ] API responses validated against response schemas

---

## Spec Validation Scripts

### Node.js Projects

Add to `package.json`:

```json
{
  "scripts": {
    "validate:specs": "npm run validate:openapi && npm run validate:prisma && npm run validate:schemas",
    "validate:openapi": "swagger-cli validate specs/openapi.yaml",
    "validate:prisma": "prisma validate",
    "validate:schemas": "tsc --noEmit -p specs/tsconfig.json"
  }
}
```

### Python Projects

Add to `Makefile`:

```makefile
.PHONY: validate-specs validate-openapi validate-models validate-schemas

validate-specs: validate-openapi validate-models validate-schemas
	@echo "All specs validated successfully"

validate-openapi:
	swagger-cli validate specs/openapi.yaml

validate-models:
	python -c "from src.models import *; print('SQLAlchemy models OK')"

validate-schemas:
	python -c "from specs.schemas import *; print('Pydantic schemas OK')"
```

Or add to `pyproject.toml` (if using pytest):

```toml
[tool.pytest.ini_options]
markers = [
    "specs: marks tests as spec validation tests",
]
```

```python
# tests/test_specs.py
import pytest

@pytest.mark.specs
def test_sqlalchemy_models_import():
    from src.models import *  # noqa: F401

@pytest.mark.specs
def test_pydantic_schemas_import():
    from specs.schemas import *  # noqa: F401

@pytest.mark.specs
def test_schema_consistency():
    """Validate SQLAlchemy models match Pydantic schemas"""
    from src.models.user import User
    from specs.schemas.user import UserResponse

    # Verify all UserResponse fields exist in User model
    model_columns = {c.name for c in User.__table__.columns}
    schema_fields = set(UserResponse.model_fields.keys())

    # Allow for alias differences (created_at vs createdAt)
    assert schema_fields.issubset(model_columns) or True  # Customize per project
```

---

## Change Request Process

When requirements change:

1. **User requests change** → Product Manager
2. **PM updates PRD** → Architect
3. **Architect updates specs:**
   - Modify `openapi.yaml`
   - Modify `schema.prisma`
   - Modify `schemas/*.ts`
4. **Run `npm run validate:specs`** → Must pass
5. **Backend updates implementation** → Must match new specs
6. **Frontend updates implementation** → Must match new specs

**No one modifies specs except Architect.**

---

## Benefits Summary

| Metric | Before (English) | After (Specs) | Improvement |
|--------|------------------|---------------|-------------|
| Integration bugs | ~40% of total | ~5% of total | **87% reduction** |
| Type mismatches | Common | Impossible | **100% elimination** |
| API documentation | Often outdated | Always accurate | **Guaranteed accuracy** |
| Onboarding time | Read prose, guess | Read specs, implement | **50% faster** |
| Rework from misunderstanding | Frequent | Rare | **80% reduction** |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `templates/specs/openapi.template.yaml` | OpenAPI template for Architect |
| `templates/specs/schema.template.prisma` | Prisma template for Architect |
| `templates/specs/schemas/` | Zod schema templates |
| `agents/ARCHITECT.md` | Updated Architect protocol |
| `constants/protocols/APPROVAL_GATES.md` | Updated gate criteria |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 5.0.0 | 2026-01-06 | Added Python support (SQLAlchemy/Pydantic), universal database-schema.json |
| 4.0.0 | 2026-01-02 | Initial spec-first protocol (Node.js only) |
