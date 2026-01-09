# Multi-Agent Framework Improvement Plan

> **Version:** 1.2.0
> **Created:** 2024-12-18
> **Updated:** 2024-12-18
> **Status:** Phase 1 & 2 Complete, Phase 3 Deferred

---

## Implementation Status

| Phase | Improvement | Status | Files Created/Modified |
|-------|-------------|--------|------------------------|
| **P1** | E: JSON-Schema Enforcement | **COMPLETE** | `scripts/validate-handoff.sh`, `scripts/lib/validate-handoff.js`, `schemas/examples/valid-handoff.json` |
| **P1** | B: Verification Proxies | **COMPLETE** | `constants/protocols/VERIFICATION_PROTOCOL.md`, updated `frontend-dev.md`, `backend-dev.md` |
| **P2** | D: Model Routing | **COMPLETE** | `constants/reference/MODEL_TIERS.md`, updated `orchestrator.md`, `schemas/handoff.schema.json` |
| **P2** | A: Agile Loops | **COMPLETE** | `constants/reference/FEATURE_LOOP_PROTOCOL.md`, `schemas/loop-handoff.schema.json`, updated `templates/docs/STATUS.md` |
| **P3** | C: Semantic Memory (RAG) | Deferred | — (implement when SYSTEM_MEMORY.md > 1000 lines) |

---

## Executive Summary

This document outlines a phased implementation plan for five improvements to the multi-agent framework, based on third-party assessment. The improvements are prioritized by value/effort ratio.

| Priority | Improvement | Effort | Value | Timeline |
|----------|-------------|--------|-------|----------|
| **P1** | E: JSON-Schema Enforcement | Low | High | Phase 1 |
| **P1** | B: Verification Proxies | Medium | High | Phase 1 |
| **P2** | D: Model Routing | Low | Medium | Phase 2 |
| **P2** | A: Agile Loops | High | High | Phase 2 |
| **P3** | C: Semantic Memory (RAG) | High | Medium | Phase 3 (Future) |

---

## Phase 1: Foundation Reliability (P1)

### E. Strict JSON-Schema Enforcement

**Goal:** Prevent invalid handoffs from propagating through the system.

#### Current State
- `schemas/handoff.schema.json` exists with comprehensive structure
- No enforcement mechanism - schema is advisory only
- LLMs can produce malformed JSON, causing silent failures

#### Implementation Plan

##### E.1: Create Validation Script
**File:** `scripts/validate-handoff.sh`

```bash
#!/bin/bash
# Validates a handoff JSON against the schema
# Usage: ./scripts/validate-handoff.sh <handoff.json>

SCHEMA_PATH="$(dirname "$0")/../schemas/handoff.schema.json"
HANDOFF_FILE="$1"

# Check dependencies
if ! command -v ajv &> /dev/null; then
    echo "Installing ajv-cli..."
    npm install -g ajv-cli ajv-formats
fi

# Validate
ajv validate -s "$SCHEMA_PATH" -d "$HANDOFF_FILE" --strict=false --all-errors

if [ $? -eq 0 ]; then
    echo "✅ Handoff validation PASSED"
    exit 0
else
    echo "❌ Handoff validation FAILED"
    exit 1
fi
```

##### E.2: Create Node.js Validation Module
**File:** `scripts/lib/validate-handoff.js`

```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const handoffSchema = require('../../schemas/handoff.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(handoffSchema);

function validateHandoff(handoffData) {
  const valid = validate(handoffData);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors.map(err => ({
        path: err.instancePath,
        message: err.message,
        params: err.params
      }))
    };
  }

  return { valid: true, errors: [] };
}

function formatValidationErrors(errors) {
  return errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
}

module.exports = { validateHandoff, formatValidationErrors };
```

##### E.3: Update Protocol Documentation
**File:** `constants/protocols/PROTOCOLS.md` - Add section:

```markdown
## 8. Handoff Validation Protocol

### MANDATORY: All handoffs MUST be validated before acceptance

When an agent produces a handoff:

1. **Agent completes work** → Produces handoff JSON
2. **Orchestrator validates** → Runs `validate-handoff.sh`
3. **If VALID** → Accept handoff, proceed
4. **If INVALID** → Reject, provide error details, request retry

### Validation Errors

When validation fails, the Orchestrator MUST:

1. NOT accept the handoff
2. Present specific errors to the agent
3. Request corrected handoff
4. Track as retry attempt (max 3)

### Example Validation Failure Response

```markdown
---
## ❌ HANDOFF VALIDATION FAILED

**Agent:** Frontend Developer
**Attempt:** 1 of 3

### Schema Violations
- `/handoff/timestamp`: must match format "date-time"
- `/files_created/0`: must have required property 'purpose'
- `/quality_checks/all_passed`: must be boolean

### Required Corrections
1. Use ISO-8601 timestamp format: `2024-12-18T14:30:00Z`
2. Add `purpose` field to all files_created entries
3. Set `all_passed` to `true` or `false`

