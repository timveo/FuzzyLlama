# System Protocols

> **Version 2.0** - Hub-and-Spoke Architecture

Standard protocols for worker communication, task execution, and error handling in the Hub-and-Spoke architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKER SWARM                             │
│                                                                   │
│  Planning Workers    Generation Workers   Validation Workers     │
│  • product-planner   • full-stack-gen     • auto-reviewer        │
│  • system-planner    • ui-generator       • security-scanner     │
│                      • api-generator      • qa-validator         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Pull tasks from queue
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION HUB                             │
│                                                                   │
│  Task Queue → Agent Router → Worker Assignment                   │
│  Gate Management → State Coordination → Escalation Handling      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Tool Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CENTRAL TRUTH LAYER                            │
│                                                                   │
│  Task Queue | Worker States | Specs | Validation Results | Gates │
└─────────────────────────────────────────────────────────────────┘
```

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools for task queue, worker management, specs |
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure, priority, dependencies |
| **Agent Router** | [AGENT_ROUTER_PROTOCOL.md](./AGENT_ROUTER_PROTOCOL.md) | Worker routing, capability matching |
| **Worker Swarm** | [WORKER_SWARM.md](./WORKER_SWARM.md) | Worker categories, lifecycle, task loops |
| **Self-Healing** | [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) | Internal error correction (≤3 attempts) |
| **Progress Communication** | [PROGRESS_COMMUNICATION_PROTOCOL.md](./PROGRESS_COMMUNICATION_PROTOCOL.md) | **User visibility during agent work (MANDATORY)** |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | Automated validation pipeline |
| **Approval Gates** | [APPROVAL_GATES.md](./APPROVAL_GATES.md) | Human decision points |

---

## 1. Worker Task Protocol

> **Note:** In Hub-and-Spoke architecture, workers pull tasks from the queue rather than being activated by the Orchestrator.

### Task Dequeue (Worker Requests Task)

Workers request tasks from the queue when idle:

```typescript
// Worker requests next available task
const task = await mcp.callTool('dequeue_task', {
  worker_id: 'full-stack-generator',
  worker_category: 'generation'
});

// Returns task if available
// {
//   task_id: 'TASK-015',
//   description: 'Implement user authentication',
//   spec_refs: ['openapi.paths./api/auth.post'],
//   story_refs: ['US-001'],
//   priority: 'high'
// }
```

### Task Completion (Worker Reports Done)

When a worker completes a task:

```typescript
await mcp.callTool('complete_task', {
  task_id: 'TASK-015',
  worker_id: 'full-stack-generator',
  status: 'complete',
  output: {
    files_created: ['src/auth/login.ts'],
    files_modified: ['src/index.ts'],
    spec_sections_implemented: ['openapi.paths./api/auth.post']
  },
  verification: {
    all_passed: true,
    checks: [
      { name: 'build', passed: true, command: 'npm run build' },
      { name: 'lint', passed: true, command: 'npm run lint' },
      { name: 'test', passed: true, command: 'npm test' }
    ]
  }
});
```

### Worker Lifecycle

```
Register → Idle → Active → Idle → ...
             ↓       ↓
          (no task)  ↓
                 Complete/Fail
                     ↓
                 Self-Heal (if failed)
                     ↓
                 Complete or Escalate
```

### Task Protocol Rules

1. **Pull, not push** — Workers request tasks, Orchestrator doesn't assign
2. **Self-verify before completing** — Run build/lint/test before complete_task()
3. **Self-heal on failure** — Fix errors internally (up to 3 attempts)
4. **Include verification proof** — All completions must include verification results
5. **Spawn follow-up tasks** — If new work discovered, add to spawned_tasks

---

## 2. Spec-Based Communication

> **Note:** In Hub-and-Spoke architecture, workers communicate through shared specs rather than direct queries.

### Specs as Shared Truth

Workers read from and validate against locked specs:

```typescript
// Read spec for implementation guidance
const spec = await mcp.callTool('get_spec', {
  project_id: 'my-project',
  spec_type: 'openapi',
  path: 'paths./api/auth.post'
});

