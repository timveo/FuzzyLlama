# Task Queue Protocol

> **Version 1.0** - Hub-and-Spoke Architecture

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `enqueue_task()`, `dequeue_task()`, `complete_task()` |
| **Agent Router** | [AGENT_ROUTER_PROTOCOL.md](./AGENT_ROUTER_PROTOCOL.md) | Worker routing and capability matching |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | Validation pipeline integration (spawned tasks) |
| **Self-Healing** | [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) | Worker retry protocol before task failure |

---

## Overview

The Task Queue is the central dispatch mechanism for parallel work execution. Instead of sequential agent-to-agent handoffs, all work items are queued and pulled by available workers.

## Core Principles

1. **Pull, not Push** - Workers request tasks, Orchestrator doesn't assign
2. **Priority-Ordered** - Critical tasks processed first
3. **Dependency-Aware** - Tasks wait for dependencies before becoming available
4. **Gate-Blocked** - Tasks wait for human approval gates
5. **Parallel by Default** - Multiple workers can dequeue simultaneously

---

## Task Structure

```json
{
  "id": "TASK-001",
  "type": "generation",
  "priority": "high",
  "status": "queued",
  "worker_category": "generation",
  "description": "Implement user authentication API",
  "dependencies": ["TASK-000"],
  "gate_dependency": "G3",
  "spec_refs": ["openapi.paths./api/auth.post"],
  "story_refs": ["US-001"],
  "created_at": "2024-12-19T10:00:00Z"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (TASK-XXX) |
| `type` | enum | `planning` \| `generation` \| `validation` \| `coordination` |
| `priority` | enum | `critical` \| `high` \| `medium` \| `low` |
| `status` | enum | `queued` \| `in_progress` \| `blocked` \| `complete` \| `failed` \| `cancelled` |
| `worker_category` | enum | `planning` \| `generation` \| `validation` |
| `description` | string | Human-readable task description |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `dependencies` | string[] | Task IDs that must complete first |
| `gate_dependency` | enum | Gate that must be approved first (G1-G9, E2) |
| `spec_refs` | string[] | Spec paths this task implements |
| `story_refs` | string[] | User story IDs (US-XXX) |
| `assigned_worker` | string | Worker currently assigned |
| `created_at` | datetime | When task was created |
| `started_at` | datetime | When task started |
| `completed_at` | datetime | When task completed |
| `retry_count` | integer | Number of retry attempts (max 3) |

---

## Priority Rules

Tasks are processed in priority order:

```
CRITICAL → HIGH → MEDIUM → LOW
```

### Priority Definitions

| Priority | Use Case | Examples |
|----------|----------|----------|
| **critical** | Blocking other tasks, security issues | Security vulnerability fix, blocked dependency |
| **high** | User-facing features, spec compliance | Core feature implementation, API endpoints |
| **medium** | Standard implementation work | Component implementation, tests |
| **low** | Nice-to-haves, optimization | Performance improvements, refactoring |

### Priority Promotion

Tasks automatically promote priority when:
- Blocked for >2 hours → +1 priority level
- >3 other tasks depend on it → +1 priority level
- Security-related → always critical

---

## Dependency Resolution

Tasks with dependencies are blocked until all dependencies complete.

### Dependency Graph Example

```
TASK-001 (Write PRD)
    ↓
TASK-002 (Design OpenAPI spec) ← depends on TASK-001
    ↓
TASK-003 (Implement auth API) ← depends on TASK-002
TASK-004 (Implement user API) ← depends on TASK-002
    ↓                              ↓
    └──────────→ TASK-005 ←────────┘
         (Integration tests - depends on TASK-003 AND TASK-004)
```

### Dependency Rules

1. **No Circular Dependencies** - System rejects circular dependency chains
2. **Transitive Dependencies** - If A→B→C, then A implicitly depends on C
3. **Failed Dependency** - If dependency fails, dependent tasks are blocked (not failed)
4. **Cancelled Dependency** - If dependency cancelled, dependent tasks are unblocked with warning

### Checking Dependencies

```typescript
function canDequeue(task: Task): boolean {
  // Check all dependencies are complete
  for (const depId of task.dependencies) {
    const dep = getTask(depId);
    if (dep.status !== 'complete') {
      return false;
    }
  }

  // Check gate is approved
  if (task.gate_dependency) {
    const gate = getGate(task.gate_dependency);
    if (gate.status !== 'approved') {
      return false;
    }
  }

  return true;
}
```

---

## Gate Blocking

Tasks can be blocked by human approval gates.

### Gate-to-Task Mapping

| Gate | Blocks | Reason |
|------|--------|--------|
| G1 | All planning tasks | Scope must be approved |
| G2 | Spec generation tasks | PRD must be approved |
| G3 | All generation tasks | Architecture must be approved |
| G4 | UI generation tasks | Design must be approved |
| G5 | Deployment tasks | Features must be accepted |
| G6 | Security review tasks | QA must pass |
| G7 | Deployment tasks | Security must pass |
| G8 | Production deployment | Go/No-Go decision |

### Gate Approval Flow

```
User approves G3
    ↓
System calls: approve_gate({ gate: 'G3' })
    ↓
All tasks with gate_dependency: 'G3' are unblocked
    ↓
Tasks move from status: 'blocked' to status: 'queued'
    ↓
