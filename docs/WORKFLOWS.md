# Cross-Agent Workflow Examples

> **Version 2.0** - Hub-and-Spoke Architecture

This document shows how workers collaborate through the task queue in the Hub-and-Spoke architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Task Queue Workflow](#task-queue-workflow)
3. [Traditional Web App Workflow](#traditional-web-app-workflow)
4. [AI/ML Project Workflow](#aiml-project-workflow)
5. [Enhancement Project Workflow](#enhancement-project-workflow)
6. [Parallel Workflow Patterns](#parallel-workflow-patterns)
7. [Error Recovery Workflows](#error-recovery-workflows)

---

## Architecture Overview

### Hub-and-Spoke Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKER SWARM                             │
│                                                                   │
│  Planning Workers         Generation Workers    Validation Workers│
│  ┌─────────────────┐     ┌─────────────────┐   ┌────────────────┐│
│  │ product-planner │     │full-stack-gen   │   │ auto-reviewer  ││
│  │ system-planner  │     │ui-generator     │   │security-scanner││
│  └────────┬────────┘     │api-generator    │   │ qa-validator   ││
│           │              │ml-generator     │   └───────┬────────┘│
│           │              └────────┬────────┘           │         │
│           │                       │                    │         │
│           └───────────────────────┼────────────────────┘         │
│                                   │                               │
│                                   │ Pull tasks                    │
│                                   ▼                               │
└───────────────────────────────────┼───────────────────────────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────┐
│                                   │                               │
│                    ORCHESTRATION HUB                              │
│                                   │                               │
│  ┌────────────────────────────────┴────────────────────────────┐ │
│  │                         TASK QUEUE                           │ │
│  │                                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │ TASK-001 │ │ TASK-002 │ │ TASK-003 │ │ TASK-004 │ ...   │ │
│  │  │ priority │ │ priority │ │ priority │ │ priority │       │ │
│  │  │  HIGH    │ │  HIGH    │ │ MEDIUM   │ │ MEDIUM   │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │ │
│  └────────────────────────────────┬────────────────────────────┘ │
│                                   │                               │
│  Gate Management | Agent Router | State Coordination              │
└───────────────────────────────────┼───────────────────────────────┘
                                    │
                                    │ MCP Calls
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                     CENTRAL TRUTH LAYER                           │
│                                                                   │
│  Task Queue | Worker States | Specs | Validation | Gates          │
│                                                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐        │
│  │  OpenAPI Spec  │ │  Prisma Schema │ │  Zod Schemas   │        │
│  │  (locked G3)   │ │  (locked G3)   │ │  (locked G3)   │        │
│  └────────────────┘ └────────────────┘ └────────────────┘        │
└───────────────────────────────────────────────────────────────────┘
```

### Worker Categories

| Category | Workers | Spec Input | Output |
|----------|---------|------------|--------|
| **Planning** | product-planner, system-planner | User requirements | PRD, OpenAPI, Prisma, Zod specs |
| **Generation** | full-stack-gen, ui-gen, api-gen, ml-gen | Locked specs | Code, tests, documentation |
| **Validation** | auto-reviewer, security-scanner, qa-validator | Generated code | Pass/fail reports |

---

## Task Queue Workflow

### How Work Flows Through the System

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                               │
│                                                                   │
│  1. Decompose request into tasks                                 │
│  2. Set dependencies and priorities                              │
│  3. Assign gate_dependency where needed                          │
│  4. Enqueue all tasks                                            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        TASK QUEUE                                │
│                                                                   │
│  TASK-001: Write PRD          [queued]    gate: G1               │
│  TASK-002: Design OpenAPI     [blocked]   depends: TASK-001      │
│  TASK-003: Design Prisma      [blocked]   depends: TASK-001      │
│  TASK-004: Implement auth     [blocked]   gate: G3               │
│  TASK-005: Implement users    [blocked]   gate: G3               │
│  TASK-006: Build auth UI      [blocked]   gate: G3               │
│  TASK-007: Run tests          [blocked]   depends: TASK-004,005  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WORKER PULLS TASK                           │
│                                                                   │
│  product-planner: dequeue_task()                                 │
│      → Receives TASK-001 (highest priority, no blockers)         │
│      → Implements PRD                                            │
│      → complete_task(TASK-001)                                   │
│                                                                   │
│  TASK-001 complete → TASK-002, TASK-003 unblocked               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION                            │
│                                                                   │
│  system-planner-1: TASK-002 (OpenAPI)     ─┐                     │
│  system-planner-2: TASK-003 (Prisma)      ─┴─→ Both run parallel │
│                                                                   │
│  G2 approval → G3 approval                                       │
│                                                                   │
│  api-generator-1: TASK-004 (auth API)     ─┐                     │
│  api-generator-2: TASK-005 (users API)    ─┼─→ All run parallel  │
│  ui-generator-1:  TASK-006 (auth UI)      ─┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Gate-Blocked Task Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GATE BLOCKING FLOW                            │
│                                                                   │
│  Tasks with gate_dependency wait until gate approved             │
│                                                                   │
│  ┌──────────────┐                                                │
│  │   TASK-004   │  gate_dependency: G3                           │
│  │   BLOCKED    │◄─────────────────────────────────────┐         │
│  └──────────────┘                                      │         │
│         │                                              │         │
│         │ User approves G3                             │         │
│         │                                              │         │
│         ▼                                              │         │
│  ┌──────────────┐                                      │         │
│  │  approve_gate│ ─→ lock_specs() ─→ unblock tasks ───┘         │
│  │     (G3)     │                                                │
│  └──────────────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                                │
│  │   TASK-004   │  Now available for workers                     │
│  │    QUEUED    │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Traditional Web App Workflow

### Complete Flow: SaaS Dashboard Application

```
Day 1-2: INTAKE
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                                         │
│ • Receives project request                                          │
│ • Classifies as "traditional" project                               │
│ • Creates project structure                                         │
│ • Initializes STATUS.md                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #1
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Orchestrator",                                         │
│     "status": "complete",                                            │
│     "phase": "intake"                                                │
│   },                                                                 │
│   "deliverables": {                                                  │
│     "project_structure": "created",                                  │
│     "status_file": "docs/STATUS.md"                                  │
│   },                                                                 │
│   "next_agent": "Product Manager",                                   │
│   "next_action": "Define product requirements and user stories"      │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 3-5: PLANNING
┌─────────────────────────────────────────────────────────────────────┐
│ PRODUCT MANAGER                                                      │
│ • Conducts user research                                            │
│ • Creates personas                                                   │
│ • Writes user stories with acceptance criteria                      │
│ • Creates PRD                                                        │
│ • Defines success metrics                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #2
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Product Manager",                                      │
│     "status": "complete",                                            │
│     "phase": "planning"                                              │
│   },                                                                 │
│   "deliverables": {                                                  │
│     "prd": { "path": "docs/PRD.md", "status": "approved" },         │
│     "stories": { "total": 25, "p0": 10, "p1": 10, "p2": 5 }        │
│   },                                                                 │
│   "next_agent": "Architect",                                         │
│   "next_action": "Design system architecture based on requirements"  │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 6-8: ARCHITECTURE
┌─────────────────────────────────────────────────────────────────────┐
│ ARCHITECT                                                            │
│ • Selects tech stack                                                │
│ • Designs system components                                         │
│ • Creates database schema                                           │
│ • Defines API contracts                                             │
│ • Documents ADRs                                                    │
│ • Reviews with Security Engineer (async)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #3 (parallel handoff)
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Architect",                                            │
│     "status": "complete",                                            │
│     "phase": "architecture"                                          │
│   },                                                                 │
│   "deliverables": {                                                  │
│     "architecture_doc": "docs/ARCHITECTURE.md",                      │
│     "database_schema": "prisma/schema.prisma",                       │
│     "api_spec": "docs/API.yaml"                                      │
│   },                                                                 │
│   "next_agent": "UX/UI Designer, Frontend Developer, Backend Developer", │
│   "next_action": "Begin parallel design and development"             │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 9-12: DESIGN (parallel with early development)
┌─────────────────────────────────────────────────────────────────────┐
│ UX/UI DESIGNER                                                       │
│ • Creates user flows                                                │
│ • Designs wireframes                                                │
│ • Builds design system                                              │
│ • Documents component specs                                         │
│ • Ensures accessibility                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #4
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "UX/UI Designer",                                       │
│     "status": "complete",                                            │
│     "phase": "design"                                                │
│   },                                                                 │
│   "deliverables": {                                                  │
│     "design_system": "design/tokens.json",                          │
│     "wireframes": { "screens": 15 },                                │
│     "accessibility": { "wcag_level": "AA" }                         │
│   },                                                                 │
│   "next_agent": "Frontend Developer",                                │
│   "next_action": "Implement UI components following design specs"    │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 9-18: DEVELOPMENT (parallel tracks)
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND DEVELOPER              │  BACKEND DEVELOPER                │
│ • Sets up project               │  • Sets up project                │
│ • Implements components         │  • Implements API endpoints       │
│ • Builds pages                  │  • Creates database migrations    │
│ • Integrates with API           │  • Implements auth                │
│ • Writes tests                  │  • Writes tests                   │
└─────────────────────────────────┴───────────────────────────────────┘
                                    │
                                    ▼ Handoff #5 & #6 (merged)
┌─────────────────────────────────────────────────────────────────────┐
│ // Frontend Handoff                                                  │
│ {                                                                    │
│   "handoff": { "agent": "Frontend Developer", "phase": "development" },│
│   "deliverables": {                                                  │
│     "components": { "total": 25 },                                   │
│     "tests": { "coverage": "78%" }                                   │
│   }                                                                  │
│ }                                                                    │
│                                                                      │
│ // Backend Handoff                                                   │
│ {                                                                    │
│   "handoff": { "agent": "Backend Developer", "phase": "development" },│
│   "deliverables": {                                                  │
│     "endpoints": { "total": 15 },                                    │
│     "tests": { "coverage": "82%" }                                   │
│   }                                                                  │
│ }                                                                    │
│                                                                      │
│ "next_agent": "QA Engineer",                                         │
│ "next_action": "Execute comprehensive test plan"                     │
└─────────────────────────────────────────────────────────────────────┘

Day 19-22: TESTING
┌─────────────────────────────────────────────────────────────────────┐
│ QA ENGINEER                                                          │
│ • Creates test plan                                                 │
│ • Executes functional tests                                         │
│ • Performs UI/UX testing                                            │
│ • Runs API tests                                                    │
│ • Checks accessibility                                              │
│ • Reports bugs → Dev fixes → Retests                                │
│ • Signs off on quality gate                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #7
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "QA Engineer",                                          │
│     "status": "complete",                                            │
│     "phase": "testing"                                               │
│   },                                                                 │
│   "quality_gate": { "decision": "approved" },                        │
│   "test_summary": { "pass_rate": "96.7%" },                         │
│   "bugs": { "open": 3, "resolved": 15 },                            │
│   "next_agent": "Security & Privacy Engineer",                       │
│   "next_action": "Conduct security review before deployment"         │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 23-24: SECURITY REVIEW
┌─────────────────────────────────────────────────────────────────────┐
│ SECURITY & PRIVACY ENGINEER                                          │
│ • Reviews threat model                                              │
│ • Validates auth implementation                                     │
│ • Checks data protection                                            │
│ • Runs security scans                                               │
│ • Verifies compliance                                               │
│ • Approves for deployment                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #8
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Security & Privacy Engineer",                          │
│     "status": "complete",                                            │
│     "phase": "security_review"                                       │
│   },                                                                 │
│   "approval": { "status": "approved" },                              │
│   "scanning_results": { "critical": 0, "high": 0 },                 │
│   "next_agent": "DevOps Engineer",                                   │
│   "next_action": "Deploy to production"                              │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 25-26: DEPLOYMENT
┌─────────────────────────────────────────────────────────────────────┐
│ DEVOPS ENGINEER                                                      │
│ • Sets up infrastructure                                            │
│ • Configures CI/CD                                                  │
│ • Deploys to staging                                                │
│ • Runs smoke tests                                                  │
│ • Deploys to production                                             │
│ • Sets up monitoring                                                │
│ • Documents runbooks                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Handoff #9 (Final)
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "DevOps Engineer",                                      │
│     "status": "complete",                                            │
│     "phase": "deployment"                                            │
│   },                                                                 │
│   "urls": {                                                          │
│     "production": "https://myapp.com",                               │
│     "staging": "https://staging.myapp.com"                           │
│   },                                                                 │
│   "monitoring": { "dashboard": "[url]" },                            │
│   "next_agent": "Orchestrator",                                      │
│   "next_action": "Move to maintenance phase"                         │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

