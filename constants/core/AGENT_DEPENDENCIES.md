# Agent Dependencies

> **This document defines the dependency relationships between agents, which agents block others, and which can work in parallel.**

---

## Overview

Understanding agent dependencies is critical for:
1. **Workflow Planning** - Know what must happen before what
2. **Parallel Execution** - Identify opportunities for concurrent work
3. **Blocker Identification** - Quickly find what's holding up progress
4. **Resource Allocation** - Schedule agents efficiently

---

## Dependency Types

| Type | Symbol | Description |
|------|--------|-------------|
| **Blocks** | `──▶` | Agent A must complete before Agent B can start |
| **Parallel** | `═══` | Agents can work simultaneously |
| **Optional** | `- - ▶` | Dependency exists but can be worked around |
| **Bidirectional** | `◀──▶` | Agents need to coordinate/sync |

---

## Master Dependency Graph

### Traditional Web/Mobile Project

```
                            ┌─────────────────────────────────────┐
                            │           ORCHESTRATOR              │
                            │     (Coordinates all agents)        │
                            └──────────────┬──────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────────────┐
                            │         PRODUCT MANAGER             │
                            │           (G2: PRD)                 │
                            └──────────────┬──────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────────────┐
                            │           ARCHITECT                 │
                            │    (G3: Architecture, Tech Stack)   │
                            └──────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   UX/UI DESIGNER  │  │   DATA ENGINEER   │  │ (Optional: Start  │
        │   (G4: Design)    │  │  (DB Schema, ETL) │  │  Backend Early)   │
        └─────────┬─────────┘  └─────────┬─────────┘  └───────────────────┘
                  │                      │
                  │      ┌───────────────┘
                  │      │
                  ▼      ▼
        ┌───────────────────────────────────────────────────────────────┐
        │                     DEVELOPMENT PHASE                         │
        │  ┌─────────────────────┐    ═══    ┌─────────────────────┐   │
        │  │  FRONTEND DEVELOPER │           │  BACKEND DEVELOPER  │   │
        │  │    (G5.1 - G5.5)    │◀────────▶│    (G5.1 - G5.5)    │   │
        │  └─────────────────────┘  (sync)   └─────────────────────┘   │
        └───────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────┐
                        │    QA ENGINEER    │
                        │   (G6: Testing)   │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │ SECURITY ENGINEER │
                        │   (G7: Security)  │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │  DEVOPS ENGINEER  │
                        │ (G8-G9: Deploy)   │
                        └───────────────────┘
```

### AI/ML Project (Additional Agents)

```
                            ┌─────────────────────────────────────┐
                            │           ARCHITECT                 │
                            └──────────────┬──────────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
  ┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
  │    ML ENGINEER    │   ═══  │  PROMPT ENGINEER  │   ═══  │   DATA ENGINEER   │
  │  (Model Design)   │        │ (Prompt Strategy) │        │   (Data Pipeline) │
  └─────────┬─────────┘        └─────────┬─────────┘        └─────────┬─────────┘
            │                            │                            │
            └────────────────────────────┼────────────────────────────┘
                                         │
                                         ▼
                          ┌─────────────────────────────┐
                          │   DEVELOPMENT PHASE         │
                          │   (Frontend + Backend +     │
                          │    AI Integration)          │
                          └──────────────┬──────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
  ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
  │    QA ENGINEER    │ ═══  │  MODEL EVALUATOR  │ ═══  │ PROMPT ENGINEER   │
  │     (Testing)     │      │   (AI Testing)    │      │ (Prompt Tuning)   │
  └─────────┬─────────┘      └─────────┬─────────┘      └─────────┬─────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                          ┌───────────────────────┐
                          │   SECURITY ENGINEER   │
                          │  (+ AI Security)      │
                          └───────────┬───────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
              ┌───────────────────┐   ┌───────────────────┐
              │  DEVOPS ENGINEER  │═══│  AIOPS ENGINEER   │
              │   (Infra Deploy)  │   │  (Model Deploy)   │
              └───────────────────┘   └───────────────────┘
```

