# Self-Healing Protocol (Autonomic Development)

> **Version 2.0** - Hub-and-Spoke Architecture
>
> **Core Principle:** Workers automatically verify, detect failures, fix issues, and retry - surfacing problems to humans only after exhausting internal remediation.

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Worker Swarm** | [WORKER_SWARM.md](./WORKER_SWARM.md) | Worker lifecycle and self-verification |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | External validation pipeline (Level 2) |
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task retry via queue re-enqueue |
| **Protocols** | [PROTOCOLS.md](./PROTOCOLS.md) | Retry protocol and escalation |

---

## Overview

The Self-Healing Loop creates **autonomic development** where workers:
1. Write code
2. Automatically run verification (build, lint, test, typecheck)
3. If failure: Parse error, reflect, patch, retry
4. Human only sees final result OR escalation after 3 failed internal attempts

## Integration with Hub-and-Spoke Architecture

Self-healing operates at **two levels**:

### Level 1: Worker Self-Healing (Internal)

Workers heal their own work **before completing tasks**:

```
Worker receives task → Implement → Verify → Self-heal if needed → Complete task
```

This is internal to the worker and happens before `complete_task()` is called.

### Level 2: Pipeline Validation (External)

Continuous Validation runs **after task completion**:

```
Worker completes task → Validation triggered → Additional issues found → Regeneration queued
```

See [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) for pipeline details.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKER TASK EXECUTION                         │
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │  Dequeue │───>│ Implement│───>│  Self-   │                   │
│  │  Task    │    │  Code    │    │  Verify  │                   │
│  └──────────┘    └──────────┘    └────┬─────┘                   │
│                                       │                          │
│                         ┌─────────────┼─────────────┐            │
│                         ▼             ▼             ▼            │
│                   ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│                   │  FAIL    │  │ WARNING  │  │ SUCCESS  │       │
│                   └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│                        │             │             │              │
│                        ▼             ▼             ▼              │
│                   ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│                   │Self-Heal │  │   Log    │  │ Complete │       │
│                   │ (≤3 try) │  │ Continue │  │  Task    │───────┼──┐
│                   └────┬─────┘  └──────────┘  └──────────┘       │  │
│                        │                                          │  │
│            ┌───────────┴───────────┐                              │  │
│            ▼                       ▼                              │  │
│       ┌──────────┐          ┌──────────┐                         │  │
│       │ Fixed?   │──YES────>│ Complete │                         │  │
│       │ (retry)  │          │  Task    │─────────────────────────┼──┤
│       └────┬─────┘          └──────────┘                         │  │
│            │NO (after 3)                                          │  │
│            ▼                                                      │  │
│       ┌──────────┐                                                │  │
│       │ ESCALATE │                                                │  │
│       │ to Orch  │                                                │  │
│       └──────────┘                                                │  │
└─────────────────────────────────────────────────────────────────┘  │
                                                                      │
┌─────────────────────────────────────────────────────────────────┐  │
│                  CONTINUOUS VALIDATION PIPELINE                   │  │
│                                                                   │  │
│  ┌──────────────────────────────────────────────────────────┐    │  │
│  │                Task Completed Event                       │<───┼──┘
│  └────────────────────────┬─────────────────────────────────┘    │
│                           ▼                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Lint    │  │ Typecheck│  │  Test    │  │ Security │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       └─────────────┴─────────────┴─────────────┘                │
│                           │                                       │
│            ┌──────────────┼──────────────┐                       │
│            ▼              ▼              ▼                        │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│       │ ALL PASS │  │  FAIL    │  │ ESCALATE │                  │
│       │  (Done)  │  │ (Regen)  │  │(Critical)│                  │
│       └──────────┘  └────┬─────┘  └──────────┘                  │
│                          │                                        │
│                          ▼                                        │
│                   ┌──────────────┐                                │
│                   │Queue Regen   │                                │
│                   │Task (≤3 try) │                                │
│                   └──────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│                    SELF-HEALING LOOP                        │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Write   │───>│  Verify  │───>│  Check   │              │
│  │  Code    │    │  (Auto)  │    │  Output  │              │
│  └──────────┘    └──────────┘    └────┬─────┘              │
│       ▲                               │                     │
│       │              ┌────────────────┼────────────────┐    │
│       │              ▼                ▼                ▼    │
│       │         ┌────────┐      ┌──────────┐    ┌─────────┐ │
│       │         │ ERRORS │      │ WARNINGS │    │ SUCCESS │ │
│       │         └────┬───┘      └────┬─────┘    └────┬────┘ │
│       │              │               │               │      │
│       │              ▼               ▼               ▼      │
│       │         ┌────────┐    ┌──────────┐    ┌─────────┐   │
│       │         │  Parse │    │  Log &   │    │ Proceed │   │
│       │         │ & Fix  │    │ Continue │    │   to    │   │
│       │         └────┬───┘    └──────────┘    │ Handoff │   │
│       │              │                        └─────────┘   │
│       │              ▼                                      │
│       │         ┌────────┐                                  │
│       │         │ Attempt│                                  │
│       │         │  < 3?  │                                  │
│       │         └────┬───┘                                  │
│       │              │                                      │
│       │    YES ──────┴────── NO                             │
│       │     │                │                              │
│       └─────┘                ▼                              │
│                        ┌──────────┐                         │
│                        │ ESCALATE │                         │
│                        │ to Human │                         │
│                        └──────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Terminal Command Tool Usage

