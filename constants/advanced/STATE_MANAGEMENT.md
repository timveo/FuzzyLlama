# State Management Protocol

> **Version 3.0** - Hub-and-Spoke Architecture with Task Queue

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure, priority, dependencies |
| **Worker Swarm** | [WORKER_SWARM.md](./WORKER_SWARM.md) | Worker categories and lifecycle |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | Validation pipeline triggers |
| **Approval Gates** | [APPROVAL_GATES.md](./APPROVAL_GATES.md) | Gate definitions and approval flow |
| **Protocols** | [PROTOCOLS.md](./PROTOCOLS.md) | Worker communication protocols |

---

## Overview

Project state is managed through the **Product Creator State MCP Server**, which provides:

1. **Central Truth Layer** - Single source of state, specs, and coordination
2. **Task Queue** - Priority-ordered work items for parallel execution
3. **Worker Management** - Track and coordinate parallel workers
4. **Continuous Validation** - Automated validation pipeline
5. **Spec Locking** - Immutable specs after G3 approval

## Single Source of Truth

> **IMPORTANT**: There is ONE truth store per project: `TruthStore` class in `mcp-server/src/state/truth-store.ts`

The `TruthStore` is an in-memory object that persists to JSON at `.truth/truth.json` in the project directory. It contains ALL state:
- Project metadata
- Task queue
- Worker registry
- Gate approvals
- Specs (references)
- Agent spawn tracking
- Teaching moments
- Escalations, blockers, decisions
- Event log (audit trail)

**There is NO separate SQLite database.** All references to SQLite in diagrams are for conceptual illustration. The actual implementation uses JSON persistence.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 WORKER SWARM (Parallel)                     │
│                                                              │
│  Planning Workers    Generation Workers   Validation Workers │
│  • Product Planner   • Full Stack Gen     • Auto-Reviewer    │
│  • System Planner    • UI Generator       • Security Scanner │
│                      • API Generator      • QA Validator     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Tool Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Product Creator State MCP Server                │
│                                                              │
│  Task Queue Tools:     Worker Tools:      Validation Tools:  │
│  • enqueue_task()      • register_worker() • trigger_validation()
│  • dequeue_task()      • update_worker()   • get_validation_results()
│  • update_task()       • get_workers()     • validate_against_spec()
│                                                              │
│  Spec Tools:           Gate Tools:         State Tools:      │
│  • lock_specs()        • check_gate()      • get_state()     │
│  • get_spec()          • approve_gate()    • update_state()  │
│  • validate_spec()     • get_blocked_tasks()                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ TruthStore (in-memory)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Central Truth Layer                       │
│                                                              │
│  TruthStore persists to: .truth/truth.json                   │
│  Specs stored in:        specs/ directory                    │
│  Source files:           src/, tests/, docs/                 │
└─────────────────────────────────────────────────────────────┘
```

## Core Principle: Task Queue Driven

**OLD WAY (Sequential Handoffs)**:
```markdown
1. Agent A completes work
2. Agent A creates handoff JSON
3. Orchestrator validates handoff
4. Orchestrator activates Agent B
5. Agent B reads handoff for context
```

**NEW WAY (Task Queue)**:
```typescript
// Worker requests task from queue
const task = await mcp.callTool('dequeue_task', {
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});
// Returns: { task_id, description, spec_refs, dependencies }

