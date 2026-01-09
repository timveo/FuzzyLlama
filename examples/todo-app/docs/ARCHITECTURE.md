# Architecture Document: Todo App

**Version:** 1.0
**Last Updated:** 2024-01-17
**Author:** Architect Agent
**Status:** Approved
**Approval Gate:** G3 Passed

---

## 1. Executive Summary

A simple, two-tier web application with a React frontend and Express backend. Data persisted in PostgreSQL. Deployed on Vercel (frontend) and Railway (backend + database).

**Architecture Pattern:** Monolith (simple app, no need for microservices)
**API Style:** REST

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Browser                           │   │
│  │              React SPA (Vite)                       │   │
│  └───────────────────────┬─────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      CDN / Edge                              │
│                   (Vercel Edge Network)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
           ┌────────────────┴────────────────┐
           │                                 │
           ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│     FRONTEND        │           │      BACKEND        │
│                     │           │                     │
│  Static Assets      │   API     │  Express Server     │
│  (Vercel)           │ ───────▶  │  (Railway)          │
│                     │           │                     │
└─────────────────────┘           └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │    PostgreSQL       │
                                  │    (Railway)        │
                                  └─────────────────────┘
```

### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │    Pages      │  │  Components   │  │  State (Zustand)│ │
│  │  - LoginPage  │  │  - TaskList   │  │  - authStore    │ │
│  │  - TasksPage  │  │  - TaskItem   │  │  - taskStore    │ │
│  │  - RegisterPage│ │  - TaskInput  │  │                 │ │
│  └───────────────┘  │  - FilterBar  │  └─────────────────┘ │
│                     └───────────────┘                       │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │   Services    │  │    Hooks      │                      │
│  │  - api.ts     │  │  - useAuth    │                      │
│  │  - auth.ts    │  │  - useTasks   │                      │
│  │  - tasks.ts   │  │               │                      │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │    Routes     │  │  Controllers  │  │   Middleware    │ │
│  │  /api/auth/*  │  │  authCtrl     │  │  - auth.ts      │ │
│  │  /api/tasks/* │  │  taskCtrl     │  │  - validate.ts  │ │
│  └───────────────┘  └───────────────┘  │  - error.ts     │ │
│                                        └─────────────────┘ │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │   Services    │  │    Models     │                      │
│  │  - authSvc    │  │  - User       │                      │
│  │  - taskSvc    │  │  - Task       │                      │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Framework | React | 18.2.0 | Industry standard, large ecosystem |
| Language | TypeScript | 5.3.0 | Type safety, better DX |
| Build Tool | Vite | 5.0.0 | Fast builds, HMR |
| Styling | Tailwind CSS | 3.4.0 | Rapid development |
| State | Zustand | 4.5.0 | Simple, minimal boilerplate |
| Routing | React Router | 6.20.0 | Standard React routing |
| HTTP Client | Axios | 1.6.0 | Promise-based, interceptors |

### 3.2 Backend

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 20.11.0 | LTS, stable |
| Framework | Express | 4.18.0 | Minimal, flexible |
| Language | TypeScript | 5.3.0 | Type safety |
| ORM | Prisma | 5.8.0 | Type-safe queries, migrations |
| Validation | Zod | 3.22.0 | Schema validation |
| Auth | JWT | - | Stateless auth |
| Password | bcrypt | 5.1.0 | Secure hashing |

### 3.3 Database

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Primary DB | PostgreSQL | 16 | Reliable, scalable, free tier |

### 3.4 Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend Hosting | Vercel | Free tier, instant deploys |
| Backend Hosting | Railway | Simple, good free tier |
| Database | Railway PostgreSQL | Same platform as backend |
| CI/CD | GitHub Actions | Free, integrated |

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│       users         │       │        tasks        │
├─────────────────────┤       ├─────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)       │
│ email (UNIQUE)      │───┐   │ user_id (FK)        │──┐
│ password_hash       │   │   │ title               │  │
│ created_at          │   │   │ description         │  │
│ updated_at          │   │   │ completed           │  │
└─────────────────────┘   │   │ due_date            │  │
                          │   │ created_at          │  │
                          │   │ updated_at          │  │
                          │   └─────────────────────┘  │
                          │              │             │
                          └──────────────┘─────────────┘
                              One-to-Many
```

### 4.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tasks Task[]

  @@map("users")
}

model Task {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  title       String
  description String?
  completed   Boolean   @default(false)
  dueDate     DateTime? @map("due_date")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("tasks")
}
```

---

## 5. API Design

### 5.1 Base URL

```
Production: https://api.todo-app.example.com/api/v1
Staging:    https://staging-api.todo-app.example.com/api/v1
Local:      http://localhost:3001/api/v1
```

### 5.2 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create account | No |
| POST | /auth/login | Login | No |
| POST | /auth/logout | Logout | Yes |
| GET | /auth/me | Get current user | Yes |

### 5.3 Task Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /tasks | List user's tasks | Yes |
| POST | /tasks | Create task | Yes |
| GET | /tasks/:id | Get task | Yes |
| PATCH | /tasks/:id | Update task | Yes |
| DELETE | /tasks/:id | Delete task | Yes |

### 5.4 Request/Response Examples

**POST /auth/register**
```json
// Request
{
  "email": "user@example.com",
  "password": "securepass123"
}

