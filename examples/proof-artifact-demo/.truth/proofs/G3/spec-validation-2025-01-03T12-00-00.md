# Spec Validation Report for G3
Project: demo-app
Timestamp: 2025-01-03T12:00:00.000Z

## OpenAPI Validation
Spec: specs/openapi.yaml

```
$ npx swagger-cli validate "/path/to/project/specs/openapi.yaml"
/path/to/project/specs/openapi.yaml is valid
Exit code: 0
```
Result: VALID

## Prisma Validation
Schema: prisma/schema.prisma

```
$ npx prisma validate
Prisma schema loaded from prisma/schema.prisma
The schema is valid.
Exit code: 0
```
Result: VALID

## Zod Schema Validation
Schema: specs/schemas/index.ts

```
$ npx tsc --noEmit "specs/schemas/index.ts"

Exit code: 0
```
Result: VALID

## Summary
All spec validations PASSED