Please resubmit a corrected handoff.
---
```

### Integration Points

| Location | Action |
|----------|--------|
| `agents/orchestrator.md` | Add validation step after each handoff |
| `scripts/validate-project.sh` | Call validate-handoff for stored handoffs |
| `constants/protocols/PROTOCOLS.md` | Document validation protocol |

### Retry Behavior

- Attempt 1: Provide errors, request fix
- Attempt 2: Provide errors + example of correct format
- Attempt 3: Escalate to user with full error history
```

##### E.4: Update Orchestrator
**File:** `agents/orchestrator.md` - Add to deactivation protocol:

```markdown
### Handoff Validation (MANDATORY)

Before accepting ANY agent handoff:

1. **Parse JSON** — Verify valid JSON syntax
2. **Run schema validation** — `./scripts/validate-handoff.sh handoff.json`
3. **Check required fields:**
   - `handoff.agent` matches deactivating agent
   - `handoff.timestamp` is current (within 1 hour)
   - `handoff.status` is valid enum
   - `files_created` lists all files (verify they exist)
   - `verification.commands_executed` has actual output
4. **If invalid** — Reject and request correction
5. **If valid** — Accept, update STATUS.md, proceed

**NEVER proceed with an invalid handoff.**
```

##### E.5: Create Example Valid Handoff
**File:** `schemas/examples/valid-handoff.json`

```json
{
  "handoff": {
    "agent": "Frontend Developer",
    "timestamp": "2024-12-18T14:30:00Z",
    "status": "complete",
    "phase": "development",
    "project": "my-app",
    "idempotency_key": "G5.3_Frontend_Developer_2024-12-18T14:30:00Z",
    "checksum": "sha256:abc123..."
  },
  "deliverables": {
    "components": ["Dashboard", "Settings", "Profile"],
    "tests": 15,
    "coverage": "82%"
  },
  "quality_checks": {
    "all_passed": true,
    "checks": [
      {
        "name": "Build passes",
        "status": "passed",
        "actual_value": "0 errors",
        "expected_value": "0 errors"
      },
      {
        "name": "Test coverage",
        "status": "passed",
        "actual_value": "82%",
        "expected_value": ">=80%"
      }
    ]
  },
  "files_created": [
    {
      "path": "src/components/Dashboard.tsx",
      "purpose": "Main dashboard component",
      "lines": 150
    },
    {
      "path": "src/components/Dashboard.test.tsx",
      "purpose": "Dashboard unit tests",
      "lines": 80
    }
  ],
  "verification": {
    "build_output": "vite v5.0.0 building...\n✓ 45 modules transformed.\nBuild completed in 2.3s",
    "test_output": "Test Suites: 8 passed, 8 total\nTests: 45 passed, 45 total",
    "commands_executed": [
      {
        "command": "npm run build",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:29:00Z"
      },
      {
        "command": "npm run test",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:29:30Z"
      }
    ]
  },
  "next_agent": "QA Engineer",
  "next_action": "Execute full test suite and quality assessment",
  "notes": "All components implemented per design specs. Dashboard includes real-time updates via TanStack Query."
}
```

##### E.6: Dependencies
**File:** `package.json` (create in project root)

```json
{
  "name": "multi-agent-product-creator",
  "version": "1.3.0",
  "scripts": {
    "validate:handoff": "node scripts/lib/validate-handoff-cli.js",
    "validate:project": "./scripts/validate-project.sh"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1"
  }
}
```

#### Success Criteria
- [ ] `validate-handoff.sh` script created and executable
- [ ] Node.js validation module created
- [ ] Example valid handoff created
- [ ] Orchestrator documentation updated
- [ ] PROTOCOLS.md updated with validation section
- [ ] All existing handoffs in schemas/examples validate

---

### B. Automated Verification Proxies (Compiler/Linter Feedback Loop)

**Goal:** Dev agents see and fix their own errors before handoff.

#### Current State
- Validation runs post-hoc via `validate-project.sh`
- Agents report completion without real verification
- Build/test errors discovered late in the process

#### Implementation Plan

##### B.1: Create Verification Protocol
**File:** `constants/protocols/VERIFICATION_PROTOCOL.md`

```markdown
# Real-Time Verification Protocol

> **Version:** 1.0.0
> **Purpose:** Agents verify their work in real-time before handoff

---

## Core Principle

**NO AGENT may claim "complete" status without automated verification.**

Every code-producing agent MUST:
1. Write code
2. Run verification commands
3. See output
4. Fix errors
5. Repeat until passing
6. Include verification output in handoff

---

## Verification Commands by Agent

### Frontend Developer

After EACH component or significant change:

```bash
# 1. Type Check
npm run typecheck
# Expected: 0 errors

# 2. Lint Check
npm run lint
# Expected: 0 errors, 0 warnings

# 3. Build Check
npm run build
# Expected: Build successful

# 4. Unit Tests
npm run test -- --coverage
# Expected: All pass, coverage ≥80%
```

### Backend Developer

After EACH endpoint or service:

```bash
# 1. Type Check
npm run typecheck

