# External Tools & MCP Servers

> **Purpose:** Define required and recommended external tools, MCP servers, and third-party services that Claude agents should use for consistent, high-quality outcomes.

---

## Environment Validation

Before starting a project, validate that required tools are installed:

```bash
./scripts/validate-environment.sh
```

Options:
- `--install` - Attempt to install missing tools
- `--agent qa|security|devops` - Check tools for specific agent only

The script checks all third-party tools required by QA, Security, and DevOps agents.

---

## Relationship to STANDARD_TOOLING.md

| Document | Scope | When to Reference |
|----------|-------|-------------------|
| **STANDARD_TOOLING.md** | Core development tools (React, Vite, Vitest, Tailwind, Prisma, etc.) | Tool selection at G3, G5.1 |
| **EXTERNAL_TOOLS.md** (this file) | Testing, CI/CD, monitoring, MCP servers | Testing at G6, Security at G7, Deploy at G8 |

**No overlap:** Core tools are in STANDARD_TOOLING. Extended tools are here.

---

## MCP Servers (Model Context Protocol)

MCP servers extend Claude's capabilities with specialized tools. These should be configured in the user's Claude Code environment.

### Required MCP Servers

| Server | Purpose | When to Use | Installation |
|--------|---------|-------------|--------------|
| **@anthropic/mcp-server-filesystem** | File operations | Always (default) | Built-in |
| **@anthropic/mcp-server-git** | Git operations | Version control | `npm install -g @anthropic/mcp-server-git` |

### Recommended MCP Servers

| Server | Purpose | When to Use | Installation |
|--------|---------|-------------|--------------|
| **@anthropic/mcp-server-github** | GitHub API | PRs, issues, actions | `npm install -g @anthropic/mcp-server-github` |
| **@anthropic/mcp-server-postgres** | Database queries | Direct DB access | `npm install -g @anthropic/mcp-server-postgres` |
| **@anthropic/mcp-server-sqlite** | SQLite databases | Local DB testing | `npm install -g @anthropic/mcp-server-sqlite` |
| **@anthropic/mcp-server-puppeteer** | Browser automation | E2E testing, screenshots | `npm install -g @anthropic/mcp-server-puppeteer` |
| **@anthropic/mcp-server-fetch** | HTTP requests | API testing | `npm install -g @anthropic/mcp-server-fetch` |

### MCP Configuration

Add to `~/.claude/mcp_servers.json`:

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-filesystem", "--root", "."]
    },
    "git": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-git"]
    },
    "github": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "puppeteer": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-puppeteer"]
    },
    "fetch": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-fetch"]
    }
  }
}
```

---

## Testing Tools

### Unit & Integration Testing

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Vitest** | Unit tests, component tests | G5, G6 | ✅ YES |
| **@testing-library/react** | React component testing | G5, G6 | ✅ YES |
| **@testing-library/jest-dom** | DOM matchers | G5, G6 | ✅ YES |
| **MSW (Mock Service Worker)** | API mocking | G5, G6 | Recommended |

**Standard Test Setup:**
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### End-to-End Testing

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Playwright** | E2E browser testing | G6 | ✅ DEFAULT |
| **Cypress** | E2E testing (alternative) | G6 | Alternative |

**Tool Selection Guide:**

| Choose Playwright When | Choose Cypress When |
|------------------------|---------------------|
| Cross-browser testing needed | Team familiar with Cypress |
| Testing multiple pages/tabs | Need visual debugging UI |
| Need parallel execution | Simpler API preferred |
| Testing with network interception | Component testing focus |
| **Default choice for new projects** | User explicitly requests |

**Decision:** Use **Playwright** as default. Only use Cypress if:
1. User explicitly requests in Q5
2. Team has existing Cypress expertise
3. Project already has Cypress tests

**When to use E2E:**
- Critical user flows (auth, checkout, core features)
- Cross-browser verification
- Visual regression testing

**Playwright Configuration:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

### Performance Testing

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Lighthouse CI** | Performance audits | G6, G7 | ✅ YES |
| **Web Vitals** | Core Web Vitals | G5.5 | ✅ YES |
| **k6** | Load testing | G6 (if needed) | For scale |

**Lighthouse CI in GitHub Actions:**
```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      http://localhost:5173/
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

**Lighthouse Budget (lighthouse-budget.json):**
```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  }
]
```

### Accessibility Testing

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **axe-core** | Accessibility testing | G5, G6 | ✅ YES |
| **@axe-core/playwright** | Playwright a11y | G6 | Recommended |
| **pa11y** | CLI accessibility | G6 | Alternative |

**Vitest + axe-core:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Security Testing Tools

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **npm audit** | Dependency vulnerabilities | G7 | ✅ YES |
| **Snyk** | Security scanning | G7 | Recommended |
| **OWASP ZAP** | Web security scanning | G7 | For production |
| **Trivy** | Container scanning | G8 | If using Docker |

**npm audit in CI:**
```yaml
- name: Security Audit
  run: |
    npm audit --audit-level=high
    npx snyk test --severity-threshold=high
```