MAINTENANCE PHASE
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                                         │
│ • Updates STATUS.md to "completed"                                  │
│ • Archives project documentation                                    │
│ • Monitors for issues                                               │
│ • Routes bug reports to appropriate agents                          │
│ • Manages future enhancements                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI/ML Project Workflow

### Complete Flow: NPS Prediction Model

```
Day 1-2: INTAKE
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                                         │
│ • Receives project request                                          │
│ • Classifies as "ai_ml" project                                     │
│ • Activates AI/ML agent track                                       │
│ • Creates project structure                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Day 3-5: PLANNING
┌─────────────────────────────────────────────────────────────────────┐
│ PRODUCT MANAGER                                                      │
│ • Defines ML problem statement                                      │
│ • Identifies success metrics (accuracy, F1, etc.)                   │
│ • Documents data requirements                                       │
│ • Creates ethical considerations                                    │
│ • Defines acceptable model performance                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Day 6-8: ARCHITECTURE
┌─────────────────────────────────────────────────────────────────────┐
│ ARCHITECT                                                            │
│ • Designs ML system architecture                                    │
│ • Defines feature store structure                                   │
│ • Plans model serving infrastructure                                │
│ • Documents data pipelines                                          │
│ • Coordinates with Data Engineer                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Parallel Track Begins
┌─────────────────────────────────────────────────────────────────────┐
│                      PARALLEL AI/ML DEVELOPMENT                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DATA ENGINEER (Day 9-14)                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ • Builds data ingestion pipelines                              │ │
│  │ • Creates feature engineering pipelines                        │ │
│  │ • Sets up data quality monitoring                              │ │
│  │ • Implements feature store                                     │ │
│  │ • Documents data lineage                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                            │
│                         ▼ Data Ready                                 │
│  ML ENGINEER (Day 12-20)                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ • Performs EDA                                                 │ │
│  │ • Implements model training pipeline                           │ │
│  │ • Trains and tunes models                                      │ │
│  │ • Implements experiment tracking                               │ │
│  │ • Creates model artifacts                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                            │
│                         ▼ Models Ready                               │
│  PROMPT ENGINEER (Day 15-22, if LLM involved)                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ • Designs prompt templates                                     │ │
│  │ • Implements prompt chains                                     │ │
│  │ • Creates evaluation datasets                                  │ │
│  │ • Optimizes for cost/latency                                   │ │
│  │ • Documents prompt library                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ All Models Ready
Day 20-24: EVALUATION
┌─────────────────────────────────────────────────────────────────────┐
│ MODEL EVALUATOR                                                      │
│ • Evaluates model performance                                       │
│ • Tests for bias and fairness                                       │
│ • Validates against acceptance criteria                             │
│ • Performs adversarial testing                                      │
│ • Creates evaluation report                                         │
│ • Approves model for deployment                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Model Evaluator",                                      │
│     "status": "complete",                                            │
│     "phase": "ml_development"                                        │
│   },                                                                 │
│   "model_evaluation": {                                              │
│     "accuracy": 0.94,                                                │
│     "f1_score": 0.91,                                                │
│     "bias_check": "passed",                                          │
│     "approved_for_deployment": true                                  │
│   },                                                                 │
│   "next_agent": "AIOps Engineer",                                    │
│   "next_action": "Deploy model to production with monitoring"        │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Day 25-28: ML DEPLOYMENT
┌─────────────────────────────────────────────────────────────────────┐
│ AIOPS ENGINEER                                                       │
│ • Sets up model registry                                            │
│ • Configures model serving (batch/real-time)                        │
│ • Implements A/B testing infrastructure                             │
│ • Sets up model monitoring                                          │
│ • Configures drift detection                                        │
│ • Creates retraining triggers                                       │
│ • Documents operational procedures                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Day 29-30: SECURITY REVIEW
┌─────────────────────────────────────────────────────────────────────┐
│ SECURITY & PRIVACY ENGINEER                                          │
│ • Reviews data privacy controls                                     │
│ • Validates model access controls                                   │
│ • Checks for data leakage                                           │
│ • Reviews prompt injection defenses (if LLM)                        │
│ • Approves for production                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Day 31-32: FINAL DEPLOYMENT
┌─────────────────────────────────────────────────────────────────────┐
│ DEVOPS ENGINEER                                                      │
│ • Deploys model serving infrastructure                              │
│ • Integrates with application                                       │
│ • Sets up production monitoring                                     │
│ • Configures alerts                                                 │
│ • Documents runbooks                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enhancement Project Workflow

### Complete Flow: Existing Codebase Improvement

Enhancement projects follow a different path - they start with assessment before planning.

```
Day 1: INTAKE & CLASSIFICATION
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                                         │
│ • Receives improvement request                                       │
│ • Classifies as "enhancement" project                               │
│ • Requests codebase access (path or URL)                            │
│ • Creates project structure with ASSESSMENT.md template             │
│ • Initializes STATUS.md with enhancement workflow                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Handoff #1
Day 2-4: ASSESSMENT PHASE
┌─────────────────────────────────────────────────────────────────────┐
│                      PARALLEL ASSESSMENT                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ARCHITECT                    │  SECURITY ENGINEER                  │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐       │
│  │ • Architecture review    │  │  │ • Vulnerability scan    │       │
│  │ • Pattern analysis       │  │  │ • Auth/authz review     │       │
│  │ • Scalability assessment │  │  │ • Data protection check │       │
│  │ • Score: Architecture    │  │  │ • Score: Security       │       │
│  └─────────────────────────┘  │  └─────────────────────────┘       │
│                               │                                      │
│  QA ENGINEER                  │  DEVOPS ENGINEER                    │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐       │
│  │ • Test coverage analysis │  │  │ • CI/CD review          │       │
│  │ • Code quality metrics   │  │  │ • Infrastructure check  │       │
│  │ • Documentation review   │  │  │ • Monitoring assessment │       │
│  │ • Score: Quality         │  │  │ • Score: DevOps         │       │
│  └─────────────────────────┘  │  └─────────────────────────┘       │
│                               │                                      │
│  FRONTEND/BACKEND DEVS                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Code style & consistency review                            │   │
│  │ • Performance bottleneck identification                      │   │
│  │ • Technical debt catalog                                     │   │
│  │ • Score: Code Quality                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Assessment Complete
┌─────────────────────────────────────────────────────────────────────┐
│ ASSESSMENT DELIVERABLES                                              │
│ • docs/ASSESSMENT.md — Complete with weighted scores                │
│ • docs/GAP_ANALYSIS.md — Current vs target state                    │
│ • docs/TECH_DEBT.md — Prioritized debt inventory                    │
│ • Overall Score: X.X/10                                             │
│                                                                      │
│ RECOMMENDATION:                                                      │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ 8-10: MAINTAIN — Minor improvements only                       │   │
│ │ 6-7:  ENHANCE  — Targeted improvements to existing code        │   │
│ │ 4-5:  REFACTOR — Significant restructuring needed              │   │
│ │ 1-3:  REWRITE  — Fresh start recommended                       │   │
│ └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ User Approves Recommendation
Day 5: PLANNING (Enhancement-Focused)
┌─────────────────────────────────────────────────────────────────────┐
│ PRODUCT MANAGER                                                      │
│ • Reviews assessment findings with user                             │
│ • Prioritizes improvements based on assessment                      │
│ • Creates ENHANCEMENT_PLAN.md with phases                           │
│ • Defines success metrics (before/after)                            │
│ • Creates PRD focused on improvements                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Handoff #2
Day 6: ARCHITECTURE REVIEW
┌─────────────────────────────────────────────────────────────────────┐
│ ARCHITECT                                                            │
│ • Reviews/updates existing architecture (if needed)                 │
│ • Documents changes to current architecture                         │
│ • Identifies locked components (do not modify)                      │
│ • Updates docs/ARCHITECTURE.md                                      │
│ • Creates migration path if structural changes needed               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Handoff #3
Day 7-14: INCREMENTAL DEVELOPMENT
┌─────────────────────────────────────────────────────────────────────┐
│ PHASED IMPROVEMENT                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Phase 1: Critical Fixes (P0)                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ • Security vulnerabilities                                       │ │
│ │ • Critical bugs                                                  │ │
│ │ • Data integrity issues                                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                         │                                            │
│                         ▼ Validate                                   │
│ Phase 2: High Priority (P1)                                         │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ • Performance improvements                                       │ │
│ │ • Test coverage increase                                         │ │
│ │ • Major refactoring                                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                         │                                            │
│                         ▼ Validate                                   │
│ Phase 3: Improvements (P2)                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ • Code quality improvements                                      │ │
│ │ • Documentation updates                                          │ │
│ │ • Minor enhancements                                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Each Phase
Day 15-17: VALIDATION (per phase)
┌─────────────────────────────────────────────────────────────────────┐
│ QA ENGINEER + SECURITY ENGINEER                                      │
│ • Regression testing (no new bugs introduced)                       │
│ • Improvement verification (metrics before/after)                   │
│ • Security re-scan (no new vulnerabilities)                         │
│ • Performance benchmarking                                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Final
Day 18: COMPLETION
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                                         │
│ • Updates ASSESSMENT.md with final scores                           │
│ • Documents improvements made                                       │
│ • Shows before/after metrics                                        │
│ • Archives project                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Differences: Enhancement vs New Project

