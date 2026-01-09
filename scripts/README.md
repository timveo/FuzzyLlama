# Validation Scripts

Scripts to validate project compliance with the agent system protocols.

## validate-project.sh

**Main enforcement script.** Validates gate requirements including Spec-First at G3.

```bash
./scripts/validate-project.sh /path/to/project [gate]
```

| Gate | Description |
|------|-------------|
| `g3` | Architecture + **Spec-First enforcement** (validate:specs script required) |
| `g5.1` | Foundation (package.json, types, config) |
| `full` | All validations + build check |

See script header for all gates.

## validate-specs.sh

Runs actual spec validation commands. Auto-detects Node.js or Python stack.

```bash
./scripts/validate-specs.sh /path/to/project [--stack nodejs|python]
```

## enforce-spec-immutability.sh

**Pre-commit enforcement.** Blocks commits that modify locked specs after G3 approval.

```bash
./scripts/enforce-spec-immutability.sh /path/to/project
```

Uses TruthStore (`.truth/truth.json`) to check if specs are locked. Called automatically by pre-commit hook.

## validate-g5-compliance.sh

**G5 compliance check.** Validates implementation follows spec-first contracts.

```bash
./scripts/validate-g5-compliance.sh /path/to/project [--stack nodejs|python]
```

Checks:
- All OpenAPI endpoints implemented
- Validation schemas imported from specs/ (not inline)
- Frontend uses zodResolver with spec schemas
- Database operations use Prisma/SQLAlchemy models

Outputs compliance report to `.truth/proofs/G5/`.

## detect-schema-drift.sh

Detects inconsistencies between OpenAPI, Prisma/SQLAlchemy, and Zod/Pydantic specs.

```bash
./scripts/detect-schema-drift.sh /path/to/project
```

## Output

- **[PASS]** — Requirement met
- **[FAIL]** — Blocks progress
- **[WARN]** — Review recommended

Exit code `0` = passed, `1` = failed.

## Integration with TruthStore

These scripts integrate with the MCP TruthStore:
- Read spec lock status from `.truth/truth.json`
- Write proof artifacts to `.truth/proofs/G3/` and `.truth/proofs/G5/`
- Use the same spec paths registered via `register_spec()` MCP tool