// Validate implementation against spec
const validation = await mcp.callTool('validate_against_spec', {
  project_id: 'my-project',
  file_path: 'src/api/auth.ts',
  spec_type: 'openapi',
  spec_path: 'paths./api/auth.post'
});
```

### When Workers Need Clarification

If a spec is ambiguous or missing information:

1. **Check existing specs** — The answer may be in another spec section
2. **Spawn clarification task** — Create a planning task for spec clarification
3. **Block current task** — Mark as blocked with reason

```typescript
// Worker discovers spec ambiguity
await mcp.callTool('update_task_status', {
  task_id: 'TASK-015',
  status: 'blocked',
  error: {
    code: 'SPEC_AMBIGUOUS',
    message: 'OpenAPI spec does not define error response format for auth endpoint',
    blocked_by: 'spec_clarification'
  }
});

// Spawn clarification task
await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'planning',
  priority: 'high',
  worker_category: 'planning',
  description: 'Define error response format for auth endpoints',
  context: {
    requesting_task: 'TASK-015',
    spec_section: 'openapi.paths./api/auth'
  }
});
```

### Communication Flow

```
Worker A finds ambiguity
        │
        ▼
Spawn clarification task → Planning worker resolves
        │                            │
        ▼                            ▼
Task blocked             Spec updated, task unblocked
        │                            │
        └──────────> Worker A continues
```

---

## 3. Retry Protocol

When task execution fails, workers use the self-healing loop before escalating.

### Self-Healing Retry Flow

```
Worker executes task
        │
        ▼
Verification fails (build/lint/test)
        │
        ▼
┌─────────────────────────────────────┐
│        SELF-HEALING LOOP            │
│                                     │
│  Attempt 1: Analyze error, fix      │
│       │                             │
│       ▼                             │
│  Verification: FAIL                 │
│       │                             │
│       ▼                             │
│  Attempt 2: Different fix           │
│       │                             │
│       ▼                             │
│  Verification: FAIL                 │
│       │                             │
│       ▼                             │
│  Attempt 3: Alternative approach    │
│       │                             │
│       ▼                             │
│  Verification: FAIL                 │
└───────────────┬─────────────────────┘
                │
                ▼
        ESCALATE TO ORCHESTRATOR
                │
                ▼
        Queue regeneration task OR
        Escalate to user
```

### Retry via Task Queue

Failed tasks can be re-queued automatically:

```typescript
// Task failed after 3 self-healing attempts
await mcp.callTool('complete_task', {
  task_id: 'TASK-015',
  worker_id: 'full-stack-generator',
  status: 'failed',
  error: {
    code: 'SELF_HEALING_EXHAUSTED',
    message: 'Failed to resolve type errors after 3 attempts',
    attempts: 3,
    last_error: 'TS2322: Type string not assignable to number'
  }
});

// Task queue automatically:
// 1. Increments retry_count
// 2. If retry_count < 3: Re-queue with higher priority
// 3. If retry_count >= 3: Escalate to user
```

### Retry Rules

1. **Worker self-heals first** — 3 internal attempts before task failure
2. **Task queue retries second** — 3 queue-level retries with different workers
3. **Total max attempts: 9** — (3 internal × 3 queue-level)
4. **Escalate blocking issues** — Don't retry if fundamentally blocked
5. **Different worker on queue retry** — Prefer different worker for fresh perspective

---

## 4. Rollback Protocol

When production issues require reverting changes.

### Rollback Triggers

| Trigger | Severity | Auto-Rollback | Manual Approval |
|---------|----------|---------------|-----------------|
| Error rate >5% for 5 min | Critical | ✅ Yes | Not required |
| P0 bug in production | Critical | ❌ No | Required |
| Security vulnerability | Critical | ❌ No | Required |
| Performance degradation >50% | High | ❌ No | Required |
| Data corruption detected | Critical | ✅ Yes | Not required |

### Rollback Notification Format

```json
{
  "rollback": {
    "id": "ROLLBACK-XXX",
    "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
    "project": "[project-id]",
    "trigger": "[What caused rollback]",
    "severity": "critical|high|medium",
    "auto_triggered": true,
    "deployment_reverted": {
      "from_version": "v1.2.3",
      "to_version": "v1.2.2",
      "deployment_id": "[deployment-id]"
    },
    "affected_components": [
      "backend-api",
      "worker-service"
    ],
    "impact": {
      "duration_minutes": 15,
      "users_affected": 1200,
      "data_loss": false
    },
    "status": "completed|in_progress|failed",
    "post_rollback_checks": {
      "health_check": "passing",
      "error_rate": "0.5%",
      "response_time_p95_ms": 180
    }
  }
}
```

### Rollback Procedure

```
1. DETECT
   │
   ├── Automated: Monitoring alert triggers
   └── Manual: User/engineer reports issue
   │
   ▼