| Aspect | New Project | Enhancement Project |
|--------|-------------|---------------------|
| First phase | Planning (PRD) | Assessment |
| Architecture | Design from scratch | Review/modify existing |
| Development | Build new | Improve existing |
| Testing focus | Feature completeness | Regression prevention |
| Success metric | Features delivered | Metrics improved |
| Locked components | None | Critical existing code |

### Enhancement Handoff Example

```json
{
  "handoff": {
    "agent": "Orchestrator",
    "timestamp": "2024-01-15T10:00:00Z",
    "status": "complete",
    "phase": "intake",
    "project": "improve-legacy-app"
  },
  "project_type": "enhancement",
  "codebase": {
    "location": "~/projects/legacy-app",
    "size_loc": 45000,
    "tech_stack": ["React", "Node.js", "PostgreSQL"]
  },
  "user_goals": [
    "Fix security vulnerabilities",
    "Improve performance",
    "Add test coverage"
  ],
  "next_agent": "Architect, Security Engineer, QA Engineer",
  "next_action": "Begin parallel assessment of existing codebase",
  "workflow": "assessment → planning → development → validation"
}
```

---

## Hybrid Project Workflow

### Flow: AI-Powered SaaS Application

Combines both traditional and AI/ML tracks:

```
                    ORCHESTRATOR
                         │
                         ▼
                  PRODUCT MANAGER
                         │
                         ▼
                    ARCHITECT
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              │              ▼
    TRADITIONAL TRACK    │        AI/ML TRACK
          │              │              │
    ┌─────┴─────┐        │        ┌─────┴─────┐
    │           │        │        │           │
UX/UI       Frontend     │    Data Eng    ML Eng
Designer       Dev       │        │           │
    │           │        │        └─────┬─────┘
    │           │        │              │
    │        Backend     │        Model Eval
    │          Dev       │              │
    │           │        │         AIOps Eng
    │           │        │              │
    └─────┬─────┘        │              │
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  INTEGRATION POINT
                  (QA coordinates)
                         │
                         ▼
                   QA ENGINEER
                         │
                         ▼
               SECURITY ENGINEER
                         │
                         ▼
                 DEVOPS ENGINEER
                         │
                         ▼
                   ORCHESTRATOR
                   (Maintenance)
```