# 2. Lint Check
npm run lint

# 3. Build Check
npm run build

# 4. Unit Tests
npm run test

# 5. API Health Check (if server running)
curl -s http://localhost:3000/health | jq .
```

### QA Engineer

After writing tests:

```bash
# 1. Run Full Test Suite
npm run test:all

# 2. Coverage Report
npm run test:coverage

# 3. E2E Tests (if configured)
npm run test:e2e
```

---

## Verification Loop Protocol

```
┌─────────────────────────────────────────────────────┐
│                  WRITE CODE                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              RUN VERIFICATION                        │
│  npm run build && npm run test                       │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌───────────┐         ┌───────────┐
    │  ERRORS   │         │  SUCCESS  │
    └─────┬─────┘         └─────┬─────┘
          │                     │
          ▼                     ▼
┌─────────────────┐    ┌─────────────────────────┐
│  ANALYZE ERROR  │    │  PROCEED TO HANDOFF     │
│  FIX THE ISSUE  │    │  Include verification   │
│  LOOP BACK ↑    │    │  output in handoff JSON │
└─────────────────┘    └─────────────────────────┘
```

---

## Required Verification Output in Handoff

The `verification` field in handoff JSON MUST include:

```json
{
  "verification": {
    "build_output": "<actual npm run build output>",
    "test_output": "<actual npm run test output>",
    "lint_output": "<actual npm run lint output>",
    "commands_executed": [
      {
        "command": "npm run build",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:30:00Z",
        "duration_ms": 2300
      }
    ],
    "coverage": {
      "lines": 82,
      "branches": 78,
      "functions": 85,
      "statements": 82
    }
  }
}
```

---

## Rejection Criteria

Orchestrator MUST REJECT handoffs if:

| Condition | Action |
|-----------|--------|
| `build_output` missing | Reject: "No build verification" |
| `exit_code` > 0 for build | Reject: "Build failed" |
| `test_output` shows failures | Reject: "Tests failing" |
| Coverage < 80% | Reject: "Coverage below threshold" |
| `commands_executed` empty | Reject: "No verification commands run" |

---

## Self-Correction Protocol

When verification fails, the agent MUST:

1. **Read the error output carefully**
2. **Identify the root cause:**
   - Type error? → Fix types
   - Import error? → Fix imports
   - Test failure? → Fix code or test
   - Lint error? → Apply lint rules
3. **Make the fix**
4. **Re-run verification**
5. **Repeat until passing**

### Example Self-Correction

```markdown
**Verification Attempt 1:**
Command: npm run build
Exit Code: 1
Error:
  src/components/Dashboard.tsx:45:12
  Type '"string"' is not assignable to type 'number'.

**Analysis:**
Line 45 passes a string where a number is expected.

**Fix Applied:**
Changed `count="5"` to `count={5}` on line 45.

**Verification Attempt 2:**
Command: npm run build
Exit Code: 0
Output: Build successful.

**Proceeding to handoff.**
```

---

## Integration with Sub-Gates

| Sub-Gate | Verification Required |
|----------|----------------------|
| G5.1 Foundation | `npm run build` passes |
| G5.2 Data Layer | Build + API tests pass |
| G5.3 Components | Build + component tests pass |
| G5.4 Integration | Build + integration tests pass |
| G5.5 Polish | Build + all tests + lint pass |

---

## Headless Browser Verification (E2E)

For frontend verification beyond unit tests:

### Setup (in project)

```bash
npm install -D playwright @playwright/test
npx playwright install
```

### E2E Test Example

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and displays data', async ({ page }) => {
  await page.goto('/dashboard');

  // Verify page loads
  await expect(page.locator('h1')).toContainText('Dashboard');

  // Verify data renders
  await expect(page.locator('[data-testid="metrics"]')).toBeVisible();

  // Verify no console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.reload();
  expect(errors).toHaveLength(0);
});
```

### Run E2E Verification

```bash
npm run test:e2e
# Or specific test
npx playwright test dashboard.spec.ts
```

---

## Runtime Verification (Backend)

For backend verification beyond unit tests:

### Health Check Endpoint

Every backend MUST implement:

```typescript
// src/routes/health.ts
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      cache: await checkCache(),
      external_apis: await checkExternalAPIs()
    }
  });
});
```

### Runtime Verification Command

```bash
# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for startup
sleep 5

# Run health check
HEALTH=$(curl -s http://localhost:3000/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "❌ Health check failed"
  echo "$HEALTH"
  kill $SERVER_PID
  exit 1
fi

echo "✅ Health check passed"
kill $SERVER_PID
```

---

## Verification Checklist Template

Add to each development handoff:

```markdown
### Verification Checklist

- [ ] `npm run build` - Exit code 0
- [ ] `npm run lint` - 0 errors, 0 warnings
- [ ] `npm run test` - All passing
- [ ] `npm run test:coverage` - ≥80%
- [ ] No TypeScript errors
- [ ] No console errors in browser (if applicable)
- [ ] API health check passing (if applicable)
- [ ] E2E critical paths passing (if applicable)
```
```

##### B.2: Update Agent Prompts

Add to `agents/frontend-developer.md`, `agents/backend-developer.md`:

```markdown
## Real-Time Verification (MANDATORY)