// Worker completes task
await mcp.callTool('complete_task', {
  task_id: task.task_id,
  output: { files_created, verification }
});
// Queue automatically dispatches next available task
```

---

## MCP Tool Reference

### Task Queue Tools

#### `enqueue_task`
Add a task to the queue.

```typescript
await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'generation',           // planning | generation | validation
  priority: 'high',             // critical | high | medium | low
  worker_category: 'generation',
  description: 'Implement user authentication',
  dependencies: ['TASK-001'],   // Tasks that must complete first
  gate_dependency: 'G3',        // Gate that must be approved first
  spec_refs: ['openapi.paths./api/auth.post'],
  story_refs: ['US-001']
});
// Returns: { task_id: 'TASK-002' }
```

#### `dequeue_task`
Get next available task for a worker.

```typescript
await mcp.callTool('dequeue_task', {
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});
// Returns: {
//   task_id: 'TASK-002',
//   description: 'Implement user authentication',
//   spec_refs: ['openapi.paths./api/auth.post'],
//   story_refs: ['US-001'],
//   priority: 'high'
// }
// Returns null if no tasks available for this category
```

#### `complete_task`
Mark a task as complete with output.

```typescript
await mcp.callTool('complete_task', {
  task_id: 'TASK-002',
  worker_id: 'full-stack-generator',
  status: 'complete',           // complete | failed | blocked
  output: {
    files_created: ['src/auth/login.ts', 'src/auth/login.test.ts'],
    files_modified: ['src/index.ts'],
    spec_sections_implemented: ['openapi.paths./api/auth.post'],
    verification: {
      all_passed: true,
      checks: [
        { name: 'build', passed: true },
        { name: 'test', passed: true },
        { name: 'lint', passed: true }
      ]
    }
  },
  spawned_tasks: [  // Optional: new tasks discovered
    {
      type: 'validation',
      description: 'Security review of auth implementation',
      priority: 'high'
    }
  ]
});
```

#### `get_task_queue`
Get current task queue state.

```typescript
await mcp.callTool('get_task_queue', {
  project_id: 'my-project',
  filter_status: 'queued',      // Optional: queued | in_progress | blocked
  filter_category: 'generation' // Optional: planning | generation | validation
});
// Returns: { tasks: [...], count: 12 }
```

#### `update_task_status`
Update task status without completing.

```typescript
await mcp.callTool('update_task_status', {
  task_id: 'TASK-002',
  status: 'blocked',
  error: {
    code: 'BLOCKED_BY_GATE',
    message: 'Waiting for G3 approval',
    blocked_by: 'G3'
  }
});
```

---

### Worker Management Tools

#### `register_worker`
Register a worker with capabilities.

```typescript
await mcp.callTool('register_worker', {
  worker_id: 'full-stack-generator',
  category: 'generation',
  capabilities: ['react', 'typescript', 'node', 'prisma'],
  spec_consumption: ['openapi.paths.*', 'prisma.models.*', 'zod.schemas.*']
});
```

#### `update_worker_status`
Update worker status.

```typescript
await mcp.callTool('update_worker_status', {
  worker_id: 'full-stack-generator',
  status: 'active',             // idle | active | blocked | cooling_down | offline
  current_task: 'TASK-002'
});
```

#### `get_available_workers`
Get workers available for work.

```typescript
await mcp.callTool('get_available_workers', {
  category: 'generation'        // Optional: filter by category
});
// Returns: { workers: [{ worker_id, capabilities, status }] }
```

#### `get_worker_state`
Get detailed worker state.

```typescript
await mcp.callTool('get_worker_state', {
  worker_id: 'full-stack-generator'
});
// Returns: { worker_id, category, status, current_task, tasks_completed, error_count }
```

---

### Spec Management Tools

#### `lock_specs`
Lock specs after G3 approval (immutable until unlocked).

```typescript
await mcp.callTool('lock_specs', {
  project_id: 'my-project',
  locked_by: 'G3'               // Gate that triggered lock
});
// After this, specs cannot be modified
```

#### `get_spec`
Get spec content.

```typescript
await mcp.callTool('get_spec', {
  project_id: 'my-project',
  spec_type: 'openapi',         // openapi | prisma | zod
  path: 'paths./api/users.get'  // Optional: specific path
});
// Returns: { content: {...}, version: '1.0.0', locked: true }
```

#### `validate_against_spec`
Validate implementation against spec.

```typescript
await mcp.callTool('validate_against_spec', {
  project_id: 'my-project',
  file_path: 'src/api/users.ts',
  spec_type: 'openapi',
  spec_path: 'paths./api/users.get'
});
// Returns: { valid: true, errors: [] }
```

---

### Validation Tools

#### `trigger_validation`
Trigger validation pipeline for changed files.

```typescript
await mcp.callTool('trigger_validation', {
  project_id: 'my-project',
  file_paths: ['src/components/UserList.tsx'],
  checks: ['lint', 'typecheck', 'test', 'security']  // Optional: defaults to all
});
// Returns: { validation_id: 'VAL-001' }
```

#### `get_validation_results`
Get validation results.

```typescript
await mcp.callTool('get_validation_results', {
  project_id: 'my-project',
  validation_id: 'VAL-001'      // Optional: get specific run
});
// Returns: {
//   overall_status: 'passing',
//   lint: { status: 'passed', errors: [] },
//   typecheck: { status: 'passed', errors: [] },
//   tests: { status: 'passed', coverage: '85%' },
//   security: { status: 'passed', vulnerabilities: 0 }
// }
```

---

### Gate Tools

#### `check_gate`
Check if a gate is approved.

```typescript
await mcp.callTool('check_gate', {
  project_id: 'my-project',
  gate: 'G3'
});
// Returns: { status: 'approved', approved_at: '...', blocked_tasks: [] }
```

#### `approve_gate`
Approve a gate (typically called by Orchestrator after user approval).

```typescript
await mcp.callTool('approve_gate', {
  project_id: 'my-project',
  gate: 'G3',
  approved_by: 'user',
  conditions: ['Must complete security review before deploy']
});
// This will unblock all tasks with gate_dependency: 'G3'
```

#### `get_blocked_tasks`
Get tasks blocked by a gate.

```typescript
await mcp.callTool('get_blocked_tasks', {
  project_id: 'my-project',
  gate: 'G3'
});
// Returns: { tasks: ['TASK-002', 'TASK-003', 'TASK-004'] }
```

---

### Progress Communication Tools

> **See:** `constants/protocols/PROGRESS_COMMUNICATION_PROTOCOL.md`

#### `log_progress`
Log a progress update to the truth store. Use this to announce work as you do it.

```typescript
await mcp.callTool('log_progress', {
  project_id: 'my-project',
  worker_id: 'frontend-developer',
  task_id: 'TASK-002',           // Current task
  action: 'file_created',        // file_created | file_modified | command_run | decision_made | error_fixed | task_started | task_completed
  message: 'Created LoginForm component with email/password validation',
  details: {
    file_path: 'src/components/LoginForm.tsx',  // Optional
    command: null,                               // Optional
    decision_rationale: null                     // Optional
  }
});
// Returns: { logged: true, timestamp: '...' }
```

**Action Types:**
| Action | When to Use |
|--------|-------------|
| `task_started` | Beginning work on a task |
| `file_created` | Creating a new file |
| `file_modified` | Modifying an existing file |
| `command_run` | Running build/test/lint commands |
| `decision_made` | Making a significant decision |
| `error_fixed` | Fixing an error during self-healing |
| `task_completed` | Finishing a task |

#### `get_progress_log`
Get progress log for a task or worker.

```typescript
await mcp.callTool('get_progress_log', {
  project_id: 'my-project',
  task_id: 'TASK-002',           // Optional: filter by task
  worker_id: 'frontend-developer' // Optional: filter by worker
});
// Returns: { entries: [...], count: 15 }
```

---

### State Tools

#### `get_state`
Get current project state.

```typescript
await mcp.callTool('get_state', {
  project_id: 'my-project'
});
// Returns: { current_phase, phase_progress, task_queue, worker_states, gates }
```

#### `get_parallel_execution_status`
Get parallel execution metrics.

```typescript
await mcp.callTool('get_parallel_execution_status', {
  project_id: 'my-project'
});
// Returns: {
//   active_workers: ['full-stack-gen', 'ui-gen', 'api-gen'],
//   blocked_workers: [],
//   concurrent_tasks: 3,
//   dependency_graph: { 'TASK-005': ['TASK-002', 'TASK-003'] }
// }
```

---

## Worker Workflow

### On Worker Activation

```typescript
// 1. Register worker
await mcp.callTool('register_worker', {
  worker_id: 'full-stack-generator',
  category: 'generation',
  capabilities: ['react', 'typescript', 'prisma']
});