### Key Coordination Points

1. **Architecture Phase**: Architect designs both traditional and ML components together
2. **Development Phase**: Backend Dev creates API endpoints that will serve ML predictions
3. **Integration Point**: QA tests both traditional features and ML integration
4. **Deployment**: DevOps deploys both application and ML infrastructure together

---

## Parallel Workflow Patterns

### Pattern 1: Design & Early Backend (Days 9-12)

```
                    ARCHITECT
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
    UX/UI DESIGNER              BACKEND DEVELOPER
    (Full effort)               (Database + Auth only)
          │                             │
          │                             │
          ▼ Day 12                      │
    Design Complete ────────────────────┤
          │                             │
          │                             ▼
          └──────────────┬──────────────┘
                         │
                         ▼ Day 12+
                  FRONTEND DEVELOPER
                  (Has designs + API)
```

### Pattern 2: Parallel Development (Days 12-18)

```
Day 12          Day 14          Day 16          Day 18
   │               │               │               │
   │  ┌────────────┼───────────────┼───────────────┤
   │  │            │               │               │
   │  ▼            ▼               ▼               ▼
   │  FRONTEND: Components ──► Pages ──► Integration ──► Tests
   │
   │  ┌────────────┼───────────────┼───────────────┤
   │  │            │               │               │
   │  ▼            ▼               ▼               ▼
   │  BACKEND: Endpoints ──► Business Logic ──► Tests ──► Docs
   │
   ├──────────────────────────────────────────────────────►
   │                    SYNC POINTS
   │
   │  Day 14: API contract finalized
   │  Day 16: Integration testing begins
   │  Day 18: Both hand off to QA
```

