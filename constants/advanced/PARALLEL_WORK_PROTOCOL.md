# Parallel Work Protocol

> **Version 3.0** - Hub-and-Spoke Architecture

This protocol defines how multiple workers execute tasks in parallel without conflicts. In Hub-and-Spoke architecture, **parallel work is the default mode** across all phases.

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure, spec_refs for conflict detection |
| **Worker Swarm** | [WORKER_SWARM.md](./WORKER_SWARM.md) | Worker categories and parallel execution |
| **Approval Gates** | [APPROVAL_GATES.md](./APPROVAL_GATES.md) | G3 approval triggers spec locking |
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `lock_specs()`, `get_parallel_execution_status()` |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | Parallel validation checks |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARALLEL TASK EXECUTION                       │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  TASK-001   │  │  TASK-002   │  │  TASK-003   │              │
│  │  auth API   │  │  user API   │  │  product UI │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ api-gen     │  │ api-gen     │  │ ui-gen      │              │
│  │ (worker)    │  │ (worker)    │  │ (worker)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  All workers execute simultaneously from shared specs            │
└─────────────────────────────────────────────────────────────────┘
```

## Parallel Work by Phase

| Phase | Parallel Workers | Coordination Method |
|-------|-----------------|---------------------|
| **Assessment** | All validation workers | Parallel task queue |
| **Planning** | product-planner + system-planner | Separate spec sections |
| **Development** | All generation workers | Spec locking after G3 |
| **Validation** | Lint + Typecheck + Test + Security | No dependencies |
| **Deployment** | Frontend deploy + Backend deploy | Separate targets |

---

## Task Queue Parallelism

### How Parallel Tasks Work

In Hub-and-Spoke, parallelism is achieved through the task queue:

```typescript
// Orchestrator decomposes work into parallel tasks
await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'generation',
  description: 'Implement auth API',
  spec_refs: ['openapi.paths./api/auth.*'],
  gate_dependency: 'G3'
});

await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'generation',
  description: 'Implement user API',
  spec_refs: ['openapi.paths./api/users.*'],
  gate_dependency: 'G3'
});

await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'generation',
  description: 'Build user profile UI',
  spec_refs: ['zod.schemas.User'],
  gate_dependency: 'G3'
});

// After G3 approval, all three tasks can be picked up by different workers simultaneously
```

### Conflict Prevention via Specs

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPEC-BASED ISOLATION                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 LOCKED SPECS (after G3)                   │   │
│  │                                                           │   │
│  │  openapi.yaml        prisma.schema       zod/schemas/    │   │
│  │  ├─ /api/auth.*      ├─ User model       ├─ User.ts     │   │
│  │  ├─ /api/users.*     ├─ Product model    ├─ Product.ts  │   │
│  │  └─ /api/products.*  └─ Order model      └─ Order.ts    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │ Worker A    │      │ Worker B    │      │ Worker C    │     │
│  │ /api/auth   │      │ /api/users  │      │ User UI     │     │
│  │             │      │             │      │             │     │
│  │ NO CONFLICT │      │ NO CONFLICT │      │ NO CONFLICT │     │
│  │ (different  │      │ (different  │      │ (different  │     │
│  │  spec_refs) │      │  spec_refs) │      │  spec_refs) │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Task Conflict Detection

Tasks with overlapping spec_refs cannot run in parallel:

```typescript
// These tasks CONFLICT - same spec section
{
  task_id: 'TASK-001',
  description: 'Implement auth login',
  spec_refs: ['openapi.paths./api/auth.post']
}

{
  task_id: 'TASK-002',
  description: 'Add 2FA to auth',
  spec_refs: ['openapi.paths./api/auth.post']  // CONFLICT!
}

