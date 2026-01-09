# Product Creator Multi-Agent System

A comprehensive AI-powered multi-agent development system that coordinates specialized agents to build complete software applications from concept to deployment.

---

## What Is This?

**This is a prompt engineering framework**, not standalone software. It provides structured prompts and templates that guide AI assistants (like Claude Code) through professional software development practices.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  YOU  ──►  AI Assistant (Claude Code)  ──►  Your Application   │
│              │                                                  │
│              │ uses                                             │
│              ▼                                                  │
│       ┌─────────────────────────────┐                          │
│       │  This Framework             │                          │
│       │  • 14 Agent Prompts         │                          │
│       │  • Templates & Starters     │                          │
│       │  • Workflow Definitions     │                          │
│       │  • Quality Gates            │                          │
│       └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Requirements

- **Claude Code** (recommended) or another AI coding assistant
- Git installed
- Node.js 18+ (for most projects)

### Validate Your Environment

Before starting, ensure all third-party tools are installed:

```bash
./scripts/validate-environment.sh
```

This checks tools required by QA, Security, and DevOps agents (Playwright, Lighthouse, Vercel CLI, etc.)

### New Here?

**[🚀 Start Here - 5 Minute Quickstart →](NOVICE_QUICKSTART.md)** *(Recommended for beginners)*

**[📖 Detailed Getting Started Guide →](GETTING_STARTED.md)** *(More comprehensive)*

---

## ⚠️ Important: Agent System vs. Project Workspaces

```
THIS DIRECTORY                          YOUR PROJECTS
─────────────────                       ──────────────
Product-Creator-Multi-Agent-/           ~/projects/my-saas-app/
├── agents/          (prompts)          ├── docs/
├── constants/       (rules)       →    │   ├── PRD.md
├── templates/       (blueprints)       │   ├── ARCHITECTURE.md
├── schemas/         (validation)       │   └── STATUS.md
└── README.md                           ├── src/
                                        ├── package.json
This is the AGENT SYSTEM.               └── .git/
Do NOT create projects here.
                                        Projects live in SEPARATE
                                        Git repositories.
```

**The agent system is a set of instructions.** Projects are created in their own directories with their own Git repos.

---

## 🚀 Quick Start

### Starting a New Project

1. **Tell the Orchestrator where to create the project:**
   ```
   "Create a new project called 'my-saas' at ~/projects/my-saas"
   ```

2. **Or specify an existing repo to enhance:**
   ```
   "Enhance the project at ~/projects/existing-app"
   ```

3. **The system will:**
   - Initialize Git repo (if new)
   - Create `docs/` folder with STATUS.md, INTAKE.md
   - Guide you through intake questionnaire
   - Begin appropriate workflow

### Project Structure Created

```
~/projects/my-saas/                 ← YOUR PROJECT (separate repo)
├── .git/                           ← Project's own Git history
├── docs/
│   ├── INTAKE.md                   ← Your answers to intake
│   ├── STATUS.md                   ← Current project state
│   ├── PRD.md                      ← Requirements (Product Manager)
│   ├── ARCHITECTURE.md             ← System design (Architect)
│   ├── DECISIONS.md                ← Decision log
│   └── MEMORY.md                   ← Learnings
├── src/                            ← Application code
├── tests/                          ← Test suites
├── prisma/                         ← Database schema
└── package.json
```

---

## 🤖 Available Agents

### Traditional Software Development (10 Agents)

| # | Agent | File | Key Outputs |
|---|-------|------|-------------|
| 1 | **Orchestrator** | `agents/orchestrator.md` | Coordination, quality gates |
| 2 | **Product Manager** | `agents/product-manager.md` | PRD, user stories, success metrics |
| 3 | **Architect** | `agents/architect.md` | Architecture, tech stack, API design |
| 4 | **UX/UI Designer** | `agents/ux-ui-designer.md` | Wireframes, design system, specs |
| 5 | **Frontend Developer** | `agents/frontend-dev.md` | React/TypeScript UI |
| 6 | **Backend Developer** | `agents/backend-dev.md` | Node.js/Express API |
| 7 | **Data Engineer** | `agents/data-engineer.md` | Pipelines, data models |
| 8 | **QA Engineer** | `agents/qa-engineer.md` | Test plans, bug reports |
| 9 | **Security & Privacy Engineer** | `agents/security-privacy-engineer.md` | Threat model, security review |
| 10 | **DevOps Engineer** | `agents/devops.md` | Infrastructure, CI/CD |

### AI/ML Development (4 Additional Agents)

| # | Agent | File | Key Outputs |
|---|-------|------|-------------|
| 11 | **ML Engineer** | `agents/ml-engineer.md` | Model integration, AI architecture |
| 12 | **Prompt Engineer** | `agents/prompt-engineer.md` | Prompt library, optimization |
| 13 | **Model Evaluator** | `agents/model-evaluator.md` | Benchmarks, A/B tests |
| 14 | **AIOps Engineer** | `agents/aiops-engineer.md` | AI deployment, monitoring |

---

## 🏗️ System Architecture

### Constants & Protocols (Agent System)

| File | Purpose |
|------|---------|
| `constants/core/CONSTANTS.md` | **Single source of truth** for all enums, phases, severities |
| `constants/core/AGENT_INDEX.md` | Lightweight agent reference with capabilities matrix |
| `constants/protocols/PROTOCOLS.md` | Agent activation, queries, retry, rollback, escalation |
| `constants/protocols/APPROVAL_GATES.md` | Human approval checkpoints |

### Templates (Copied to Projects)

