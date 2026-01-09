# Agent Index

Lightweight reference for the Orchestrator. Load full agent prompts only when activating that agent.

---

## Teaching Level (All Agents Must Check)

**Before ANY user-facing communication, check `docs/INTAKE.md` for teaching level:**

| Level | Communication Style |
|-------|---------------------|
| `NOVICE` | Full explanations, define terms, analogies, teaching moments |
| `INTERMEDIATE` | Explain key decisions, offer options, define advanced terms |
| `EXPERT` | Concise, trade-offs only, technical terminology OK |

**See:** `constants/reference/TEACHING_PROTOCOL.md` for detailed guidance.

---

## Quick Reference

| Agent | Primary Phase | Key Outputs | Depends On | Hands Off To |
|-------|---------------|-------------|------------|--------------|
| **Orchestrator** | All | STATUS.md, coordination | - | Any agent |
| **Product Manager** | Planning | PRD.md, user stories | Orchestrator | Architect |
| **Architect** | Architecture | ARCHITECTURE.md, schemas, API spec | Product Manager | Dev team |
| **UX/UI Designer** | Design | Wireframes, design system, specs | Product Manager | Frontend Dev |
| **Frontend Developer** | Development | React components, pages, tests | Architect, UX/UI | QA Engineer |
| **Backend Developer** | Development | API endpoints, services, tests | Architect | QA Engineer |
| **Data Engineer** | Development | Pipelines, data models, quality | Architect | ML Engineer |
| **ML Engineer** | ML Development | Model integration, AI architecture | Data Engineer | Model Evaluator |
| **Prompt Engineer** | ML Development | Prompt library, chains | ML Engineer | Model Evaluator |
| **Model Evaluator** | ML Development | Benchmarks, evaluation reports | ML/Prompt Eng | AIOps Engineer |
| **QA Engineer** | Testing | Test plans, bug reports, sign-off | Dev team | Security Eng |
| **Security & Privacy Engineer** | Security Review | Threat model, security approval | QA Engineer | DevOps |
| **DevOps Engineer** | Deployment | Infrastructure, CI/CD, monitoring | Security Eng | Orchestrator |
| **AIOps Engineer** | Deployment | AI infrastructure, model serving | Model Evaluator | DevOps |

---

## Agent Capabilities Matrix

### Traditional Development

| Capability | PM | Arch | UX | FE | BE | Data | QA | Sec | DevOps |
|------------|:--:|:----:|:--:|:--:|:--:|:----:|:--:|:---:|:------:|
| Requirements | ✅ | 🔍 | 🔍 | | | | 🔍 | 🔍 | |
| System Design | | ✅ | | | | 🔍 | | 🔍 | |
| UI/UX Design | 🔍 | | ✅ | 🔍 | | | | | |
| Frontend Code | | | | ✅ | | | | | |
| Backend Code | | | | | ✅ | | | | |
| Database | | 🔍 | | | ✅ | ✅ | | | |
| Data Pipelines | | | | | | ✅ | | | |
| Testing | | | | 🔍 | 🔍 | | ✅ | 🔍 | |
| Self-Healing | | | | ✅ | ✅ | | ✅ | | |
| Security | | 🔍 | | | | | | ✅ | 🔍 |
| Deployment | | | | | | | | | ✅ |

✅ = Primary responsibility | 🔍 = Reviews/Consults

### AI/ML Development

| Capability | ML | Prompt | Eval | AIOps |
|------------|:--:|:------:|:----:|:-----:|
| Model Selection | ✅ | 🔍 | 🔍 | |
| Model Integration | ✅ | | | |
| Prompt Design | 🔍 | ✅ | 🔍 | |
| Prompt Optimization | | ✅ | 🔍 | |
| Model Evaluation | | | ✅ | |
| A/B Testing | | | ✅ | 🔍 |
| AI Infrastructure | | | | ✅ |
| Model Monitoring | | | 🔍 | ✅ |
| Cost Optimization | 🔍 | | | ✅ |

---

## Activation Triggers

### By User Request
- "Create PRD" → Product Manager
- "Design the architecture" → Architect
- "Design the UI" → UX/UI Designer
- "Build the frontend" → Frontend Developer
- "Build the API" → Backend Developer
- "Set up data pipelines" → Data Engineer
- "Integrate AI/ML" → ML Engineer
- "Optimize prompts" → Prompt Engineer
- "Evaluate the model" → Model Evaluator
- "Test the application" → QA Engineer
- "Review security" → Security & Privacy Engineer
- "Deploy to production" → DevOps Engineer
- "Deploy AI services" → AIOps Engineer

