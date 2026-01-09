# Standard Tooling Protocol

> **Purpose:** Ensure consistent tool selection across ALL projects. Claude agents MUST use these tools unless explicitly overridden by user constraints in Q5.

---

## Why Standardize Tools?

1. **Consistency** - Same tools every time = predictable outcomes
2. **Quality** - Vetted tools that work together
3. **Speed** - No time wasted on tool selection
4. **Maintainability** - Familiar patterns across projects
5. **2025 Compatibility** - Tools tested for current year

---

## Tool Selection Hierarchy

```
1. User constraint (Q5)     → HIGHEST PRIORITY
2. Starter template         → If using a starter
3. Standard tooling         → THIS DOCUMENT (default)
4. Agent preference         → LOWEST PRIORITY (not allowed)
```

**Rule:** Agents MUST NOT deviate from standard tooling based on personal preference. Only user constraints or explicit starter templates override this document.

---

## Frontend Stack (Default)

### Core Technologies

| Category | Tool | Version | Rationale | Enforced |
|----------|------|---------|-----------|----------|
| **Framework** | React | 19.x | Industry standard, ecosystem | ✅ YES |
| **Language** | TypeScript | 5.9+ | Type safety, IDE support | ✅ YES |
| **Build Tool** | Vite | 7.x | Fast builds, HMR, native ESM | ✅ YES |
| **Styling** | Tailwind CSS | 4.x | Utility-first, rapid dev | ✅ YES |
| **Testing** | Vitest | 4.x | Fast, Vite-native | ✅ YES |

### Supporting Libraries

| Category | Tool | When to Use | Enforced |
|----------|------|-------------|----------|
| **State (Simple)** | React useState/useReducer | < 5 global states | ✅ Default |
| **State (Complex)** | Zustand | > 5 global states | ✅ YES |
| **Data Fetching** | TanStack Query | External API calls | Recommended |
| **Forms** | React Hook Form + Zod | Complex forms | Recommended |
| **UI Components** | shadcn/ui | When needed | Recommended |
| **Routing** | React Router | Multi-page apps | ✅ YES |
| **Charts** | Recharts | Data visualization | Recommended |

### Configuration Requirements (2025)

**postcss.config.js:**
```javascript
// ✅ REQUIRED - Tailwind v4 syntax
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // NOT 'tailwindcss'
    autoprefixer: {},
  },
}
```

**src/index.css:**
```css
/* ✅ REQUIRED - Tailwind v4 syntax */
@import "tailwindcss";  /* NOT @tailwind directives */
```

**vite.config.ts:**
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**TypeScript imports:**
```typescript
// ✅ REQUIRED - Use import type for type-only imports
import type { User, Product } from '../types';

// ❌ WRONG - Will fail with verbatimModuleSyntax
import { User, Product } from '../types';
```

---

## Backend Stack (Default)

### Core Technologies

| Category | Tool | Version | Rationale | Enforced |
|----------|------|---------|-----------|----------|
| **Runtime** | Node.js | 20.x LTS | Stable, ecosystem | ✅ YES |
| **Framework** | Express | 4.x | Simple, flexible | ✅ YES |
| **Language** | TypeScript | 5.9+ | Type safety | ✅ YES |
| **ORM** | Prisma | 5.x | Type-safe queries | ✅ YES |
| **Validation** | Zod | 3.x | Schema validation | ✅ YES |
| **Testing** | Vitest | 4.x | Consistency with frontend | ✅ YES |

### Supporting Libraries

| Category | Tool | When to Use | Enforced |
|----------|------|-------------|----------|
| **Auth** | JWT (jsonwebtoken) | Token auth | ✅ YES |
| **Password** | bcrypt | Password hashing | ✅ YES |
| **HTTP Client** | axios | External API calls | Recommended |
| **Logging** | pino | Structured logging | Recommended |
| **Rate Limiting** | express-rate-limit | API protection | Recommended |

---

## Database Stack (Default)

| Category | Tool | When to Use | Enforced |
|----------|------|-------------|----------|
| **Primary DB** | PostgreSQL | Default for all projects | ✅ YES |
| **Hosted DB** | Supabase | Need auth + realtime | Recommended |
| **Cache** | Redis (Upstash) | Need caching | When needed |
| **Vector DB** | pgvector | AI embeddings | For AI projects |

