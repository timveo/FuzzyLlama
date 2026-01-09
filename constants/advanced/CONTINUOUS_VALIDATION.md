# Continuous Validation Protocol

> **Version 1.0** - Hub-and-Spoke Architecture

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `trigger_validation()`, `get_validation_results()` |
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task structure, regeneration task queuing |
| **Self-Healing** | [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) | Worker-level validation before task completion |
| **Approval Gates** | [APPROVAL_GATES.md](./APPROVAL_GATES.md) | Gate validation requirements |

---

## Overview

Continuous Validation runs **automatically and in parallel** throughout the development process. Every file change triggers validation, and validation workers process checks concurrently.

## Core Principles

1. **Event-Driven** - File changes trigger validation, not manual requests
2. **Parallel Execution** - Lint, typecheck, test, security run simultaneously
3. **Non-Blocking** - Validation runs alongside generation (doesn't block workers)
4. **Auto-Remediation** - Failed checks queue regeneration tasks (up to 3 attempts)
5. **Spec Compliance** - All output validated against locked specs

---

## Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     FILE CHANGE DETECTED                         │
│                                                                   │
│  Generation Worker completes task → files_created/modified        │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION TRIGGERED                          │
│                                                                   │
│  MCP: trigger_validation({ file_paths, checks })                 │
└───────────────────────────┬───────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┬───────────────┐
            ▼               ▼               ▼               ▼
       ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
       │  LINT   │    │ TYPECHECK│   │  TEST   │    │SECURITY │
       │         │    │         │    │         │    │         │
       │ ESLint  │    │   tsc   │    │  Jest   │    │  Snyk   │
       │ Prettier│    │         │    │Playwright│   │ npm audit│
       └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
            │              │              │              │
            └───────────────┼───────────────┴───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RESULTS AGGREGATED                             │
│                                                                   │
│  All passed? → Complete                                          │
│  Any failed? → Queue regeneration task                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Trigger Events

### Automatic Triggers

| Event | Trigger Source | Validation Scope |
|-------|---------------|------------------|
| Task completion | Generation worker | Changed files only |
| File save | Watch mode (dev) | Changed file only |
| Pre-commit | Git hook | Staged files |
| PR creation | CI pipeline | All changed files |
| Gate transition | Gate approval | Full validation suite |

### Manual Triggers

```typescript
// Full project validation
await mcp.callTool('trigger_validation', {
  project_id: 'my-project',
  scope: 'full'
});

// Specific files
await mcp.callTool('trigger_validation', {
  project_id: 'my-project',
  file_paths: ['src/auth/login.ts', 'src/auth/login.test.ts']
});

// Specific checks
await mcp.callTool('trigger_validation', {
  project_id: 'my-project',
  checks: ['security']  // Only security scan
});
```

---

## Validation Checks

### Check Categories

| Check | Tool | Runs On | Blocking |
|-------|------|---------|----------|
| **Lint** | ESLint + Prettier | All .ts/.tsx/.js files | Yes |
| **Typecheck** | TypeScript compiler | All .ts/.tsx files | Yes |
| **Test** | Jest/Vitest | Test files for changed code | Yes |
| **Security** | Snyk + npm audit | package.json, lock files | G6+ only |
| **Build** | Vite/Next.js | Full project | G5+ only |
| **E2E** | Playwright | Critical paths | G5+ only |
| **Accessibility** | axe-core | UI components | G4+ only |
| **Performance** | Lighthouse | Pages | G8 only |

### Check Configuration

```json
{
  "validation": {
    "default_checks": ["lint", "typecheck", "test"],
    "gate_checks": {
      "G3": ["lint", "typecheck"],
      "G4": ["lint", "typecheck", "test", "accessibility"],
      "G5": ["lint", "typecheck", "test", "build", "e2e"],
      "G6": ["security"],
      "G7": ["security", "build"],
      "G8": ["lint", "typecheck", "test", "security", "build", "e2e", "performance"]
    },
    "parallel_limit": 4,
    "timeout_ms": 300000
  }
}
```

---

## Parallel Validation

### Execution Model

All validation checks run in parallel (no dependencies between checks):

```typescript
async function runValidation(files: string[], checks: string[]): Promise<ValidationResult> {
  // Run all checks in parallel
  const results = await Promise.all([
    checks.includes('lint') ? runLint(files) : null,
    checks.includes('typecheck') ? runTypecheck(files) : null,
    checks.includes('test') ? runTests(files) : null,
    checks.includes('security') ? runSecurity(files) : null
  ]);

  // Aggregate results
  return {
    overall_status: results.every(r => r?.passed) ? 'passing' : 'failing',
    lint: results[0],
    typecheck: results[1],
    tests: results[2],
    security: results[3],
    duration_ms: calculateDuration()
  };
}
```

### Resource Allocation

| Check | Typical Duration | Memory | CPU |
|-------|-----------------|--------|-----|
| Lint | 5-15s | Low | Medium |
| Typecheck | 10-30s | High | High |
| Test (unit) | 10-60s | Medium | High |
| Test (e2e) | 60-300s | High | High |
| Security | 5-20s | Low | Low |
| Build | 30-120s | High | High |

---

## Validation Results

### Result Schema

```typescript
interface ValidationResult {
  validation_id: string;
  project_id: string;
  triggered_by: 'task_completion' | 'file_change' | 'gate' | 'manual';
  trigger_source: string;  // Task ID, file path, or gate ID
  started_at: string;
  completed_at: string;
  duration_ms: number;

  overall_status: 'passing' | 'failing' | 'partial';

  checks: {
    lint?: CheckResult;
    typecheck?: CheckResult;
    tests?: TestResult;
    security?: SecurityResult;
    build?: BuildResult;
    e2e?: E2EResult;
    accessibility?: A11yResult;
    performance?: PerfResult;
  };

  files_validated: string[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface CheckResult {
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  errors: string[];
  warnings: string[];
}

interface TestResult extends CheckResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
}

interface SecurityResult extends CheckResult {
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  advisories: SecurityAdvisory[];
}
```

### Result Storage

```typescript
// Store validation result
await mcp.callTool('store_validation_result', {
  project_id: 'my-project',
  result: validationResult
});

// Query validation history
await mcp.callTool('get_validation_history', {
  project_id: 'my-project',
  limit: 10,
  filter_status: 'failing'
});
```

---

## Auto-Remediation

### Remediation Flow

```
Validation Failed
       │
       ▼
┌─────────────────────┐
│ Analyze Error Type  │
│                     │
│ • Lint error        │
│ • Type error        │
│ • Test failure      │
│ • Security issue    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check Retry Count   │
│                     │
│ attempts < 3?       │
│   → Queue regen     │
│ attempts >= 3?      │
│   → Escalate        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Queue Regen Task    │
│                     │
│ Priority: HIGH      │
│ Include error ctx   │
│ Target same spec    │
└─────────────────────┘
```

### Remediation Rules

| Error Type | Remediation | Worker |
|------------|-------------|--------|
| Lint error | Auto-fix + regenerate | auto-reviewer |
| Type error | Regenerate with error context | original generator |
| Test failure | Fix implementation | original generator |
| Security (critical) | Block + escalate | security-scanner |
| Security (high/med) | Queue fix task | security-scanner |
| Build failure | Regenerate affected files | original generator |

### Regeneration Task

```typescript
// On validation failure, queue regeneration
if (result.overall_status === 'failing') {
  const originalTask = await getTask(result.trigger_source);

  if (originalTask.retry_count < 3) {
    await mcp.callTool('enqueue_task', {
      project_id: 'my-project',
      type: 'generation',
      priority: 'high',  // Elevated priority
      worker_category: 'generation',
      description: `Fix: ${result.errors[0].message}`,
      spec_refs: originalTask.spec_refs,
      context: {
        original_task_id: originalTask.id,
        retry_count: originalTask.retry_count + 1,
        validation_errors: result.errors,
        files_to_fix: result.files_validated
      }
    });
  } else {
    // Escalate to user
    await mcp.callTool('escalate', {
      type: 'validation_failure',
      task_id: originalTask.id,
      errors: result.errors,
      attempts: 3
    });
  }
}
```

---

## Spec Compliance Validation

### Spec Validation

After G3 approval, all generated code must match locked specs:

```typescript
async function validateSpecCompliance(files: string[]): Promise<SpecValidation> {
  const results = [];

  for (const file of files) {
    // Determine which spec this file implements
    const specRef = inferSpecRef(file);
    if (!specRef) continue;

    // Validate against spec
    const result = await mcp.callTool('validate_against_spec', {
      project_id: 'my-project',
      file_path: file,
      spec_type: specRef.type,
      spec_path: specRef.path
    });

    results.push(result);
  }

  return {
    all_compliant: results.every(r => r.valid),
    violations: results.filter(r => !r.valid)
  };
}
```

### Spec Inference

```typescript
function inferSpecRef(filePath: string): SpecRef | null {
  // API routes → OpenAPI
  if (filePath.includes('/api/') && filePath.endsWith('.ts')) {
    const route = extractRoute(filePath);
    return { type: 'openapi', path: `paths.${route}` };
  }

  // Database models → Prisma
  if (filePath.includes('/models/') || filePath.includes('.prisma')) {
    const model = extractModel(filePath);
    return { type: 'prisma', path: `models.${model}` };
  }

  // Types/interfaces → Zod
  if (filePath.includes('/types/') || filePath.includes('/schemas/')) {
    const schema = extractSchema(filePath);
    return { type: 'zod', path: `schemas.${schema}` };
  }

  return null;
}
```

---

## Integration with Task Queue

### On Task Completion

```typescript
// Generation worker completes task
await mcp.callTool('complete_task', {
  task_id: 'TASK-015',
  worker_id: 'full-stack-generator',
  status: 'complete',
  output: {
    files_created: ['src/auth/login.ts'],
    files_modified: ['src/index.ts'],
    verification: internalVerification
  }
});

// System automatically triggers validation
// (handled by MCP server, not worker)
await mcp.callTool('trigger_validation', {
  project_id: 'my-project',
  file_paths: ['src/auth/login.ts', 'src/index.ts'],
  triggered_by: 'task_completion',
  trigger_source: 'TASK-015'
});
```

### Validation as Task

Validation itself runs as tasks in the queue:

```typescript
// Validation task structure
{
  id: 'TASK-016',
  type: 'validation',
  priority: 'high',
  worker_category: 'validation',
  description: 'Validate TASK-015 output',
  context: {
    validation_type: 'task_completion',
    source_task: 'TASK-015',
    files: ['src/auth/login.ts', 'src/index.ts'],
    checks: ['lint', 'typecheck', 'test']
  }
}
```

---

## Gate Validation

### Pre-Gate Validation

Before any gate approval, full validation must pass:

```typescript
async function canApproveGate(gate: string): Promise<GateReadiness> {
  // Run gate-specific validation suite
  const checks = GATE_CHECKS[gate];

  const result = await mcp.callTool('trigger_validation', {
    project_id: 'my-project',
    scope: 'full',
    checks: checks
  });

  await waitForValidation(result.validation_id);

  const validation = await mcp.callTool('get_validation_results', {
    validation_id: result.validation_id
  });

  return {
    ready: validation.overall_status === 'passing',
    blocking_errors: validation.errors.filter(e => e.blocking),
    warnings: validation.warnings
  };
}
```

### Gate Validation Requirements

| Gate | Required Checks | Must Pass |
|------|----------------|-----------|
| G1 | None | - |
| G2 | None | - |
| G3 | lint, typecheck | All |
| G4 | lint, typecheck, test, a11y | All |
| G5 | lint, typecheck, test, build, e2e | All |
| G6 | security | No critical/high vulns |
| G7 | security, build | All |
| G8 | All checks | All |

---

## Monitoring & Metrics

### Validation Metrics

```typescript
await mcp.callTool('get_validation_metrics', {
  project_id: 'my-project'
});
// Returns:
// {
//   total_validations: 150,
//   pass_rate: 0.85,
//   average_duration_ms: 45000,
//   by_check: {
//     lint: { total: 150, pass_rate: 0.95 },
//     typecheck: { total: 150, pass_rate: 0.92 },
//     test: { total: 120, pass_rate: 0.88, avg_coverage: 0.82 },
//     security: { total: 30, pass_rate: 0.97 }
//   },
//   remediation_stats: {
//     auto_fixed: 45,
//     escalated: 3,
//     avg_retries: 1.2
//   }
// }
```

### Health Dashboard

```
┌────────────────────────────────────────────────────────────┐
│                   VALIDATION HEALTH                         │
│                                                             │
│  Overall Pass Rate: 85%  ████████░░  Last Hour: 12/14      │
│                                                             │
│  Lint:      95% ████████████░  │  Security: 97% ██████████│
│  Typecheck: 92% ███████████░░  │  Build:    100% █████████│
│  Tests:     88% █████████░░░░  │  E2E:      85% ████████░░│
│                                                             │
│  Active Validations: 3                                      │
│  Queued Validations: 2                                      │
│  Failed (pending fix): 1                                    │
└────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Project Configuration

```json
{
  "validation": {
    "enabled": true,
    "auto_trigger": true,
    "parallel_limit": 4,
    "timeout_ms": 300000,

    "checks": {
      "lint": {
        "enabled": true,
        "config": ".eslintrc.js",
        "auto_fix": true
      },
      "typecheck": {
        "enabled": true,
        "strict": true
      },
      "test": {
        "enabled": true,
        "coverage_threshold": 80,
        "run_affected_only": true
      },
      "security": {
        "enabled": true,
        "fail_on": ["critical", "high"],
        "ignore_dev_deps": true
      },
      "build": {
        "enabled": true,
        "production": false
      },
      "e2e": {
        "enabled": true,
        "browsers": ["chromium"],
        "headed": false
      }
    },

    "remediation": {
      "enabled": true,
      "max_retries": 3,
      "auto_escalate": true
    }
  }
}
```

---

## Best Practices

1. **Run validation early and often** - Don't wait for gate checkpoints
2. **Keep checks fast** - Optimize test suite for quick feedback
3. **Use affected-only testing** - Don't run all tests for every change
4. **Auto-fix when possible** - Lint errors shouldn't require human intervention
5. **Escalate appropriately** - Security issues get immediate attention
6. **Track coverage trends** - Prevent coverage regression
7. **Cache validation results** - Don't re-validate unchanged files