### Required Tool Access
All development agents MUST have access to terminal execution:

```markdown
## Tool Access
- **run_terminal_command**: Execute shell commands for verification
  - Build commands: `npm run build`, `tsc`
  - Test commands: `npm test`, `npm run test:coverage`
  - Lint commands: `npm run lint`, `eslint`
  - Type check: `npm run typecheck`, `tsc --noEmit`
```

### Mandatory Verification Before Handoff
**CRITICAL:** No handoff may be submitted without running verification commands.

```bash
# Frontend/Full-stack Projects
npm run typecheck     # TypeScript compilation check
npm run lint          # ESLint/Prettier
npm run build         # Production build
npm test              # Unit tests

# Backend Projects (additional)
npx prisma migrate status   # Database migrations
npm run test:integration    # Integration tests

# All Projects
npm audit --audit-level=high  # Security check (warnings only)
```

## Self-Healing Workflow

### Phase 1: Initial Code Write
Agent writes code based on requirements/handoff.

### Phase 2: Automatic Verification
Immediately after writing code, agent MUST run:

```bash
# Run sequentially, stop on first failure
npm run typecheck && npm run lint && npm run build && npm test
```

### Phase 3: Error Detection & Classification

When verification fails, classify the error:

| Error Type | Detection Pattern | Auto-Fix Strategy |
|------------|-------------------|-------------------|
| **Type Error** | `TS\d{4}:`, `Type '.*' is not assignable` | Fix type annotations, add type guards |
| **Import Error** | `Cannot find module`, `Module not found` | Check path, install package, fix export |
| **Syntax Error** | `Unexpected token`, `SyntaxError` | Parse error location, fix syntax |
| **Lint Error** | `error  .*  @typescript-eslint` | Apply auto-fix or manual correction |
| **Test Failure** | `FAIL`, `AssertionError`, `Expected.*Received` | Analyze assertion, fix logic or test |
| **Build Error** | `Build failed`, `Compilation failed` | Parse webpack/vite error, fix source |
| **Runtime Error** | `ReferenceError`, `TypeError` at runtime | Add null checks, fix logic |
| **Coverage Gap** | `Coverage.*below threshold` | Add missing test cases |

### Phase 4: Reflection & Analysis

Before attempting a fix, agent MUST:

1. **Read the full error message** - Not just the first line
2. **Identify root cause** - What specifically is wrong?
3. **Check for patterns** - Is this similar to a previous failure?
4. **Plan the fix** - What specific change will resolve this?

```markdown
### Internal Reflection (Attempt N)
**Error Type:** [Classification]
**Error Message:** [Full message]
**Root Cause:** [Analysis]
**Planned Fix:** [Specific change]
**Confidence:** [High/Medium/Low]
```

### Phase 5: Apply Fix & Retry

1. Make the minimal change needed to fix the error
2. Re-run the exact same verification command
3. If new error appears, classify and continue
4. Track all attempts in internal log

### Phase 6: Success or Escalation

