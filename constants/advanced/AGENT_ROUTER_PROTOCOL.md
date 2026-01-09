# Agent Router Protocol

> **Version 1.0** - Hub-and-Spoke Architecture

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure and queue operations |
| **Worker Swarm** | [WORKER_SWARM.md](./WORKER_SWARM.md) | Worker categories, capabilities, lifecycle |
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `dequeue_task()`, `register_worker()` |
| **Protocols** | [PROTOCOLS.md](./PROTOCOLS.md) | Worker task protocol and communication |

---

## Overview

The Agent Router maps tasks to capable workers based on task requirements and worker availability. It's the dispatch mechanism between the Task Queue and the Worker Swarm.

## Core Principles

1. **Capability-Based Routing** - Match task requirements to worker capabilities
2. **Load Balancing** - Distribute work across available workers
3. **Category Isolation** - Workers only receive tasks from their category
4. **Fallback Handling** - Graceful handling when no worker is available

---

## Worker Categories

Workers are organized into three functional categories:

### Planning Workers

Write and refine specifications.

| Worker ID | Capabilities | Spec Output |
|-----------|-------------|-------------|
| `product-planner` | requirements, stories, prd, scope | PRD.md, user stories |
| `system-planner` | architecture, openapi, prisma, zod, design | OpenAPI spec, Prisma schema, Zod schemas |

### Generation Workers

Generate code from specifications.

| Worker ID | Capabilities | Input Specs | Output |
|-----------|-------------|-------------|--------|
| `full-stack-generator` | react, typescript, node, prisma, api | OpenAPI, Prisma, Zod | Full feature implementation |
| `ui-generator` | react, css, accessibility, components | OpenAPI (responses), Zod | UI components, pages |
| `api-generator` | node, express, prisma, validation | OpenAPI, Prisma | API endpoints, services |
| `ml-generator` | python, pytorch, prompts, evaluation | ML specs | AI/ML features |

### Validation Workers

Validate output and ensure quality.

| Worker ID | Capabilities | Validates |
|-----------|-------------|-----------|
| `auto-reviewer` | lint, typecheck, build, coverage | Code quality, compilation |
| `security-scanner` | security, audit, vulnerabilities | Security posture |
| `qa-validator` | testing, e2e, regression | Functional correctness |

---

## Routing Algorithm

```typescript
function routeTask(task: Task): Worker | null {
  // 1. Filter workers by category
  const categoryWorkers = workers.filter(
    w => w.category === task.worker_category
  );

  // 2. Filter by capability match
  const capableWorkers = categoryWorkers.filter(
    w => hasRequiredCapabilities(w, task)
  );

  // 3. Filter by availability
  const availableWorkers = capableWorkers.filter(
    w => w.status === 'idle'
  );

  // 4. Select by load (lowest tasks_completed today = freshest)
  if (availableWorkers.length > 0) {
    return selectByLowestLoad(availableWorkers);
  }

  // 5. No worker available - task stays queued
  return null;
}

function hasRequiredCapabilities(worker: Worker, task: Task): boolean {
  const requiredCaps = inferCapabilities(task);
  return requiredCaps.every(cap => worker.capabilities.includes(cap));
}

function inferCapabilities(task: Task): string[] {
  const caps = [];

  // Infer from spec_refs
  for (const ref of task.spec_refs) {
    if (ref.startsWith('openapi.')) caps.push('api');
    if (ref.startsWith('prisma.')) caps.push('prisma');
    if (ref.startsWith('zod.')) caps.push('typescript');
  }

  // Infer from description keywords
  if (task.description.includes('component')) caps.push('react');
  if (task.description.includes('endpoint')) caps.push('node');
  if (task.description.includes('test')) caps.push('testing');

  return [...new Set(caps)];
}
```

---

## Capability Matching

### Capability Registry

```typescript
const CAPABILITIES = {
  // Languages/Frameworks
  'react': { category: 'generation', aliases: ['jsx', 'tsx'] },
  'typescript': { category: 'generation', aliases: ['ts'] },
  'node': { category: 'generation', aliases: ['nodejs', 'express'] },
  'python': { category: 'generation', aliases: ['py'] },
  'prisma': { category: 'generation', aliases: ['orm', 'database'] },

  // Task Types
  'api': { category: 'generation', requires: ['node', 'typescript'] },
  'components': { category: 'generation', requires: ['react', 'typescript'] },
  'testing': { category: 'validation', aliases: ['tests', 'e2e'] },

  // Domains
  'security': { category: 'validation' },
  'accessibility': { category: 'generation', aliases: ['a11y'] },
  'performance': { category: 'validation' },

  // Planning
  'requirements': { category: 'planning' },
  'architecture': { category: 'planning' },
  'openapi': { category: 'planning', aliases: ['swagger'] },
};
```

