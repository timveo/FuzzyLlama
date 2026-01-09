# Test Templates

Templates for validating spec compliance in your projects.

## Available Templates

### 1. Response Validation Tests
`response-validation.test.template.ts`

Tests that API responses match Zod schemas. Use these to:
- Validate JSON responses from your backend
- Catch missing or extra fields
- Ensure enum values are valid
- Verify type inference works

**Usage:**
```bash
cp templates/tests/response-validation.test.template.ts your-project/tests/
# Update imports and add domain-specific tests
npx jest tests/response-validation.test.ts
```

### 2. Form Validation Tests
`form-validation.test.template.ts`

Tests Zod schemas for frontend form validation. Use these to:
- Verify form data is validated correctly
- Test error messages are user-friendly
- Ensure optional vs required fields work
- Validate enum/select inputs

**Usage:**
```bash
cp templates/tests/form-validation.test.template.ts your-project/tests/
# Update imports and add domain-specific tests
npx jest tests/form-validation.test.ts
```

## Related Scripts

### G3 Spec Validation
```bash
./scripts/validate-specs.sh [project-dir]
```
Validates all spec files exist and are valid before G3 approval.

### Schema Drift Detection
```bash
./scripts/detect-schema-drift.sh [project-dir]
```
Detects inconsistencies between OpenAPI, Prisma, and Zod specs.

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# GitHub Actions example
jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: ./scripts/validate-specs.sh
      - run: ./scripts/detect-schema-drift.sh
      - run: npx jest tests/
```
