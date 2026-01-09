# Architecture Decision Records: Todo App

This document tracks all significant decisions made during the project.

---

## DEC-001: Frontend Framework - React

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need to select a frontend framework for the todo app. Must be modern, well-supported, and easy to deploy.

### Decision
Use **React 18 with TypeScript** and **Vite** as the build tool.

### Rationale
- Industry standard with massive ecosystem
- Excellent TypeScript support
- Vite provides fast development experience
- Easy deployment to Vercel
- Huge community for troubleshooting

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Vue 3 | Clean syntax, good DX | Smaller ecosystem | Less resources for learning |
| Svelte | Best performance | Smaller community | Less mature ecosystem |
| Vanilla JS | No framework overhead | More boilerplate | Reinventing the wheel |

### Consequences
- Must manage component state (using Zustand)
- JSX learning curve (minimal for this project)
- Good documentation available

---

## DEC-002: Backend Framework - Express

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need a backend framework for the REST API. Must be lightweight and easy to deploy.

### Decision
Use **Express.js with TypeScript**.

### Rationale
- Minimal and flexible
- Large middleware ecosystem
- Works well with Prisma ORM
- Easy deployment to Railway
- Same language as frontend (TypeScript)

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Fastify | Better performance | Smaller ecosystem | Overkill for simple app |
| NestJS | Full-featured, opinionated | Heavy, steeper learning curve | Over-engineered for this |
| Next.js API Routes | All-in-one solution | Tied to Next.js frontend | Want separate deployment |

### Consequences
- Must set up middleware manually
- Need to structure routes ourselves
- Full control over API design

---

## DEC-003: Database - PostgreSQL

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need a database for storing users and tasks. Must be reliable and have a free hosting tier.

### Decision
Use **PostgreSQL 16** hosted on **Railway**.

### Rationale
- Production-grade from day one
- Railway offers free tier
- Works seamlessly with Prisma
- Better concurrency than SQLite
- Industry standard for web apps

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| SQLite | Simpler, no server | Limited concurrency | Not production-ready |
| MongoDB | Flexible schema | Overkill for relational data | Tasks are relational |
| Supabase | Built-in auth | More to learn | Want simpler stack |

### Consequences
- Need to manage database migrations
- Connection string as environment variable
- Prisma handles complexity

---

## DEC-004: State Management - Zustand

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
React apps need state management for auth state and task data.

### Decision
Use **Zustand** for global state management.

### Rationale
- Minimal boilerplate
- No providers needed
- Simple API
- Works well with TypeScript
- Built-in persist middleware

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Redux | Predictable, DevTools | Too much boilerplate | Overkill |
| React Context | Built-in | Re-render issues | Performance concerns |
| Jotai | Atomic model | Less intuitive | Learning curve |

### Consequences
- Simple store setup
- Must handle hydration for persisted state

---

## DEC-005: Authentication - JWT in localStorage

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need to authenticate users and protect API endpoints.

### Decision
Use **JWT tokens** stored in **localStorage** with 24-hour expiry.

### Rationale
- Stateless authentication
- Simple to implement
- Works well with SPA
- No session storage needed on server

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Session cookies | More secure, revocable | Stateful, CSRF needed | More complex |
| JWT in httpOnly cookie | Secure from XSS | CORS complexity | Deployment complexity |
| OAuth providers | No password handling | External dependency | Overkill for personal app |

### Consequences
- Tokens can't be revoked (mitigated by short expiry)
- Must handle token refresh
- Vulnerable to XSS (mitigated by CSP)

### Security Mitigations
- Short 24-hour token expiry
- HTTPS only
- Input sanitization
- CSP headers

---

## DEC-006: Styling - Tailwind CSS

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need a styling approach that allows rapid development without custom CSS files.

### Decision
Use **Tailwind CSS** with utility classes.

### Rationale
- Rapid prototyping
- No CSS file management
- Consistent spacing/colors
- Responsive utilities built-in
- Works great with React

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| CSS Modules | Scoped styles | More files to manage | Slower development |
| styled-components | CSS-in-JS | Runtime overhead | Bundle size |
| Plain CSS | No dependencies | Harder to maintain | Inconsistent styling |

### Consequences
- Utility classes in JSX
- Must learn Tailwind conventions
- Excellent for component-based development

---

## DEC-007: Deployment Platform - Vercel + Railway

**Date:** 2024-01-17
**Decided By:** Architect Agent
**Status:** Accepted

### Context
Need to deploy frontend (static) and backend (Node.js) separately with free tiers.

### Decision
- **Frontend:** Vercel (static hosting)
- **Backend:** Railway (Node.js + PostgreSQL)

### Rationale
- Both have generous free tiers
- Vercel optimized for React/Vite
- Railway supports Node.js and PostgreSQL
- Easy GitHub integration
- Automatic deploys on push

### Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| All on Vercel | One platform | Serverless limitations | Cold starts for API |
| All on Railway | One platform | Less optimized for static | Vercel better for frontend |
| AWS | Most flexible | Complex setup | Overkill |

### Consequences
- Two deployment pipelines
- Must configure CORS between domains
- Environment variables in two places

---

## DEC-008: No Categories in MVP

**Date:** 2024-01-16
**Decided By:** Product Manager Agent
**Status:** Accepted

### Context
User requested categories/tags but we need to keep MVP scope small.

### Decision
**Defer categories to v2**. MVP will only have task status filtering.

### Rationale
- Keeps MVP simple and achievable
- Core functionality (add, complete, delete, filter) is sufficient
- Can add categories later without major refactoring

### Consequences
- User may feel limited
- Database schema designed to accommodate future categories
- Clear path for v2 enhancement

---

## Decision Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| DEC-001 | Frontend Framework | Accepted | 2024-01-17 |
| DEC-002 | Backend Framework | Accepted | 2024-01-17 |
| DEC-003 | Database Selection | Accepted | 2024-01-17 |
| DEC-004 | State Management | Accepted | 2024-01-17 |
| DEC-005 | Authentication | Accepted | 2024-01-17 |
| DEC-006 | Styling Approach | Accepted | 2024-01-17 |
| DEC-007 | Deployment Platform | Accepted | 2024-01-17 |
| DEC-008 | Scope: No Categories | Accepted | 2024-01-16 |