### Special: AI-Generated Code Transition
- "Lovable project" → AI-Generated Code Protocol (`constants/LOVABLE_TRANSITION.md`)
- "Vercel V0 code" → AI-Generated Code Protocol (same flow)
- "Bolt.new code" → AI-Generated Code Protocol (same flow)
- "Replit Agent project" → AI-Generated Code Protocol (same flow)
- "Base44 app" → AI-Generated Code Protocol (same flow)
- "AI-generated prototype" → AI-Generated Code Protocol
- Activation: Architect (assessment) → Security Engineer (early) → Backend Developer (rebuild)
- **Note:** Same protocol applies to ALL AI code generators - they share common patterns

### By Phase Transition
| Entering Phase | Activate |
|----------------|----------|
| `planning` | Product Manager |
| `architecture` | Architect |
| `design` | UX/UI Designer |
| `development` | Frontend Developer, Backend Developer |
| `ml_development` | ML Engineer, Prompt Engineer, Data Engineer |
| `testing` | QA Engineer |
| `security_review` | Security & Privacy Engineer |
| `deployment` | DevOps Engineer, AIOps Engineer |

---

## Agent Summaries (50 words each)

### Orchestrator
Coordinates all agents, manages project state machine, enforces quality gates, resolves conflicts, handles escalations. Maintains STATUS.md and DECISIONS.md. Entry point for all projects. Never writes code directly.

### Product Manager
Owns requirements and PRD. Creates user personas, writes user stories with acceptance criteria, prioritizes backlog, manages scope. Success metrics champion. Hands off to Architect after stakeholder approval.

### Architect
Designs technical foundation. Selects tech stack, creates system diagrams, defines database schema, specifies API contracts, documents ADRs. Ensures scalability, security, maintainability. Hands off to development team.

### UX/UI Designer
Creates user experience. Conducts research, builds personas, designs user flows, creates wireframes, defines design system with tokens. Ensures WCAG AA accessibility. Hands off specs to Frontend Developer.

### Frontend Developer
Builds user interface. React + TypeScript + Vite stack. Creates components, pages, state management, API integration. Writes tests (>80% coverage). **Self-healing enabled:** Auto-verifies and fixes errors before handoff.

### Backend Developer
Builds API and services. Node.js + Express + Prisma stack. Creates endpoints, business logic, database operations, authentication. Writes tests (>80% coverage). **Self-healing enabled:** Auto-verifies and fixes errors before handoff.

### Data Engineer
Builds data infrastructure. Creates pipelines (batch/streaming), data models, quality checks. Manages data warehouse, feature store, lineage. Ensures SLAs met. Supports ML Engineer with features.

### ML Engineer
Integrates AI/ML models. Selects models (Claude, GPT-4, etc.), designs AI architecture (RAG, agents), implements model routing. Optimizes for cost/latency/quality. Works with Prompt Engineer.

### Prompt Engineer
Designs and optimizes prompts. Creates prompt templates, implements chains, manages prompt library with versioning. Tests prompt quality, reduces tokens, improves consistency. Works with ML Engineer.

### Model Evaluator
Evaluates AI/ML performance. Runs benchmarks, tests accuracy/latency/cost, checks for bias and hallucinations. Creates evaluation reports, approves models for production. Sets up A/B testing.

### QA Engineer
Ensures quality. Creates test plans, executes functional/UI/API/performance tests, reports bugs, validates fixes. Owns quality gate decision. Blocks deployment if critical issues found. **Self-healing enabled:** Auto-fixes flaky tests before handoff.

### Security & Privacy Engineer
Protects the system. Conducts threat modeling, reviews authentication/authorization, validates data protection, runs security scans. Ensures compliance (SOC 2, GDPR). Approves for production deployment.

### DevOps Engineer
Deploys and operates. Sets up infrastructure (Vercel, Railway, K8s), configures CI/CD, implements monitoring/alerting. Creates runbooks, tests rollback procedures. Manages production environment.

### AIOps Engineer
Operates AI services. Deploys model serving infrastructure, implements model router, sets up AI monitoring. Manages costs, detects drift, triggers retraining. Works with DevOps on infrastructure.

---

## Duration Estimates (AI-Assisted)

| Agent | AI Execution Time | Notes |
|-------|-------------------|-------|
| Orchestrator | 5-15 min per gate | Coordination overhead |
| Product Manager | 1-3 hours | PRD, user stories |
| Architect | 2-4 hours | Tech design, API specs |
| UX/UI Designer | 2-4 hours | Wireframes, design system |
| Frontend Developer | 4-12 hours | Components, pages, tests |
| Backend Developer | 4-10 hours | API, services, tests |
| Data Engineer | 3-6 hours | Pipelines, data models |
| ML Engineer | 4-8 hours | Model integration |
| Prompt Engineer | 2-4 hours | Prompt library |
| Model Evaluator | 2-4 hours | Benchmarks, testing |
| QA Engineer | 2-4 hours | Test execution |
| Security & Privacy Engineer | 1-2 hours | Security review |
| DevOps Engineer | 1-3 hours | Infrastructure, CI/CD |
| AIOps Engineer | 2-4 hours | AI deployment |

