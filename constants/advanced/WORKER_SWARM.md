# Worker Swarm Architecture

> **Version 1.0** - Hub-and-Spoke Architecture

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Agent Router** | [AGENT_ROUTER_PROTOCOL.md](./AGENT_ROUTER_PROTOCOL.md) | Worker routing and capability matching |
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure, dequeue operations |
| **Self-Healing** | [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) | Worker self-verification (3 attempts) |
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `register_worker()`, `complete_task()` |

---

## Overview

The Worker Swarm organizes the 14 specialized agents into 3 functional categories for parallel execution. Each "worker" in this document corresponds to one or more of the 14 named agents defined in `agents/*.md`. Workers pull tasks from the queue, read specs from the Truth Layer, and submit task completions.

> **IMPORTANT:** "Workers" and "Agents" refer to the same entities. The worker IDs map directly to the 14 agent prompts. When spawning a worker, you are activating the corresponding agent from `agents/*.md`.

## Core Principles

1. **Stateless Workers** - Workers read context from Truth, don't carry state
2. **Pull Model** - Workers request tasks, Orchestrator doesn't push
3. **Self-Verifying** - Workers run self-healing loop before completing
4. **Spec-Driven** - Implementation follows specs exactly
5. **Parallel by Default** - Multiple workers execute simultaneously

---

## Worker Categories

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WORKER SWARM                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │    PLANNING     │  │   GENERATION    │  │   VALIDATION    │      │
│  │    WORKERS      │  │    WORKERS      │  │    WORKERS      │      │
│  │                 │  │                 │  │                 │      │
│  │  • Product      │  │  • Full Stack   │  │  • Auto-        │      │
│  │    Planner      │  │    Generator    │  │    Reviewer     │      │
│  │                 │  │                 │  │                 │      │
│  │  • System       │  │  • UI Generator │  │  • Security     │      │
│  │    Planner      │  │                 │  │    Scanner      │      │
│  │                 │  │  • API Generator│  │                 │      │
│  │                 │  │                 │  │  • QA Validator │      │
│  │                 │  │  • ML Generator │  │                 │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
│  Writes specs ────────► Reads specs ───────► Validates output       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Planning Workers

Write and refine specifications. Active during intake through G3 approval.

### Product Planner

**Formerly:** Product Manager

```json
{
  "worker_id": "product-planner",
  "category": "planning",
  "capabilities": ["requirements", "stories", "prd", "scope", "acceptance-criteria"],
  "spec_output": ["PRD.md", "user-stories/*.md"],
  "reads_from": ["INTAKE.md"],
  "writes_to": ["docs/PRD.md", "docs/user-stories/"]
}
```

**Responsibilities:**
- Translate user intent into requirements
- Write PRD with features, scope, constraints
- Define user stories with acceptance criteria
- Prioritize features (MoSCoW)

**Task Types Handled:**
- `Write PRD for [project]`
- `Define user stories for [feature]`
- `Refine scope based on feedback`

### System Planner

**Formerly:** Architect

```json
{
  "worker_id": "system-planner",
  "category": "planning",
  "capabilities": ["architecture", "openapi", "prisma", "zod", "design", "adr"],
  "spec_output": ["specs/openapi.yaml", "prisma/schema.prisma", "specs/schemas/*.ts"],
  "reads_from": ["PRD.md", "user-stories/"],
  "writes_to": ["docs/ARCHITECTURE.md", "specs/"]
}
```

**Responsibilities:**
- Design system architecture
- Write OpenAPI specification
- Design Prisma database schema
- Define Zod validation schemas
- Document ADRs (Architecture Decision Records)

**Task Types Handled:**
- `Design OpenAPI spec for [feature]`
- `Define Prisma schema for [models]`
- `Create Zod schemas for [domain]`
- `Document architecture decisions`

---

## Generation Workers

Generate code from specifications. Active after G3 approval (specs locked).

### Full Stack Generator

**Formerly:** Frontend Developer + Backend Developer combined

