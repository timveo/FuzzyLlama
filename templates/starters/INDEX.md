# Starter Templates

Pre-configured project templates to accelerate development. Each template includes architecture, tech stack decisions, and boilerplate structure.

---

## ⚠️ 2025 Updates

All starters now use **2025-compatible tooling**. See [REACT_VITE_2025.md](./REACT_VITE_2025.md) for:
- Tailwind CSS v4 configuration (`@tailwindcss/postcss`)
- TypeScript strict mode with `import type`
- Vitest configuration in vite.config.ts
- Single `npm run verify` command
- **Pre-commit hooks** auto-installed via `prepare` script

---

## Pre-commit Hooks (Required)

All generated projects MUST include the `prepare` script for automatic hook installation:

```json
{
  "scripts": {
    "prepare": "test -d .git && ./scripts/setup-hooks.sh || true"
  }
}
```

**Alternative (inline):**
```json
{
  "scripts": {
    "prepare": "test -d .git && cp -n templates/infrastructure/hooks/pre-commit .git/hooks/pre-commit 2>/dev/null && chmod +x .git/hooks/pre-commit || true"
  }
}
```

This ensures:
- Hooks install automatically on `npm install`
- No secrets can be committed
- Tests run before commits
- Specs are validated before commits

See [templates/infrastructure/README.md](../infrastructure/README.md) for hook details.

---

## Available Starters

