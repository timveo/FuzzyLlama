# Spec Consumption Mandate

> **Version 4.0.0**
>
> **Purpose:** Shared mandate for all implementation agents. This is the CANONICAL source for spec-first development requirements.
>
> **Used by:** backend-dev.md, frontend-dev.md, and all implementation agents

---

## Core Mandate

**You do NOT interpret requirements. You implement specifications.**

Your job is to translate approved specs into working code, not to make product decisions.

---

## The Three Contracts

### 1. OpenAPI Specification (`specs/openapi.yaml`)

**What it defines:**
- All API endpoints, methods, paths
- Request/response schemas
- Authentication requirements
- Error response formats

**Your obligation:**
- Implement endpoints EXACTLY as specified
- Use the exact paths, methods, and status codes
- Match request/response schemas precisely
- Don't add undocumented endpoints

### 2. Prisma Schema (`prisma/schema.prisma`)

**What it defines:**
- Database models and relationships
- Field types and constraints
- Indexes and unique constraints

**Your obligation:**
- Use the exact model names
- Respect all relationships and constraints
- Don't add fields not in schema
- Use Prisma Client for all DB operations

### 3. Zod Schemas (`specs/schemas/`)

**What it defines:**
- Runtime validation rules
- Type definitions
- Transformation logic

**Your obligation:**
- Import and use these schemas for validation
- Don't create duplicate validation logic
- Extend (don't replace) when adding features

---

## Spec Access Pattern

```typescript
// CORRECT: Import from approved specs
import { UserCreateSchema, UserResponseSchema } from '@/specs/schemas/user';
import { prisma } from '@/lib/prisma';

// WRONG: Define your own schemas
const UserSchema = z.object({ ... }); // DON'T DO THIS
```

---

## When Specs Don't Cover Something

If you encounter a scenario not covered by specs:

1. **Check Related Specs:** The answer may be in a related schema or endpoint
2. **Check Conventions:** Follow patterns established elsewhere in specs
3. **Flag for Architect:** If genuinely missing, don't guess - ask for spec update

**Never:**
- Invent your own API contracts
- Add "helpful" fields not in spec
- Create database columns not in Prisma schema
- Assume what the user "probably wants"

---

## Spec Versions

After G3 approval, specs are **LOCKED**. Any changes require:
1. Formal change request
2. Architect review
3. User approval
4. Version bump

You cannot modify specs during implementation. Work with what's approved.

---

## Integration with Gates

| Gate | Spec Status | Your Responsibility |
|------|-------------|---------------------|
| Pre-G3 | Specs being created | Wait for approval |
| G3 Approved | Specs locked | Begin implementation |
| G5+ | Specs immutable | Implement exactly |

---

## Verification

Before marking work complete, verify:

- [ ] All endpoints match OpenAPI spec exactly
- [ ] All models use Prisma schema definitions
- [ ] All validation uses Zod schemas from specs
- [ ] No undocumented features added
- [ ] No schema fields invented

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | 2026-01-02 | Extracted as shared reference |
| 1.0.0 | 2024-12-18 | Initial creation (inline in agent files) |