```json
{
  "worker_id": "full-stack-generator",
  "category": "generation",
  "capabilities": ["react", "typescript", "node", "prisma", "api", "components", "testing"],
  "spec_consumption": ["openapi.paths.*", "prisma.models.*", "zod.schemas.*"],
  "reads_from": ["specs/openapi.yaml", "prisma/schema.prisma", "specs/schemas/"],
  "writes_to": ["src/", "tests/"]
}
```

**Responsibilities:**
- Implement complete features end-to-end
- Generate React components from specs
- Generate API endpoints from OpenAPI
- Generate Prisma queries from schema
- Write tests for implementation

**Task Types Handled:**
- `Implement [feature] end-to-end`
- `Generate CRUD for [model]`
- `Implement [user-story]`

### UI Generator

**Formerly:** UX/UI Designer + Frontend Developer for UI

```json
{
  "worker_id": "ui-generator",
  "category": "generation",
  "capabilities": ["react", "css", "accessibility", "components", "design-system", "responsive"],
  "spec_consumption": ["openapi.paths.*.responses", "zod.schemas.*"],
  "reads_from": ["specs/openapi.yaml", "docs/designs/"],
  "writes_to": ["src/components/", "src/pages/", "src/styles/"]
}
```

**Responsibilities:**
- Generate UI components
- Implement design system
- Ensure accessibility (WCAG)
- Handle responsive layouts
- Component styling

**Task Types Handled:**
- `Build [component] component`
- `Implement [page] page`
- `Create design system components`

### API Generator

**Formerly:** Backend Developer + Data Engineer

```json
{
  "worker_id": "api-generator",
  "category": "generation",
  "capabilities": ["node", "express", "prisma", "validation", "api", "database", "caching"],
  "spec_consumption": ["openapi.paths.*", "prisma.models.*", "zod.schemas.*"],
  "reads_from": ["specs/openapi.yaml", "prisma/schema.prisma"],
  "writes_to": ["src/api/", "src/services/", "src/middleware/"]
}
```

**Responsibilities:**
- Generate API endpoints from OpenAPI
- Implement service layer
- Database operations with Prisma
- Input validation with Zod
- Middleware (auth, logging, etc.)

**Task Types Handled:**
- `Implement [endpoint] endpoint`
- `Create [service] service`
- `Add middleware for [concern]`

### ML Generator

**Formerly:** ML Engineer + Prompt Engineer + Data Engineer

```json
{
  "worker_id": "ml-generator",
  "category": "generation",
  "capabilities": ["python", "pytorch", "prompts", "evaluation", "pipelines", "embeddings"],
  "spec_consumption": ["ml-specs/*"],
  "reads_from": ["docs/ML_ARCHITECTURE.md", "prompts/"],
  "writes_to": ["src/ml/", "prompts/", "notebooks/"]
}
```

**Responsibilities:**
- Implement ML features
- Write and version prompts
- Create evaluation pipelines
- Build data pipelines
- Integrate AI services

**Task Types Handled:**
- `Implement [AI-feature]`
- `Write prompts for [use-case]`
- `Create evaluation suite for [model]`

---

## Validation Workers

Validate output and ensure quality. Active continuously after generation begins.

### Auto-Reviewer

**Formerly:** Automatic validation (new role)

```json
{
  "worker_id": "auto-reviewer",
  "category": "validation",
  "capabilities": ["lint", "typecheck", "build", "coverage", "format"],
  "validates": ["*.ts", "*.tsx", "*.js", "*.jsx"],
  "triggers_on": ["file_change", "task_completion", "pre_gate"]
}
```

**Responsibilities:**
- Run linting (ESLint)
- Run type checking (TypeScript)
- Run build verification
- Calculate test coverage
- Enforce formatting (Prettier)

**Task Types Handled:**
- `Lint [files]`
- `Type check project`
- `Verify build`
- `Check coverage`

### Security Scanner

**Formerly:** Security & Privacy Engineer