### Pattern 3: ML Parallel Development

```
DATA ENGINEER           ML ENGINEER            PROMPT ENGINEER
     │                       │                       │
     ▼                       │                       │
Data Pipelines ──────►       │                       │
     │                       ▼                       │
Feature Store ────────► Model Training              │
     │                       │                       │
Quality Checks               ▼                       ▼
     │                  Model Ready ────────► Prompt Integration
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
                             ▼
                      MODEL EVALUATOR
```

---

## Handoff Examples

### Example 1: Product Manager → Architect

```json
{
  "handoff": {
    "agent": "Product Manager",
    "timestamp": "2024-01-15T10:30:00Z",
    "status": "complete",
    "phase": "planning",
    "project": "converge-nps"
  },
  "deliverables": {
    "prd": {
      "path": "docs/PRD.md",
      "version": "1.0",
      "status": "approved"
    },
    "stories": {
      "total": 25,
      "p0": 10,
      "p1": 10,
      "p2": 5
    },
    "personas": {
      "count": 2,
      "primary": "Product Manager"
    }
  },
  "scope": {
    "in_scope": [
      "NPS survey collection",
      "Dashboard analytics",
      "AI-powered insights"
    ],
    "out_of_scope": [
      "Mobile app",
      "White-labeling"
    ],
    "mvp_stories": ["US-001", "US-002", "US-003", "US-004", "US-005"]
  },
  "risks": [
    {
      "id": "RISK-001",
      "description": "AI accuracy may not meet 90% target",
      "probability": "medium",
      "impact": "high",
      "mitigation": "Plan fallback to rule-based system"
    }
  ],
  "next_agent": "Architect",
  "next_action": "Design system architecture for NPS platform with AI integration",
  "blockers": [],
  "notes": "Stakeholder approved hybrid approach with both traditional dashboard and ML predictions"
}
```