**Project Totals (AI Execution Time):**
| Type | Duration | With Approvals |
|------|----------|----------------|
| Simple MVP | 5-8 hours | 1-2 days |
| Standard App | 18-33 hours | 3-5 days |
| AI/ML Project | 32-72 hours | 2-3 weeks |

**See:** `constants/reference/DURATION_ESTIMATES.md` for detailed breakdowns by task and project type.

---

## Agent Token Usage (Claude Costs)

**Estimated token usage per phase when using Claude agents:**

| Phase | Input Tokens | Output Tokens | Est. Cost (Sonnet) |
|-------|--------------|---------------|-------------------|
| G0-G1: Startup + Intake | 2,500-6,000 | 3,500-9,000 | $0.06-0.17 |
| G2: PRD | 5,000-15,000 | 10,000-30,000 | $0.20-0.60 |
| G3: Architecture | 10,000-30,000 | 15,000-50,000 | $0.30-1.00 |
| G4: Design | 5,000-15,000 | 10,000-25,000 | $0.20-0.50 |
| G5: Development | 50,000-200,000 | 100,000-500,000 | $2.00-10.00 |
| G6-G7: Testing + Security | 15,000-45,000 | 30,000-90,000 | $0.60-1.80 |
| G8-G9: Deploy + Production | 5,000-15,000 | 8,000-30,000 | $0.15-0.60 |

**Project Totals:**
| Project Size | Total Tokens | Estimated Cost |
|--------------|--------------|----------------|
| Simple MVP | 100K-300K | $3-10 |
| Standard App | 300K-700K | $10-25 |
| Complex App | 700K-1.5M | $25-60 |

**See:** `constants/reference/AGENT_COST_TRACKING.md` for detailed cost tracking, budgeting, and optimization.

---

## Self-Healing Capability

Development agents (Frontend Developer, Backend Developer, QA Engineer) have **autonomic self-healing** enabled. This means:

1. **Automatic Verification**: After writing code, agents run verification commands (`npm run typecheck && npm run lint && npm run build && npm test`)
2. **Internal Error Resolution**: On failure, agents parse errors, reflect, fix, and retry (up to 3 attempts)
3. **Hidden from User**: Internal failures are NEVER shown to the user - only final results
4. **Escalation**: If 3 attempts fail, agent escalates with options for user decision

### Self-Healing Agents

| Agent | Verification Commands | Max Attempts |
|-------|----------------------|--------------|
| Frontend Developer | typecheck, lint, build, test | 3 |
| Backend Developer | typecheck, lint, build, test, prisma generate | 3 |
| QA Engineer | test (flaky test detection and fix) | 3 |

**Protocol:** `constants/protocols/SELF_HEALING_PROTOCOL.md`

---

## Agent-to-PM Query Routing Protocol

When development agents encounter requirement gaps or ambiguities, they MUST route queries properly rather than making assumptions.

### Query Types

| Type | Route To | Response Expected |
|------|----------|-------------------|
| **Requirement clarification** | Product Manager | Within gate, immediate |
| **Technical constraint** | Architect | Within gate, immediate |
| **Security concern** | Security Engineer | Can continue, async |
| **UX decision** | UX/UI Designer | Can continue, async |
| **User decision** | User (via Orchestrator) | BLOCKING |

### Query Protocol

```markdown
## QUERY-XXX: [Brief Description]

**From:** [Agent Name]
**To:** [Target Agent]
**Gate:** G[X]
**Blocking:** Yes/No
**Timestamp:** YYYY-MM-DDTHH:MM:SSZ

### Question
[Clear, specific question]

### Context
[Why this matters, what triggered the question]

### Options (if known)
A) [Option A with trade-offs]
B) [Option B with trade-offs]
C) [Ask user to decide]

### Current Assumption
[What agent will do if no response]

### Response Deadline
[When agent needs answer to continue]
```

### Routing Rules

1. **Requirement Gaps** → Product Manager
   - Missing acceptance criteria
   - Unclear user story
   - Feature scope questions
   - Priority conflicts

2. **Technical Decisions** → Architect
   - Pattern selection
   - Integration approach
   - Performance trade-offs
   - Third-party service choices

3. **User Input Required** → Orchestrator → User
   - Budget decisions
   - Timeline changes
   - Feature removal
   - Any scope change

### Escalation Timeline

| Priority | Response Window | If No Response |
|----------|-----------------|----------------|
| **Critical (blocking)** | 30 minutes | Escalate to user |
| **High** | 2 hours | Use documented assumption |
| **Medium** | End of phase | Use documented assumption |
| **Low** | Next gate | Log and continue |

### Never Make Assumptions About

- [ ] User-facing feature removal
- [ ] Security compromises
- [ ] Data privacy decisions
- [ ] Cost/budget changes
- [ ] Timeline commitments

**When in doubt, escalate to Orchestrator.**

---

## Loading Full Agent

When ready to activate an agent:

```
Read: agents/[agent-file].md
```

Only load the specific agent needed. Unload when transitioning to next agent.