**On Success (any attempt):**
- Proceed to handoff with verification proof
- Include attempt history in handoff (for learning)
- Human sees only the successful result

**On Failure (after 3 attempts):**
- Compile full failure report
- Escalate to human with all context
- Present options for path forward

## Internal Attempt Tracking

Agents maintain an internal log that is NOT shown to users unless escalation:

```json
{
  "self_healing_log": {
    "started_at": "ISO-8601",
    "attempts": [
      {
        "attempt": 1,
        "command": "npm run build",
        "exit_code": 1,
        "error_type": "type_error",
        "error_summary": "TS2322: Type 'string' is not assignable to type 'number'",
        "error_location": "src/components/Counter.tsx:15:5",
        "reflection": "Props type expects number but string literal passed",
        "fix_applied": "Changed count=\"5\" to count={5}",
        "fix_file": "src/components/Counter.tsx",
        "fix_line": 15
      },
      {
        "attempt": 2,
        "command": "npm run build",
        "exit_code": 0,
        "duration_ms": 4523
      }
    ],
    "final_status": "success",
    "total_attempts": 2,
    "total_duration_ms": 12847
  }
}
```

## Escalation Protocol

### When to Escalate (Human Intervention Required)

Escalate immediately (don't retry) if:
- **Security vulnerability** detected in code
- **Data loss risk** identified
- **Breaking change** to public API
- **Architectural decision** needed
- **External dependency** is unavailable
- **Credentials/secrets** issue

Escalate after 3 attempts if:
- Same error persists despite fixes
- Error type changes each attempt (cascading issues)
- Fix requires information agent doesn't have

### Escalation Format

```markdown
## SELF-HEALING ESCALATION

**Agent:** [Agent Name]
**Phase:** [Current Phase]
**Attempts:** 3 of 3 exhausted

### Error Summary
[Brief description of the persistent issue]

### Attempt History
| # | Error Type | Fix Tried | Result |
|---|-----------|-----------|--------|
| 1 | Type Error | Fixed type annotation | New error |
| 2 | Import Error | Fixed import path | Same error |
| 3 | Import Error | Installed missing dep | Same error |

### Root Cause Analysis
[Agent's analysis of why fixes aren't working]

### Recommended Options
1. **[Option A]** - [Description and trade-offs]
2. **[Option B]** - [Description and trade-offs]
3. **[Option C]** - [Description and trade-offs]

### Files Affected
- `path/to/file.ts` - [What was changed]

### Full Error Log
<details>
<summary>Click to expand</summary>

[Complete error output from all 3 attempts]

</details>
```

## Agent-Specific Verification Commands

### Frontend Developer
```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:coverage  # Verify ≥80%
```

### Backend Developer
```bash
npm run typecheck
npm run lint
npm run build
npm test
npx prisma migrate status
npm run test:integration
curl -s http://localhost:3000/health  # If server running
```

### QA Engineer
```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:accessibility  # If configured
```

### DevOps Engineer
```bash
npm run build
docker build -t test .  # If Dockerfile exists
npm run lint:ci
```

## Verification Command Configuration

### Expected Exit Codes

| Command | Success | Failure |
|---------|---------|---------|
| `npm run typecheck` | 0 | 1+ |
| `npm run lint` | 0 | 1+ |
| `npm run build` | 0 | 1+ |
| `npm test` | 0 | 1+ |
| `npm run test:coverage` | 0 (if ≥80%) | 1 (if <80%) |

### Timeout Configuration

| Command | Default Timeout | Max Retries |
|---------|----------------|-------------|
| `typecheck` | 60s | 1 |
| `lint` | 60s | 1 |
| `build` | 300s | 1 |
| `test` | 300s | 1 |
| `test:coverage` | 300s | 1 |

## Integration with Task Completion

### Task Completion Verification Section (Required)

When completing a task, workers must include verification results:

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
    self_healing_applied: true,
    total_internal_attempts: 2,
    checks: [
      { name: 'typecheck', passed: true, command: 'npm run typecheck', duration_ms: 2341 },
      { name: 'lint', passed: true, command: 'npm run lint', duration_ms: 1523 },
      { name: 'build', passed: true, command: 'npm run build', duration_ms: 8234 },
      { name: 'test', passed: true, command: 'npm test', duration_ms: 5123 }
    ],
    healing_summary: {
      errors_fixed: 1,
      error_types: ['type_error'],
      confidence: 'high'
    }
  }
});
```

### Task Completion Without Verification = REJECTION

The MCP server MUST reject any task completion that:
- Has no `verification` section
- Has no `checks` array
- Has empty check results
- Has `passed: false` on any verification check
- Is missing build or test checks (for generation workers)

## Best Practices

### DO:
- Run verification immediately after any code change
- Read complete error messages, not just summaries
- Make minimal, targeted fixes
- Track all attempts for learning
- Escalate early if blocked on missing information

### DON'T:
- Skip verification to save time
- Make multiple unrelated changes between verifications
- Retry the same fix hoping for different results
- Hide failures from the handoff record
- Continue past 3 attempts without escalation

## Error Pattern Library

Common patterns and fixes for quick reference:

### TypeScript Errors

| Pattern | Likely Cause | Fix |
|---------|--------------|-----|
| `TS2307: Cannot find module` | Missing/wrong import | Check path, install package |
| `TS2322: Type X not assignable to Y` | Type mismatch | Fix type or add assertion |
| `TS2339: Property does not exist` | Missing property | Add to interface or check spelling |
| `TS2345: Argument type mismatch` | Wrong function argument | Fix argument type |
| `TS7006: Parameter implicitly has any` | Missing type annotation | Add explicit type |

### ESLint Errors

| Pattern | Likely Cause | Fix |
|---------|--------------|-----|
| `no-unused-vars` | Declared but unused | Remove or use the variable |
| `react-hooks/exhaustive-deps` | Missing dependency | Add to deps array or ignore |
| `@typescript-eslint/no-explicit-any` | Using `any` type | Add proper type |
| `prefer-const` | Using `let` for constant | Change to `const` |

### Test Failures

| Pattern | Likely Cause | Fix |
|---------|--------------|-----|
| `Expected X, Received Y` | Logic error | Fix implementation or test |
| `Cannot read property of undefined` | Null reference | Add null checks or mock |
| `Timeout` | Async not awaited | Add await or increase timeout |
| `No tests found` | Test file not matched | Check file naming pattern |

## Metrics & Learning

### Track for Continuous Improvement

- **First-pass success rate**: % of code that passes verification on first try
- **Average attempts to success**: Mean attempts before passing
- **Common error types**: Which errors occur most frequently
- **Time in healing loop**: Duration spent in self-healing
- **Escalation rate**: % that require human intervention

### MCP Metrics Queries

```typescript
// Get self-healing metrics
await mcp.callTool('get_worker_metrics', {
  project_id: 'my-project',
  metric_type: 'self_healing'
});
// Returns:
// {
//   first_pass_success_rate: 0.72,
//   average_attempts: 1.4,
//   error_distribution: { type_error: 45, lint_error: 30, test_failure: 25 },
//   average_healing_duration_ms: 28000,
//   escalation_rate: 0.05
// }
```

### Cross-Session Learning

When the same error type is encountered:
1. Check if a fix worked before
2. Apply known fix first
3. Track effectiveness of fixes over time

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────┐
│              SELF-HEALING CHECKLIST                    │
├────────────────────────────────────────────────────────┤
│ □ Code written                                         │
│ □ npm run typecheck - exit 0                           │
│ □ npm run lint - exit 0                                │
│ □ npm run build - exit 0                               │
│ □ npm test - exit 0                                    │
│ □ Coverage ≥ 80%                                       │
├────────────────────────────────────────────────────────┤
│ IF FAILURE:                                            │
│ □ Classify error type                                  │
│ □ Read full error message                              │
│ □ Identify root cause                                  │
│ □ Plan targeted fix                                    │
│ □ Apply fix                                            │
│ □ Re-run verification                                  │
│ □ Repeat (max 3 attempts)                              │
├────────────────────────────────────────────────────────┤
│ AFTER 3 FAILURES:                                      │
│ □ Compile attempt history                              │
│ □ Analyze why fixes failed                             │
│ □ Present escalation to human                          │
│ □ Offer options for path forward                       │
└────────────────────────────────────────────────────────┘
```