2. ASSESS (≤5 min)
   │
   ├── Confirm issue is real
   ├── Determine severity
   └── Decide: rollback vs hotfix
   │
   ▼
3. EXECUTE ROLLBACK (≤10 min)
   │
   ├── DevOps: Revert deployment
   ├── DevOps: Verify old version running
   └── QA: Smoke test critical paths
   │
   ▼
4. COMMUNICATE (≤15 min)
   │
   ├── Orchestrator: Update STATUS.md
   ├── Orchestrator: Notify all agents
   └── User: Send incident notification
   │
   ▼
5. INVESTIGATE (≤24 hours)
   │
   ├── Identify root cause
   ├── Document in DECISIONS.md
   └── Plan fix
   │
   ▼
6. RE-DEPLOY (when ready)
   │
   ├── Fix applied and tested
   ├── QA: Full regression
   ├── Security: Re-review if needed
   └── Staged rollout (10% → 50% → 100%)
```

### Agent Responsibilities During Rollback

| Agent | Responsibility |
|-------|----------------|
| **DevOps** | Execute rollback, verify infrastructure |
| **AIOps** | Rollback AI services if affected |
| **QA** | Verify rollback successful, smoke tests |
| **Security** | Assess if security-related |
| **Orchestrator** | Coordinate, communicate, document |
| **Backend/Frontend** | Investigate root cause |

### Post-Rollback Checklist

- [ ] Old version deployed and running
- [ ] Health checks passing
- [ ] Error rate normalized
- [ ] User-facing functionality verified
- [ ] Monitoring confirms stability
- [ ] STATUS.md updated
- [ ] Incident documented
- [ ] Stakeholders notified
- [ ] Root cause identified
- [ ] Fix planned and scheduled

---

## 5. Escalation Protocol

When issues exceed agent authority or capability.

### Escalation Levels

| Level | Escalate To | When |
|-------|-------------|------|
| L1 | Orchestrator | Agent blocked, needs coordination |
| L2 | User | Requires human decision |
| L3 | External | Needs third-party support |

### Escalation Message Format

```json
{
  "escalation": {
    "id": "ESC-XXX",
    "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
    "level": "L1|L2|L3",
    "from_agent": "[Agent Name]",
    "project": "[project-id]",
    "severity": "critical|high|medium",
    "type": "blocker|decision|resource|technical|scope",
    "summary": "[One sentence summary]",
    "details": "[Full explanation]",
    "impact": {
      "blocked_agents": ["Agent 1", "Agent 2"],
      "timeline_impact_days": 3,
      "cost_impact_usd": 500
    },
    "options": [
      {
        "option": "A",
        "description": "[Description]",
        "pros": ["Pro 1", "Pro 2"],
        "cons": ["Con 1"],
        "recommendation": true
      },
      {
        "option": "B",
        "description": "[Description]",
        "pros": ["Pro 1"],
        "cons": ["Con 1", "Con 2"],
        "recommendation": false
      }
    ],
    "deadline": "YYYY-MM-DDTHH:MM:SSZ",
    "auto_resolution": {
      "enabled": true,
      "default_option": "A",
      "trigger_after_hours": 24
    }
  }
}
```

### Escalation Rules

1. **Always provide options** — Don't just present problems
2. **Include recommendation** — State which option you'd choose
3. **Set deadline** — When decision is needed
4. **Define auto-resolution** — What happens if no response
5. **Track in STATUS.md** — All escalations logged

---

## 6. Assessment Protocol

For evaluating existing codebases in enhancement projects.

> **PARALLEL ASSESSMENT (v2.0):** Assessment agents now run simultaneously for ~4x speedup.
> See `constants/advanced/PARALLEL_WORK_PROTOCOL.md` → "Assessment Phase Parallelization" for implementation details.

### Assessment Workflow (Parallel Execution)

```
INTAKE: User provides existing codebase
    │
    ▼
STEP 1: ORCHESTRATOR INITIALIZATION
    │
    ├── Verify project path exists
    ├── Create docs/ASSESSMENT.md from template
    ├── Identify repository structure
    ├── Classify project scope
    └── Call MCP: start_parallel_assessment()
    │
    ▼