---

## Detailed Agent Dependencies

### 1. Product Manager

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Orchestrator | Required | Activation and context |
| User | Required | Requirements input |
| **Blocks** | | |
| Architect | Hard Block | Cannot design without approved PRD |
| All Development | Hard Block | No code without requirements |

**Can Work In Parallel With:** None (first agent after intake)

---

### 2. Architect

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Product Manager | Hard Block | Needs approved PRD |
| **Blocks** | | |
| UX/UI Designer | Hard Block | Needs tech constraints |
| Frontend Developer | Hard Block | Needs tech stack decision |
| Backend Developer | Hard Block | Needs API design |
| Data Engineer | Hard Block | Needs data model overview |
| ML Engineer | Hard Block | Needs AI architecture |

**Can Work In Parallel With:** None during architecture phase

---

### 3. UX/UI Designer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs technical constraints |
| Product Manager | Soft | May need requirement clarification |
| **Blocks** | | |
| Frontend Developer | Soft Block | Can start foundation without designs |

**Can Work In Parallel With:**
- Data Engineer (no overlap)
- Backend Developer (early API work)

---

### 4. Data Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs data architecture |
| **Blocks** | | |
| Backend Developer | Partial | Database schema needed for full work |
| ML Engineer | Partial | Data pipelines for training |

**Can Work In Parallel With:**
- UX/UI Designer (no overlap)
- Frontend Developer (different concerns)

---

### 5. Frontend Developer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs tech stack |
| UX/UI Designer | Soft Block | Can start foundation, needs designs for components |
| **Blocks** | | |
| QA Engineer | Partial | Needs testable code |
| **Coordinates With** | | |
| Backend Developer | Bidirectional | API contracts |

**Can Work In Parallel With:**
- Backend Developer (with defined API contracts)
- Data Engineer (different layer)

---

### 6. Backend Developer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs API design, tech stack |
| Data Engineer | Soft Block | Needs database schema |
| **Blocks** | | |
| QA Engineer | Partial | Needs testable APIs |
| **Coordinates With** | | |
| Frontend Developer | Bidirectional | API contracts |

**Can Work In Parallel With:**
- Frontend Developer (with defined API contracts)
- UX/UI Designer (no overlap)

---

### 7. ML Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs AI architecture |
| Data Engineer | Soft Block | Needs data pipelines |
| Prompt Engineer | Soft | Prompt strategy input |
| **Blocks** | | |
| Model Evaluator | Hard Block | Needs model to evaluate |
| Backend Developer | Soft | AI integration endpoints |

**Can Work In Parallel With:**
- Prompt Engineer (collaborate on AI strategy)
- Frontend Developer (different layer)

---

### 8. Prompt Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Architect | Hard Block | Needs AI architecture |
| Product Manager | Soft | Use case understanding |
| **Blocks** | | |
| ML Engineer | Soft | Prompt templates needed |
| **Coordinates With** | | |
| Model Evaluator | Bidirectional | Prompt effectiveness testing |

**Can Work In Parallel With:**
- ML Engineer (collaborative)
- Data Engineer (no overlap)

---

### 9. Model Evaluator

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| ML Engineer | Hard Block | Needs model to evaluate |
| Prompt Engineer | Soft | Needs prompts to test |
| **Blocks** | | |
| Security Engineer | Partial | AI security review |

**Can Work In Parallel With:**
- QA Engineer (different test focus)
- Backend Developer (infrastructure testing)

---

### 10. QA Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Frontend Developer | Hard Block | Needs code to test |
| Backend Developer | Hard Block | Needs APIs to test |
| **Blocks** | | |
| Security Engineer | Soft | Quality baseline needed |

**Can Work In Parallel With:**
- Model Evaluator (different test domains)

---

### 11. Security & Privacy Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| QA Engineer | Soft | Quality baseline |
| Backend Developer | Required | Code to review |
| ML Engineer | If AI project | AI security review |
| **Blocks** | | |
| DevOps Engineer | Hard Block | Cannot deploy without security approval |

