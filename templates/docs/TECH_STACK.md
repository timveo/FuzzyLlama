# Technology Stack

**Project:** [Project Name]
**Version:** 1.0
**Created:** [Date]
**Author:** Architect Agent

---

## Overview

This document defines the approved technology stack for this project. **All developer agents must read this file and adhere to the specified technologies.** Do not deviate from this stack without explicit approval via an Architecture Decision Record (ADR).

---

## Frontend

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **Framework** | [e.g., React, Vue, Svelte, Angular] | [version] | |
| **Language** | [e.g., TypeScript, JavaScript] | [version] | |
| **Build Tool** | [e.g., Vite, Webpack, esbuild] | [version] | |
| **Styling** | [e.g., Tailwind CSS, CSS Modules, Styled Components] | [version] | |
| **State Management** | [e.g., Zustand, Redux, Pinia, Vuex] | [version] | |
| **Data Fetching** | [e.g., TanStack Query, SWR, Apollo] | [version] | |
| **Routing** | [e.g., React Router, Vue Router] | [version] | |
| **Testing** | [e.g., Vitest, Jest, Playwright] | [version] | |
| **UI Components** | [e.g., shadcn/ui, Radix, Headless UI] | [version] | Optional |

### Frontend Constraints

- [Any specific constraints, e.g., "No jQuery", "Must support IE11"]
- [Performance requirements, e.g., "Lighthouse score ≥90"]
- [Accessibility requirements, e.g., "WCAG 2.1 AA"]

---

## Backend

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **Runtime** | [e.g., Node.js, Python, Go, Rust] | [version] | |
| **Framework** | [e.g., Express, FastAPI, Gin, Actix] | [version] | |
| **Language** | [e.g., TypeScript, Python, Go] | [version] | |
| **ORM/Database Client** | [e.g., Prisma, SQLAlchemy, GORM] | [version] | |
| **Validation** | [e.g., Zod, Pydantic, validator] | [version] | |
| **Authentication** | [e.g., JWT, Session, OAuth2] | | |
| **Testing** | [e.g., Vitest, pytest, go test] | [version] | |
| **API Style** | [REST, GraphQL, gRPC, tRPC] | | |

### Backend Constraints

- [Any specific constraints, e.g., "Serverless compatible"]
- [Performance requirements, e.g., "p95 < 500ms"]
- [Security requirements]

---

## Database

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **Primary Database** | [e.g., PostgreSQL, MySQL, MongoDB] | [version] | |
| **Cache** | [e.g., Redis, Memcached] | [version] | Optional |
| **Search** | [e.g., Elasticsearch, Meilisearch] | [version] | Optional |
| **Vector Store** | [e.g., Pinecone, pgvector, Weaviate] | [version] | For AI projects |

### Database Constraints

- [Hosting requirements, e.g., "Must be managed service"]
- [Backup requirements]
- [Data residency requirements]

---

## Infrastructure & DevOps

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **Hosting (Frontend)** | [e.g., Vercel, Netlify, Cloudflare Pages] | | |
| **Hosting (Backend)** | [e.g., Railway, Render, AWS, GCP] | | |
| **Containerization** | [e.g., Docker, Podman] | [version] | Optional |
| **Orchestration** | [e.g., Kubernetes, ECS, Cloud Run] | | Optional |
| **CI/CD** | [e.g., GitHub Actions, GitLab CI] | | |
| **Monitoring** | [e.g., DataDog, Grafana, New Relic] | | |
| **Logging** | [e.g., Structured JSON, ELK Stack] | | |

### Infrastructure Constraints

- **Deployment Tier:** [Tier 1 MVP / Tier 2 Production / Tier 3 Enterprise]
- **Budget:** [Monthly budget constraint]
- **Regions:** [Required regions]

---

## AI/ML Stack (if applicable)

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| **LLM Provider** | [e.g., Anthropic Claude, OpenAI, local] | | |
| **Primary Model** | [e.g., claude-sonnet-4-20250514, gpt-4o] | | |
| **Fallback Model** | [e.g., claude-haiku, gpt-4o-mini] | | Optional |
| **Embeddings** | [e.g., text-embedding-3-small] | | |
| **Vector Database** | [e.g., Pinecone, pgvector] | | |
| **ML Framework** | [e.g., LangChain, LlamaIndex] | [version] | Optional |

### AI/ML Constraints

- **Latency Target:** [e.g., "p95 < 2s for completions"]
- **Cost Target:** [e.g., "$X per 1K requests"]
- **Safety Requirements:** [e.g., "Content filtering required"]

---

## Third-Party Services

| Service | Provider | Purpose | Notes |
|---------|----------|---------|-------|
| **Authentication** | [e.g., Auth0, Clerk, built-in] | User auth | |
| **Payments** | [e.g., Stripe, Paddle] | Billing | Optional |
| **Email** | [e.g., SendGrid, Resend, Postmark] | Transactional email | Optional |
| **File Storage** | [e.g., S3, Cloudflare R2] | User uploads | Optional |
| **Analytics** | [e.g., PostHog, Mixpanel] | Usage tracking | Optional |

---

## Package Managers & Tools

| Purpose | Tool | Notes |
|---------|------|-------|
| **Package Manager** | [npm, pnpm, yarn, pip, cargo] | |
| **Linting** | [ESLint, Ruff, golangci-lint] | |
| **Formatting** | [Prettier, Black, gofmt] | |
| **Git Hooks** | [Husky, pre-commit] | Optional |
| **Monorepo** | [Turborepo, Nx, none] | Optional |

---

## Version Pinning Policy

- **Major versions:** Pinned (no automatic updates)
- **Minor versions:** Allow patch updates only
- **Lock files:** Always commit `package-lock.json` / `pnpm-lock.yaml` / etc.

---

## Deviation Process

To deviate from this stack:

1. Create an ADR in `docs/DECISIONS.md`
2. Document the reason for deviation
3. Get approval from Architect and Product Manager
4. Update this document

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| [Date] | Initial stack definition | Architect |