```json
{
  "worker_id": "security-scanner",
  "category": "validation",
  "capabilities": ["security", "audit", "vulnerabilities", "sast", "secrets"],
  "validates": ["src/**", "package.json", ".env*"],
  "triggers_on": ["pre_gate_G7", "dependency_change", "auth_code_change"]
}
```

**Responsibilities:**
- Run npm audit
- Scan for vulnerabilities
- Check for secrets in code
- Validate auth implementation
- OWASP compliance check

**Task Types Handled:**
- `Security scan [scope]`
- `Audit dependencies`
- `Review auth implementation`
- `Check for secrets`

### QA Validator

**Formerly:** QA Engineer

```json
{
  "worker_id": "qa-validator",
  "category": "validation",
  "capabilities": ["testing", "e2e", "regression", "integration", "acceptance"],
  "validates": ["src/**", "tests/**"],
  "triggers_on": ["feature_complete", "pre_gate_G6", "bug_fix"]
}
```

**Responsibilities:**
- Run unit tests
- Run integration tests
- Run E2E tests
- Validate acceptance criteria
- Regression testing

**Task Types Handled:**
- `Run tests for [feature]`
- `E2E test [user-flow]`
- `Validate acceptance criteria for [story]`
- `Regression suite`

---

## Agent-to-Worker Mapping

> **These are the SAME entities.** Worker IDs are shorthand for the 14 agent prompts.
> When activating a worker, load the corresponding agent prompt from `agents/*.md`.

| Agent (Prompt File) | Worker ID | Category | When Activated | Project Type |
|---------------------|-----------|----------|----------------|--------------|
| Product Manager (`product-manager.md`) | product-planner | Planning | G1→G2 | All |
| Architect (`architect.md`) | system-planner | Planning | G2→G3 | All |
| UX/UI Designer (`ux-ui-designer.md`) | ui-generator | Generation | G3→G4 (if UI) | All (with UI) |
| Frontend Developer (`frontend-dev.md`) | full-stack-generator / ui-generator | Generation | G4→G5 | All |
| Backend Developer (`backend-dev.md`) | full-stack-generator / api-generator | Generation | G4→G5 | All |
| Data Engineer (`data-engineer.md`) | api-generator / ml-generator | Generation | G3→G5 | All |
| ML Engineer (`ml-engineer.md`) | ml-generator | Generation | G3→G5 | **ai_ml / hybrid ONLY** |
| Prompt Engineer (`prompt-engineer.md`) | ml-generator | Generation | G3→G5 | **ai_ml / hybrid ONLY** |
| Model Evaluator (`model-evaluator.md`) | ml-generator | Generation | G5→G6 | **ai_ml / hybrid ONLY** |
| QA Engineer (`qa-engineer.md`) | qa-validator | Validation | **MANDATORY before G6** | All |
| Security & Privacy Engineer (`security-privacy-engineer.md`) | security-scanner | Validation | **MANDATORY before G7** | All |
| DevOps Engineer (`devops.md`) | devops-deployer | Deployment | G7→G8→G9 | All |
| AIOps Engineer (`aiops-engineer.md`) | ml-generator | Deployment | G7→G8→G9 | **ai_ml / hybrid ONLY** |
| Orchestrator (`orchestrator.md`) | **Hub** (unchanged) | Coordination | Always active | All |

### Agent Activation by Project Type

| Project Type | Active Agents | Skipped Agents |
|--------------|---------------|----------------|
| `traditional` | 10 agents | ML Engineer, Prompt Engineer, Model Evaluator, AIOps Engineer |
| `ai_ml` | All 14 agents | None |
| `hybrid` | All 14 agents | None |
| `enhancement` | Varies by scope | Assessment-dependent |

> **Note:** Project type is determined at G1 (Intake). The orchestrator MUST check `PROJECT_TYPE` before activating any ML-specific agents.

### Mandatory Agent Activation for Gates

**These agents MUST be spawned via Task tool and complete their work before the gate can be presented:**