You MUST verify your work before reporting completion:

### After EVERY Code Change

1. **Run build:** `npm run build`
2. **If errors:** Fix them immediately
3. **Run tests:** `npm run test`
4. **If failures:** Fix them immediately
5. **Run lint:** `npm run lint`
6. **If warnings:** Fix them

### Before Handoff

NEVER report "complete" until:
- Build passes (exit code 0)
- All tests pass
- Coverage ≥80%
- Lint passes

Include full verification output in your handoff JSON.

### Error Self-Correction

When you see an error:

1. Read the FULL error message
2. Identify the file and line number
3. Understand WHY it's failing
4. Make the minimal fix
5. Re-run verification
6. Repeat if needed

**Example:**
```
Error: Cannot find module './utils/format'

Analysis: Import path is wrong
Fix: Changed to './utils/formatters'
Result: Build now passes
```
```

##### B.3: Update validate-project.sh

Add verification output checking:

```bash
# In validate-project.sh, add function:

verify_handoff_verification() {
    local handoff_file="$1"

    # Check verification section exists
    if ! jq -e '.verification' "$handoff_file" > /dev/null 2>&1; then
        echo "❌ FAIL: Handoff missing verification section"
        return 1
    fi

    # Check build was run
    if ! jq -e '.verification.commands_executed[] | select(.command | contains("build"))' "$handoff_file" > /dev/null 2>&1; then
        echo "❌ FAIL: No build command in verification"
        return 1
    fi

    # Check build passed
    BUILD_EXIT=$(jq -r '.verification.commands_executed[] | select(.command | contains("build")) | .exit_code' "$handoff_file")
    if [ "$BUILD_EXIT" != "0" ]; then
        echo "❌ FAIL: Build command failed (exit code: $BUILD_EXIT)"
        return 1
    fi

    # Check tests were run
    if ! jq -e '.verification.commands_executed[] | select(.command | contains("test"))' "$handoff_file" > /dev/null 2>&1; then
        echo "❌ FAIL: No test command in verification"
        return 1
    fi

    echo "✅ PASS: Verification requirements met"
    return 0
}
```

#### Success Criteria
- [ ] VERIFICATION_PROTOCOL.md created
- [ ] Frontend Developer agent updated with verification loop
- [ ] Backend Developer agent updated with verification loop
- [ ] validate-project.sh checks verification in handoffs
- [ ] Example E2E test template created
- [ ] Health check endpoint template created

---

## Phase 2: Efficiency Improvements (P2)

### D. Specialized Model Routing (Tiered Intelligence)

**Goal:** Use faster/cheaper models for simple tasks, reserve powerful models for complex reasoning.

#### Current State
- Framework assumes single model (Claude)
- All tasks use same model regardless of complexity
- No model specification in agent definitions

#### Implementation Plan

##### D.1: Define Model Tiers
**File:** `constants/reference/MODEL_TIERS.md`

```markdown
# Model Tier Routing

> **Version:** 1.0.0
> **Purpose:** Optimize cost/speed by routing tasks to appropriate models

---

## Tier Definitions

| Tier | Model Examples | Use Case | Cost | Speed |
|------|----------------|----------|------|-------|
| **Tier 1: Fast** | Claude Haiku, GPT-4o-mini | Simple, repetitive tasks | $ | Fast |
| **Tier 2: Balanced** | Claude Sonnet, GPT-4o | Standard development | $$ | Medium |
| **Tier 3: Powerful** | Claude Opus, o1 | Complex reasoning, architecture | $$$ | Slow |

---

## Task-to-Tier Mapping

### Tier 1 (Fast) Tasks

| Task | Agent | Rationale |
|------|-------|-----------|
| STATUS.md updates | Orchestrator | Template filling, no reasoning |
| DECISIONS.md logging | Any | Structured format, simple |
| File renaming/moving | Any | Mechanical operation |
| Generating test stubs | QA Engineer | Pattern-based generation |
| Writing docstrings | Any | Formulaic content |
| Updating imports | Frontend/Backend | Find-replace style |
| Creating boilerplate | Any | Template expansion |

### Tier 2 (Balanced) Tasks

| Task | Agent | Rationale |
|------|-------|-----------|
| Component implementation | Frontend Developer | Standard development |
| API endpoint creation | Backend Developer | Standard development |
| Writing unit tests | QA Engineer | Requires logic understanding |
| Bug fixing | Any Developer | Analysis + implementation |
| Code review | Any | Pattern recognition |
| PRD writing | Product Manager | Structured creativity |
| Design system creation | UX/UI Designer | Creative + technical |

### Tier 3 (Powerful) Tasks

