# Real-Time Verification Protocol

> **Version:** 1.1.0
> **Last Updated:** 2024-12-18
> **Purpose:** Ensure agents verify their work in real-time before handoff
> **Related:** [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) - Autonomic error recovery

---

## Core Principle

**NO AGENT may claim "complete" status without automated verification.**

**Verification is AUTONOMIC:** Agents automatically run verification, fix errors internally, and only surface failures to humans after exhausting internal remediation (3 attempts). See [Self-Healing Protocol](./SELF_HEALING_PROTOCOL.md) for the full autonomic loop.

Every code-producing agent MUST:
1. Write code
2. **Automatically** run verification commands (build, lint, test, typecheck)
3. If errors: **Internally** parse, reflect, fix, and retry (up to 3 times)
4. Human only sees success OR escalation after 3 failed internal attempts
5. Include verification output (with healing history) in handoff

---

## Verification Loop

```
┌─────────────────────────────────────────────────────────┐
│                     WRITE CODE                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 RUN VERIFICATION                         │
│         npm run build && npm run test                    │
└────────────────────────┬────────────────────────────────┘
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

## Verification Commands by Agent

### Frontend Developer

After EACH component or significant change:

```bash
# 1. Type Check (REQUIRED)
npm run typecheck
# Expected: 0 errors

# 2. Lint Check (REQUIRED)
npm run lint
# Expected: 0 errors, 0 warnings

# 3. Build Check (REQUIRED)
npm run build
# Expected: Build successful

# 4. Unit Tests (REQUIRED)
npm run test
# Expected: All tests pass

# 5. Coverage Check (REQUIRED for handoff)
npm run test -- --coverage
# Expected: Coverage >=80%
```

**Minimum verification before ANY handoff:**
```bash
npm run build && npm run test
```

### Backend Developer

After EACH endpoint or service:

```bash
# 1. Type Check (REQUIRED)
npm run typecheck

# 2. Lint Check (REQUIRED)
npm run lint

# 3. Build Check (REQUIRED)
npm run build

# 4. Unit Tests (REQUIRED)
npm run test

# 5. Database Migration Check (REQUIRED for Prisma/TypeORM projects)
# Verify migrations exist and schema is in sync
npx prisma migrate status  # or equivalent for your ORM

# 6. API Health Check (if server running)
curl -s http://localhost:3000/health | jq .
```

**Minimum verification before ANY handoff:**
```bash
npm run build && npm run test
```

### Database Migration Verification (G5 Exit Criteria)

For projects using Prisma, TypeORM, or other ORMs with migrations:

| Check | Command | Required? |
|-------|---------|-----------|
| Schema defined | File exists: `prisma/schema.prisma` | YES |
| Client generated | `npx prisma generate` exits 0 | YES |
| Initial migration | `prisma/migrations/` directory exists | YES |
| Migration applied | `npx prisma migrate status` shows no pending | YES (dev) |

**G5 Database Checklist:**
```markdown
- [ ] Schema file exists with all models defined
- [ ] Prisma client generated successfully
- [ ] Initial migration created: `npx prisma migrate dev --name init`
- [ ] .env.example includes DATABASE_URL
- [ ] README includes database setup instructions
```

**Migration Status Check:**
```bash
# Check migration status
npx prisma migrate status

# Expected output for healthy state:
# Database schema is up to date!

# If migrations pending:
# 1 migration found in prisma/migrations
# Following migration have not yet been applied: 20231218_init
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

### DevOps Engineer

After infrastructure changes:

```bash
# 1. Validate configuration
npm run validate:config

# 2. Dry-run deployment
npm run deploy:dry-run

# 3. Health checks
curl -s $STAGING_URL/health
```

---

## Self-Correction Protocol (Self-Healing Integration)

> **IMPORTANT:** This section describes the self-healing loop. For complete details, see [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md).

**Key Principle:** The human never sees failures during internal healing. They only see:
- The final successful result, OR
- An escalation after 3 failed internal attempts

When verification fails, the agent MUST:

### Step 1: Read the Error

```
Error: src/components/Dashboard.tsx:45:12
       Type '"string"' is not assignable to type 'number'.
```

### Step 2: Analyze the Cause

```markdown
**Error Analysis:**
- File: src/components/Dashboard.tsx
- Line: 45, Column: 12
- Issue: Passing a string where a number is expected
- Root Cause: JSX prop `count="5"` should be `count={5}`
```

### Step 3: Fix the Issue

```typescript
// Before (wrong)
<Counter count="5" />

// After (correct)
<Counter count={5} />
```

### Step 4: Re-run Verification

```bash
npm run build
# Expected: Build successful
```

### Step 5: Track Attempts Internally

The agent tracks all attempts in an internal log. This is NOT shown to the user unless escalation is required:

```json
{
  "self_healing_log": {
    "attempts": [
      {
        "attempt": 1,
        "command": "npm run build",
        "exit_code": 1,
        "error_type": "type_error",
        "error": "Type '\"string\"' is not assignable to type 'number'",
        "reflection": "Props type expects number but string literal passed",
        "fix_applied": "Changed count=\"5\" to count={5}",
        "timestamp": "2024-12-18T14:25:00Z"
      },
      {
        "attempt": 2,
        "command": "npm run build",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:26:00Z"
      }
    ],
    "final_status": "success",
    "total_attempts": 2
  }
}
```

### Step 6: Document Final Status in Handoff

Only the final successful state (or escalation) is shown to the user:

```json
{
  "verification": {
    "self_healing_applied": true,
    "total_internal_attempts": 2,
    "final_verification": {
      "commands_executed": [
        {"command": "npm run build", "exit_code": 0, "timestamp": "..."}
      ],
      "all_passed": true
    },
    "healing_summary": {
      "errors_fixed": 1,
      "error_types": ["type_error"]
    }
  }
}
```

---

## Verification Output in Handoff

The `verification` field in handoff JSON MUST include:

```json
{
  "verification": {
    "build_output": "<actual npm run build output>",
    "test_output": "<actual npm run test output>",
    "lint_output": "<actual npm run lint output - if run>",
    "commands_executed": [
      {
        "command": "npm run typecheck",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:25:00Z",
        "duration_ms": 1500
      },
      {
        "command": "npm run build",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:25:30Z",
        "duration_ms": 2300
      },
      {
        "command": "npm run test -- --coverage",
        "exit_code": 0,
        "timestamp": "2024-12-18T14:26:00Z",
        "duration_ms": 4500
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

| Condition | Rejection Message |
|-----------|-------------------|
| `verification` missing | "No verification section in handoff" |
| `commands_executed` empty | "No verification commands were run" |
| Build command missing | "Build verification required" |
| Build exit_code > 0 | "Build failed - must pass before handoff" |
| Test command missing (for complete status) | "Test verification required for complete status" |
| Test exit_code > 0 | "Tests failing - must pass before handoff" |
| Coverage < 80% (for complete status) | "Coverage below 80% threshold" |
| `build_output` is empty/placeholder | "Actual build output required" |
| **Agent mismatch** | "Handoff from wrong agent" |

---

## Agent Validation (MANDATORY)

Before accepting ANY handoff, verify the submitting agent matches expected agent.

### Validation Check

```
HANDOFF RECEIVED
    │
    ▼
Step 1: READ STATUS.md
    │
    ├── Extract: current_agent from Active Agent field
    │
    ▼
Step 2: COMPARE AGENTS
    │
    ├── handoff.agent == STATUS.current_agent?
    │   ├── YES → Proceed with other validations
    │   └── NO → REJECT immediately
    │
    ▼
Step 3: IF REJECTED
    │
    └── Log warning:
        "AGENT MISMATCH: Received handoff from [handoff.agent]
         but STATUS.md shows current_agent = [STATUS.current_agent]

         Possible causes:
         - Parallel agent submitted out of turn
         - STATUS.md out of sync
         - Wrong agent activated

         Action: Verify correct agent and retry"
```

### Agent Validation in validate-handoff-integrity.sh

The script `scripts/validate-handoff-integrity.sh` includes agent validation:

```bash
# Validates handoff.agent matches STATUS.md current_agent
validate_agent_matches_status "$PROJECT_PATH" "$HANDOFF_FILE"
```

### Why This Matters

Without agent validation:
- Parallel agent could submit handoff for wrong phase
- Fraud: Agent could claim to be different agent
- Confusion: Next agent receives wrong context
- State corruption: STATUS.md and reality diverge

---

## Common Errors and Fixes

### TypeScript Errors

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `Cannot find module` | Wrong import path | Check file path, add `.js` extension if needed |
| `Type X is not assignable to type Y` | Type mismatch | Fix the type or cast appropriately |
| `Property does not exist` | Missing property | Add to interface or check spelling |
| `Could not find declaration file` | Missing types | Install `@types/package` |

### Build Errors

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `Module not found` | Missing dependency | Run `npm install package` |
| `Unexpected token` | Syntax error | Check for typos, missing brackets |
| `Cannot use import outside module` | ESM/CJS mismatch | Check package.json `"type"` field |

### Test Errors

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `Expected X but received Y` | Assertion failure | Fix code or update test |
| `Cannot find module` in test | Mock not set up | Add mock or stub |
| `Timeout` | Async not handled | Add `await` or increase timeout |

---

## Integration with Development Sub-Gates

| Sub-Gate | Verification Required |
|----------|----------------------|
| G5.1 Foundation | `npm run build` passes |
| G5.2 Data Layer | Build + API/service tests pass |
| G5.3 Components | Build + component unit tests pass |
| G5.4 Integration | Build + integration tests pass |
| G5.5 Polish | Build + all tests + lint + coverage >=80% + **bundle size** |

---

## Bundle Size Validation (G5.5)

**APPLIES TO: Frontend/Fullstack projects ONLY**

> For backend-only APIs, skip this section. Backend size metrics are Docker image size (see below).

Bundle size directly impacts user experience. Large bundles = slow load times.

### Bundle Size Thresholds

| Project Type | Max Bundle (gzipped) | Warning At |
|--------------|---------------------|------------|
| **MVP/Landing** | 100 KB | 75 KB |
| **Standard App** | 250 KB | 200 KB |
| **Complex App** | 500 KB | 400 KB |
| **Enterprise** | 1 MB | 750 KB |

### Bundle Analysis Commands

```bash
# 1. Build and analyze
npm run build