| Gate | Mandatory Agent | Spawn Command | Required Output |
|------|-----------------|---------------|-----------------|
| G4 (Design) | UX/UI Designer | `Task({description: "UX/UI - design options"})` | 3 HTML options, user selection |
| G6 (Quality) | QA Engineer | `Task({description: "QA - full test suite"})` | Test results, coverage report |
| G7 (Security) | Security & Privacy Engineer | `Task({description: "Security - security scan"})` | Security scan results, npm audit |
| G8 (Pre-Deploy) | DevOps Engineer | `Task({description: "DevOps - deploy checklist"})` | Deployment checklist, rollback plan |
| G9 (Production) | DevOps Engineer | `Task({description: "DevOps - smoke test"})` | Smoke test results, production metrics |

**⛔ The orchestrator CANNOT do the agent's work itself. It MUST use the Task tool to spawn agents.**

**⛔ A gate CANNOT be presented to the user until its mandatory agent has completed and produced proof artifacts.**

### How Orchestrator Spawns Agents

The orchestrator uses Claude Code's Task tool to spawn specialist agents:

```typescript
// Example: Spawning QA Engineer for G6
Task({
  subagent_type: "general-purpose",
  description: "QA Engineer - G6 test suite",
  prompt: `You are the QA Engineer Agent.

    Read your full instructions from: agents/qa-engineer.md

    Project path: /path/to/project

    Your task:
    1. Run the full test suite
    2. Generate coverage report
    3. Return results to orchestrator

    DO NOT present G6 yourself - return results only.`
})
```

The orchestrator then:
1. Waits for the Task to complete
2. Verifies proof artifacts in the response
3. Only then presents the gate to the user

---

## Worker Lifecycle

### Registration

Workers register with capabilities:

```typescript
await register_worker({
  worker_id: 'full-stack-generator',
  category: 'generation',
  capabilities: ['react', 'typescript', 'node', 'prisma'],
  spec_consumption: ['openapi.paths.*', 'prisma.models.*']
});
```

### Task Loop

```typescript
while (true) {
  // 1. Request task
  const task = await dequeue_task({
    worker_id: MY_WORKER_ID,
    worker_category: MY_CATEGORY
  });

  if (!task) {
    // No tasks - idle
    await update_worker_status({ worker_id: MY_WORKER_ID, status: 'idle' });
    await sleep(POLL_INTERVAL);
    continue;
  }

  // 2. Mark active
  await update_worker_status({
    worker_id: MY_WORKER_ID,
    status: 'active',
    current_task: task.task_id
  });

  // 3. Read specs
  const specs = await Promise.all(
    task.spec_refs.map(ref => get_spec({ spec_type: inferType(ref), path: ref }))
  );

  // 4. Execute task
  const output = await executeTask(task, specs);

  // 5. Self-verify
  const verification = await selfVerify(output);

  // 6. Complete task
  await complete_task({
    task_id: task.task_id,
    worker_id: MY_WORKER_ID,
    status: verification.all_passed ? 'complete' : 'failed',
    output,
    verification
  });

  // 7. Back to idle
  await update_worker_status({ worker_id: MY_WORKER_ID, status: 'idle' });
}
```

### Self-Verification

Workers must verify output before completing:

```typescript
async function selfVerify(output: TaskOutput): Promise<Verification> {
  const checks = [];

  // Build check
  const buildResult = await runCommand('npm run build');
  checks.push({ name: 'build', passed: buildResult.exitCode === 0, ...buildResult });

  // Lint check
  const lintResult = await runCommand('npm run lint');
  checks.push({ name: 'lint', passed: lintResult.exitCode === 0, ...lintResult });

  // Test check
  const testResult = await runCommand('npm test');
  checks.push({ name: 'test', passed: testResult.exitCode === 0, ...testResult });

  return {
    all_passed: checks.every(c => c.passed),
    checks,
    self_healing_applied: false
  };
}
```

### Self-Healing Loop

If verification fails, workers attempt self-healing (up to 3 times):

