# System Constants

This file is the **single source of truth** for all enums, agent definitions, and system constants. All other files should reference these values.

---

## Agents

### Agent Registry

| ID | Display Name | File | Category |
|----|--------------|------|----------|
| `orchestrator` | Orchestrator | `agents/orchestrator.md` | Core |
| `product-manager` | Product Manager | `agents/product-manager.md` | Traditional |
| `architect` | Architect | `agents/architect.md` | Traditional |
| `ux-ui-designer` | UX/UI Designer | `agents/ux-ui-designer.md` | Traditional |
| `frontend-developer` | Frontend Developer | `agents/frontend-dev.md` | Traditional |
| `backend-developer` | Backend Developer | `agents/backend-dev.md` | Traditional |
| `data-engineer` | Data Engineer | `agents/data-engineer.md` | Traditional |
| `qa-engineer` | QA Engineer | `agents/qa-engineer.md` | Traditional |
| `security-privacy-engineer` | Security & Privacy Engineer | `agents/security-privacy-engineer.md` | Traditional |
| `devops-engineer` | DevOps Engineer | `agents/devops.md` | Traditional |
| `ml-engineer` | ML Engineer | `agents/ml-engineer.md` | AI/ML |
| `prompt-engineer` | Prompt Engineer | `agents/prompt-engineer.md` | AI/ML |
| `model-evaluator` | Model Evaluator | `agents/model-evaluator.md` | AI/ML |
| `aiops-engineer` | AIOps Engineer | `agents/aiops-engineer.md` | AI/ML |

### Agent Enum (for JSON schemas)

```json
[
  "Orchestrator",
  "Product Manager",
  "Architect",
  "UX/UI Designer",
  "Frontend Developer",
  "Backend Developer",
  "Data Engineer",
  "ML Engineer",
  "Prompt Engineer",
  "Model Evaluator",
  "AIOps Engineer",
  "QA Engineer",
  "Security & Privacy Engineer",
  "DevOps Engineer",
  "Multiple",
  "None"
]
```

---

## Phases

### Phase Registry

| ID | Display Name | Description | Primary Agent(s) |
|----|--------------|-------------|------------------|
| `intake` | Intake | Initial project setup and classification | Orchestrator |
| `assessment` | Assessment | Existing codebase evaluation (enhancement projects) | Multiple |
| `planning` | Planning | Requirements gathering, PRD creation | Product Manager |
| `architecture` | Architecture | System design, tech stack selection | Architect |
| `design` | Design | UI/UX design, wireframes, design system | UX/UI Designer |
| `development` | Development | Frontend and backend implementation | Frontend Developer, Backend Developer |
| `ml_development` | ML Development | AI/ML model integration and training | ML Engineer, Prompt Engineer |
| `testing` | Testing | QA, performance, accessibility testing | QA Engineer |
| `security_review` | Security Review | Security audit and compliance | Security & Privacy Engineer |
| `deployment` | Deployment | Infrastructure setup and production release | DevOps Engineer, AIOps Engineer |
| `maintenance` | Maintenance | Ongoing support and improvements | Orchestrator |
| `blocked` | Blocked | Work stopped due to blocker | Varies |
| `completed` | Completed | Project finished | None |

### Phase Enum (for JSON schemas)

```json
[
  "intake",
  "assessment",
  "planning",
  "architecture",
  "design",
  "development",
  "ml_development",
  "testing",
  "security_review",
  "deployment",
  "maintenance",
  "blocked",
  "completed"
]
```

### Phase Transitions (Valid)

#### Greenfield Projects (New Development)

| From | To | Condition |
|------|----|-----------|
| `intake` | `planning` | New project confirmed |
| `planning` | `architecture` | PRD approved |
| `architecture` | `design` | Architecture approved |
| `architecture` | `development` | Architecture approved (skip design) |
| `architecture` | `ml_development` | Architecture approved (AI project) |
| `design` | `development` | Design approved |
| `ml_development` | `development` | ML components ready |
| `development` | `testing` | Features complete |
| `testing` | `security_review` | QA approved |
| `security_review` | `deployment` | Security approved |
| `deployment` | `maintenance` | Production stable |
| `maintenance` | `completed` | Project closed |
| `*` | `blocked` | Blocker identified |
| `blocked` | `*` | Blocker resolved |