### Example 2: Architect → Development Team (Parallel)

```json
{
  "handoff": {
    "agent": "Architect",
    "timestamp": "2024-01-18T14:00:00Z",
    "status": "complete",
    "phase": "architecture",
    "project": "converge-nps"
  },
  "deliverables": {
    "architecture_doc": "docs/ARCHITECTURE.md",
    "api_spec": "docs/API.yaml",
    "database_schema": "prisma/schema.prisma",
    "adrs": ["ADR-001", "ADR-002", "ADR-003"]
  },
  "tech_stack": {
    "frontend": "React + TypeScript + Vite",
    "backend": "Node.js + Express + Prisma",
    "database": "PostgreSQL",
    "ml": "Python + FastAPI + scikit-learn"
  },
  "api_design": {
    "total_endpoints": 20,
    "auth_endpoints": 5,
    "survey_endpoints": 8,
    "analytics_endpoints": 4,
    "ml_endpoints": 3
  },
  "parallel_assignments": {
    "UX/UI Designer": {
      "scope": "All user-facing screens",
      "priority": "P0 flows first",
      "deadline": "2024-01-22"
    },
    "Frontend Developer": {
      "scope": "Component library + auth flows",
      "dependencies": ["Design system from UX/UI"],
      "deadline": "2024-01-28"
    },
    "Backend Developer": {
      "scope": "API implementation + database",
      "dependencies": ["None - can start immediately"],
      "deadline": "2024-01-28"
    },
    "Data Engineer": {
      "scope": "Feature pipeline for ML",
      "dependencies": ["Database schema"],
      "deadline": "2024-01-25"
    }
  },
  "next_agent": "UX/UI Designer, Frontend Developer, Backend Developer, Data Engineer",
  "next_action": "Begin parallel development tracks",
  "blockers": [],
  "notes": "Backend can start immediately. Frontend should wait for design system basics (Day 2-3). Data Engineer needs database deployed first."
}
```