STEP 2: PARALLEL ASSESSMENT (ALL AGENTS RUN SIMULTANEOUSLY)
┌─────────────────────────────────────────────────────────────────────────┐
│                        ⚡ PARALLEL EXECUTION ⚡                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Architect (1.2x)        Security Engineer (1.5x)   QA Engineer (1.0x)  │
│  ├─ Directory structure  ├─ Vulnerability scan     ├─ Test coverage    │
│  ├─ Tech stack           ├─ Auth/authz review      ├─ Code quality     │
│  ├─ Patterns/anti        ├─ Data protection        ├─ Documentation    │
│  └─ Score: 1-10          └─ Score: 1-10            └─ Score: 1-10      │
│                                                                         │
│  DevOps (0.8x)           Frontend Dev (0.5x)       Backend Dev (0.5x)  │
│  ├─ CI/CD pipeline       ├─ UI code quality        ├─ API design       │
│  ├─ Deployment config    ├─ Performance            ├─ Database review  │
│  ├─ Monitoring/logging   ├─ Accessibility          ├─ Performance      │
│  └─ Score: 1-10          └─ → Code Quality         └─ → Code Quality   │
│                                                                         │
│  [If AI/ML project]                                                     │
│  Data/ML Engineers (1.0x)                                               │
│  ├─ Data pipeline assessment                                            │
│  ├─ Model evaluation                                                    │
│  └─ Score: 1-10                                                         │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │   Each agent submits via: MCP tool submit_assessment_result()
    │
    ▼
STEP 3: ORCHESTRATOR AGGREGATION
    │
    ├── Poll MCP: check_assessment_completion() until all complete
    ├── Call MCP: get_aggregated_assessment() for combined results
    ├── Calculate weighted overall health score
    ├── Generate docs/GAP_ANALYSIS.md from combined findings
    ├── Generate docs/TECH_DEBT.md from combined weaknesses
    ├── Generate docs/ENHANCEMENT_PLAN.md from combined recommendations
    │
    ▼
DELIVERABLES
    ├── docs/ASSESSMENT.md — Complete assessment (all sections)
    ├── docs/GAP_ANALYSIS.md — Current vs target state
    ├── docs/TECH_DEBT.md — Debt inventory with priorities
    └── docs/ENHANCEMENT_PLAN.md — Phased improvement plan
    │
    ▼
DECISION POINT (Present to User)
    │
    ├── Score 8-10: Maintain → Minor fixes only → MAINTENANCE
    ├── Score 6-7:  Enhance → Targeted improvements → PLANNING
    ├── Score 4-5:  Refactor → Significant rework → PLANNING
    └── Score 1-3:  Rewrite → Fresh start → ARCHITECTURE
```

### Parallel Assessment Speed Improvement

| Approach | Time (6 agents × 10 min each) |
|----------|-------------------------------|
| **Sequential (old)** | 60 minutes |
| **Parallel (new)** | ~15 minutes |
| **Speedup** | **4x faster** |

### Agent Assessment Responsibilities

| Agent | Assessment Focus | Output |
|-------|------------------|--------|
| **Architect** | Structure, patterns, scalability | Architecture section of ASSESSMENT.md |
| **Security** | Vulnerabilities, compliance, data protection | Security section + vulnerability list |
| **QA** | Test coverage, quality metrics, documentation | Testing & Quality sections |
| **DevOps** | CI/CD, infrastructure, monitoring | DevOps section |
| **Frontend** | UI code quality, performance, accessibility | Frontend review in Code Quality |
| **Backend** | API design, database, performance | Backend review in Code Quality |
| **Data/ML** | Pipelines, models, data quality | AI/ML section (if applicable) |

### Parallel Assessment Handoff Format

Each agent submits their assessment via MCP tool `submit_assessment_result()`:

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
    "strengths": [
      "Clear separation of concerns",
      "Good test coverage for core modules"
    ],
    "weaknesses": [
      "Outdated dependencies (15 packages)",
      "No integration tests"
    ],
    "recommendations": [
      "Migrate to parameterized queries",
      "Add integration test suite",
      "Update dependencies to latest LTS"
    ]
  },
  "metrics": {
    "files_analyzed": 45,
    "patterns_identified": 8,
    "anti_patterns_found": 3
  },
  "details": {
    "tech_stack": ["React", "Node.js", "PostgreSQL"],
    "architecture_style": "Monolithic with some service extraction",
    "critical_issues": [
      {
        "id": "CRIT-001",
        "description": "SQL injection vulnerability in search endpoint",
        "severity": "critical",
        "location": "src/api/search.js:45"
      }
    ]
  }
}
```