#### Enhancement Projects (Existing Codebase)

| From | To | Condition |
|------|----|-----------|
| `intake` | `assessment` | Enhancement project confirmed |
| `assessment` | `planning` | Assessment complete, enhancement plan needed |
| `planning` | `architecture` | Major architectural changes required |
| `planning` | `development` | Minor enhancements, no arch changes |
| `planning` | `security_review` | Security-focused enhancement |
| `architecture` | `development` | Architecture changes approved |
| `development` | `testing` | Enhancements complete |
| `testing` | `security_review` | QA approved |
| `security_review` | `deployment` | Security approved |
| `deployment` | `maintenance` | Enhancement deployed |

#### Assessment Sub-Phases

During `assessment`, agents evaluate in this order:

1. **Architect** - Architecture & code structure review
2. **Security & Privacy Engineer** - Security vulnerability scan
3. **QA Engineer** - Test coverage & quality analysis
4. **DevOps Engineer** - Infrastructure & CI/CD review
5. **Frontend/Backend Developers** - Code quality review
6. **Data Engineer / ML Engineer** - Data & AI components (if applicable)

---

## Statuses

### Task Status

```json
["not_started", "in_progress", "complete", "blocked", "skipped"]
```

### Handoff Status

```json
["complete", "partial", "blocked", "failed"]
```

### Quality Gate Decision

```json
["approved", "approved_with_conditions", "rejected"]
```

### Deliverable Status

```json
["not_started", "in_progress", "in_review", "complete", "blocked"]
```

---

## Severities

### Blocker/Bug Severity

```json
["critical", "high", "medium", "low"]
```

| Severity | Response Time | Description |
|----------|---------------|-------------|
| `critical` | 15 minutes | Stops all work, production down |
| `high` | 1 hour | Major feature broken, workaround exists |
| `medium` | 4 hours | Feature degraded, non-blocking |
| `low` | 24 hours | Minor issue, cosmetic |

### Risk Probability/Impact

```json
["high", "medium", "low"]
```

---

## Project Types

```json
["traditional", "ai_ml", "hybrid", "enhancement"]
```

| Type | Description | Agents Used | Starting Phase |
|------|-------------|-------------|----------------|
| `traditional` | Standard web/mobile app (new) | 10 traditional agents | `intake` → `planning` |
| `ai_ml` | AI/ML focused project (new) | All 14 agents | `intake` → `planning` |
| `hybrid` | Traditional app with AI features (new) | All 14 agents | `intake` → `planning` |
| `enhancement` | Improve existing codebase | Varies by scope | `intake` → `assessment` |

---

## User Constraints

### Locked Components

Components that users can mark as "do not change":

```json
[
  "frontend_design",
  "frontend_code", 
  "backend_architecture",
  "backend_code",
  "database_schema",
  "api_contracts",
  "auth_approach",
  "tech_stack",
  "third_party_integrations",
  "deployment_config"
]
```

| Component | What's Locked | Agents Affected |
|-----------|---------------|-----------------|
| `frontend_design` | UI appearance, layout, styling | UX/UI Designer, Frontend Dev |
| `frontend_code` | Existing frontend implementation | Frontend Developer |
| `backend_architecture` | Service structure, patterns | Architect, Backend Dev |
| `backend_code` | Existing backend implementation | Backend Developer |
| `database_schema` | Tables, columns, relationships | Data Engineer, Backend Dev |
| `api_contracts` | Endpoints, request/response shapes | Backend Dev, Frontend Dev |
| `auth_approach` | Auth method (OAuth, JWT, etc.) | Security Engineer, Backend Dev |
| `tech_stack` | Languages, frameworks, platforms | All technical agents |
| `third_party_integrations` | External services in use | All technical agents |
| `deployment_config` | Infrastructure, CI/CD | DevOps Engineer |

### Change Authority

User's preference when trade-offs arise:

```json
["preserve", "optimize", "balance"]
```

| Authority | Meaning | Agent Behavior |
|-----------|---------|----------------|
| `preserve` | Keep existing, even if suboptimal | Never propose changes to locked items |
| `optimize` | Quality first, propose improvements | Flag issues, recommend changes for approval |
| `balance` | Preserve where possible, flag issues | Preserve by default, escalate significant issues |