| Starter | Description | Complexity | Est. Time |
|---------|-------------|------------|-----------|
| [react-vite-2025](#react-vite-2025) | **NEW** Modern React + Vite + Tailwind v4 | Low | 1-2 days |
| [saas-app](#saas-app) | Full SaaS with auth, billing, dashboard | High | 4-6 weeks |
| [ai-chatbot](#ai-chatbot) | AI chatbot with streaming, history | Medium | 2-3 weeks |
| [api-only](#api-only) | Headless REST API | Low | 1-2 weeks |
| [landing-page](#landing-page) | Marketing site with CMS | Low | 1 week |

---

## React Vite 2025

Modern React application with 2025-compatible tooling.

### Tech Stack (Pre-decided)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + TypeScript 5.9 | Latest stable |
| Build | Vite 7+ | Fast builds, HMR |
| Styling | Tailwind CSS 4.x | v4 with @tailwindcss/postcss |
| Testing | Vitest 4+ | Fast, Vite-native |
| Charts | Recharts 3+ | If needed |

### Key Configuration

See [REACT_VITE_2025.md](./REACT_VITE_2025.md) for complete setup.

**Critical differences from older templates:**
- `postcss.config.js`: Use `@tailwindcss/postcss`, not `tailwindcss`
- `index.css`: Use `@import "tailwindcss"`, not `@tailwind` directives
- TypeScript: Use `import type` for all type-only imports
- `vite.config.ts`: Include `/// <reference types="vitest/config" />`

---

## SaaS App

Full-featured SaaS application with authentication, team management, and billing.

> **Note:** Uses 2025 tooling. See [REACT_VITE_2025.md](./REACT_VITE_2025.md) for configuration details.

### Tech Stack (Pre-decided)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + TypeScript 5.9 + Vite 7 | Fast builds, type safety |
| Styling | Tailwind CSS 4.x + shadcn/ui | Rapid development, consistent UI |
| State | Zustand | Simple, minimal boilerplate |
| Backend | Node.js + Express + TypeScript | JavaScript ecosystem |
| ORM | Prisma | Type-safe queries |
| Database | PostgreSQL | Reliable, scalable |
| Auth | Custom JWT + bcrypt | Full control, no vendor lock-in |
| Payments | Stripe | Industry standard |
| Email | SendGrid/Resend | Transactional email |
| Hosting | Vercel + Railway | Easy deployment, good free tier |

### Directory Structure

```
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn components
│   │   │   ├── common/          # Shared components
│   │   │   ├── layout/          # Layout components
│   │   │   └── features/        # Feature-specific
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Zustand stores
│   │   ├── services/            # API clients
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Helpers
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/              # Environment, constants
│   │   ├── controllers/         # Route handlers
│   │   ├── middleware/          # Auth, validation, errors
│   │   ├── routes/              # Express routes
│   │   ├── services/            # Business logic
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Helpers
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── STATUS.md
│   ├── DECISIONS.md
│   └── MEMORY.md
└── README.md
```

### Pre-built Features

- [x] User registration and login
- [x] JWT authentication with refresh tokens
- [x] Password reset flow
- [x] User profile management
- [x] Team/workspace creation
- [x] Team member invitations
- [x] Role-based access control (RBAC)
- [x] Stripe subscription integration
- [x] Usage-based billing support
- [x] Webhook handling
- [x] Email notifications
- [x] Dashboard layout
- [x] Settings pages
- [x] Error boundaries
- [x] Loading states
- [x] Responsive design

### Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  avatarUrl     String?
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  memberships   TeamMember[]
  refreshTokens RefreshToken[]
}

model Team {
  id               String   @id @default(uuid())
  name             String
  slug             String   @unique
  stripeCustomerId String?
  subscriptionId   String?
  subscriptionStatus String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  members TeamMember[]
}

model TeamMember {
  id       String   @id @default(uuid())
  teamId   String
  userId   String
  role     Role     @default(MEMBER)
  joinedAt DateTime @default(now())
  
  team Team @relation(fields: [teamId], references: [id])
  user User @relation(fields: [userId], references: [id])
  
  @@unique([teamId, userId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

### API Endpoints (Pre-defined)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register user |
| POST | /auth/login | Login user |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout user |
| POST | /auth/forgot-password | Request reset |
| POST | /auth/reset-password | Reset password |
| GET | /users/me | Get current user |
| PATCH | /users/me | Update profile |
| GET | /teams | List user's teams |
| POST | /teams | Create team |
| GET | /teams/:id | Get team |
| PATCH | /teams/:id | Update team |
| DELETE | /teams/:id | Delete team |
| POST | /teams/:id/invite | Invite member |
| DELETE | /teams/:id/members/:userId | Remove member |
| POST | /billing/create-checkout | Start checkout |
| POST | /billing/portal | Billing portal |
| POST | /webhooks/stripe | Stripe webhook |

### Estimated Costs

| Category | Monthly |
|----------|---------|
| Vercel Pro | $20 |
| Railway (Backend + DB) | $20-50 |
| SendGrid | $0-20 |
| Stripe | 2.9% + $0.30/txn |
| **Total** | **$40-90** |

---

## AI Chatbot

AI-powered chatbot with streaming responses, conversation history, and multiple model support.

### Tech Stack (Pre-decided)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 (App Router) | SSR, API routes, streaming |
| Styling | Tailwind CSS | Rapid development |
| AI SDK | Vercel AI SDK | Streaming, multiple providers |
| AI Provider | Anthropic Claude | Best quality, good streaming |
| Database | Supabase (PostgreSQL) | Free tier, auth included |
| Hosting | Vercel | Seamless Next.js deployment |

### Directory Structure

```
project/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (chat)/
│   │   ├── chat/
│   │   │   └── [id]/
│   │   └── history/
│   ├── api/
│   │   ├── chat/
│   │   └── conversations/
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessages.tsx
│   │   ├── MessageBubble.tsx
│   │   └── StreamingMessage.tsx
│   └── ui/
├── lib/
│   ├── ai.ts
│   ├── supabase.ts
│   └── utils.ts
├── types/
└── docs/
```

### Pre-built Features

- [x] Streaming chat responses
- [x] Conversation history
- [x] New conversation creation
- [x] Message persistence
- [x] User authentication (Supabase)
- [x] Model selection (Claude Sonnet/Haiku)
- [x] Token counting and limits
- [x] Error handling with retry
- [x] Mobile responsive
- [x] Markdown rendering
- [x] Code syntax highlighting
- [x] Copy message button

### Key Code Patterns

**Streaming API Route:**
```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages, model = 'claude-3-sonnet-20240229' } = await req.json();

  const result = await streamText({
    model: anthropic(model),
    messages,
    maxTokens: 4096,
  });

  return result.toDataStreamResponse();
}
```

**Chat Component:**
```typescript
// components/chat/Chat.tsx
'use client';

import { useChat } from 'ai/react';

export function Chat({ conversationId }: { conversationId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    id: conversationId,
  });

  return (
    <div className="flex flex-col h-full">
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
```

### Estimated Costs

| Category | Monthly (1K users) |
|----------|-------------------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Claude API | $100-500 |
| **Total** | **$145-545** |

---

## API Only

Headless REST API for mobile apps or third-party integrations.

### Tech Stack (Pre-decided)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Framework | Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT |
| Docs | OpenAPI/Swagger |
| Testing | Vitest + Supertest |
| Hosting | Railway |

### Directory Structure

```
project/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── validations/
│   └── app.ts
├── prisma/
├── tests/
├── docs/
│   ├── openapi.yaml
│   └── ...
└── package.json
```

### Pre-built Features

- [x] RESTful API structure
- [x] JWT authentication
- [x] Request validation (Zod)
- [x] Error handling
- [x] Rate limiting
- [x] CORS configuration
- [x] OpenAPI documentation
- [x] Health check endpoint
- [x] Logging (Pino)
- [x] Testing setup

### Estimated Costs

| Category | Monthly |
|----------|---------|
| Railway (API + DB) | $10-30 |
| **Total** | **$10-30** |

---

## Landing Page

Marketing landing page with CMS for content management.

### Tech Stack (Pre-decided)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 |
| Styling | Tailwind CSS |
| CMS | Contentlayer or MDX |
| Analytics | Vercel Analytics |
| Forms | Formspree or Resend |
| Hosting | Vercel |

### Pre-built Features

- [x] Hero section
- [x] Features grid
- [x] Pricing table
- [x] Testimonials
- [x] FAQ accordion
- [x] Contact form
- [x] Blog (MDX)
- [x] SEO optimization
- [x] Open Graph images
- [x] Mobile responsive
- [x] Dark mode

### Estimated Costs

| Category | Monthly |
|----------|---------|
| Vercel (Hobby/Pro) | $0-20 |
| Domain | ~$1 |
| **Total** | **$1-21** |

---

## Using a Starter

1. **Select starter:** Tell the Orchestrator which starter to use
2. **Customize:** Provide project-specific requirements
3. **Skip decisions:** ADRs for pre-decided tech stack are auto-generated
4. **Accelerate:** Architecture phase reduced from 2-3 days to 1 day
5. **Focus:** More time on unique features, less on boilerplate

### Example

```
User: "Create a new project using the saas-app starter for a project management tool"

Orchestrator:
1. Creates project structure from saas-app template
2. Generates ADRs for pre-decided stack
3. Skips tech selection (already decided)
4. Product Manager focuses on unique features only
5. Architecture phase focuses on custom data models
```

---

## Creating New Starters

When patterns emerge across projects, create a new starter:

1. Identify common patterns (3+ projects with similar stack)
2. Document tech stack decisions
3. Create directory structure
4. Add boilerplate code
5. Document pre-built features
6. Add to this index

---

**Version:** 1.0.0
**Last Updated:** 2024-01-15