# 2. Check bundle size (Vite)
npx vite-bundle-visualizer
# Creates stats.html with bundle breakdown

# 3. Quick size check
du -sh dist/assets/*.js | sort -h

# 4. Gzipped size (more accurate)
gzip -c dist/assets/index-*.js | wc -c
# Divide by 1024 for KB
```

### G5.5 Bundle Size Check

```
At G5.5 Polish Gate:
    │
    ▼
Run: npm run build
    │
    ▼
Calculate gzipped bundle size
    │
    ├── Size <= threshold?
    │   ├── YES → ✅ Proceed
    │   └── NO → ⚠️ WARNING
    │           │
    │           ▼
    │       Size <= threshold + 50%?
    │           ├── YES → Proceed with documented plan
    │           └── NO → BLOCK: Must optimize
```

### Bundle Size Blocking Criteria

| Condition | Action |
|-----------|--------|
| Size <= threshold | ✅ Pass |
| Size <= 1.5x threshold | ⚠️ Warning, document optimization plan |
| Size > 1.5x threshold | ❌ Block, must optimize before proceeding |

### Common Bundle Optimizations

| Issue | Solution | Impact |
|-------|----------|--------|
| Large dependencies | Tree-shake or replace | High |
| Duplicate packages | Dedupe npm packages | Medium |
| Unused code | Remove dead code | Medium |
| Large images in bundle | Move to CDN/public | High |
| No code splitting | Add dynamic imports | High |
| Source maps in prod | Disable in build | Medium |

### Bundle Size Report Template

```markdown
## G5.5 Bundle Size Report

**Project:** [name]
**Build Date:** YYYY-MM-DD

### Bundle Analysis
| Asset | Size (raw) | Size (gzip) | % of Total |
|-------|------------|-------------|------------|
| index.js | 450 KB | 120 KB | 65% |
| vendor.js | 200 KB | 55 KB | 30% |
| styles.css | 25 KB | 8 KB | 5% |
| **Total** | **675 KB** | **183 KB** | 100% |

### Threshold Check
- **Project Type:** Standard App
- **Threshold:** 250 KB gzipped
- **Actual:** 183 KB gzipped
- **Status:** ✅ PASS (73% of limit)

### Largest Dependencies
1. react-dom: 45 KB
2. @tanstack/react-query: 20 KB
3. zustand: 5 KB

### Recommendations
- [Any optimization suggestions]
```

---

## Backend Size Validation (G5.5)

**APPLIES TO: Backend/API projects ONLY**

For backend projects, measure Docker image size instead of bundle size.

### Docker Image Size Thresholds

| Project Type | Max Image Size | Warning At |
|--------------|----------------|------------|
| **Simple API** | 200 MB | 150 MB |
| **Standard API** | 500 MB | 400 MB |
| **Complex API** | 1 GB | 800 MB |

### Image Size Check

```bash
# Build the image
docker build -t myapi:latest .

# Check image size
docker images myapi:latest --format "{{.Size}}"

# Expected: Under threshold for project type
```

### Image Size Optimization

| Issue | Solution | Impact |
|-------|----------|--------|
| Large base image | Use Alpine variants | High |
| Dev dependencies in prod | Multi-stage build | High |
| Unused files copied | Improve .dockerignore | Medium |
| No layer caching | Order Dockerfile correctly | Medium |

### Backend G5.5 Report Template

```markdown
## G5.5 Backend Size Report

**Project:** [name]
**Build Date:** YYYY-MM-DD

### Docker Image Analysis
| Stage | Size |
|-------|------|
| Build stage | 800 MB |
| **Production image** | **180 MB** |

### Threshold Check
- **Project Type:** Standard API
- **Threshold:** 500 MB
- **Actual:** 180 MB
- **Status:** ✅ PASS (36% of limit)

### Base Image
- **Image:** node:20-alpine
- **Size:** 120 MB
```

---

## E2E Verification Requirements

E2E tests are **MANDATORY** for production projects, **OPTIONAL** for MVPs/prototypes.

### E2E Test Thresholds

| Project Type | Min E2E Tests | Required Flows |
|--------------|---------------|----------------|
| **MVP/Prototype** | 0 | None required |
| **Production** | 5+ | Core user journeys |
| **Enterprise** | 10+ | All critical paths |

### Required E2E Coverage for Production

At minimum, E2E tests must cover:

| Flow | Required? | Example |
|------|-----------|---------|
| **Authentication** | YES if auth exists | Login, logout, session persistence |
| **Primary user journey** | YES | Main feature happy path |
| **Data creation** | YES if CRUD | Create, read, update flows |
| **Error handling** | YES | 404 page, form validation errors |
| **Navigation** | YES | All main routes accessible |

### G6 E2E Verification

```bash
# At G6, run E2E tests (if project type is Production+)
npm run test:e2e

# Must pass:
# - All E2E tests green
# - Minimum test count met
# - No flaky tests (run 2x if suspect)
```

### E2E Gate Enforcement

```
At G6 Testing Gate:
    │
    ├── Project Type = MVP/Prototype?
    │   └── E2E tests optional, proceed if unit tests pass
    │
    └── Project Type = Production/Enterprise?
        │
        ├── E2E test count >= threshold?
        │   ├── YES → Run tests, must all pass
        │   └── NO → BLOCK: "Need X more E2E tests for critical flows"
        │
        └── Required flows covered?
            ├── YES → Proceed
            └── NO → BLOCK: "Missing E2E for: [flow]"
```

### E2E Waiver (Exception)

If E2E tests cannot be written (e.g., complex third-party integration):

```markdown
## E2E-WAIVER-XXX: [Reason]

**Date:** YYYY-MM-DD
**Flow:** [Which flow is not E2E tested]
**Reason:** [Why E2E is not possible]
**Mitigation:** [How quality is ensured without E2E]
**User Approval:** "[User's verbatim approval]"
```

For frontend applications, E2E tests provide additional confidence.

### Setup Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Example E2E Test

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

### Run E2E

```bash
npm run test:e2e
# or
npx playwright test
```

---

## Backend Health Check Verification

Every backend MUST implement a health endpoint:

```typescript
// src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      cache: await checkCache(),
      external_apis: await checkExternalAPIs()
    }
  };

  const allHealthy = Object.values(checks.checks).every(c => c === 'ok');

  res.status(allHealthy ? 200 : 503).json(checks);
});

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkCache() {
  // Implement cache check
  return 'ok';
}

async function checkExternalAPIs() {
  // Implement external API checks
  return 'ok';
}

export default router;
```

### Runtime Verification

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
  echo "Health check failed"
  echo "$HEALTH"
  kill $SERVER_PID
  exit 1
fi

echo "Health check passed"
kill $SERVER_PID
```

---

## Verification Checklist Template

Every development handoff should include this verified checklist:

```markdown
### Verification Checklist

**Build & Compile:**
- [ ] `npm run typecheck` - Exit code 0, no type errors
- [ ] `npm run build` - Exit code 0, build successful

**Code Quality:**
- [ ] `npm run lint` - 0 errors, 0 warnings

**Testing:**
- [ ] `npm run test` - All tests passing
- [ ] `npm run test:coverage` - Coverage >=80%

**Runtime (if applicable):**
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] No console errors in browser

**Files Created:**
- [ ] All source files listed in handoff
- [ ] All test files have corresponding source files
- [ ] No temporary/debug files included

**Configuration & Setup:**
- [ ] `.env.example` exists with all required variables documented
- [ ] `.gitignore` includes `.env` and sensitive files
- [ ] `README.md` includes setup instructions (or update existing)
- [ ] README includes: `cp .env.example .env` step

**Database (if applicable):**
- [ ] Schema file exists (`prisma/schema.prisma` or equivalent)
- [ ] Initial migration created
- [ ] `.env.example` includes `DATABASE_URL`
```

---

## Troubleshooting

### "npm run build" hangs

1. Check for infinite loops in code
2. Check for unresolved promises
3. Try with `--verbose` flag
4. Check available memory

### Tests timeout

1. Increase timeout in test config
2. Check for async operations without await
3. Check for unclosed connections/handles

### Coverage not meeting threshold

1. Add tests for untested branches
2. Check for dead code that can be removed
3. Review coverage report for specific gaps

---

## Protocol Compliance

Agents MUST follow this protocol. Non-compliance will result in:

1. **Handoff rejection** by Orchestrator
2. **Retry request** with specific missing verifications
3. **Escalation to user** after 3 failed attempts

**This protocol is enforced by the Handoff Validation Protocol (Section 8 of PROTOCOLS.md).**