### MCP Tools for Parallel Assessment

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `start_parallel_assessment` | Initialize session with agent list | Orchestrator at assessment start |
| `mark_assessment_started` | Mark agent as in_progress | Agent begins evaluation |
| `submit_assessment_result` | Submit completed assessment | Agent completes evaluation |
| `mark_assessment_failed` | Mark as failed/timed_out | Agent cannot complete |
| `check_assessment_completion` | Check if all agents done | Orchestrator polling |
| `get_pending_assessments` | List agents not yet submitted | Orchestrator monitoring |
| `get_aggregated_assessment` | Get combined results | Orchestrator for final report |
| `get_assessment_status` | Detailed session status | Debugging/monitoring |

### Legacy Sequential Handoff Format (Deprecated)

> **Note:** The sequential format below is deprecated but still supported for backward compatibility.

```json
{
  "handoff": {
    "agent": "[Agent Name]",
    "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
    "status": "complete",
    "phase": "assessment",
    "project": "[project-id]"
  },
  "assessment": {
    "category": "[architecture|security|quality|devops|code|data]",
    "score": 7,
    "max_score": 10,
    "findings": { ... }
  },
  "next_agent": "[Next agent in assessment sequence]",
  "next_action": "Continue assessment - [focus area]"
}
```

### Assessment Decision Criteria

| Overall Score | Recommendation | Rationale |
|---------------|----------------|----------|
| 8-10 | **Maintain** | Healthy codebase, minor improvements only |
| 6-7 | **Enhance** | Good foundation, targeted improvements |
| 4-5 | **Refactor** | Structural issues, needs significant rework |
| 1-3 | **Rewrite** | Fundamental problems, fresh start cheaper |

### Assessment Quality Gate

Before exiting assessment phase:

- [ ] All relevant agents have completed their sections
- [ ] ASSESSMENT.md is complete with all scores
- [ ] GAP_ANALYSIS.md identifies all gaps
- [ ] TECH_DEBT.md catalogs all debt items
- [ ] ENHANCEMENT_PLAN.md has phased approach
- [ ] Recommendation (Enhance/Refactor/Rewrite) documented
- [ ] User has approved the recommendation
- [ ] Effort estimates provided
- [ ] Risks identified

### Assessment Templates

| Template | Path | Purpose |
|----------|------|--------|
| Assessment | `templates/docs/ASSESSMENT.md` | Comprehensive codebase evaluation |
| Gap Analysis | `templates/docs/GAP_ANALYSIS.md` | Current vs desired state |
| Tech Debt | `templates/docs/TECH_DEBT.md` | Debt inventory & tracking |
| Enhancement Plan | `templates/docs/ENHANCEMENT_PLAN.md` | Phased improvement roadmap |

### Assessment Timeline

| Project Size | Assessment Duration | Agents Involved |
|--------------|---------------------|------------------|
| Small (<10K LOC) | 1-2 days | 3-4 agents |
| Medium (10K-50K LOC) | 2-4 days | 5-6 agents |
| Large (50K-200K LOC) | 1-2 weeks | All relevant agents |
| Enterprise (>200K LOC) | 2-4 weeks | All agents + external review |

---

## 7. Context Compression Protocol

To prevent STATUS.md from consuming the entire context window, the Orchestrator implements periodic compression.

### Compression Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| **Line count** | STATUS.md exceeds 500 lines | Compress |
| **Phase completion** | Major phase completed (e.g., development → testing) | Optional compress |
| **Manual request** | User requests compression | Compress |
| **Handoff count** | More than 10 handoffs in history | Compress |

### Compression Procedure