// 2. Request task
const task = await mcp.callTool('dequeue_task', {
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});

if (!task) {
  // No tasks available - wait or go idle
  await mcp.callTool('update_worker_status', {
    worker_id: 'full-stack-generator',
    status: 'idle'
  });
  return;
}

// 3. Mark as active
await mcp.callTool('update_worker_status', {
  worker_id: 'full-stack-generator',
  status: 'active',
  current_task: task.task_id
});
```

### During Task Execution

```typescript
// Read specs for implementation guidance
const spec = await mcp.callTool('get_spec', {
  project_id: 'my-project',
  spec_type: 'openapi',
  path: task.spec_refs[0]
});

// Implement according to spec
// ...

// Run self-verification
const verification = {
  all_passed: true,
  checks: [
    { name: 'build', passed: true, command: 'npm run build' },
    { name: 'lint', passed: true, command: 'npm run lint' },
    { name: 'test', passed: true, command: 'npm test' }
  ]
};
```

### On Task Completion

```typescript
// Complete the task
await mcp.callTool('complete_task', {
  task_id: task.task_id,
  worker_id: 'full-stack-generator',
  status: 'complete',
  output: {
    files_created: ['src/features/auth/login.ts'],
    files_modified: [],
    spec_sections_implemented: task.spec_refs,
    verification
  }
});

