# Spec Templates

> **Purpose:** Machine-readable specification templates for spec-first development.

## Template Files

| Template | Purpose | Output |
|----------|---------|--------|
| `openapi.template.yaml` | API contract | `specs/openapi.yaml` |
| `database-schema.template.json` | Universal DB schema | `specs/database-schema.json` |
| `schema.template.prisma` | Prisma schema (Node.js) | `prisma/schema.prisma` |
| `tsconfig.template.json` | TypeScript config for specs | `specs/tsconfig.json` |
| `schemas/*.template.ts` | Zod validation schemas | `specs/schemas/*.ts` |

## Usage

See `agents/architect.md` Phase 3 for complete instructions on:
- Generating specs from PRD
- Adding validation scripts to package.json
- Running validation before G3

## Enforcement

G3 approval is **blocked** unless:
- All spec files exist
- `validate:specs` script exists in package.json (Node.js) or Makefile (Python)
- Validation passes

Enforced by: `scripts/validate-project.sh g3`

## Related Documentation

| Document | Purpose |
|----------|---------|
| `agents/architect.md` | **Source of truth** for spec generation |
| `constants/protocols/SPEC_FIRST_PROTOCOL.md` | Full protocol documentation |
| `constants/protocols/APPROVAL_GATES.md` | G3 gate requirements |