**Can Work In Parallel With:** None during security review

---

### 12. DevOps Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| Security Engineer | Hard Block | Security approval |
| All Developers | Required | Code to deploy |
| **Blocks** | | |
| Production | Final | Deployment gate |

**Can Work In Parallel With:**
- AIOps Engineer (if AI project, coordinate on deployment)

---

### 13. AIOps Engineer

| Dependency | Type | Description |
|------------|------|-------------|
| **Depends On** | | |
| ML Engineer | Hard Block | Model artifacts |
| Model Evaluator | Soft | Evaluation results |
| Security Engineer | Required | AI security approval |
| **Coordinates With** | | |
| DevOps Engineer | Bidirectional | Infrastructure alignment |

**Can Work In Parallel With:**
- DevOps Engineer (coordinate deployment)

---

## Parallel Execution Opportunities

### Phase-Based Parallelism

| Phase | Parallel Agents | Prerequisites |
|-------|-----------------|---------------|
| **Planning** | None | Sequential |
| **Architecture** | None | Sequential |
| **Design** | UX/UI + Data Engineer | Architecture approved |
| **Development** | Frontend + Backend + ML | Defined contracts |
| **Testing** | QA + Model Evaluator | Development complete |
| **Deployment** | DevOps + AIOps | Security approved |

### Maximum Parallelism Configuration

```
G3 Approved (Architecture)
           │
           ├── UX/UI Designer ─────────────────────────────────────┐
           │                                                        │
           ├── Data Engineer ──────────────────────────────────┐   │
           │                                                    │   │
           ├── ML Engineer ═══ Prompt Engineer ────────────┐   │   │
           │                                                │   │   │
           ▼                                                ▼   ▼   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT (G5)                                   │
│                                                                          │
│    Frontend Dev ◀═══════════════════▶ Backend Dev                        │
│         │                                  │                             │
│         │                     ML Engineer ─┘                             │
│         │                          │                                     │
│         └──────────────────────────┘                                     │
│                                                                          │
│    All coordinating on shared types/interfaces                           │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        TESTING (G6)                                       │
│                                                                          │
│    QA Engineer ═══════════════════════════ Model Evaluator               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Conflict Resolution

### Circular Dependency Detection

If you encounter a pattern like:
```
A depends on B
B depends on C
C depends on A
```

**Resolution:**
1. Identify the shared interface/contract
2. Define contract first (Architect responsibility)
3. All agents implement against contract
4. Integrate when all complete

### Blocking Dependency Resolution

If Agent A is blocked by Agent B:

1. **Can we start with stubs/mocks?**
   - Frontend can mock API responses
   - Backend can mock database
   - AI can use test prompts

2. **Can we reorder sub-tasks?**
   - Start with non-dependent work first
   - Save dependent work for later

3. **Can we escalate priority?**
   - If B is critical path, prioritize B
   - Communicate delay to user

---

## Agent Handoff Protocol

When one agent completes and another depends on their work:

### Handoff Checklist

```markdown
## HANDOFF: [From Agent] → [To Agent]

**Date:** YYYY-MM-DD
**Gate:** [current gate]

### Deliverables Provided
- [ ] [Deliverable 1] - Location: [path]
- [ ] [Deliverable 2] - Location: [path]

### Contracts/Interfaces
- [ ] Types defined in: [path]
- [ ] API spec in: [path]

### Context for Next Agent
[Critical information they need to know]

### Blockers Cleared
- [x] [What was blocking them is now done]

### Remaining Dependencies
- [ ] [If any still exist]
```

---

## Dependency Validation Commands

Add to validation script:

```bash
# Check if agent can start based on dependencies
./scripts/validate-project.sh [path] check-deps [agent]

# Example output:
# Agent: Frontend Developer
# Dependencies:
#   [✓] Architect - ARCHITECTURE.md exists
#   [✓] UX/UI Designer - DESIGN.md exists (or skipped)
#   [✓] Shared types defined
# Status: READY TO START
```

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Document agent dependencies and parallel execution opportunities