// Update worker status
await mcp.callTool('update_worker_status', {
  worker_id: 'full-stack-generator',
  status: 'idle',
  current_task: null
});

// Request next task
const nextTask = await mcp.callTool('dequeue_task', {
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});
```

---

## Orchestrator Workflow

### Task Decomposition

When user request arrives, Orchestrator decomposes into tasks:

```typescript
// User: "Build a todo app with authentication"

// 1. Create planning tasks
await mcp.callTool('enqueue_task', {
  type: 'planning',
  priority: 'high',
  worker_category: 'planning',
  description: 'Write PRD for todo app',
  gate_dependency: 'G1'
});

await mcp.callTool('enqueue_task', {
  type: 'planning',
  priority: 'high',
  worker_category: 'planning',
  description: 'Design OpenAPI spec',
  dependencies: ['TASK-001'],  // After PRD
  gate_dependency: 'G2'
});

// 2. Create generation tasks (blocked until G3)
await mcp.callTool('enqueue_task', {
  type: 'generation',
  priority: 'medium',
  worker_category: 'generation',
  description: 'Implement auth endpoints',
  gate_dependency: 'G3',
  spec_refs: ['openapi.paths./api/auth.*']
});

await mcp.callTool('enqueue_task', {
  type: 'generation',
  priority: 'medium',
  worker_category: 'generation',
  description: 'Implement todo endpoints',
  gate_dependency: 'G3',
  spec_refs: ['openapi.paths./api/todos.*']
});
// These can run in parallel after G3 is approved!
```

### Gate Approval Flow

```typescript
// User approves G3 (architecture)
await mcp.callTool('approve_gate', {
  project_id: 'my-project',
  gate: 'G3',
  approved_by: 'user'
});

// Lock specs (no more changes)
await mcp.callTool('lock_specs', {
  project_id: 'my-project',
  locked_by: 'G3'
});

// Tasks with gate_dependency: 'G3' are now unblocked
// Multiple generation workers can now pick them up in parallel
```

### Monitoring Parallel Execution

```typescript
// Check parallel execution status
const status = await mcp.callTool('get_parallel_execution_status', {
  project_id: 'my-project'
});

console.log(`${status.concurrent_tasks} tasks running in parallel`);
console.log(`Active workers: ${status.active_workers.join(', ')}`);

// Check if all tasks complete
const queue = await mcp.callTool('get_task_queue', {
  project_id: 'my-project',
  filter_status: 'in_progress'
});

if (queue.count === 0) {
  // Phase complete, present next gate to user
}
```

---

## Configuration

Add to Claude Code settings (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "product-creator-state": {
      "command": "node",
      "args": [
        "./mcp-server/dist/index.js",
        "--db-path",
        "./.state/project.db",
        "--mode",
        "hub-and-spoke"
      ]
    }
  }
}
```

---

## Best Practices

1. **Workers request tasks, don't wait for activation** - Pull model, not push
2. **Always read specs before generating** - Specs are the source of truth
3. **Run self-verification before completing** - Don't submit failed work
4. **Use spawned_tasks for discovered work** - Let the queue manage priorities
5. **Lock specs after G3** - Prevents spec drift during generation
6. **Monitor parallel execution** - Watch for blocked workers

---

## Deprecated (Removed)

The following are **removed** in Hub-and-Spoke architecture:

- ❌ Agent handoffs (`record_handoff()`) - replaced by task completion
- ❌ Sequential activation - replaced by task queue
- ❌ Handoff validation - replaced by task completion schema
- ❌ Agent-to-agent queries - workers read from shared Truth
- ❌ Manual gate transitions - gates auto-unblock waiting tasks
