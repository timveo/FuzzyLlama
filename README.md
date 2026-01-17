# FuzzyLlama

An AI-powered application that helps users plan, design, develop, and deploy production software through coordinated multi-agent workflows.

## Overview

FuzzyLlama orchestrates specialized AI agents to guide users through the complete software development lifecycle—from initial concept to production deployment. It provides human oversight at critical decision points while automating the heavy lifting of professional software development.

> **Note:** FuzzyLlama is derived from the [Multi-Agent-Product-Creator](https://github.com/your-org/Multi-Agent-Product-Creator) framework. All capabilities from that agent framework are being built into FuzzyLlama as product features with a full web UI.

### What It Does

- **Plan** - AI-assisted requirements gathering, PRD creation, and architecture design
- **Design** - UX/UI wireframes, design systems, and component specifications
- **Develop** - Coordinated frontend and backend development with quality checks
- **Deploy** - Security review, infrastructure setup, and production deployment

## Key Features

### Multi-Agent System
14 specialized agents work together:
- **Orchestrator** - Coordinates workflow and task assignment
- **Product Manager** - Requirements and PRD creation
- **Architect** - System design and tech stack selection
- **Frontend/Backend Developers** - Implementation
- **QA Engineer** - Testing and validation
- **Security Engineer** - Security audits and compliance
- **DevOps Engineer** - Infrastructure and CI/CD
- Plus ML-specific agents for AI/ML projects

### Approval Gates
9 human checkpoints ensure quality and alignment:

| Gate | When | Decision |
|------|------|----------|
| **G1** | After intake | Approve scope |
| **G2** | After planning | Approve PRD |
| **G3** | After architecture | Approve tech stack |
| **G4** | After design | Approve UX/UI |
| **G5** | After development | Accept features |
| **G6** | After testing | Quality sign-off |
| **G7** | After security | Security acceptance |
| **G8** | Pre-deployment | Go/no-go |
| **G9** | Post-deployment | Production acceptance |

### Project Workflows
- **Greenfield** - New projects from scratch
- **Enhancement** - Adding features to existing codebases
- **AI-Generated** - Projects with AI/ML components

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Backend | NestJS, PostgreSQL, Prisma, Redis, Bull |
| Frontend | React 19, Vite, Tailwind CSS, Zustand |
| Real-time | Socket.io WebSockets |
| AI | Anthropic Claude, OpenAI |
| Integrations | GitHub, Stripe, Railway |

## Project Structure

```
FuzzyLlama/
├── backend/          # NestJS API server (17 modules)
├── frontend/         # React web application
├── mcp-server/       # MCP state management server
├── agents/           # Agent prompt templates (from framework)
├── constants/        # Protocols and definitions (from framework)
├── templates/        # Project starter templates
├── docker/           # Docker configuration
└── docs/             # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/FuzzyLlama.git
cd FuzzyLlama

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../mcp-server && npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start database
docker compose up -d postgres redis

# Run migrations
cd backend && npx prisma migrate dev

# Start development servers
npm run dev  # In each directory
```

### Docker Setup

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

## Framework Reference

The `agents/` and `constants/` directories contain reference material from the Multi-Agent-Product-Creator framework:

### Agents (`agents/`)
14 agent prompt templates defining each agent's role, capabilities, and outputs.

### Constants (`constants/`)

| Directory | Purpose |
|-----------|---------|
| `core/` | Fundamental definitions (phases, states, enums) |
| `protocols/` | Operational protocols (startup, handoffs, approvals) |
| `advanced/` | Complex orchestration (parallel work, task queues) |
| `reference/` | Supporting documentation |

Key files:
- `constants/core/CONSTANTS.md` - Single source of truth for enums
- `constants/core/AGENT_INDEX.md` - Agent capabilities matrix
- `constants/protocols/APPROVAL_GATES.md` - Gate definitions
- `constants/protocols/PROTOCOLS.md` - Communication protocols

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Workflows](docs/WORKFLOWS.md)
- [API Documentation](http://localhost:3000/api/docs) (when running)

## Quality Targets

| Metric | Target |
|--------|--------|
| Test coverage | ≥80% |
| API response p95 | <500ms |
| Page load p95 | <2000ms |
| Lighthouse performance | ≥90 |
| Security vulnerabilities | 0 critical/high |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[License details]