| Task | Agent | Rationale |
|------|-------|-----------|
| Architecture design | Architect | Complex trade-off analysis |
| Security review | Security Engineer | Threat modeling, edge cases |
| System integration | Orchestrator | Multi-agent coordination |
| Complex debugging | Any Developer | Deep reasoning required |
| Performance optimization | Any Developer | Non-obvious solutions |
| AI/ML model selection | ML Engineer | Research + evaluation |
| Prompt engineering | Prompt Engineer | Nuanced optimization |

---

## Agent Default Tiers

| Agent | Default Tier | Override Conditions |
|-------|--------------|---------------------|
| **Orchestrator** | Tier 2 | Tier 1 for status updates |
| **Product Manager** | Tier 2 | — |
| **Architect** | Tier 3 | — |
| **UX/UI Designer** | Tier 2 | — |
| **Frontend Developer** | Tier 2 | Tier 1 for boilerplate |
| **Backend Developer** | Tier 2 | Tier 1 for boilerplate |
| **Data Engineer** | Tier 2 | Tier 3 for schema design |
| **ML Engineer** | Tier 3 | — |
| **Prompt Engineer** | Tier 3 | — |
| **Model Evaluator** | Tier 2 | Tier 3 for complex analysis |
| **AIOps Engineer** | Tier 2 | — |
| **QA Engineer** | Tier 2 | Tier 1 for test generation |
| **Security Engineer** | Tier 3 | — |
| **DevOps Engineer** | Tier 2 | Tier 1 for config files |

---

## Routing Protocol

### Automatic Routing

The Orchestrator determines model tier based on:

1. **Task complexity score** (1-10):
   - 1-3: Tier 1
   - 4-7: Tier 2
   - 8-10: Tier 3

2. **Task type classification**:
   - Documentation update → Tier 1
   - Code implementation → Tier 2
   - Architecture decision → Tier 3

3. **Retry context**:
   - First attempt: Default tier
   - Retry 2: Upgrade one tier
   - Retry 3: Tier 3 (maximum)

### Manual Override

Users can specify tier in activation:

```markdown
## 🟢 ACTIVATING AGENT

**Agent:** Frontend Developer
**Model Tier:** Tier 1 (Fast)  ← Override
**Task:** Update import paths across components
```

---

## Implementation Notes

### For Claude Code / Agentic Systems

When using Claude Code or similar systems, specify model via:

```json
{
  "model": "claude-3-haiku-20240307",  // Tier 1
  "model": "claude-3-5-sonnet-20241022", // Tier 2
  "model": "claude-3-opus-20240229"    // Tier 3
}
```

### Cost Tracking

Log model usage in STATUS.md:

```markdown
## Model Usage

| Date | Agent | Tier | Task | Tokens |
|------|-------|------|------|--------|
| 2024-12-18 | Frontend | Tier 1 | Update imports | 1,500 |
| 2024-12-18 | Architect | Tier 3 | Design review | 15,000 |
```

---

## Future: Dynamic Routing

Phase 3 improvement: Implement smart routing that:

1. Starts with Tier 1
2. Detects complexity from initial response
3. Auto-upgrades if task requires more reasoning
4. Logs upgrade for pattern learning
```

##### D.2: Update Orchestrator for Model Selection

Add to `agents/orchestrator.md`:

```markdown
## Model Tier Selection

Before activating an agent, determine the appropriate model tier:

### Quick Reference

| Scenario | Tier |
|----------|------|
| Status/doc updates | 1 |
| Standard development | 2 |
| Architecture/security | 3 |
| Retry attempt 3 | 3 |

### Activation Format with Tier

```markdown
## 🟢 ACTIVATING AGENT

**Agent:** [Name]
**Model Tier:** [1/2/3] ([Fast/Balanced/Powerful])
**Rationale:** [Why this tier]
...
```

See `constants/reference/MODEL_TIERS.md` for full routing rules.
```

##### D.3: Add to Handoff Schema

Update `schemas/handoff.schema.json`:

```json
{
  "handoff": {
    "properties": {
      "model_tier": {
        "type": "integer",
        "enum": [1, 2, 3],
        "description": "Model tier used for this work"
      },
      "model_id": {
        "type": "string",
        "description": "Specific model identifier used"
      }
    }
  }
}
```

#### Success Criteria
- [ ] MODEL_TIERS.md created with routing rules
- [ ] Orchestrator updated with tier selection logic
- [ ] Handoff schema extended with model_tier field
- [ ] Task complexity scoring documented

---

### A. Agile Loops (Micro-Sprints)

**Goal:** Enable cross-functional teams to work on single user stories end-to-end.

#### Current State
- Linear flow: All requirements → All architecture → All development
- Agents work in isolation per phase
- No iteration on individual features

#### Implementation Plan

##### A.1: Create Feature Loop Protocol
**File:** `constants/reference/FEATURE_LOOP_PROTOCOL.md`

```markdown
# Feature Loop Protocol (Agile Micro-Sprints)

> **Version:** 1.0.0
> **Purpose:** Enable iterative, feature-focused development

---

## Overview

A **Feature Loop** is a micro-sprint where a cross-functional team (PM + Dev + QA) collaborates on a single user story from definition to deployment.