### Why PostgreSQL Default?

1. **Versatile** - Handles 95% of use cases
2. **Scalable** - Works from MVP to enterprise
3. **Tooling** - Excellent Prisma support
4. **Extensions** - pgvector for AI, PostGIS for geo
5. **Hosting** - Supabase, Railway, Neon all support it

---

## AI/ML Stack (Default)

| Category | Tool | When to Use | Enforced |
|----------|------|-------------|----------|
| **LLM Provider** | Anthropic Claude | Default AI provider | ✅ YES |
| **Primary Model** | claude-sonnet-4-20250514 | General use | ✅ YES |
| **Fast Model** | claude-3-5-haiku | Simple tasks | ✅ YES |
| **AI SDK** | Vercel AI SDK | Streaming | Recommended |
| **Embeddings** | OpenAI text-embedding-3-small | Vector search | Recommended |

### Model Selection Rules

| Task | Use This Model | Rationale |
|------|----------------|-----------|
| Complex reasoning | claude-sonnet-4-20250514 | Best quality |
| Quick responses | claude-3-5-haiku | Cost efficient |
| Code generation | claude-sonnet-4-20250514 | Best accuracy |
| Classification | claude-3-5-haiku | Fast enough |

---

## Infrastructure Stack (Default)

| Category | Tool | Tier 1 (MVP) | Tier 2 (Prod) | Tier 3 (Enterprise) |
|----------|------|--------------|---------------|---------------------|
| **Frontend Hosting** | Vercel | Free | Pro ($20/mo) | Enterprise |
| **Backend Hosting** | Railway | Starter ($5/mo) | Pro ($20/mo) | Team |
| **Database** | Railway PostgreSQL | Included | Included | Dedicated |
| **Auth** | Supabase Auth | Free | Pro | Enterprise |
| **Email** | Resend | Free tier | Growth | Enterprise |
| **Monitoring** | Sentry | Free | Team | Business |

---

## DevOps & Quality Tools

| Category | Tool | Purpose | Enforced |
|----------|------|---------|----------|
| **Version Control** | Git | Source control | ✅ YES |
| **Package Manager** | npm | Dependencies | ✅ YES |
| **Linting** | ESLint | Code quality | ✅ YES |
| **Formatting** | Prettier | Code style | Recommended |
| **Git Hooks** | Husky | Pre-commit | Recommended |
| **CI/CD** | GitHub Actions | Automation | Recommended |

---

## Package.json Scripts (Standard)

Every project MUST have these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run build && npm test && npm run lint"
  }
}
```

**The `verify` script is MANDATORY** - used at every checkpoint.

---

## Tool Validation Checklist

### At G5.1 (Foundation)

Before proceeding, verify:

- [ ] `package.json` has all required dependencies
- [ ] `package.json` has `verify` script
- [ ] `vite.config.ts` uses correct Vitest config
- [ ] `postcss.config.js` uses `@tailwindcss/postcss`
- [ ] `src/index.css` uses `@import "tailwindcss"`
- [ ] TypeScript strict mode enabled
- [ ] `npm run verify` passes

### At G5.2 (Data Layer)

- [ ] Prisma schema exists (if backend)
- [ ] Zod schemas for validation
- [ ] Type-safe service functions

### At G5.4 (Integration)

- [ ] All tools from stack are properly configured
- [ ] No unauthorized tool additions
- [ ] `npm run verify` still passes

---

## Deviation Process

To use a non-standard tool:

1. **User requests in Q5** - Automatic override
2. **Technical necessity** - Document in ADR with:
   - What tool
   - Why standard tool doesn't work
   - Trade-offs
   - Approval from user

**Agents CANNOT deviate without user approval.**

### Example ADR for Deviation

```markdown
## ADR-XXX: Use MongoDB instead of PostgreSQL

**Status:** Proposed
**Date:** YYYY-MM-DD

### Context
User requires document storage for unstructured data with frequent schema changes.

### Decision
Use MongoDB instead of standard PostgreSQL.

### Rationale
- Flexible schema for evolving data structure
- Native document queries
- User familiar with MongoDB