Workers can now dequeue these tasks
```

---

## Queue Operations

### Enqueue

Add a task to the queue.

```typescript
enqueue_task({
  project_id: 'my-project',
  type: 'generation',
  priority: 'high',
  worker_category: 'generation',
  description: 'Implement auth API',
  dependencies: ['TASK-001'],
  gate_dependency: 'G3',
  spec_refs: ['openapi.paths./api/auth.post']
});
```

**Behavior:**
1. Generate task ID (TASK-XXX, incrementing)
2. Check for circular dependencies
3. Set status based on dependencies/gates:
   - Dependencies incomplete → `blocked`
   - Gate not approved → `blocked`
   - All clear → `queued`
4. Insert into queue at priority position
5. Return task ID

### Dequeue

Get next available task for a worker.

```typescript
dequeue_task({
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});
```

**Behavior:**
1. Find highest-priority task where:
   - `status` = `queued`
   - `worker_category` matches request
   - All `dependencies` are `complete`
   - `gate_dependency` is `approved` (or null)
2. Set `status` = `in_progress`
3. Set `assigned_worker` = worker_id
4. Set `started_at` = now
5. Return task (or null if none available)

### Update Status

Update task status during execution.

```typescript
update_task_status({
  task_id: 'TASK-001',
  status: 'blocked',
  error: {
    code: 'BUILD_FAILED',
    message: 'TypeScript compilation error'
  }
});
```

### Complete

Mark task as complete with output.

```typescript
complete_task({
  task_id: 'TASK-001',
  worker_id: 'full-stack-generator',
  status: 'complete',
  output: {
    files_created: ['src/auth/login.ts'],
    verification: { all_passed: true }
  }
});
```

**Behavior:**
1. Set `status` = `complete`
2. Set `completed_at` = now
3. Clear `assigned_worker`
4. Store output
5. **Unblock dependent tasks** (move from `blocked` to `queued`)
6. Process any `spawned_tasks` (enqueue them)

---

## Parallel Execution

### Parallelism Rules

Tasks can execute in parallel when:

1. **No dependency relationship** - Neither depends on the other
2. **No spec conflicts** - Don't modify same spec sections
3. **Different worker categories** - Planning + Generation + Validation simultaneously
4. **Same category, independent** - Multiple generation tasks on different features

### Parallelism Examples

**Can run in parallel:**
```
TASK-003 (Implement auth API)     }
TASK-004 (Implement user API)     } ← Different spec sections
TASK-005 (Implement product API)  }
```

**Cannot run in parallel:**
```
TASK-003 (Implement auth API)
TASK-006 (Add 2FA to auth API)  ← Same spec section
```

### Conflict Detection

```typescript
function hasConflict(task1: Task, task2: Task): boolean {
  // Check spec overlap
  for (const ref1 of task1.spec_refs) {
    for (const ref2 of task2.spec_refs) {
      if (specsOverlap(ref1, ref2)) {
        return true;
      }
    }
  }
  return false;
}

function specsOverlap(ref1: string, ref2: string): boolean {
  // 'openapi.paths./api/auth.*' overlaps with 'openapi.paths./api/auth.post'
  // 'prisma.models.User' overlaps with 'prisma.models.User.email'
  return ref1.startsWith(ref2) || ref2.startsWith(ref1);
}
```

---

## Retry Protocol

Failed tasks can be retried up to 3 times.

### Retry Flow

```
Attempt 1: Task fails
    ↓
    retry_count = 1
    status = 'queued' (back in queue)
    ↓
Attempt 2: Task fails
    ↓
    retry_count = 2
    priority += 1 (escalate)
    ↓
Attempt 3: Task fails
    ↓
    retry_count = 3
    status = 'failed'
    ESCALATE TO USER
```

### Retry Rules

1. **Max 3 attempts** - After 3 failures, escalate to user
2. **Priority escalation** - Retry 2 gets +1 priority, Retry 3 gets +2
3. **Different worker** - System prefers different worker for retry
4. **Context preserved** - Error history passed to retry attempt
5. **Exponential backoff** - Wait 1min, 5min, 15min between retries

---

## Task Lifecycle

```
Created → Queued → In Progress → Complete
                              ↘
                               Failed → Retry (up to 3x) → Escalated
                              ↗
         Blocked → Unblocked ↗
```

### State Transitions

| From | To | Trigger |
|------|----|---------|
| (new) | queued | Task created, no blockers |
| (new) | blocked | Task created with unmet dependencies/gates |
| blocked | queued | Dependencies complete + gate approved |
| queued | in_progress | Worker dequeues task |
| in_progress | complete | Worker completes successfully |
| in_progress | failed | Worker reports failure |
| in_progress | blocked | Discovered new blocker |
| failed | queued | Retry initiated (retry_count < 3) |
| failed | escalated | retry_count >= 3 |
| any | cancelled | User or system cancels task |

---

## Monitoring

### Queue Metrics

```typescript
get_task_queue_metrics({
  project_id: 'my-project'
});
// Returns:
// {
//   total: 25,
//   by_status: { queued: 10, in_progress: 5, blocked: 8, complete: 2 },
//   by_category: { planning: 3, generation: 15, validation: 7 },
//   by_priority: { critical: 1, high: 5, medium: 12, low: 7 },
//   average_wait_time_ms: 45000,
//   average_execution_time_ms: 120000,
//   blocked_by_gates: { G3: 8 }
// }
```

### Dependency Graph

```typescript
get_dependency_graph({
  project_id: 'my-project'
});
// Returns visual representation of task dependencies
```

---

## Best Practices

1. **Granular tasks** - Small, focused tasks enable more parallelism
2. **Explicit dependencies** - Always declare known dependencies
3. **Spec references** - Include spec_refs for conflict detection
4. **Meaningful descriptions** - Help workers understand context
5. **Appropriate priority** - Don't over-use critical/high
6. **Story linking** - Connect tasks to user stories for traceability