// Task queue automatically serializes conflicting tasks
// TASK-002 waits until TASK-001 completes
```

---

## Shared Resource Ownership

### Spec-Based Ownership (After G3)

| Resource | Spec Type | Owner Worker | Modifiable After G3? |
|----------|-----------|--------------|---------------------|
| **API Endpoints** | OpenAPI | api-generator | NO (locked) |
| **Database Schema** | Prisma | api-generator | NO (locked) |
| **Domain Types** | Zod | system-planner | NO (locked) |
| **UI Components** | - | ui-generator | YES (implements spec) |
| **Test Files** | - | qa-validator | YES (validates spec) |

### Pre-G3 Ownership

Before G3 approval, specs are mutable:

| Resource | File Pattern | Primary Owner | Can Modify |
|----------|--------------|---------------|------------|
| **OpenAPI Spec** | `specs/openapi.yaml` | system-planner | planning workers |
| **Prisma Schema** | `prisma/schema.prisma` | system-planner | planning workers |
| **Zod Schemas** | `specs/schemas/*.ts` | system-planner | planning workers |
| **PRD** | `docs/PRD.md` | product-planner | only product-planner |

### Post-G3 Lock

```typescript
// G3 approval triggers spec lock
await mcp.callTool('approve_gate', {
  project_id: 'my-project',
  gate: 'G3',
  approved_by: 'user'
});

// Automatically locks specs
await mcp.callTool('lock_specs', {
  project_id: 'my-project',
  locked_by: 'G3'
});

// After this, any attempt to modify specs fails
// Workers can only READ specs, not WRITE
```

---

## Query Protocol & Circular Dependency Detection

### Query Tracking

All inter-agent queries must be tracked in `docs/STATUS.md`:

```markdown
## Active Queries

| Query ID | From | To | Status | Created | Depends On |
|----------|------|-----|--------|---------|------------|
| QUERY-001 | Frontend | Backend | pending | 2024-12-19 10:00 | - |
| QUERY-002 | Backend | Frontend | pending | 2024-12-19 10:15 | QUERY-001 |
```

### Circular Query Detection (MANDATORY)

**Definition:** A circular query occurs when Agent A is waiting for Agent B, and Agent B is waiting for Agent A (directly or through a chain).

**Detection Algorithm:**

```
function detectCircularQueries(queries):
  # Build dependency graph
  graph = {}
  for query in queries:
    if query.status == "pending":
      from_agent = query.from_agent
      to_agent = query.to_agent
      depends_on = query.depends_on  # What query this agent is blocked by

      if from_agent not in graph:
        graph[from_agent] = []
      graph[from_agent].append(to_agent)

  # Detect cycles using DFS
  for agent in graph:
    visited = set()
    if hasCycle(agent, graph, visited):
      return CIRCULAR_DETECTED

  return NO_CIRCULAR

function hasCycle(agent, graph, visited):
  if agent in visited:
    return true  # Cycle found!
  visited.add(agent)
  for dependency in graph.get(agent, []):
    if hasCycle(dependency, graph, visited):
      return true
  return false
```

### Circular Query Examples

**Example 1: Direct Circular (DETECTED)**
```
QUERY-A: Frontend → Backend: "Should we use X for API response?"
QUERY-B: Backend → Frontend: "Need to know if Frontend can handle nested JSON"

Graph: Frontend → Backend → Frontend (CYCLE!)

Resolution: ESCALATE IMMEDIATELY to Orchestrator
```

**Example 2: Indirect Circular (DETECTED)**
```
QUERY-A: Frontend → Backend: "What format for user data?"
QUERY-B: Backend → ML Engineer: "What embeddings format?"
QUERY-C: ML Engineer → Frontend: "What display format?"

Graph: Frontend → Backend → ML Engineer → Frontend (CYCLE!)

Resolution: ESCALATE IMMEDIATELY to Orchestrator
```

**Example 3: Valid Chain (NOT circular)**
```
QUERY-A: Frontend → Backend: "What format for user data?"
QUERY-B: Backend → Architect: "Best practice for this pattern?"

Graph: Frontend → Backend → Architect (NO CYCLE)

Status: Proceed normally
```

### When Circular Query Detected

**Immediate Actions:**

1. **STOP** all agents involved in the cycle
2. **LOG** the circular dependency in DECISIONS.md:
   ```markdown
   ## CIRCULAR-QUERY-XXX: Dependency Deadlock

   **Date:** YYYY-MM-DD
   **Agents Involved:** [Agent A], [Agent B], [Agent C]...
   **Query Chain:** QUERY-A → QUERY-B → QUERY-C → QUERY-A

   ### Root Cause
   [Why the circular dependency occurred]

   ### Resolution
   [How it was resolved - which query was answered first]
   ```

3. **ESCALATE** to Orchestrator with resolution options:
   ```markdown
   ## CIRCULAR QUERY ESCALATION

   **Detected:** Circular dependency between queries

   **Query Chain:**
   - QUERY-001: Frontend waiting on Backend (API format)
   - QUERY-002: Backend waiting on Frontend (data shape)

   **Options:**
   A) **Break at Frontend:** Frontend makes assumption, Backend adapts
   B) **Break at Backend:** Backend makes assumption, Frontend adapts
   C) **User decides:** Escalate to user for decision
   D) **Architect intervenes:** Architect defines canonical answer for both

   **Recommendation:** [Most appropriate option based on context]
   ```

4. **Resolution:** One agent MUST break the cycle by:
   - Making a reasonable assumption
   - Documenting the assumption in DECISIONS.md
   - Other agent adapts to that assumption

### Query Timeout

**Maximum wait time per query: 2 hours**

After 2 hours without response:
1. Query marked as `expired`
2. Orchestrator notified
3. Originating agent must either:
   - Make reasonable assumption and proceed
   - Escalate to user for decision
   - Wait for explicit resolution (blocking)

---

## Branch Strategy

### Feature Branches During Parallel Work

```
main
  │
  ├── feature/G5-frontend  (Frontend Developer)
  │     └── src/components/
  │     └── src/pages/
  │     └── src/hooks/
  │
  ├── feature/G5-backend   (Backend Developer)
  │     └── src/controllers/
  │     └── src/services/
  │     └── src/routes/
  │     └── prisma/
  │
  └── shared/types         (Architect - if type changes needed)
        └── src/types/
```

### Branch Commands

```bash
# Frontend Developer starts work
git checkout -b feature/G5-frontend

# Backend Developer starts work (separate branch)
git checkout -b feature/G5-backend

# After both complete, Orchestrator merges
git checkout main
git merge feature/G5-backend
git merge feature/G5-frontend  # May have conflicts
```

---

## Conflict Prevention

### 1. Type Definition Protocol

When Frontend and Backend both need types:

**Step 1: Architect defines shared types first**
```typescript
// src/types/api.ts - Owned by Architect
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO 8601
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

**Step 2: Backend implements API returning these types**
```typescript
// Backend uses shared types
import { User, ApiResponse } from '../types/api';

router.get('/users/:id', async (req, res) => {
  const user: User = await userService.findById(req.params.id);
  const response: ApiResponse<User> = { success: true, data: user };
  res.json(response);
});
```

**Step 3: Frontend consumes same types**
```typescript
// Frontend uses same shared types
import { User, ApiResponse } from '../types/api';

const fetchUser = async (id: string): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(`/users/${id}`);
  if (!response.data.success) throw new Error(response.data.error?.message);
  return response.data.data!;
};
```

### 2. API Contract Protocol

**Rule: Backend owns API.yaml, Frontend must follow it.**

```yaml
# docs/API.yaml - Source of truth
paths:
  /users/{id}:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

**If Frontend needs a change:**

```markdown
## QUERY-XXX: API Change Request

**From:** Frontend Developer
**To:** Backend Developer
**Type:** consultation
**Blocking:** false

**Current Contract:**
GET /users/{id} returns { user }

**Requested Change:**
GET /users/{id} should also return { user, permissions }

**Rationale:**
Need permissions for role-based UI rendering

**Options:**
A) Add permissions to existing endpoint
B) Create new endpoint /users/{id}/permissions
C) Frontend fetches permissions separately
```

### 3. Database Schema Protocol

**Rule: Backend owns schema, Frontend never touches it.**

```
NEVER ALLOWED:
  - Frontend modifying prisma/schema.prisma
  - Frontend running migrations
  - Frontend adding database columns

ALWAYS ALLOWED:
  - Frontend reading from API (not directly from DB)
  - Frontend requesting schema changes via Query Protocol
  - Backend implementing schema changes
```

---

## Conflict Detection

### Pre-Merge Checks

Before merging parallel branches, Orchestrator runs:

```bash
#!/bin/bash
# Check for potential conflicts

# 1. Check if both branches modified shared files
FRONTEND_FILES=$(git diff main...feature/G5-frontend --name-only)
BACKEND_FILES=$(git diff main...feature/G5-backend --name-only)

# Find intersection (both modified)
CONFLICTS=$(echo "$FRONTEND_FILES" | grep -xF "$BACKEND_FILES")

if [ -n "$CONFLICTS" ]; then
  echo "POTENTIAL CONFLICTS DETECTED:"
  echo "$CONFLICTS"
  exit 1
fi

# 2. Check type compatibility
npx tsc --noEmit  # Compile both branches together
```

### Conflict Indicators

| Indicator | Detection | Action |
|-----------|-----------|--------|
| Same file modified | `git diff --name-only` | Manual merge required |
| Type mismatch | `tsc --noEmit` fails | Architect resolves |
| API mismatch | Contract tests fail | Backend resolves |
| Import path change | Build fails | Whoever changed it |

---

## Conflict Resolution

### Authority Hierarchy

When parallel agents disagree, this hierarchy determines who has final say:

| Conflict Area | Primary Authority | Secondary | User Escalation |
|---------------|-------------------|-----------|-----------------|
| **Shared Types** | Architect | Backend Dev | If neither agrees |
| **API Contracts** | Backend Developer | Architect | If breaking change |
| **Database Schema** | Backend Developer | Architect | Always for data loss |
| **UI Patterns** | UX/UI Designer | Frontend Dev | If accessibility impact |
| **Performance** | Architect | Affected Dev | If SLA impact |
| **Security** | Security Engineer | All defer | Always escalate |

### Resolution Workflow

```
CONFLICT DETECTED
    │
    ▼
Step 1: IDENTIFY TYPE
    │
    ├── Git conflict (same file) → Manual merge
    ├── Type mismatch → Architect decides canonical
    ├── API mismatch → API.yaml is source of truth
    ├── Design conflict → UX/UI Designer decides
    │
    ▼
Step 2: DETERMINE RESOLVER (see Authority Hierarchy)
    │
    ├── Shared types → Architect
    ├── API contracts → Backend Developer
    ├── UI conflicts → Frontend Developer (with UX input)
    ├── Infrastructure → DevOps Engineer
    │
    ▼
Step 3: EXECUTE RESOLUTION
    │
    ├── Create CONFLICT-XXX entry in DECISIONS.md
    ├── Resolver makes canonical decision
    ├── Other agent adapts to decision
    ├── If authority disputed → Escalate to Orchestrator
    │
    ▼
Step 4: VALIDATE
    │
    └── npm run build && npm run test
```

### Escalation to User

Escalate to user (via Orchestrator) when:
- Both agents have equal authority
- Conflict affects user-facing functionality
- Either agent requests escalation
- Timeout (2 hours) without resolution

### Escalation Format

```markdown
## CONFLICT-ESCALATE-XXX: [Description]

**Date:** YYYY-MM-DD
**Agents Involved:** [Agent A], [Agent B]
**Conflict Area:** [Area]

### Issue
[What the conflict is]

### Position A ([Agent A])
[Agent A's approach and rationale]

### Position B ([Agent B])
[Agent B's approach and rationale]

### Impact
- **If A chosen:** [Impact]
- **If B chosen:** [Impact]

### Recommendation
[Orchestrator's recommendation]

### Your Decision Required
Please choose:
A) Go with [Agent A]'s approach
B) Go with [Agent B]'s approach
C) Provide alternative direction
```

### Conflict Entry Template

```markdown
## CONFLICT-XXX: [Description]

**Date:** YYYY-MM-DD
**Detected At:** G5.4 (Integration)
**Agents Involved:** Frontend Developer, Backend Developer
**Files Affected:** src/types/user.ts

### Conflict Description
[What conflict occurred]

### Version A (Frontend)
```typescript
interface User {
  createdAt: Date;  // Wanted JavaScript Date
}
```

### Version B (Backend)
```typescript
interface User {
  createdAt: string;  // Returns ISO string
}
```

### Analysis
[Why each agent made their choice]

### Resolution Options

| Option | Impact | Effort | Recommended |
|--------|--------|--------|-------------|
| A: Frontend adapts | Frontend parses strings | 30min | Yes |
| B: Backend adapts | Backend serializes Dates | 1h | No |
| C: Both change | Add both formats | 2h | No |

### Decision
**Chosen:** Option A
**Rationale:** Keep API JSON-friendly, parsing is trivial
**Resolver:** Architect
**Approved By:** User

### Implementation
- [x] Update `src/types/user.ts` to use `string`
- [x] Add date parsing utility in Frontend
- [x] Update affected components
```

---

## Sync Points

### Mandatory Sync Points

| Gate | Sync Action | Who Syncs |
|------|-------------|-----------|
| G3 Approved | Types frozen | Architect |
| G5.1 Complete | Foundation aligned | Frontend + Backend |
| G5.2 Complete | API contracts finalized | Backend |
| G5.4 Start | Branch merge | Orchestrator |
| G5.5 Complete | Final type check | All developers |

### Sync Checkpoint Format

```markdown
## SYNC-XXX: [Gate] Synchronization

**Date:** YYYY-MM-DD
**Gate:** G5.4_INTEGRATION

### Branches Merged
- [x] feature/G5-frontend (47 commits)
- [x] feature/G5-backend (32 commits)

### Conflicts Resolved
- CONFLICT-001: User.createdAt type (resolved)
- CONFLICT-002: None

### Type Check
- `tsc --noEmit`: PASSED

### Build Check
- Frontend: PASSED
- Backend: PASSED

### Test Check
- Unit tests: 45/45 passing
- Integration tests: 12/12 passing

### Verified By
- Orchestrator: [timestamp]
```

---

## Communication During Parallel Work

### Status Updates

During parallel work, agents post updates to `docs/STATUS.md`:

```markdown
## Parallel Work Status

### Frontend Developer
**Branch:** feature/G5-frontend
**Current:** Building SearchResults component
**Blocked By:** None
**Modified Shared Files:** None
**Last Commit:** abc1234 (2h ago)

### Backend Developer
**Branch:** feature/G5-backend
**Current:** Implementing search API
**Blocked By:** None
**Modified Shared Files:** src/types/search.ts (added SearchParams)
**Last Commit:** def5678 (1h ago)
```

### Proactive Conflict Notification

When modifying shared resources, agent MUST notify:

```markdown
## NOTIFY: Shared Resource Modified

**Agent:** Backend Developer
**File:** src/types/search.ts
**Change:** Added SearchParams interface
**Affects:** Frontend Developer

```typescript
// New interface - Frontend should use this for search requests
export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
}
```

**Action Required:** Frontend Developer should pull latest types before implementing search UI.
```

---

## Anti-Patterns

### What NOT to Do During Parallel Work

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|-------------------|
| Modifying shared types without notification | Causes type errors in other branch | Use NOTIFY protocol |
| Direct database access from Frontend | Bypasses API contracts | Always go through API |
| Duplicating types in each branch | Drift between definitions | Use single shared types file |
| Merging without type check | Runtime errors | Always run `tsc --noEmit` |
| Ignoring API.yaml | Contract violations | API.yaml is source of truth |
| Force-pushing to shared branch | Loses others' work | Only push to feature branches |

---

---

## Assessment Phase Parallelization

> **NEW in v2.0.0:** Assessment agents now run in parallel for faster evaluation.

### Overview

During the Assessment phase for enhancement projects, multiple agents can evaluate the codebase **simultaneously** since they read from the same source but write to different sections of `docs/ASSESSMENT.md`.

### Parallel Assessment Groups

```
GROUP 1 (Technical Analysis) - Run Simultaneously:
├── Architect         → Architecture section, patterns, tech stack
├── Security Engineer → Security section, vulnerabilities, auth
├── QA Engineer       → Quality section, test coverage, code quality
└── DevOps Engineer   → Infrastructure section, CI/CD, deployment

GROUP 2 (Code Review) - Run Simultaneously:
├── Frontend Developer → UI code review, accessibility, performance
└── Backend Developer  → API review, database, backend performance

GROUP 3 (Optional - AI Projects):
├── ML Engineer       → Model evaluation, data pipelines
└── Data Engineer     → Data quality, ETL processes
```

### Parallel Assessment Workflow

```
PHASE: ASSESSMENT (Parallel Execution)

Step 1: Orchestrator Initialization
├── Verify project path exists
├── Create docs/ASSESSMENT.md from template
├── Identify repository structure
├── Classify project scope
└── Initialize parallel_assessment tracking in MCP

Step 2: Spawn Assessment Agents IN PARALLEL
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION                        │
├─────────────────────────────────────────────────────────────┤
│  Architect            Security Engineer                      │
│  ├─ Architecture      ├─ Vulnerability scan                 │
│  ├─ Tech stack        ├─ Auth/authz review                  │
│  ├─ Patterns          ├─ Data protection                    │
│  └─ Score: 1-10       └─ Score: 1-10                        │
│                                                              │
│  QA Engineer          DevOps Engineer                        │
│  ├─ Test coverage     ├─ CI/CD assessment                   │
│  ├─ Code quality      ├─ Deployment config                  │
│  ├─ Documentation     ├─ Monitoring/logging                 │
│  └─ Score: 1-10       └─ Score: 1-10                        │
│                                                              │
│  Frontend Developer   Backend Developer                      │
│  ├─ UI code quality   ├─ API design review                  │
│  ├─ Performance       ├─ Database analysis                  │
│  ├─ Accessibility     ├─ Performance bottlenecks            │
│  └─ Contributes to    └─ Contributes to                     │
│     Code Quality         Code Quality                        │
└─────────────────────────────────────────────────────────────┘

Step 3: Orchestrator Aggregates Results
├── Wait for ALL parallel agents to complete
├── Collect JSON outputs from each agent
├── Calculate weighted overall score
├── Generate GAP_ANALYSIS.md
├── Generate TECH_DEBT.md
├── Generate ENHANCEMENT_PLAN.md
└── Present recommendation to user
```

### Assessment Section Ownership

Each agent owns a specific section of `docs/ASSESSMENT.md`:

| Section | Owner Agent | Score Weight |
|---------|-------------|--------------|
| `## Architecture Analysis` | Architect | 1.2x |
| `## Security Assessment` | Security Engineer | 1.5x |
| `## Quality Analysis` | QA Engineer | 1.0x |
| `## Infrastructure Review` | DevOps Engineer | 0.8x |
| `## Frontend Code Review` | Frontend Developer | 0.5x (→ Code Quality) |
| `## Backend Code Review` | Backend Developer | 0.5x (→ Code Quality) |
| `## AI/ML Assessment` | ML Engineer | 1.0x (if applicable) |

### Parallel Assessment JSON Output Format

Each assessment agent produces a structured JSON output:

```json
{
  "assessment_handoff": {
    "agent": "Architect",
    "timestamp": "2024-12-19T10:00:00Z",
    "status": "complete",
    "project_id": "my-enhancement-project"
  },
  "section": "architecture",
  "score": 7,
  "findings": {
    "strengths": ["Well-structured modules", "Clear separation of concerns"],
    "weaknesses": ["No caching layer", "Tight coupling in auth module"],
    "recommendations": ["Add Redis caching", "Extract auth to separate service"]
  },
  "metrics": {
    "files_analyzed": 45,
    "patterns_identified": 8,
    "anti_patterns_found": 3
  },
  "details": {
    "tech_stack": ["React", "Node.js", "PostgreSQL"],
    "architecture_style": "Monolithic with some service extraction",
    "concerns": ["Scalability at >10k users"]
  }
}
```

### Orchestrator Aggregation Logic

```typescript
interface ParallelAssessmentResult {
  agent: string;
  section: string;
  score: number;
  findings: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  metrics: Record<string, number>;
  details: Record<string, unknown>;
}

function aggregateAssessmentResults(results: ParallelAssessmentResult[]): AssessmentReport {
  const weights: Record<string, number> = {
    'architecture': 1.2,
    'security': 1.5,
    'quality': 1.0,
    'devops': 0.8,
    'frontend_code': 0.5,
    'backend_code': 0.5,
    'ai_ml': 1.0,
  };

  // Calculate weighted score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const weight = weights[result.section] || 1.0;
    weightedSum += result.score * weight;
    totalWeight += weight;
  }

  const overallScore = weightedSum / totalWeight;

  // Combine code quality scores
  const frontendScore = results.find(r => r.section === 'frontend_code')?.score || 0;
  const backendScore = results.find(r => r.section === 'backend_code')?.score || 0;
  const codeQualityScore = (frontendScore + backendScore) / 2;

  // Determine recommendation
  let recommendation: 'MAINTAIN' | 'ENHANCE' | 'REFACTOR' | 'REWRITE';
  if (overallScore >= 8) recommendation = 'MAINTAIN';
  else if (overallScore >= 6) recommendation = 'ENHANCE';
  else if (overallScore >= 4) recommendation = 'REFACTOR';
  else recommendation = 'REWRITE';

  // Check for critical overrides (security issues cap score)
  const securityResult = results.find(r => r.section === 'security');
  if (securityResult && securityResult.score < 4) {
    // Critical security issues cap recommendation
    if (recommendation === 'MAINTAIN') recommendation = 'ENHANCE';
  }

  return {
    overallScore,
    codeQualityScore,
    recommendation,
    allFindings: results.flatMap(r => r.findings),
    allMetrics: Object.fromEntries(results.map(r => [r.section, r.metrics])),
  };
}
```

### MCP Tools for Parallel Assessment

```typescript
// New MCP tools for parallel assessment coordination

// Start a parallel assessment session
start_parallel_assessment({
  project_id: string,
  agents: string[],  // ["Architect", "Security Engineer", "QA Engineer", ...]
});

// Submit an agent's assessment result
submit_assessment_result({
  project_id: string,
  agent: string,
  section: string,
  score: number,
  findings: object,
  metrics: object,
  details: object,
});

// Check if all parallel assessments are complete
check_assessment_completion({
  project_id: string,
});

// Get aggregated assessment results
get_aggregated_assessment({
  project_id: string,
});

// Get pending assessments (which agents haven't submitted yet)
get_pending_assessments({
  project_id: string,
});
```

### Parallel Assessment State Tracking

The MCP server tracks parallel assessment state:

```sql
-- Parallel assessment sessions
CREATE TABLE IF NOT EXISTS parallel_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('in_progress', 'complete', 'failed')) NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  aggregated_score REAL,
  recommendation TEXT
);

-- Individual assessment results from each agent
CREATE TABLE IF NOT EXISTS assessment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parallel_assessment_id INTEGER NOT NULL REFERENCES parallel_assessments(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  section TEXT NOT NULL,
  score INTEGER CHECK(score >= 1 AND score <= 10),
  findings_json TEXT,  -- JSON blob
  metrics_json TEXT,   -- JSON blob
  details_json TEXT,   -- JSON blob
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(parallel_assessment_id, agent)
);
```

### Handling Parallel Assessment Conflicts

Unlike development where agents modify shared files, assessment agents **read** shared code but **write** to separate sections. Conflicts are rare but can occur:

| Conflict Type | Example | Resolution |
|---------------|---------|------------|
| Contradictory findings | Architect says "good separation", Security says "tight coupling in auth" | Both valid - document both perspectives |
| Score disagreement | QA says 8/10, Frontend says 5/10 for code quality | Use weighted average, flag large discrepancies |
| Overlapping concerns | Both Security and Backend flag same vulnerability | Deduplicate in aggregation, attribute to Security |

### Timeout and Error Handling

```
Assessment Agent Timeout: 30 minutes per agent

If agent times out:
1. Mark agent's assessment as "timed_out"
2. Continue with other completed assessments
3. Log timeout in STATUS.md
4. Include note in final report: "Assessment incomplete - [Agent] timed out"
5. Score calculation excludes timed-out agent's section
6. User can request re-run of specific agent

If agent fails:
1. Mark agent's assessment as "failed"
2. Log error details
3. Continue with other assessments
4. Include note in final report
5. Orchestrator can retry failed agent once
```

### Orchestrator Activation for Parallel Assessment

When initiating parallel assessment, Orchestrator outputs:

```markdown
---
## 🟢 INITIATING PARALLEL ASSESSMENT

**Project:** my-enhancement-project
**Project Path:** ~/projects/my-enhancement-project
**Phase:** assessment
**Timestamp:** 2024-12-19T10:00:00Z

### Parallel Assessment Configuration
| Agent | Section | Status |
|-------|---------|--------|
| Architect | Architecture Analysis | ⏳ Pending |
| Security & Privacy Engineer | Security Assessment | ⏳ Pending |
| QA Engineer | Quality Analysis | ⏳ Pending |
| DevOps Engineer | Infrastructure Review | ⏳ Pending |
| Frontend Developer | Frontend Code Review | ⏳ Pending |
| Backend Developer | Backend Code Review | ⏳ Pending |

### Instructions for Each Agent
All agents will receive:
- Project path: ~/projects/my-enhancement-project
- Task: Evaluate codebase for your domain
- Output: JSON assessment result
- Timeout: 30 minutes

### Aggregation
When all agents complete, I will:
1. Collect all JSON outputs
2. Calculate weighted overall score
3. Generate GAP_ANALYSIS.md, TECH_DEBT.md, ENHANCEMENT_PLAN.md
4. Present recommendation for user approval

---
## 🟢 ACTIVATING AGENTS IN PARALLEL

**Agents:** Architect, Security & Privacy Engineer, QA Engineer, DevOps Engineer, Frontend Developer, Backend Developer
**Mode:** Parallel Assessment
**Project Path:** ~/projects/my-enhancement-project

*All agents now evaluating codebase simultaneously...*
---
```

### Speed Improvement

| Approach | Time (6 agents × 10 min each) |
|----------|-------------------------------|
| **Sequential** | 60 minutes |
| **Parallel** | ~15 minutes (longest agent + overhead) |
| **Speedup** | **4x faster** |

---

## Development Phase Parallelization

### Parallel Generation (After G3)

Once specs are locked at G3, multiple generation workers execute in parallel:

```
┌─────────────────────────────────────────────────────────────────┐
│              DEVELOPMENT PHASE - PARALLEL EXECUTION              │
│                                                                   │
│  G3 Approved → Specs Locked → Tasks Unblocked                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                TASK QUEUE (after G3)                      │   │
│  │                                                           │   │
│  │  TASK-001: Auth API     → api-generator                  │   │
│  │  TASK-002: User API     → api-generator                  │   │
│  │  TASK-003: Product API  → api-generator                  │   │
│  │  TASK-004: Auth UI      → ui-generator                   │   │
│  │  TASK-005: User Profile → ui-generator                   │   │
│  │  TASK-006: Product List → ui-generator                   │   │
│  │                                                           │   │
│  │  All 6 tasks can execute in parallel!                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Workers:                                                        │
│  • api-generator-1: TASK-001 (auth API)                         │
│  • api-generator-2: TASK-002 (user API)                         │
│  • ui-generator-1:  TASK-004 (auth UI)                          │
│  • ui-generator-2:  TASK-005 (user profile)                     │
│                                                                   │
│  TASK-003 and TASK-006 queued, waiting for worker availability   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend + Frontend Parallel

Unlike sequential architecture, Hub-and-Spoke enables true parallelism:

| Old (Sequential) | New (Hub-and-Spoke) |
|------------------|---------------------|
| Backend completes → Frontend starts | Backend AND Frontend start together |
| ~4 days for both | ~2 days for both |
| API must be finished first | Both work from same spec |

---

## Validation Phase Parallelization

All validation checks run in parallel:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARALLEL VALIDATION                           │
│                                                                   │
│  Task completed → Validation triggered                           │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  LINT    │  │TYPECHECK │  │   TEST   │  │ SECURITY │        │
│  │          │  │          │  │          │  │          │        │
│  │ ESLint   │  │   tsc    │  │  Jest    │  │  Snyk    │        │
│  │ Prettier │  │          │  │Playwright│  │npm audit │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │                │
│       └─────────────┴─────────────┴─────────────┘                │
│                           │                                       │
│                           ▼                                       │
│                  RESULTS AGGREGATED                               │
│                                                                   │
│  Time: ~30 seconds (parallel) vs ~2 minutes (sequential)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallel Work Monitoring

### MCP Tools for Monitoring

```typescript
// Check parallel execution status
await mcp.callTool('get_parallel_execution_status', {
  project_id: 'my-project'
});
// Returns:
// {
//   active_workers: ['api-gen-1', 'api-gen-2', 'ui-gen-1'],
//   tasks_in_progress: ['TASK-001', 'TASK-002', 'TASK-004'],
//   concurrent_count: 3,
//   blocked_workers: [],
//   dependency_graph: { 'TASK-007': ['TASK-001', 'TASK-004'] }
// }

// Check for spec conflicts
await mcp.callTool('check_spec_conflicts', {
  project_id: 'my-project',
  task_ids: ['TASK-001', 'TASK-002', 'TASK-003']
});
// Returns: { conflicts: [], can_run_parallel: true }
```

### Parallelism Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Concurrent tasks | Tasks running simultaneously | 3-6 |
| Worker utilization | % time workers are active | >80% |
| Queue depth | Tasks waiting for workers | <10 |
| Conflict rate | Tasks blocked by spec conflicts | <5% |

---

## Version

**Version:** 3.0.0
**Created:** 2024-12-11
**Updated:** 2026-01-02
**Purpose:** Define parallel work coordination for Hub-and-Spoke architecture
**Changes:**
- 3.0.0: Hub-and-Spoke architecture - Task queue parallelism, spec-based isolation, all-phase parallelization
- 2.0.0: Added Assessment Phase Parallelization for enhancement projects
- 1.1.0: Added authority hierarchy and escalation protocol for conflict resolution