```
Traditional Flow:
  ALL Requirements → ALL Architecture → ALL Development → ALL Testing

Feature Loop Flow:
  Feature 1: Requirements → Design → Dev → Test → Deploy
  Feature 2: Requirements → Design → Dev → Test → Deploy
  (Parallel or Sequential)
```

---

## When to Use Feature Loops

| Project Type | Approach |
|--------------|----------|
| Small MVP (<5 features) | Traditional linear flow |
| Medium project (5-15 features) | Feature loops after architecture |
| Large project (>15 features) | Feature loops with parallel teams |
| Enhancement project | Feature loops by default |

### Feature Loop Triggers

Orchestrator activates Feature Loop mode when:
- Architecture phase complete (G3 approved)
- User stories are well-defined in PRD
- Features are loosely coupled
- User requests iterative approach

---

## Feature Loop Structure

### Loop Team

| Role | Agent | Responsibility |
|------|-------|----------------|
| **PM** | Product Manager | Story refinement, acceptance |
| **Dev** | Frontend/Backend Developer | Implementation |
| **QA** | QA Engineer | Testing, verification |
| **Optional** | UX/UI Designer | Design tweaks |

### Loop Phases

```
┌─────────────────────────────────────────────────────────┐
│                    FEATURE LOOP                          │
│                                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │
│  │  REFINE │ → │  BUILD  │ → │  TEST   │ → │ ACCEPT  │  │
│  │  (PM)   │   │  (Dev)  │   │  (QA)   │   │ (User)  │  │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │
│       ↑                                          │       │
│       └──────────── ITERATE IF NEEDED ───────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Phase Details

#### 1. REFINE (PM)
- Review user story
- Clarify acceptance criteria
- Identify edge cases
- Break into tasks if needed
- Duration: 30 min - 2 hours

#### 2. BUILD (Dev)
- Implement the feature
- Run verification loop
- Write unit tests
- Duration: 2 hours - 2 days

#### 3. TEST (QA)
- Review implementation
- Run integration tests
- Verify acceptance criteria
- Report issues if any
- Duration: 1 hour - 4 hours

#### 4. ACCEPT (User)
- Demo the feature
- Verify it meets expectations
- Approve or request changes
- Duration: 15 min - 1 hour

---

## Feature Loop State Machine

```
┌─────────────┐
│   QUEUED    │ ← Story selected for loop
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  REFINING   │ ← PM clarifying story
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  BUILDING   │ ← Dev implementing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   TESTING   │ ← QA verifying
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  ACCEPTING  │   │   BLOCKED   │ ← Issue found
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 └──→ Loop back to BUILD
       ▼
┌─────────────┐
│  COMPLETE   │ ← Feature shipped
└─────────────┘
```

---

## Orchestrator Behavior in Feature Loop Mode

### Entering Loop Mode

```markdown
---
## 🔄 ENTERING FEATURE LOOP MODE

**Project:** [name]
**Features Queued:**
1. [US-001] User authentication
2. [US-002] Dashboard view
3. [US-003] Settings page

**Loop Strategy:** Sequential (one at a time)
**Team:** PM + Frontend Developer + QA Engineer

### Starting Feature Loop 1: [US-001] User Authentication

**Current Phase:** REFINE
**Active Agent:** Product Manager
---
```

### Loop Status Tracking

In STATUS.md, track loop state:

```markdown
## Feature Loops

### Active Loop
| Story | Phase | Agent | Started | Iterations |
|-------|-------|-------|---------|------------|
| US-001 | BUILD | Frontend Developer | 2024-12-18 | 1 |

### Completed Loops
| Story | Duration | Iterations | Issues |
|-------|----------|------------|--------|
| US-000 | 4 hours | 1 | 0 |

### Queued
- US-002: Dashboard view
- US-003: Settings page
```

### Loop Transitions

| From | To | Trigger |
|------|----|---------|
| QUEUED | REFINING | Orchestrator activates PM |
| REFINING | BUILDING | PM hands off refined story |
| BUILDING | TESTING | Dev hands off with passing build |
| TESTING | ACCEPTING | QA hands off with test results |
| TESTING | BUILDING | QA finds issues → loop back |
| ACCEPTING | COMPLETE | User approves |
| ACCEPTING | BUILDING | User requests changes → loop back |

---

## Feature Loop Handoff (Lightweight)

Within a loop, use lightweight handoffs:

```json
{
  "loop_handoff": {
    "story_id": "US-001",
    "from_agent": "Frontend Developer",
    "to_agent": "QA Engineer",
    "phase": "BUILD → TEST",
    "timestamp": "2024-12-18T14:30:00Z",
    "iteration": 1
  },
  "deliverables": {
    "files_changed": ["src/components/Login.tsx", "src/services/auth.ts"],
    "tests_added": 8
  },
  "verification": {
    "build": "passing",
    "tests": "15/15 passing",
    "coverage": "85%"
  },
  "notes": "Login form complete with validation. Ready for QA."
}
```

---

## Parallel Feature Loops

For large projects, run loops in parallel:

```
Loop Team A: [PM] + [Frontend Dev] + [QA]
  └─ Working on: US-001, US-003, US-005