```
1. DETECT TRIGGER
   │
   ├── Monitor STATUS.md size
   ├── Check after each handoff
   │
   ▼
2. CREATE ARCHIVE
   │
   ├── Create docs/archive/ directory (if not exists)
   ├── Copy template from templates/docs/STATUS_ARCHIVE.md
   ├── Name: STATUS_ARCHIVE_v[N].md (increment N)
   │
   ▼
3. SUMMARIZE COMPLETED PHASES
   │
   ├── For each completed phase:
   │   ├── Duration (start → end date)
   │   ├── Agent responsible
   │   ├── Key deliverables
   │   ├── Major decisions
   │   └── 1-2 sentence outcome
   │
   ├── Summarize resolved blockers
   ├── Summarize mitigated risks
   ├── Snapshot key metrics
   ├── Summarize handoff history
   │
   ▼
4. WRITE ARCHIVE
   │
   ├── Fill in STATUS_ARCHIVE_v[N].md with summaries
   ├── Include reference to previous archives
   │
   ▼
5. TRIM STATUS.md
   │
   ├── Keep:
   │   ├── Project identification
   │   ├── Current phase & agent
   │   ├── Active blockers only
   │   ├── Active risks only
   │   ├── In-progress deliverables only
   │   ├── Last 3 handoffs (for context)
   │   ├── Pending queries
   │   ├── Active escalations
   │   ├── Current metrics
   │   ├── Next actions
   │   ├── Memory section
   │   └── Reference to archives
   │
   ├── Remove:
   │   ├── Completed phase history (moved to archive)
   │   ├── Resolved blockers (moved to archive)
   │   ├── Mitigated risks (moved to archive)
   │   ├── Old handoffs beyond last 3
   │   └── Answered queries
   │
   ▼
6. ADD ARCHIVE REFERENCE
   │
   └── Add to STATUS.md:
       ```
       ## Archive Reference

       Previous history archived to reduce context size.
       See: docs/archive/STATUS_ARCHIVE_v[N].md

       Previous archives:
       - v1: [date range] - intake through architecture
       - v2: [date range] - design through development
       ```
```

### Archive File Structure

```
[project]/
├── docs/
│   ├── STATUS.md              ← Active status (trimmed)
│   └── archive/
│       ├── STATUS_ARCHIVE_v1.md  ← First archive
│       ├── STATUS_ARCHIVE_v2.md  ← Second archive
│       └── ...
```

### What to Keep vs Archive

| Keep in STATUS.md | Archive |
|-------------------|---------|
| Current phase & agent | Completed phases |
| Active blockers | Resolved blockers |
| Active risks | Mitigated/accepted risks |
| In-progress deliverables | Completed deliverables |
| Last 3 handoffs | Older handoffs |
| Pending queries | Answered queries |
| Active escalations | Resolved escalations |
| Current metrics | Historical metrics |
| Next actions | Completed actions |
| Memory section | (Keep - important context) |

### Compression Rules

1. **Never lose information** — All data moves to archive, never deleted
2. **Maintain continuity** — Include enough context for agents to understand state
3. **Keep memory section** — Learnings are always valuable
4. **Reference archives** — Always link to archived history
5. **Compress incrementally** — Don't archive everything at once
6. **Version archives** — Use v1, v2, etc. for sequential archives

### Compression Notification

After compression, notify:

```markdown
---
## 📦 STATUS COMPRESSION COMPLETED

**Timestamp:** YYYY-MM-DDTHH:MM:SSZ
**Archive Created:** docs/archive/STATUS_ARCHIVE_v[N].md
**Lines Before:** 650
**Lines After:** 180
**Phases Archived:** intake, planning, architecture, design
**Reason:** Line count exceeded 500

STATUS.md has been compressed. Historical data preserved in archive.
---
```

### Retrieving Archived Context

When an agent needs historical context:

1. Check archive reference in STATUS.md
2. Read relevant archive file(s)
3. Extract needed information
4. Don't copy archive content back to STATUS.md

---

## 8. Handoff Validation Protocol

**MANDATORY: All handoffs MUST be validated before acceptance.**

### Overview

The Handoff Validation Protocol ensures that all inter-agent communications conform to the defined schema, preventing silent failures and cascading errors.

### Validation Flow

```
Agent completes work
        │
        ▼
┌─────────────────────────┐
│  Agent produces handoff │
│  JSON in required format│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Orchestrator validates │
│  via validate-handoff.sh│
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌────────┐    ┌─────────┐
│ VALID  │    │ INVALID │
└────┬───┘    └────┬────┘
     │             │
     ▼             ▼
  Accept      Reject with
  handoff     error details
     │             │
     ▼             ▼
  Proceed     Request fix
  to next     (retry logic)
  agent
```

### Running Validation