### Code Sources

Where existing code came from:

```json
["lovable", "v0", "bolt", "cursor", "copilot", "claude", "manual", "other"]
```

---

## Quality Targets

### Default Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Test coverage | ≥80% | <70% |
| API response p95 | <500ms | >1000ms |
| Page load p95 | <2000ms | >3000ms |
| Lighthouse performance | ≥90 | <80 |
| Accessibility (WCAG) | AA | Fail |
| Security vulnerabilities | 0 critical/high | Any critical |
| Error rate | <1% | >2% |

### AI/ML Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Model accuracy | ≥90% | <85% |
| Model latency p95 | <2000ms | >3000ms |
| Cost per 1K requests | <$1.00 | >$2.00 |
| Hallucination rate | <2% | >5% |

---

## ID Formats

| Entity | Format | Example |
|--------|--------|---------|
| User Story | `US-XXX` | US-001 |
| Bug | `BUG-XXX` | BUG-042 |
| Blocker | `BLOCK-XXX` | BLOCK-003 |
| Risk | `RISK-XXX` | RISK-015 |
| ADR | `ADR-XXX` | ADR-007 |
| Change Request | `CR-XXX` | CR-002 |
| Conflict | `CONFLICT-XXX` | CONFLICT-001 |
| Query | `QUERY-XXX` | QUERY-005 |
| Constraint Conflict | `CC-XXX` | CC-001 |

---

## File Paths (Standard)

### Core Documents

| Document | Path |
|----------|------|
| **Project State** | `docs/PROJECT_STATE.md` |
| Intake | `docs/INTAKE.md` |
| PRD | `docs/PRD.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Status | `docs/STATUS.md` |
| Decisions | `docs/DECISIONS.md` |
| Memory | `docs/MEMORY.md` |
| API Spec | `docs/API.yaml` |
| Database Schema | `prisma/schema.prisma` |
| Threat Model | `docs/THREAT_MODEL.md` |

### Mandatory Protocol Files

| Protocol | Path | Purpose |
|----------|------|---------|
| **Mandatory Startup** | `constants/protocols/MANDATORY_STARTUP.md` | Enforces intake and approval gates |
| **State Definitions** | `constants/protocols/STATE_DEFINITIONS.md` | Complete state machine for ALL gates (G0-G9) |
| Approval Gates | `constants/protocols/APPROVAL_GATES.md` | Gate definitions and approval format |
| Execution Protocol | `constants/protocols/EXECUTION_PROTOCOL.md` | Ensures code is actually written |

### Enhancement Project Documents

| Document | Path | Purpose |
|----------|------|--------|
| Assessment | `docs/ASSESSMENT.md` | Codebase evaluation results |
| Gap Analysis | `docs/GAP_ANALYSIS.md` | Current vs target state |
| Tech Debt | `docs/TECH_DEBT.md` | Debt inventory & tracking |
| Enhancement Plan | `docs/ENHANCEMENT_PLAN.md` | Phased improvement plan |

---

## Timestamps

All timestamps use **ISO 8601** format with timezone:

```
YYYY-MM-DDTHH:MM:SSZ
```

Example: `2024-01-15T10:30:00Z`

---

## MCP State Server

Project state management is handled by the **Product Creator State MCP Server** (`mcp-server/`).

### Key Tools

| Tool | Purpose | Replaces |
|------|---------|----------|
| `get_current_phase` | Query current phase, gate, agent | Reading STATUS.md |
| `update_task_status` | Update task status | Editing STATUS.md |
| `log_decision` | Record decisions with rationale | Editing DECISIONS.md |
| `transition_gate` | Move to next gate (validated) | Manual gate updates |
| `record_handoff` | Record agent handoffs | Manual handoff tracking |

### Configuration

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "product-creator-state": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js", "--db-path", "./.state/project.db"]
    }
  }
}
```

See [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) for full documentation.

---

## Version

**Constants Version:** 1.2.0
**Last Updated:** 2026-01-02

When updating constants:
1. Increment version
2. Update all referencing files
3. Run schema validation
4. Update CHANGELOG