### Example 3: QA Engineer → Security (with conditions)

```json
{
  "handoff": {
    "agent": "QA Engineer",
    "timestamp": "2024-02-05T16:00:00Z",
    "status": "complete",
    "phase": "testing",
    "project": "converge-nps"
  },
  "quality_gate": {
    "decision": "approved_with_conditions",
    "conditions": [
      "BUG-015 must be fixed before production",
      "Performance test on ML endpoint needed"
    ],
    "sign_off_date": "2024-02-05"
  },
  "test_summary": {
    "total_test_cases": 150,
    "passed": 145,
    "failed": 3,
    "blocked": 2,
    "pass_rate": "96.7%"
  },
  "bugs": {
    "critical": 0,
    "high": 1,
    "medium": 8,
    "low": 9,
    "open": 3,
    "resolved": 15
  },
  "open_bugs": [
    {
      "id": "BUG-015",
      "title": "ML prediction timeout on large datasets",
      "severity": "high",
      "status": "in_progress",
      "owner": "ML Engineer"
    }
  ],
  "performance": {
    "api_response_p95_ms": 180,
    "page_load_s": 1.8,
    "ml_prediction_p95_ms": 450,
    "ml_prediction_status": "needs_optimization"
  },
  "next_agent": "Security & Privacy Engineer",
  "next_action": "Conduct security review. Note: ML endpoint performance being addressed in parallel.",
  "blockers": [
    {
      "id": "BLOCK-001",
      "description": "BUG-015 must be resolved",
      "severity": "high",
      "owner": "ML Engineer",
      "blocks": "Production deployment"
    }
  ],
  "notes": "Application is functionally complete. High-severity bug being fixed in parallel with security review."
}
```

---

## Error Recovery Workflows

### Scenario 1: Blocker During Development

```
Normal Flow                    Blocked Flow
─────────────                  ────────────

Backend Dev                    Backend Dev
    │                              │
    ▼                              ▼
[Building Auth] ──────────►  [BLOCKED: 3rd party API down]
    │                              │
    │                              ▼
    │                         ESCALATION
    │                              │
    │                         ┌────┴────┐
    │                         │         │
    │                         ▼         ▼
    │                    Orchestrator   Architect
    │                    (notified)     (design workaround)
    │                         │         │
    │                         └────┬────┘
    │                              │
    │                              ▼
    │                    [Workaround: Mock API + retry later]
    │                              │
    ▼                              ▼
[Continue] ◄───────────────  [UNBLOCKED]
```

### Scenario 2: Quality Gate Failure

```
QA Engineer
    │
    ▼
[Quality Gate: FAILED]
    │
    ├── Critical bugs found: 2
    │
    ▼
REJECTION HANDOFF
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "QA Engineer",                                          │
│     "status": "blocked",                                             │
│     "phase": "testing"                                               │
│   },                                                                 │
│   "quality_gate": { "decision": "rejected" },                        │
│   "blockers": [                                                      │
│     { "id": "BUG-001", "severity": "critical", "owner": "Backend" }, │
│     { "id": "BUG-002", "severity": "critical", "owner": "Frontend" } │
│   ],                                                                 │
│   "next_agent": "Frontend Developer, Backend Developer",             │
│   "next_action": "Fix critical bugs and resubmit for testing"        │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DEVELOPMENT (Bug Fixes)                                              │
│                                                                      │
│ Frontend Dev ──► Fix BUG-002 ──► Commit ──┐                         │
│                                           │                         │
│ Backend Dev ──► Fix BUG-001 ──► Commit ───┤                         │
│                                           │                         │
│                                           ▼                         │
│                                    RE-HANDOFF TO QA                 │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
QA Engineer
    │
    ▼
[Regression Testing]
    │
    ▼
[Quality Gate: PASSED]
```

### Scenario 3: Model Evaluation Failure