Loop Team B: [PM] + [Backend Dev] + [QA]
  └─ Working on: US-002, US-004, US-006
```

### Sync Points

Parallel loops must sync at:
- Shared API contracts
- Shared state management
- Integration testing
- Security review

```markdown
## 🔗 LOOP SYNC POINT

**Teams:** A, B
**Sync Type:** API Contract
**Status:** Frontend expects `/api/users`, Backend provides `/api/v1/users`

**Resolution Required:**
- [ ] Agree on endpoint paths
- [ ] Update API contract doc
- [ ] Both teams align
```

---

## Integration with Quality Gates

Feature Loops integrate with the existing gate system:

| Loop Event | Equivalent Gate |
|------------|-----------------|
| Story refined | Mini-G2 (requirements) |
| Feature built | Mini-G5 (development) |
| Feature tested | Mini-G6 (testing) |
| Feature accepted | User approval |
| All loops complete | Full G6 (testing phase) |

After all feature loops complete:
- Proceed to G7 (Security Review)
- Then G8 (Pre-deployment)
- Then G9 (Production acceptance)

---

## Example Feature Loop Session

```markdown
## Feature Loop: US-001 User Authentication

### Iteration 1

**REFINE Phase** (PM)
- Clarified: Social login not in MVP
- Added: Password reset flow
- Acceptance criteria:
  - [ ] Email/password login works
  - [ ] Error messages clear
  - [ ] Session persists on refresh

**BUILD Phase** (Frontend Dev)
- Implemented Login component
- Created auth service
- Added 8 unit tests
- Build: ✅ | Tests: ✅ | Coverage: 85%

**TEST Phase** (QA)
- Ran integration tests: 12/12 passing
- Found issue: Error message shows "undefined" on network failure
- Recommendation: Fix error handling, then accept

**Status:** BLOCKED → Loop back to BUILD

### Iteration 2

**BUILD Phase** (Frontend Dev)
- Fixed error handling
- Added network error test
- Build: ✅ | Tests: ✅ | Coverage: 87%

**TEST Phase** (QA)
- Re-ran tests: 14/14 passing
- No issues found
- Recommendation: Ready for acceptance

**ACCEPT Phase** (User)
- Demoed login flow
- Tested error states
- Approved ✅

**Status:** COMPLETE (2 iterations, 6 hours total)
```

---

## Configuration

### Enable Feature Loops

In project intake or STATUS.md:

```markdown
## Project Configuration

**Development Approach:** Feature Loops
**Loop Strategy:** Sequential
**Max Iterations per Loop:** 3
**Loop Team:** PM + Frontend Developer + QA Engineer
```

### Disable Feature Loops

```markdown
**Development Approach:** Traditional (Linear)
**Reason:** Small project, tight coupling
```
```

##### A.2: Update Orchestrator for Loop Mode

Add to `agents/orchestrator.md`:

```markdown
## Feature Loop Mode

When development approach is "Feature Loops":

### Entering Loop Mode

After G3 (Architecture) approval:

1. Parse user stories from PRD.md
2. Create feature queue in STATUS.md
3. Present loop plan to user
4. Start first loop

### Loop Orchestration

During a loop:
1. Track current loop state in STATUS.md
2. Use lightweight loop_handoff format
3. Coordinate PM → Dev → QA → User flow
4. Handle loop iterations (max 3)
5. Mark loop complete when user accepts

### Exiting Loop Mode

When all features complete:
1. Transition to full testing (G6)
2. Proceed with standard gate flow

See `constants/reference/FEATURE_LOOP_PROTOCOL.md` for full details.
```

##### A.3: Update STATUS.md Template

Add to `templates/docs/STATUS.md`:

```markdown
## Feature Loops

### Configuration
- **Mode:** [Traditional | Feature Loops]
- **Strategy:** [Sequential | Parallel]
- **Max Iterations:** 3

### Active Loop
| Story | Phase | Agent | Started | Iteration |
|-------|-------|-------|---------|-----------|
| — | — | — | — | — |

### Loop Queue
1. [Story ID]: [Story title]
2. [Story ID]: [Story title]

### Completed Loops
| Story | Duration | Iterations | Result |
|-------|----------|------------|--------|
| — | — | — | — |
```