// Response 201
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "token": "jwt-token"
  }
}
```

**POST /tasks**
```json
// Request
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2024-01-20T00:00:00Z"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "dueDate": "2024-01-20T00:00:00Z",
    "createdAt": "2024-01-17T10:00:00Z"
  }
}
```

**GET /tasks?status=active**
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "title": "Buy groceries",
      "completed": false,
      "createdAt": "2024-01-17T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "filter": "active"
  }
}
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │  API   │                    │   DB   │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │  POST /auth/login           │                             │
    │  {email, password}          │                             │
    │────────────────────────────▶│                             │
    │                             │  Find user by email         │
    │                             │────────────────────────────▶│
    │                             │◀────────────────────────────│
    │                             │                             │
    │                             │  Verify password (bcrypt)   │
    │                             │  Generate JWT (24h expiry)  │
    │                             │                             │
    │  {token, user}              │                             │
    │◀────────────────────────────│                             │
    │                             │                             │
    │  GET /tasks                 │                             │
    │  Authorization: Bearer JWT  │                             │
    │────────────────────────────▶│                             │
    │                             │  Verify JWT                 │
    │                             │  Extract userId             │
    │                             │  Fetch tasks where userId   │
    │                             │────────────────────────────▶│
    │  {tasks}                    │◀────────────────────────────│
    │◀────────────────────────────│                             │
```

### 6.2 Security Measures

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with cost factor 12 |
| Token Auth | JWT with 24h expiry |
| HTTPS | Enforced via hosting platform |
| CORS | Whitelist frontend origin only |
| Input Validation | Zod schemas on all endpoints |
| SQL Injection | Prevented via Prisma ORM |
| XSS | React auto-escapes, CSP headers |

---

## 7. Directory Structure

### 7.1 Frontend

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   └── Input.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskInput.tsx
│   │   │   └── FilterBar.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── TasksPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useTasks.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── tasks.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── taskStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 7.2 Backend

```
backend/
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── taskController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validate.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   └── tasks.ts
│   ├── services/
│   │   ├── authService.ts
│   │   └── taskService.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── jwt.ts
│   └── app.ts
├── prisma/
│   └── schema.prisma
├── package.json
└── tsconfig.json
```

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load (LCP) | < 2s | Lighthouse |
| API Response (p95) | < 500ms | Server logs |
| Bundle Size | < 200KB gzip | Build output |
| Database Query | < 100ms | Prisma logs |

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       GitHub Repository                      │
│                    (main branch triggers)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions CI/CD                     │
│  ┌─────────────────┐              ┌─────────────────┐      │
│  │ Build Frontend  │              │ Build Backend   │      │
│  │ Run Tests       │              │ Run Tests       │      │
│  │ Type Check      │              │ Type Check      │      │
│  └────────┬────────┘              └────────┬────────┘      │
└───────────┼────────────────────────────────┼────────────────┘
            │                                │
            ▼                                ▼
┌─────────────────────┐           ┌─────────────────────┐
│       Vercel        │           │      Railway        │
│  (Static Hosting)   │           │  (Node.js + PG)     │
│                     │           │                     │
│  todo-app.vercel.app│           │  api.railway.app    │
└─────────────────────┘           └─────────────────────┘
```

---

## 10. Architecture Decision Records

### ADR-001: Monolith over Microservices

**Decision:** Use monolithic architecture
**Rationale:** Simple app with <10 endpoints, single developer, no need for independent scaling
**Consequences:** Simpler deployment, but must refactor if app grows significantly

### ADR-002: PostgreSQL over SQLite

**Decision:** Use PostgreSQL
**Rationale:** Production-ready, better concurrency, Railway provides free tier
**Consequences:** Slightly more complex setup, but production-grade from day one

### ADR-003: JWT over Session Cookies

**Decision:** Use JWT tokens stored in localStorage
**Rationale:** Stateless, simple to implement, works well with SPA
**Consequences:** Can't revoke tokens (mitigated by 24h expiry)

---

**Architect Hand-Off:**

```json
{
  "handoff": {
    "agent": "Architect",
    "timestamp": "2024-01-17T16:00:00Z",
    "status": "complete",
    "phase": "architecture",
    "project": "todo-app"
  },
  "architecture": {
    "pattern": "monolith",
    "style": "REST"
  },
  "tech_stack": {
    "frontend": {
      "framework": "React 18.2.0",
      "language": "TypeScript 5.3.0",
      "build_tool": "Vite 5.0.0",
      "styling": "Tailwind CSS 3.4.0",
      "state": "Zustand 4.5.0"
    },
    "backend": {
      "runtime": "Node.js 20.11.0",
      "framework": "Express 4.18.0",
      "language": "TypeScript 5.3.0",
      "orm": "Prisma 5.8.0"
    },
    "database": {
      "primary": "PostgreSQL 16"
    },
    "deployment": {
      "frontend": "Vercel",
      "backend": "Railway",
      "database": "Railway PostgreSQL"
    }
  },
  "deliverables": {
    "architecture_doc": "docs/ARCHITECTURE.md",
    "database_schema": "prisma/schema.prisma",
    "api_design": "docs/ARCHITECTURE.md#5-api-design"
  },
  "next_agent": "Frontend Developer, Backend Developer",
  "next_action": "Begin parallel development",
  "blockers": []
}
```