### Matching Rules

1. **Exact Match** - Worker capability exactly matches requirement
2. **Alias Match** - Worker capability matches an alias
3. **Implied Match** - Worker has capability that implies requirement
4. **Partial Match** - Worker has most required capabilities (last resort)

### Match Score

```typescript
function calculateMatchScore(worker: Worker, task: Task): number {
  const required = inferCapabilities(task);
  let score = 0;

  for (const cap of required) {
    if (worker.capabilities.includes(cap)) {
      score += 10;  // Exact match
    } else if (hasAlias(worker, cap)) {
      score += 8;   // Alias match
    } else if (hasImplied(worker, cap)) {
      score += 5;   // Implied match
    }
  }

  // Bonus for specialization
  if (required.length > 0 && score === required.length * 10) {
    score += 5;  // Perfect match bonus
  }

  return score;
}
```

---

## Load Balancing

When multiple workers can handle a task, select based on load.

### Load Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| `tasks_completed` | 0.4 | Fewer completions = fresher worker |
| `error_count` | 0.3 | Fewer errors = more reliable |
| `average_duration` | 0.2 | Faster = better throughput |
| `last_active` | 0.1 | More recent = warmed up |

### Load Score Calculation

```typescript
function calculateLoadScore(worker: Worker): number {
  // Lower score = better choice
  const tasksScore = worker.tasks_completed * 0.4;
  const errorScore = worker.error_count * 0.3;
  const durationScore = (worker.average_task_duration_ms / 60000) * 0.2;
  const idleScore = (Date.now() - worker.last_active) / 60000 * 0.1;

  return tasksScore + errorScore + durationScore - idleScore;
}
```

### Selection

```typescript
function selectByLowestLoad(workers: Worker[]): Worker {
  return workers.sort((a, b) =>
    calculateLoadScore(a) - calculateLoadScore(b)
  )[0];
}
```

---

## Fallback Handling

When no worker is available for a task:

### Fallback Strategy

```
1. Task stays in queue with status: 'queued'
2. Log warning: "No worker available for TASK-XXX"
3. Check again on next dequeue request
4. After 5 minutes: Emit event for monitoring
5. After 30 minutes: Alert Orchestrator
```

### Worker Shortage Detection

```typescript
function checkWorkerShortage(category: WorkerCategory): void {
  const queuedTasks = getTaskQueue({
    status: 'queued',
    worker_category: category
  });
  const availableWorkers = getAvailableWorkers({ category });

  if (queuedTasks.length > 0 && availableWorkers.length === 0) {
    emit('worker_shortage', {
      category,
      queued_count: queuedTasks.length,
      oldest_task_age_ms: Date.now() - queuedTasks[0].created_at
    });
  }
}
```

---

## Worker Registration

Workers must register before receiving tasks.

### Registration Request

```typescript
register_worker({
  worker_id: 'full-stack-generator',
  category: 'generation',
  capabilities: ['react', 'typescript', 'node', 'prisma'],
  spec_consumption: ['openapi.paths.*', 'prisma.models.*', 'zod.schemas.*']
});
```

### Registration Validation

1. **Unique ID** - No duplicate worker_id
2. **Valid Category** - Must be planning | generation | validation
3. **Non-empty Capabilities** - Must have at least one capability
4. **Category Match** - Capabilities must match category expectations

### Registration Response

```typescript
// Success
{
  status: 'registered',
  worker_id: 'full-stack-generator',
  queue_position: null  // No task yet
}

// Failure
{
  status: 'rejected',
  reason: 'Worker with id full-stack-generator already registered'
}
```

---

## Worker Lifecycle

```
Registered → Idle → Active → Idle → ...
              ↓        ↓
           Blocked   Failed → Cooling Down → Idle
              ↓
           Offline
```

### Status Transitions