### Consequences
- Lose Prisma type safety (use Mongoose instead)
- Different hosting (MongoDB Atlas)
- Different backup strategy

### Approval
- [ ] User approved deviation
```

---

## Quick Reference: Commands

| Task | Command |
|------|---------|
| **Create React app** | `npm create vite@latest my-app -- --template react-ts` |
| **Install Tailwind v4** | `npm install tailwindcss @tailwindcss/postcss autoprefixer` |
| **Install testing** | `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` |
| **Install Zustand** | `npm install zustand` |
| **Install Prisma** | `npm install prisma @prisma/client` |
| **Verify build** | `npm run verify` |

---

## Integration with Workflow

### When Tools Are Selected

| Phase | Tool Decision |
|-------|---------------|
| G1: Intake | User constraints captured (Q5) |
| G3: Architecture | TECH_STACK.md generated using this document |
| G5.1: Foundation | Tools installed, configured, verified |

### Enforcement Points

```
G1 (Intake)
    ↓ Q5 captures any overrides
G3 (Architecture)
    ↓ TECH_STACK.md must reference STANDARD_TOOLING.md
    ↓ Deviations require ADR
G5.1 (Foundation)
    ↓ Tool validation checklist
    ↓ npm run verify MUST pass
G5.4 (Integration)
    ↓ No new unauthorized tools
    ↓ Final verification
```

---

## Version Compatibility Matrix

| Tool | Min Version | Max Version | Notes |
|------|-------------|-------------|-------|
| Node.js | 20.0.0 | latest LTS | Use LTS only |
| React | 18.2.0 | 19.x | 19.x preferred |
| TypeScript | 5.5.0 | 5.9.x | Strict mode required |
| Vite | 6.0.0 | 7.x | Latest stable |
| Tailwind | 4.0.0 | 4.x | v4 syntax required |
| Vitest | 3.0.0 | 4.x | Match Vite major |
| Prisma | 5.10.0 | 5.x | Latest 5.x |

---

## Anti-Patterns to Avoid

| Don't Do This | Do This Instead |
|---------------|-----------------|
| `npm install webpack` | Use Vite (included) |
| `npm install jest` | Use Vitest |
| `npm install sass` | Use Tailwind |
| `npm install redux` | Use Zustand or React state |
| `npm install moment` | Use native Date or date-fns |
| `npm install lodash` | Use native JS methods |
| `npm install axios` (frontend) | Use fetch or TanStack Query |
| MySQL/SQLite | Use PostgreSQL |
| Express alternatives (Fastify, Koa) | Use Express |

---

## Extended Tools (See EXTERNAL_TOOLS.md)

The following tools are defined in `constants/reference/EXTERNAL_TOOLS.md` and should be used alongside the core tools above:

### Testing Tools
| Tool | Purpose | Required |
|------|---------|----------|
| Playwright | E2E browser testing | Recommended |
| Cypress | E2E testing (alternative) | Alternative |
| Supertest | Backend API testing | ✅ YES (backend) |
| axe-core | Accessibility testing | ✅ YES |
| Lighthouse CI | Performance audits | ✅ YES |

### Security Tools
| Tool | Purpose | Required |
|------|---------|----------|
| npm audit | Dependency vulnerabilities | ✅ YES |
| Snyk | Security scanning | Recommended |

### Monitoring Tools
| Tool | Purpose | Required |
|------|---------|----------|
| Sentry | Error tracking | ✅ YES (production) |
| Vercel Analytics | Web analytics | Recommended |

**Important:** For detailed configuration and usage of these tools, see `constants/reference/EXTERNAL_TOOLS.md`.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `constants/reference/EXTERNAL_TOOLS.md` | MCP servers, testing tools, CI/CD, monitoring |
| `constants/reference/TOOL_ENFORCEMENT.md` | Automated validation and override process |
| `constants/protocols/EXECUTION_PROTOCOL.md` | Configuration requirements (2025) |
| `templates/starters/REACT_VITE_2025.md` | Detailed React setup guide |
| `templates/docs/TECH_STACK.md` | Per-project tech stack template |

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Enforce consistent tool selection across all projects
**Maintainer:** Update when tools are upgraded or ecosystem changes