| File | Purpose |
|------|---------|
| `templates/docs/PROJECT_INTAKE.md` | Initial questionnaire |
| `templates/docs/STATUS.md` | Project status tracking |
| `templates/docs/MEMORY.md` | Project learnings |
| `templates/docs/ASSESSMENT.md` | Codebase evaluation (enhancement) |
| `templates/docs/GAP_ANALYSIS.md` | Current vs target state |
| `templates/docs/TECH_DEBT.md` | Debt inventory |
| `templates/docs/ENHANCEMENT_PLAN.md` | Improvement roadmap |

### Starter Templates

| Starter | Description | Use Case |
|---------|-------------|----------|
| **saas-app** | Full SaaS with auth, billing, dashboard | B2B/B2C SaaS |
| **ai-chatbot** | AI chatbot with streaming, history | Conversational AI |
| **api-only** | Headless REST API | Backend services |
| **landing-page** | Marketing site with CMS | Marketing |

---

## 📋 Project Workflows

### Greenfield (New Project)

```
intake → planning → architecture → design → development → testing → security → deployment
```

### Enhancement (Existing Code)

```
intake → assessment → planning → development → testing → security → deployment
```

### With AI-Generated Code (Lovable, v0, Bolt)

```
intake (with constraints) → assessment → planning (PRD ingestion) → development → ...
```

User can lock components: "Keep the frontend exactly as designed"

---

## 🚦 Human Approval Gates

| Gate | When | Decision | Proof Required |
|------|------|----------|----------------|
| **G1** | After intake | Approve scope | - |
| **G2** | After planning | Approve PRD | `prd_review` |
| **G3** | After architecture | Approve tech stack | `spec_validation` |
| **G4** | After design | Approve UX/UI | - |
| **G5** | After development | Accept features | `build_output`, `lint_output` |
| **G6** | After testing | Quality sign-off | `test_output`, `coverage_report` |
| **G7** | After security | Security acceptance | `security_scan` |
| **G8** | Pre-deployment | Go/no-go | `accessibility_audit`, `performance_audit` |
| **G9** | Post-deployment | Production acceptance | `deployment_verification` |
| **E2** | After assessment | Approve recommendation | - |

### Proof Artifact Enforcement

Gates G2, G3, and G5-G9 require **proof artifacts** - actual outputs proving validations passed or user reviewed:

```
.truth/
├── truth.json          # State with SHA256 hashes
└── proofs/
    ├── G2/             # prd-review.json (user sign-off)
    ├── G3/             # spec-validation.json
    ├── G5/             # build-output.json, lint-output.json
    ├── G6/             # test-output.json, coverage-report.json
    ├── G7/             # security-scan.json
    └── G8/             # lighthouse-report.json, axe-*.json
```

Gates **will block** without required proofs. Use `force_without_proofs: true` only with documented justification (creates audit trail).

See [examples/proof-artifact-demo/](examples/proof-artifact-demo/) for a complete demonstration.

---

## 📁 Directory Structure

### Agent System (This Repo)

```
Product-Creator-Multi-Agent-/
├── agents/                     # 14 agent prompts
│   ├── orchestrator.md
│   ├── product-manager.md
│   └── ...
├── constants/                  # System constants
│   ├── CONSTANTS.md           # Enums, phases, IDs
│   ├── AGENT_INDEX.md         # Agent capabilities
│   ├── PROTOCOLS.md           # Communication protocols
│   └── APPROVAL_GATES.md      # Human checkpoints
├── schemas/                    # JSON validation
│   ├── status.schema.json
│   └── handoff.schema.json
├── templates/                  # Project templates
│   ├── docs/                  # Document templates
│   └── starters/              # Project starters
└── README.md
```

### Project (Created Separately)

```
~/projects/[project-name]/      # ← Separate Git repo
├── .git/
├── docs/
│   ├── INTAKE.md
│   ├── STATUS.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── MEMORY.md
├── src/
├── tests/
└── ...
```

---

## ✅ Quality Targets

| Metric | Target |
|--------|--------|
| Test coverage | ≥80% |
| API response p95 | <500ms |
| Page load p95 | <2000ms |
| Lighthouse performance | ≥90 |
| Security vulnerabilities | 0 critical/high |

---

## 📚 Key Documents

| Document | When to Read |
|----------|--------------|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | **First time? Start here!** |
| **[examples/](examples/)** | **See what completed projects look like** |
| `constants/core/CONSTANTS.md` | Understanding system enums and rules |
| `constants/core/AGENT_INDEX.md` | Which agent does what |
| `constants/protocols/PROTOCOLS.md` | How agents communicate |
| `constants/protocols/APPROVAL_GATES.md` | When system pauses for approval |
| `templates/starters/INDEX.md` | Starting with a template |

---

## 🔧 MCP State Server

The framework includes an optional **MCP (Model Context Protocol) server** for programmatic state management:

```bash
cd mcp-server
npm install && npm run build
npm start
```

### Key Capabilities

| Category | Tools | Purpose |
|----------|-------|---------|
| **State Management** | 160 tools | Query/update project state atomically |
| **Result Caching** | `cache_tool_result`, `get_cached_result` | Avoid re-running expensive operations |
| **Error History** | `log_error_with_context`, `get_similar_errors` | Cross-agent learning from failures |
| **Enhanced Memory** | `search_memory`, `link_memories` | Semantic search with embeddings |
| **Session Context** | `save_session_context`, `get_handoff_context` | Persist context across conversations |
| **Learning Extraction** | `extract_learnings`, `sync_to_system_memory` | Auto-extract patterns to SYSTEM_MEMORY |

See [mcp-server/README.md](mcp-server/README.md) for full documentation.

---

**Ready to build something? Tell the Orchestrator your project name and where to create it!**