##### A.4: Create Loop Handoff Schema
**File:** `schemas/loop-handoff.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Feature Loop Handoff",
  "description": "Lightweight handoff for within-loop transitions",
  "type": "object",
  "required": ["loop_handoff", "deliverables"],
  "properties": {
    "loop_handoff": {
      "type": "object",
      "required": ["story_id", "from_agent", "to_agent", "phase", "timestamp", "iteration"],
      "properties": {
        "story_id": {
          "type": "string",
          "pattern": "^US-[0-9]{3}$"
        },
        "from_agent": { "type": "string" },
        "to_agent": { "type": "string" },
        "phase": {
          "type": "string",
          "enum": ["REFINE → BUILD", "BUILD → TEST", "TEST → ACCEPT", "TEST → BUILD", "ACCEPT → BUILD", "ACCEPT → COMPLETE"]
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "iteration": {
          "type": "integer",
          "minimum": 1,
          "maximum": 3
        }
      }
    },
    "deliverables": {
      "type": "object",
      "properties": {
        "files_changed": {
          "type": "array",
          "items": { "type": "string" }
        },
        "tests_added": { "type": "integer" }
      }
    },
    "verification": {
      "type": "object",
      "properties": {
        "build": { "type": "string" },
        "tests": { "type": "string" },
        "coverage": { "type": "string" }
      }
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          }
        }
      }
    },
    "notes": { "type": "string" }
  }
}
```

#### Success Criteria
- [ ] FEATURE_LOOP_PROTOCOL.md created
- [ ] Orchestrator updated with loop mode
- [ ] STATUS.md template updated with loop tracking
- [ ] Loop handoff schema created
- [ ] Example loop session documented

---

## Phase 3: Future Improvements (P3)

### C. Semantic Memory (RAG)

**Goal:** Replace document-based memory with semantic search.

#### Current State
- `SYSTEM_MEMORY.md` is 359 lines
- Read entirely at project start
- No semantic search capability
- Will scale poorly past ~1000 lines

#### Deferral Rationale

Current memory size is manageable. Implementing RAG requires:
- Vector database infrastructure (Pinecone, Weaviate, or local)
- Embedding pipeline
- Query interface
- Significant complexity increase

#### Trigger for Implementation

Implement when:
- `SYSTEM_MEMORY.md` exceeds 1000 lines
- Or 20+ projects completed
- Or user explicitly requests

#### High-Level Plan (For Future)

1. **Choose Vector DB:** Pinecone (cloud) or Chroma (local)
2. **Create Embedding Pipeline:**
   - Parse SYSTEM_MEMORY.md sections
   - Generate embeddings (OpenAI or local)
   - Store with metadata (project, date, type)
3. **Implement Query Interface:**
   - Orchestrator queries: "Recent failures in React auth"
   - Return top-k relevant chunks
   - Inject into agent context
4. **Hybrid Approach:**
   - Keep SYSTEM_MEMORY.md as source of truth
   - RAG as query layer on top
   - Sync on each memory update

---

## Implementation Checklist

### Phase 1 (P1) - Foundation Reliability

#### E: JSON-Schema Enforcement
- [ ] Create `scripts/validate-handoff.sh`
- [ ] Create `scripts/lib/validate-handoff.js`
- [ ] Create `schemas/examples/valid-handoff.json`
- [ ] Update `constants/protocols/PROTOCOLS.md` with validation section
- [ ] Update `agents/orchestrator.md` with validation step
- [ ] Create `package.json` with ajv dependencies
- [ ] Test validation with valid and invalid handoffs

#### B: Verification Proxies
- [ ] Create `constants/protocols/VERIFICATION_PROTOCOL.md`
- [ ] Update `agents/frontend-developer.md` with verification loop
- [ ] Update `agents/backend-developer.md` with verification loop
- [ ] Update `scripts/validate-project.sh` with verification checks
- [ ] Create E2E test template
- [ ] Create health check endpoint template

### Phase 2 (P2) - Efficiency Improvements

#### D: Model Routing
- [ ] Create `constants/reference/MODEL_TIERS.md`
- [ ] Update `agents/orchestrator.md` with tier selection
- [ ] Update `schemas/handoff.schema.json` with model_tier field
- [ ] Document task complexity scoring

#### A: Agile Loops
- [ ] Create `constants/reference/FEATURE_LOOP_PROTOCOL.md`
- [ ] Update `agents/orchestrator.md` with loop mode
- [ ] Update `templates/docs/STATUS.md` with loop tracking
- [ ] Create `schemas/loop-handoff.schema.json`
- [ ] Document example loop session

### Phase 3 (P3) - Future

#### C: Semantic Memory (RAG)
- [ ] Monitor SYSTEM_MEMORY.md size
- [ ] Plan infrastructure when threshold reached
- [ ] Document architecture decision

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Schema enforcement too strict | Start with warnings, graduate to rejections |
| Model routing adds complexity | Default to Tier 2, explicit override only |
| Feature loops don't fit all projects | Make it optional, default to traditional |
| Verification slows development | Parallelize where possible, cache results |

---

## Success Metrics

After implementation:

| Metric | Before | Target |
|--------|--------|--------|
| Invalid handoff rate | Unknown | <5% |
| Build failures at handoff | ~20% | <5% |
| Model cost | Baseline | -30% |
| Feature completion time | N/A | Track per loop |

---

## Next Steps

1. **User Review:** Approve this plan
2. **Phase 1 Start:** Implement E and B in parallel
3. **Phase 1 Validation:** Test on sample project
4. **Phase 2 Start:** Implement D and A
5. **Retrospective:** Document learnings in SYSTEM_MEMORY.md