```bash
# Validate a handoff file
./scripts/validate-handoff.sh path/to/handoff.json

# Validate inline JSON
./scripts/validate-handoff.sh --inline '{"handoff":{...}}'

# Get markdown-formatted output
./scripts/validate-handoff.sh --format markdown path/to/handoff.json
```

### Schema Requirements

Handoffs MUST include these required fields:

| Field | Description | Example |
|-------|-------------|---------|
| `handoff.agent` | Agent producing handoff | `"Frontend Developer"` |
| `handoff.timestamp` | ISO-8601 timestamp | `"2024-12-18T14:30:00Z"` |
| `handoff.status` | Completion status | `"complete"` |
| `handoff.phase` | Current project phase | `"development"` |
| `handoff.project` | Project identifier | `"my-saas-app"` |
| `next_agent` | Receiving agent | `"QA Engineer"` |
| `next_action` | Primary next action | `"Execute test suite"` |

### Status Values

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `complete` | All deliverables done | Proceed to next agent |
| `partial` | Some deliverables done | Continue with another agent or return |
| `blocked` | Cannot proceed | Resolve blocker first |
| `failed` | Unrecoverable failure | Escalate to user |

### Validation Failure Response

When validation fails, the Orchestrator MUST:

1. **Reject the handoff** — Do NOT accept invalid handoffs
2. **Present specific errors** — Show which fields failed
3. **Request correction** — Ask agent to fix and resubmit
4. **Track as retry** — Count towards 3-attempt limit

**Format for rejection:**

```markdown
---
## ❌ HANDOFF VALIDATION FAILED

**Agent:** [Agent Name]
**Attempt:** [N] of 3

### Schema Violations

1. **Path:** /handoff/timestamp
   - Message: String does not match ISO 8601 date-time format
   - Actual: `"December 18, 2024"`
   - Expected: `"YYYY-MM-DDTHH:MM:SSZ"`

2. **Path:** /files_created/0/purpose
   - Message: Missing required property 'purpose'

### Required Corrections

1. Use ISO-8601 timestamp format: `2024-12-18T14:30:00Z`
2. Add `purpose` field to all files_created entries

Please resubmit a corrected handoff.
---
```

### Semantic Validations

Beyond schema compliance, the validator checks:

| Check | Condition | Severity |
|-------|-----------|----------|
| Verification present | Status is `complete` → verification section required | Warning |
| Commands executed | Verification has at least one command | Warning |
| Files have purpose | Each file_created has purpose field | Warning |
| Timestamp reasonable | Not in the future | Warning |
| Blockers have resolution | Non-critical blockers have resolution_path | Warning |

### Retry Protocol for Invalid Handoffs

```
Attempt 1: Validation fails
    │
    ├── Present errors to agent
    ├── Request correction
    │
    ▼
Attempt 2: Validation fails
    │
    ├── Present errors + example of correct format
    ├── Request correction
    │
    ▼
Attempt 3: Validation fails
    │
    └── ESCALATE TO USER
        ├── Present full error history
        ├── Show what was attempted
        └── Request guidance
```

### Integration with Development Flow

The Orchestrator validates handoffs at these points:

| Transition | Validation Required |
|------------|---------------------|
| Agent → Agent | Always |
| Phase → Phase | Always |
| Sub-gate transitions (G5.x) | Always |
| Loop iterations (Feature Loops) | Always |

### Example Valid Handoff

See `schemas/examples/valid-handoff.json` for a complete example of a valid handoff.

---

## 9. Related Protocols (External Files)

The following protocols are defined in separate files for detailed reference:

| Protocol | File | Purpose |
|----------|------|---------|
| **Fast Track** | `FAST_TRACK_PROTOCOL.md` | Streamlined process for cosmetic/text-only changes |
| **Maintenance** | `MAINTENANCE_PROTOCOL.md` | Post-G9 operational workflow ("Janitor mode") |
| **Cost Projections** | `AGENT_COST_TRACKING.md` | Cost-to-complete estimates based on PRD complexity |

---

## Protocol Version

**Version:** 2.0.0
**Last Updated:** 2026-01-02

### Changelog
- 2.0.0: Hub-and-Spoke architecture - Task-based worker protocol, spec-based communication, task queue retries
- 1.4.0: Added references to Fast Track, Maintenance, and Cost Projection protocols
- 1.3.0: Added Handoff Validation Protocol (Section 8)
- 1.2.0: Added Context Compression Protocol
- 1.1.0: Added Assessment Protocol
- 1.0.0: Initial version