| From | To | Trigger |
|------|----|---------|
| (new) | idle | Registration complete |
| idle | active | Worker dequeues task |
| active | idle | Task completed successfully |
| active | blocked | Task blocked by dependency |
| active | failed | Task failed |
| failed | cooling_down | Error rate too high |
| cooling_down | idle | Cooldown period elapsed (5 min) |
| any | offline | Worker disconnects |
| offline | idle | Worker reconnects |

### Cooldown Trigger

```typescript
function checkCooldown(worker: Worker): boolean {
  // Cooldown if >3 errors in last 10 tasks
  const recentTasks = getRecentTasks(worker.worker_id, 10);
  const recentErrors = recentTasks.filter(t => t.status === 'failed').length;

  if (recentErrors > 3) {
    updateWorkerStatus(worker.worker_id, 'cooling_down');
    setTimeout(() => {
      updateWorkerStatus(worker.worker_id, 'idle');
    }, 5 * 60 * 1000);  // 5 minute cooldown
    return true;
  }
  return false;
}
```

---

## Routing Examples

### Example 1: API Generation Task

```typescript
// Task
{
  id: 'TASK-015',
  type: 'generation',
  worker_category: 'generation',
  description: 'Implement user authentication endpoint',
  spec_refs: ['openapi.paths./api/auth.post', 'prisma.models.User']
}

// Inferred capabilities: ['api', 'prisma', 'node']

// Available workers:
// - full-stack-generator: ['react', 'typescript', 'node', 'prisma'] ✓
// - ui-generator: ['react', 'css', 'accessibility'] ✗
// - api-generator: ['node', 'express', 'prisma'] ✓

// Match scores:
// - full-stack-generator: 30 (exact matches for all)
// - api-generator: 25 (exact matches + no react bloat)

// Selected: api-generator (better specialized match)
```

### Example 2: Component Task

```typescript
// Task
{
  id: 'TASK-016',
  type: 'generation',
  worker_category: 'generation',
  description: 'Build user profile component',
  spec_refs: ['zod.schemas.User']
}

// Inferred capabilities: ['react', 'typescript', 'components']

// Available workers:
// - ui-generator: ['react', 'css', 'accessibility', 'components'] ✓

// Selected: ui-generator
```

### Example 3: Security Validation Task

```typescript
// Task
{
  id: 'TASK-017',
  type: 'validation',
  worker_category: 'validation',
  description: 'Security review of auth implementation'
}

// Inferred capabilities: ['security']

// Available workers in validation category:
// - auto-reviewer: ['lint', 'typecheck', 'build'] ✗
// - security-scanner: ['security', 'audit', 'vulnerabilities'] ✓
// - qa-validator: ['testing', 'e2e'] ✗

// Selected: security-scanner
```

---

## Configuration

### Default Worker Pool

```json
{
  "worker_pool": {
    "planning": {
      "product-planner": { "instances": 1 },
      "system-planner": { "instances": 1 }
    },
    "generation": {
      "full-stack-generator": { "instances": 2 },
      "ui-generator": { "instances": 1 },
      "api-generator": { "instances": 1 }
    },
    "validation": {
      "auto-reviewer": { "instances": 1 },
      "security-scanner": { "instances": 1 },
      "qa-validator": { "instances": 1 }
    }
  }
}
```

### Routing Preferences

```json
{
  "routing": {
    "prefer_specialization": true,
    "load_balance_weight": 0.3,
    "capability_match_weight": 0.7,
    "cooldown_minutes": 5,
    "shortage_alert_minutes": 30
  }
}
```

---

## Monitoring

### Router Metrics

```typescript
get_router_metrics({
  project_id: 'my-project'
});
// Returns:
// {
//   routes_total: 150,
//   routes_by_category: { planning: 20, generation: 100, validation: 30 },
//   average_route_time_ms: 5,
//   no_worker_available_count: 3,
//   capability_mismatches: 2,
//   load_balance_effectiveness: 0.85
// }
```

### Worker Utilization

```typescript
get_worker_utilization({
  project_id: 'my-project'
});
// Returns:
// {
//   'full-stack-generator': { utilization: 0.75, tasks: 45, errors: 2 },
//   'ui-generator': { utilization: 0.60, tasks: 30, errors: 0 },
//   'api-generator': { utilization: 0.80, tasks: 48, errors: 1 }
// }
```