```typescript
async function executeWithHealing(task: Task): Promise<TaskOutput> {
  let output = await executeTask(task);
  let verification = await selfVerify(output);
  let attempts = 1;

  while (!verification.all_passed && attempts < 3) {
    // Analyze failure
    const failedChecks = verification.checks.filter(c => !c.passed);

    // Attempt fix
    for (const check of failedChecks) {
      output = await fixIssue(check, output);
    }

    // Re-verify
    verification = await selfVerify(output);
    verification.self_healing_applied = true;
    verification.healing_iterations = attempts;
    attempts++;
  }

  return { output, verification };
}
```

---

## Parallel Execution Patterns

### Pattern 1: Independent Features

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AFTER G3 APPROVAL                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  full-stack-gen ──► TASK-001: Implement auth API                    │
│                                                                      │
│  api-generator ───► TASK-002: Implement user API    } PARALLEL     │
│                                                                      │
│  ui-generator ────► TASK-003: Build auth UI                         │
│                                                                      │
│  full-stack-gen ──► TASK-004: Build dashboard                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Pattern 2: Frontend + Backend Parallel

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FEATURE IMPLEMENTATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────┐              │
│  │    API Generator     │    │    UI Generator      │              │
│  │                      │    │                      │              │
│  │  1. Read OpenAPI     │    │  1. Read OpenAPI     │              │
│  │  2. Generate routes  │    │  2. Generate types   │              │
│  │  3. Generate service │    │  3. Generate hooks   │   PARALLEL   │
│  │  4. Add validation   │    │  4. Build components │              │
│  │  5. Write tests      │    │  5. Write tests      │              │
│  │                      │    │                      │              │
│  └──────────┬───────────┘    └──────────┬───────────┘              │
│             │                           │                           │
│             └───────────┬───────────────┘                           │
│                         │                                           │
│                         ▼                                           │
│             ┌──────────────────────┐                                │
│             │   Integration Test   │  ← After both complete        │
│             │     (qa-validator)   │                                │
│             └──────────────────────┘                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Continuous Validation

```
┌─────────────────────────────────────────────────────────────────────┐
│                   VALIDATION PIPELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  File change detected                                               │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ auto-reviewer│ │security-scan │ │ qa-validator │  PARALLEL     │
│  │              │ │              │ │              │               │
│  │  • Lint      │ │  • npm audit │ │  • Unit test │               │
│  │  • Types     │ │  • Secrets   │ │  • E2E       │               │
│  │  • Build     │ │  • SAST      │ │  • Coverage  │               │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘               │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          │                                          │
│                          ▼                                          │
│                 Validation Results                                  │
│                 (all must pass)                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Worker Configuration

### Default Pool

```json
{
  "worker_pool": {
    "planning": {
      "product-planner": { "instances": 1, "tier": 3 },
      "system-planner": { "instances": 1, "tier": 3 }
    },
    "generation": {
      "full-stack-generator": { "instances": 2, "tier": 2 },
      "ui-generator": { "instances": 1, "tier": 2 },
      "api-generator": { "instances": 1, "tier": 2 },
      "ml-generator": { "instances": 1, "tier": 3 }
    },
    "validation": {
      "auto-reviewer": { "instances": 1, "tier": 1 },
      "security-scanner": { "instances": 1, "tier": 2 },
      "qa-validator": { "instances": 1, "tier": 2 }
    }
  }
}
```

### Model Tiers

| Tier | Model | Use Case |
|------|-------|----------|
| 1 (Fast) | Haiku | Auto-reviewer, simple tasks |
| 2 (Balanced) | Sonnet | Most generation work |
| 3 (Powerful) | Opus | Architecture, security, complex tasks |

---

## Monitoring

### Worker Metrics

```typescript
get_worker_metrics({ project_id });
// Returns:
// {
//   workers: {
//     'full-stack-generator': {
//       status: 'active',
//       tasks_completed: 15,
//       average_duration_ms: 120000,
//       error_rate: 0.02
//     },
//     ...
//   },
//   category_stats: {
//     planning: { active: 0, idle: 2, total_tasks: 10 },
//     generation: { active: 3, idle: 1, total_tasks: 45 },
//     validation: { active: 2, idle: 1, total_tasks: 30 }
//   }
// }
```
