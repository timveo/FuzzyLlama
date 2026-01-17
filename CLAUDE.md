# CLAUDE.md - Project Context for AI Assistants

## What is FuzzyLlama?

**FuzzyLlama is a web application** that helps users plan, design, develop, and deploy production software. It provides a UI-driven experience for orchestrating AI-powered multi-agent software development.

> **Important:** FuzzyLlama is an **application**, not a framework. It is derived from the Multi-Agent-Product-Creator framework (a separate repo containing agent prompts and protocols). All capabilities from that framework must be built into FuzzyLlama as product features.

## Relationship to Multi-Agent-Product-Creator

The `Multi-Agent-Product-Creator` repo contains:
- Agent prompt templates (orchestrator, product manager, architect, etc.)
- Protocols for agent coordination, handoffs, and approvals
- Constants defining phases, states, and workflows

FuzzyLlama takes these concepts and builds them into a **user-facing product** with:
- A web UI for project management and agent interaction
- Backend services to orchestrate agent workflows
- Database persistence for project state, decisions, and artifacts
- Real-time updates via WebSocket
- Integration with AI providers (Claude, OpenAI)
- GitHub, Stripe, and deployment platform integrations

## Core Architecture

```
FuzzyLlama/
├── backend/          # NestJS API (17 modules)
├── frontend/         # React + Vite application
├── mcp-server/       # MCP state management server
├── agents/           # Agent prompt templates (from framework)
├── constants/        # Protocols and definitions (from framework)
├── templates/        # Project starter templates
└── docs/             # Documentation
```

## Tech Stack

- **Backend:** NestJS, PostgreSQL, Prisma, Redis, Bull queues
- **Frontend:** React 19, Vite, Tailwind CSS, Zustand, TanStack Query
- **Real-time:** Socket.io
- **AI:** Anthropic Claude SDK, OpenAI SDK
- **Integrations:** GitHub OAuth, Stripe, Railway, AWS S3/Cloudflare R2

## Key Features to Implement

All agent framework capabilities must become FuzzyLlama features:

1. **Multi-Agent Orchestration** - 14 specialized agents coordinated through the UI
2. **Approval Gates (G1-G9)** - Human checkpoints with proof artifacts
3. **Project Workflows** - Greenfield, enhancement, and AI-generated code paths
4. **Task Queue** - Parallel task execution with real-time status
5. **Context & Memory** - Cross-project learning, error history, embeddings
6. **Teaching Modes** - Novice, intermediate, and expert user experiences

## Development Guidelines

- The `agents/` and `constants/` directories contain reference material from the framework
- When implementing features, translate protocol definitions into actual code
- The MCP server provides state management tools for agent interactions
- Use the existing Prisma schema as the source of truth for data models

## Current Status

MVP Foundation phase - infrastructure and scaffolding complete, core features in progress.