---

## Code Quality Tools

### Linting & Formatting

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **ESLint** | Code linting | All | ✅ YES |
| **Prettier** | Code formatting | All | Recommended |
| **TypeScript** | Type checking | All | ✅ YES |

**ESLint Configuration (eslint.config.js):**
```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
];
```

### Code Coverage

| Tool | Purpose | Target | Required |
|------|---------|--------|----------|
| **c8** | Coverage with Vitest | ≥80% | ✅ YES |
| **Codecov** | Coverage reporting | CI | Recommended |

**Vitest Coverage:**
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## API Testing Tools

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Supertest** | HTTP assertions | G5, G6 | ✅ YES (backend) |
| **Postman/Newman** | API collections | G6 | Optional |
| **OpenAPI Validator** | Contract validation | G6 | Recommended |

**Supertest Example:**
```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/users', () => {
  it('creates a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

---

## Database Tools

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Prisma Studio** | DB GUI | Development | Included |
| **Prisma Migrate** | Schema migrations | G5.2 | ✅ YES |
| **pg_dump/pg_restore** | Backup/restore | G8 | Production |

**Database Commands:**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Open Prisma Studio
npx prisma studio

# Reset database (dev only)
npx prisma migrate reset
```

---

## CI/CD Tools

### GitHub Actions (Default)

| Action | Purpose | Phase |
|--------|---------|-------|
| **actions/checkout** | Clone repo | All |
| **actions/setup-node** | Node.js setup | All |
| **actions/cache** | Dependency caching | All |
| **treosh/lighthouse-ci-action** | Performance | G6 |
| **codecov/codecov-action** | Coverage upload | G6 |

**Standard CI Workflow (.github/workflows/ci.yml):**
```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### Deployment Tools

| Tool | Purpose | Tier |
|------|---------|------|
| **Vercel CLI** | Frontend deployment | All |
| **Railway CLI** | Backend deployment | All |
| **Docker** | Containerization | Tier 2+ |
| **gh-pages** | GitHub Pages | Static sites |

---

## Monitoring & Observability

| Tool | Purpose | Tier | Required |
|------|---------|------|----------|
| **Sentry** | Error tracking | All | ✅ YES (production) |
| **Vercel Analytics** | Web analytics | All | Recommended |
| **Prometheus** | Metrics | Tier 2+ | For scale |
| **Grafana** | Dashboards | Tier 2+ | For scale |

**Sentry Setup:**
```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

---

## AI/ML Tools

| Tool | Purpose | Phase | Required |
|------|---------|-------|----------|
| **Anthropic SDK** | Claude API | ML Dev | ✅ YES (AI projects) |
| **Vercel AI SDK** | Streaming | ML Dev | Recommended |
| **LangChain** | LLM orchestration | ML Dev | Optional |
| **Promptfoo** | Prompt evaluation | ML Dev | Recommended |

**Promptfoo Configuration (promptfoo.yaml):**
```yaml
providers:
  - anthropic:messages:claude-sonnet-4-20250514

prompts:
  - file://prompts/summarize.txt

tests:
  - vars:
      text: "Long article text here..."
    assert:
      - type: contains
        value: "key point"
      - type: llm-rubric
        value: "Summary is concise and accurate"
```

---

## Tool Validation Checklist

### At Project Setup (G5.1)

- [ ] Vitest configured and running
- [ ] ESLint configured and passing
- [ ] TypeScript strict mode enabled
- [ ] Coverage reporting set up
- [ ] `npm run verify` script working

### At Testing Phase (G6)

- [ ] Unit test coverage ≥ 80%
- [ ] Lighthouse score ≥ 90
- [ ] npm audit: 0 critical/high
- [ ] Accessibility tests passing
- [ ] E2E tests for critical paths (if applicable)

### At Security Phase (G7)

- [ ] npm audit clean
- [ ] No hardcoded secrets
- [ ] OWASP top 10 reviewed
- [ ] Security headers configured

### At Deployment (G8)

- [ ] CI/CD pipeline working
- [ ] Sentry configured (production)
- [ ] Environment variables documented
- [ ] Health checks implemented

---

## Installation Commands

### Quick Setup Script

```bash
#!/bin/bash
# Install all standard testing tools

# Core testing
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Accessibility
npm install -D jest-axe @axe-core/react

# API testing (backend)
npm install -D supertest @types/supertest

# Coverage
npm install -D @vitest/coverage-v8

# E2E (optional)
npm install -D @playwright/test
npx playwright install

# Security
npm install -D snyk

# Linting
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

echo "All testing tools installed!"
```

---

## Integration with Workflow

| Phase | Tools Verified |
|-------|----------------|
| G5.1 Foundation | Vitest, ESLint, TypeScript |
| G5.5 Polish | Lighthouse, Web Vitals |
| G6 Testing | Coverage, E2E, Accessibility |
| G7 Security | npm audit, Snyk |
| G8 Pre-Deploy | CI/CD, Sentry |
| G10 Completion | All tools documented in report |

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Standardize external tools, MCP servers, and third-party services across all projects