```
Model Evaluator
    │
    ▼
[Evaluation: Model accuracy 78%]
[Required: 90%]
    │
    ▼
REJECTION HANDOFF
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ {                                                                    │
│   "handoff": {                                                       │
│     "agent": "Model Evaluator",                                      │
│     "status": "blocked",                                             │
│     "phase": "ml_development"                                        │
│   },                                                                 │
│   "model_evaluation": {                                              │
│     "accuracy": 0.78,                                                │
│     "required_accuracy": 0.90,                                       │
│     "gap": 0.12                                                      │
│   },                                                                 │
│   "recommendations": [                                               │
│     "Increase training data by 50%",                                 │
│     "Try ensemble approach",                                         │
│     "Feature engineering improvements"                               │
│   ],                                                                 │
│   "next_agent": "ML Engineer, Data Engineer",                        │
│   "next_action": "Improve model per recommendations, retrain"        │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ITERATION CYCLE                                                      │
│                                                                      │
│ Data Engineer ──► More features ──► Feature Store ──┐               │
│                                                     │               │
│ ML Engineer ──► New architecture ──► Retrain ───────┤               │
│                                                     │               │
│                                                     ▼               │
│                                            Model v2 Ready           │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
Model Evaluator
    │
    ▼
[Evaluation: Model accuracy 92%]
    │
    ▼
[APPROVED for deployment]
```

---

## Status Update Flow

Throughout all workflows, agents update `docs/STATUS.md`:

```json
{
  "project": {
    "name": "Converge NPS",
    "id": "converge-nps",
    "type": "hybrid"
  },
  "current_phase": "testing",
  "current_agent": "QA Engineer",
  "last_updated": "2024-02-05T16:30:00Z",
  "phase_progress": {
    "percent_complete": 75,
    "tasks": {
      "functional_testing": "complete",
      "ui_testing": "complete",
      "api_testing": "complete",
      "performance_testing": "in_progress",
      "security_testing": "not_started",
      "regression_testing": "not_started"
    }
  },
  "handoffs": [
    {
      "from_agent": "Product Manager",
      "to_agent": "Architect",
      "timestamp": "2024-01-15T10:30:00Z",
      "phase": "planning",
      "status": "complete"
    },
    {
      "from_agent": "Architect",
      "to_agent": "Multiple",
      "timestamp": "2024-01-18T14:00:00Z",
      "phase": "architecture",
      "status": "complete"
    },
    {
      "from_agent": "Development Team",
      "to_agent": "QA Engineer",
      "timestamp": "2024-02-02T09:00:00Z",
      "phase": "development",
      "status": "complete"
    }
  ],
  "blockers": [],
  "next_actions": [
    {
      "action": "Complete performance testing",
      "owner": "QA Engineer",
      "due_date": "2024-02-06",
      "priority": "high"
    },
    {
      "action": "Security review",
      "owner": "Security Engineer",
      "due_date": "2024-02-08",
      "priority": "high"
    }
  ]
}
```

---

## Quick Reference: Project Type Selection

| User Intent | Project Type | First Phase | Key Workflow |
|-------------|--------------|-------------|--------------|
| "Build new app" | `traditional` | Planning | Intake → PRD → Architecture → Development |
| "Build new AI app" | `ai_ml` | Planning | Intake → PRD → Architecture → ML Development |
| "Improve existing code" | `enhancement` | Assessment | Intake → **Assessment** → Planning → Development |
| "Add AI to existing app" | `hybrid` | Assessment | Intake → **Assessment** → Planning → ML Development |

---

## Quick Reference: Handoff Triggers

### Standard Triggers (All Project Types)

| From Agent | To Agent | Trigger |
|------------|----------|---------|
| Orchestrator | Product Manager | Project intake complete |
| Product Manager | Architect | PRD approved |
| Architect | Dev Team | Architecture approved |
| UX/UI Designer | Frontend Dev | Design system complete |
| Frontend Dev | QA Engineer | UI implementation complete |
| Backend Dev | QA Engineer | API implementation complete |
| QA Engineer | Security Engineer | Quality gate passed |
| Security Engineer | DevOps Engineer | Security review passed |
| DevOps Engineer | Orchestrator | Deployment complete |

### AI/ML-Specific Triggers

| From Agent | To Agent | Trigger |
|------------|----------|---------|
| Data Engineer | ML Engineer | Feature pipeline ready |
| ML Engineer | Model Evaluator | Model training complete |
| Model Evaluator | AIOps Engineer | Model evaluation passed |

### Enhancement-Specific Triggers

| From Agent | To Agent | Trigger |
|------------|----------|---------|
| Orchestrator | Assessment Team | Codebase access obtained |
| Assessment Team | Product Manager | Assessment complete, recommendation approved |
| Product Manager | Dev Team | Enhancement plan approved |
| Dev Team | QA Engineer | Phase improvements complete |
| QA Engineer | Orchestrator | All phases validated |

---

---

## Version

**Version:** 2.0.0
**Last Updated:** 2026-01-02

### Changelog
- 2.0.0: Hub-and-Spoke architecture - Task queue workflows, worker-based execution, parallel patterns
- 1.0.0: Initial version with sequential handoff chains

*This document is maintained by the Orchestrator and updated as workflows evolve.*
