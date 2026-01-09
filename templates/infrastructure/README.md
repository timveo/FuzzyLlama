# Infrastructure Templates

Pre-configured deployment templates for Multi-Agent Framework projects.

## Contents

```
templates/infrastructure/
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Local development with PostgreSQL + Redis
├── nginx.conf              # Nginx config for static sites
├── github-workflows/
│   ├── ci.yml              # Lint, test, build, security audit
│   └── deploy.yml          # Deploy to Vercel (staging + production)
└── hooks/
    └── pre-commit          # Git pre-commit validation hook
```

## Quick Start

### 1. Copy Templates to Your Project

```bash
# Copy Docker files
cp templates/infrastructure/Dockerfile ./
cp templates/infrastructure/docker-compose.yml ./

# Copy GitHub Actions (create directory first)
mkdir -p .github/workflows
cp templates/infrastructure/github-workflows/*.yml .github/workflows/

# Install Git hooks
./scripts/setup-hooks.sh
```

### 2. Configure GitHub Secrets

For deployment, add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `CODECOV_TOKEN` | (Optional) Codecov upload token |

### 3. Local Development with Docker

```bash
# Start all services (app, database, redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# With dev tools (Adminer database UI)
docker-compose --profile dev-tools up -d
# Access Adminer at http://localhost:8080
```

## Customization

### Dockerfile

The Dockerfile supports two modes:

1. **Node.js Server** (default): For Express/Fastify backends
2. **Static Site**: For React/Vite SPAs (uncomment the nginx section)

### docker-compose.yml

Included services:
- `app` - Your application
- `db` - PostgreSQL 16
- `redis` - Redis 7 (optional, for caching)
- `adminer` - Database UI (dev-tools profile only)

### CI Pipeline (ci.yml)

Runs on every push/PR:
1. ESLint + TypeScript check
2. Security audit (npm audit + secret scanning)
3. Unit tests with coverage
4. Build verification
5. Accessibility audit (Lighthouse)

### Deploy Pipeline (deploy.yml)

Workflow:
1. Runs full CI pipeline
2. Deploys to staging automatically on `main` push
3. Production deployment requires manual trigger

## Pre-commit Hook

The pre-commit hook enforces:
- `npm audit` (no moderate+ vulnerabilities)
- `npm run lint` (pass)
- `npm test` (pass)
- `./scripts/validate-project.sh` (if present)
- **Spec immutability** (blocks changes to locked specs post-G3)
- Secret detection in staged files

### Spec-First Enforcement

After G3 approval, specs are locked via the TruthStore (`.truth/truth.json`). The pre-commit hook will **block commits** that modify:
- `specs/openapi.yaml`
- `specs/database-schema.json`
- `specs/schemas/*`
- `prisma/schema.prisma`
- `src/models/*.py` (Python)

To modify locked specs, you must:
1. Submit a formal change request
2. Get user approval
3. Use `unlock_specs()` MCP tool
4. Make changes and re-validate
5. Re-lock specs

### Auto-Installation (Recommended)

Add the `prepare` script to your `package.json` so hooks install automatically when anyone runs `npm install`:

```json
{
  "scripts": {
    "prepare": "test -d .git && ./scripts/setup-hooks.sh || true"
  }
}
```

This ensures all developers have hooks installed without manual steps.

### Manual Installation

```bash
./scripts/setup-hooks.sh
```

Bypass in emergencies: `git commit --no-verify`

## Spec-First Validation Scripts

These scripts enforce the spec-first protocol at different stages:

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `validate-specs.sh` | Validates spec files exist and are valid | G3 approval |
| `enforce-spec-immutability.sh` | Blocks changes to locked specs | Pre-commit (automatic) |
| `validate-g5-compliance.sh` | Checks implementation matches specs | G5 approval |
| `detect-schema-drift.sh` | Detects inconsistencies between specs | Manual / CI |

### ESLint Spec-First Rules

Copy `templates/config/eslint-spec-first.cjs` to your project and extend it in your ESLint config:

```js
module.exports = {
  extends: ['./eslint-spec-first.cjs'],
  // ... other config
}
```

This enforces:
- No inline Zod schemas outside `specs/schemas/`
- Warnings on custom validation imports

## Related Documentation

- [SPEC_FIRST_PROTOCOL.md](../../constants/protocols/SPEC_FIRST_PROTOCOL.md) - Full spec-first protocol
- [APPROVAL_GATES.md](../../constants/protocols/APPROVAL_GATES.md) - G3, G5, G7, G8, G9 gates
- [github-actions.md](../code-examples/github-actions.md) - Additional CI/CD examples
- [STANDARD_TOOLING.md](../../constants/reference/STANDARD_TOOLING.md) - DevOps tooling standards
