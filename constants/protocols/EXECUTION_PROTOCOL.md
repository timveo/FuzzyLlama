# Execution Protocol

**CRITICAL: This protocol ensures agents WRITE ACTUAL CODE, not just documentation.**
**CRITICAL: Agents must use SELF-HEALING to fix errors internally before handoff.**
**CRITICAL: Agents must COMMUNICATE PROGRESS throughout execution - never go silent.**

> **Related:** [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) - Autonomic error recovery
> **Related:** [VERIFICATION_PROTOCOL.md](./VERIFICATION_PROTOCOL.md) - Real-time verification
> **Related:** [PROGRESS_COMMUNICATION_PROTOCOL.md](./PROGRESS_COMMUNICATION_PROTOCOL.md) - User visibility requirements

---

## Core Principles

> **Every agent activation MUST result in executable files being created in the project repository.**
> Documentation alone is NOT a valid deliverable for development agents.

> **Every agent MUST run verification commands and fix errors INTERNALLY (self-healing loop).**
> The user only sees the final successful result OR escalation after 3 failed internal attempts.

> **Every agent MUST communicate progress continuously - NEVER go silent for more than 30 seconds.**
> Users must have visibility into what's happening at all times. See [PROGRESS_COMMUNICATION_PROTOCOL.md](./PROGRESS_COMMUNICATION_PROTOCOL.md).

---

## Mandatory Actions by Phase

### Phase: Development (Frontend Developer)

**BEFORE handoff is allowed, the following files MUST EXIST:**

```
[project]/
├── package.json                    # REQUIRED - with all dependencies + verify script
├── tsconfig.json                   # REQUIRED - TypeScript config
├── vite.config.ts                  # REQUIRED - Build config (with Vitest)
├── postcss.config.js               # REQUIRED - PostCSS config (Tailwind v4)
├── tailwind.config.js              # REQUIRED - Tailwind config
├── .env.example                    # REQUIRED - Environment template
├── src/
│   ├── main.tsx                    # REQUIRED - Entry point
│   ├── App.tsx                     # REQUIRED - Root component
│   ├── index.css                   # REQUIRED - @import "tailwindcss" (v4 syntax)
│   ├── test/
│   │   └── setup.ts                # REQUIRED - Test setup with jest-dom
│   ├── components/
│   │   └── [ComponentName].tsx     # REQUIRED - Feature components
│   ├── contexts/                   # Optional - React contexts
│   ├── hooks/                      # Optional - Custom hooks
│   ├── services/
│   │   └── [name].ts               # REQUIRED - Business logic / API
│   ├── types/
│   │   └── index.ts                # REQUIRED - Shared types
│   └── utils/
│       └── [name].ts               # REQUIRED - Helper functions
└── src/**/*.test.ts                # REQUIRED - At least 5 test files
```

### 2025 Configuration Requirements

**vite.config.ts MUST include:**
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**postcss.config.js MUST use Tailwind v4:**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // NOT 'tailwindcss'
    autoprefixer: {},
  },
}
```

**src/index.css MUST use:**
```css
@import "tailwindcss";  /* NOT @tailwind directives */
```

**All type imports MUST use:**
```typescript
import type { User, Product } from '../types';  // NOT import { User }
```

**Orchestrator MUST verify these files exist before accepting handoff.**

---

### Phase: Development (Backend Developer)

**BEFORE handoff is allowed, the following files MUST EXIST:**

```
[project]/backend/
├── package.json                    # REQUIRED
├── tsconfig.json                   # REQUIRED
├── .env.example                    # REQUIRED
├── prisma/
│   └── schema.prisma               # REQUIRED - Complete schema
├── src/
│   ├── server.ts                   # REQUIRED - Entry point
│   ├── app.ts                      # REQUIRED - Express setup
│   ├── config/
│   │   ├── database.ts             # REQUIRED
│   │   └── env.ts                  # REQUIRED
│   ├── middleware/
│   │   ├── auth.ts                 # REQUIRED
│   │   ├── errorHandler.ts         # REQUIRED
│   │   └── validate.ts             # REQUIRED
│   ├── routes/
│   │   └── index.ts                # REQUIRED - All routes
│   ├── controllers/                # REQUIRED - One per resource
│   ├── services/                   # REQUIRED - Business logic
│   └── types/
│       └── index.ts                # REQUIRED
└── tests/
    └── setup.ts                    # REQUIRED
```

---

### Phase: ML Development (ML Engineer)

**BEFORE handoff is allowed, the following files MUST EXIST:**

```
[project]/
├── src/
│   └── services/
│       └── ai/
│           ├── client.ts           # REQUIRED - AI provider client
│           ├── prompts.ts          # REQUIRED - Prompt templates
│           ├── types.ts            # REQUIRED - AI-related types
│           └── index.ts            # REQUIRED - Exports
└── .env.example                    # REQUIRED - Must include AI API keys
```

---

## Agent Execution Instructions

### For ALL Development Agents

When activated, you MUST:

1. **CREATE FILES, NOT DESCRIPTIONS**
   - ❌ Wrong: "The frontend should have a Button component"
   - ✅ Right: Write the actual `src/components/ui/Button.tsx` file

2. **USE WRITE/EDIT TOOLS**
   - Every code block in your response should be preceded by a Write or Edit tool call
   - Do not show code without writing it to a file

3. **FOLLOW THE FILE CHECKLIST**
   - Before handoff, verify every REQUIRED file exists
   - Run `ls -la` or equivalent to confirm

4. **COMMUNICATE PROGRESS**

   Announce what you're doing as you do it. See [PROGRESS_COMMUNICATION_PROTOCOL.md](./PROGRESS_COMMUNICATION_PROTOCOL.md).

5. **RUN VERIFICATION WITH SELF-HEALING**

   **CRITICAL:** Run verification commands AUTOMATICALLY after writing code. If errors occur, fix them INTERNALLY (up to 3 attempts) before presenting results to user.

   ```bash
   # Self-Healing Verification Loop
   npm install          # Install dependencies
   npm run typecheck && npm run lint && npm run build && npm test
   ```

   **If verification fails:**
   1. Parse the error message
   2. Classify the error type (type_error, import_error, etc.)
   3. Analyze root cause and plan fix
   4. Apply targeted fix
   5. Re-run verification
   6. Repeat up to 3 times, then escalate to user

   **The user NEVER sees internal failures. They only see:**
   - Final successful verification, OR
   - Escalation message after 3 failed attempts

   **package.json MUST include a verify script:**
   ```json
   {
     "scripts": {
       "verify": "npm run typecheck && npm run lint && npm run build && npm test"
     }
   }
   ```

   See [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) for complete details.

6. **REPORT ACTUAL FILE COUNTS AND HEALING STATUS**
   - In handoff JSON, report real counts from `find` commands
   - Include `verification.self_healing_applied` boolean
   - Include `verification.self_healing_log` if fixes were needed
   - Do not estimate or guess

---

## Orchestrator Enforcement

### Before Accepting Any Development Handoff

The Orchestrator MUST run these validation checks:

```bash
# 1. Verify package.json exists and has dependencies
cat [project]/package.json | grep -c "dependencies"

# 2. Count actual source files
find [project]/src -name "*.ts" -o -name "*.tsx" | wc -l

# 3. Count actual test files
find [project]/tests -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# 4. Verify build succeeds
cd [project] && npm run build

# 5. Verify tests pass
cd [project] && npm run test
```

### Rejection Criteria

**REJECT the handoff if:**
- Source file count < 10 for frontend
- Source file count < 8 for backend
- No test files exist
- Build fails
- package.json missing dependencies

### On Rejection

Send agent back with specific instructions:
```
HANDOFF REJECTED: Missing required files

Files missing:
- src/components/ui/Button.tsx
- src/hooks/useAuth.ts
- tests/components/Button.test.tsx

Action required: Create all missing files before re-submitting handoff.
```

---

## Build Failure Escalation Protocol (Self-Healing Integration)

**CRITICAL:** Agents use the self-healing loop to fix errors INTERNALLY. The user NEVER sees failures during the self-healing loop - they only see the final result.

See [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) for the complete self-healing workflow.

### Self-Healing Loop (User Does NOT See This)

```
Write Code → Run Verification → Check Output
                    ↓
              ┌─────┴─────┐
              ▼           ▼
           ERRORS      SUCCESS
             ↓             ↓
         Fix Issue    Proceed to Handoff
         (Attempt < 3?)
             ↓
         YES → Loop back (internally)
         NO → Escalate to human
```

### Escalation Thresholds (After Self-Healing Exhausted)

| Failure Type | Max Internal Attempts | Then Escalate To |
|--------------|----------------------|------------------|
| `npm run typecheck` | 3 | User with options |
| `npm run lint` | 3 | User with options |
| `npm run build` | 3 | User with options |
| `npm test` | 3 | User with options |
| `npm run verify` | 3 | User with options |

### Internal Self-Healing Protocol (Hidden from User)

```
FAILURE DETECTED
    │
    ▼
Step 1: CLASSIFY ERROR
    │
    ├── type_error → Fix type annotations
    ├── import_error → Fix import paths, install deps
    ├── syntax_error → Fix syntax
    ├── lint_error → Apply lint fixes
    ├── test_failure → Fix logic or test
    ├── build_error → Parse and fix source
    │
    ▼
Step 2: REFLECT (internal, not shown to user)
    │
    ├── Read full error message
    ├── Identify root cause
    ├── Plan targeted fix
    │
    ▼
Step 3: FIX & RE-VERIFY
    │
    ├── Apply minimal fix
    ├── Re-run verification
    ├── Track attempt in self_healing_log
    │
    ▼
Step 4: REPEAT OR ESCALATE
    │
    ├── Attempt < 3? → Loop back to Step 1
    └── Attempt = 3? → Escalate to user
```

### Escalation Message Format (Self-Healing Escalation)

When self-healing exhausts 3 internal attempts, present to user:

```markdown
## SELF-HEALING ESCALATION

**Agent:** [Agent Name]
**Phase:** [Current Phase/Gate]
**Attempts:** 3 of 3 exhausted

### Error Summary
[Concise description of the persistent issue]

### Attempt History
| # | Error Type | Fix Tried | Result |
|---|-----------|-----------|--------|
| 1 | [type] | [fix description] | [outcome] |
| 2 | [type] | [fix description] | [outcome] |
| 3 | [type] | [fix description] | [outcome] |

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

**DECISION:** ___
```

### Logging Failed Builds

All build failures MUST be logged in `docs/DECISIONS.md`:

```markdown
## BUILD-FAIL-XXX: [Description]

**Date:** YYYY-MM-DD
**Gate:** G5.X
**Agent:** [Agent Name]
**Command:** [npm command]
**Attempts:** [X]

### Error
[Error description]

### Resolution
- **Option Chosen:** [A/B/C/D]
- **Outcome:** [What happened]
- **User Response:** "[Verbatim response]"
```

### Timeout Handling

If a command hangs beyond timeout:

1. **Kill the process** (do not wait indefinitely)
2. **Log the timeout** in DECISIONS.md
3. **Escalate to user** with message:

```markdown
## ⏱️ COMMAND TIMEOUT

**Command:** npm run build
**Timeout:** 10 minutes exceeded
**Likely Causes:**
- Infinite loop in code
- Network issue during dependency fetch
- Memory exhaustion

**Recommendation:** Check system resources, review recent code changes.
```

### Never Do

- ❌ Retry more than threshold without user approval
- ❌ Silently skip failed checks
- ❌ Continue to next gate with failing build
- ❌ Wait indefinitely for hung commands
- ❌ Make up success status when commands fail

---

## Quality Gate: Code Verification

### Gate 4 (Development → Testing) Additional Checks

Before transitioning to testing phase:

```bash
# Minimum file counts
FRONTEND_FILES=$(find frontend/src -name "*.tsx" | wc -l)
BACKEND_FILES=$(find backend/src -name "*.ts" | wc -l)
TEST_FILES=$(find . -name "*.test.ts" -o -name "*.test.tsx" | wc -l)

# Thresholds
[ $FRONTEND_FILES -lt 15 ] && echo "FAIL: Insufficient frontend files"
[ $BACKEND_FILES -lt 10 ] && echo "FAIL: Insufficient backend files"
[ $TEST_FILES -lt 5 ] && echo "FAIL: Insufficient test files"

# Build verification
cd frontend && npm run build || echo "FAIL: Frontend build failed"
cd backend && npm run build || echo "FAIL: Backend build failed"
```

---

## Starter Template Execution

When user requests a starter template (e.g., "ai-chatbot"):

### Step 1: Create ALL Files Immediately

Do not ask questions. Create the full scaffold:

```bash
# Create directory structure
mkdir -p src/{components,pages,hooks,services,stores,types}
mkdir -p tests

# Create every required file with working code
```

### Step 2: Write Working Code

Each file must contain **complete, working code** - not placeholders:

```typescript
// ❌ WRONG - Placeholder
export function Button() {
  // TODO: implement
}

// ✅ RIGHT - Working code
export function Button({
  children,
  variant = 'primary',
  onClick
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }))}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Step 3: Verify Execution

After creating starter:
```bash
npm install
npm run dev  # Must start without errors
```

---

## Example: Correct Agent Behavior

### Frontend Developer Activation

```markdown
## 🟢 ACTIVATING AGENT: Frontend Developer

**Project:** my-chatbot
**Project Path:** ~/projects/my-chatbot
**Phase:** development

### EXECUTION SEQUENCE

1. Create package.json with all dependencies
2. Create configuration files (tsconfig, vite, tailwind)
3. Create src/main.tsx entry point
4. Create src/App.tsx with routing
5. Create all components from PRD
6. Create all pages from PRD
7. Create hooks and services
8. Create tests for components
9. Run build to verify
10. Run tests to verify

### FILES I WILL CREATE

[List every file before starting]

### STARTING EXECUTION...
```

Then the agent WRITES each file using the Write tool.

---

## Handoff Validation Template

```json
{
  "handoff": {
    "agent": "Frontend Developer",
    "status": "complete",
    "gate": "G5.3",
    "timestamp": "2024-12-18T10:30:00Z"
  },
  "project_context": {
    "teaching_level": "NOVICE | INTERMEDIATE | EXPERT",
    "project_type": "NEW_PROJECT | AI_GENERATED | EXISTING | ENHANCEMENT",
    "project_path": "/path/to/project"
  },
  "file_verification": {
    "command_run": "find src -name '*.tsx' | wc -l",
    "source_files_created": 23,
    "test_files_created": 12,
    "build_status": "passing",
    "test_status": "passing"
  },
  "files_created": [
    "package.json",
    "tsconfig.json",
    "src/main.tsx",
    "src/App.tsx",
    "src/components/ui/Button.tsx",
    "... (full list)"
  ],
  "next_agent": "QA Engineer | Backend Developer | etc.",
  "next_action": "description of what next agent should do"
}
```

### Required Context Fields

| Field | Purpose | Set By |
|-------|---------|--------|
| `teaching_level` | Adjust communication style | Q3 intake → INTAKE.md |
| `project_type` | Determine workflow branch | Q2 intake → INTAKE.md |
| `project_path` | Locate project files | Orchestrator |

**CRITICAL:** All agents MUST read `teaching_level` from handoff and adjust explanations accordingly:
- `NOVICE`: Explain all decisions, define jargon, provide context
- `INTERMEDIATE`: Explain key decisions, offer alternatives
- `EXPERT`: Be concise, focus on trade-offs only

---

## Summary

| Before | After |
|--------|-------|
| Agent describes what code should look like | Agent WRITES the actual code files |
| Handoff lists planned components | Handoff lists CREATED files with paths |
| Quality gate checks documentation | Quality gate runs `npm run build` |
| "Complete" means planning done | "Complete" means code compiles and runs |

**The code must exist in the filesystem, not just in the conversation.**

---

## Definition of Done (DoD)

**CRITICAL: A task is NOT "done" until ALL criteria in the relevant checklist are met.**

### Feature/Component Definition of Done

Before marking any feature or component as complete, verify ALL items:

#### Code Quality
- [ ] Code compiles without errors (`npm run build` passes)
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] No `console.log` statements (use proper logging if needed)
- [ ] No `TODO` or `FIXME` comments left unaddressed
- [ ] No commented-out code blocks
- [ ] No hardcoded values that should be configurable

#### Functionality
- [ ] Feature works as specified in PRD
- [ ] All acceptance criteria from user story are met
- [ ] Happy path tested manually
- [ ] Error states handled gracefully
- [ ] Edge cases identified and handled:
  - [ ] Empty states (no data)
  - [ ] Loading states
  - [ ] Error states
  - [ ] Boundary values (min/max)
  - [ ] Invalid input handling

#### Testing
- [ ] Unit tests written for new code
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] All tests pass (`npm test`)
- [ ] Test coverage meets threshold (≥80%)

#### UI/UX (if applicable)
- [ ] Matches approved design/wireframes
- [ ] Responsive across breakpoints (mobile, tablet, desktop)
- [ ] Loading indicators present
- [ ] Error messages user-friendly
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA (4.5:1)

#### Performance
- [ ] No obvious performance regressions
- [ ] No unnecessary re-renders (React)
- [ ] Images optimized
- [ ] No blocking resources

#### Security
- [ ] No sensitive data exposed in logs
- [ ] Input validation in place
- [ ] XSS prevention (output encoding)
- [ ] No SQL injection vectors (if applicable)

---

### Gate-Specific Definition of Done

#### G5.1 Foundation - DoD

```markdown
## G5.1 Foundation Complete Checklist

### Files Must Exist
- [ ] package.json (with dependencies, scripts, verify command)
- [ ] tsconfig.json (strict mode enabled)
- [ ] vite.config.ts (with Vitest configuration)
- [ ] postcss.config.js (Tailwind v4)
- [ ] tailwind.config.js
- [ ] .env.example
- [ ] src/main.tsx
- [ ] src/App.tsx
- [ ] src/index.css (@import "tailwindcss")
- [ ] src/test/setup.ts
- [ ] src/types/index.ts

### Validation Commands Must Pass
- [ ] npm install (no errors)
- [ ] npm run build (compiles)
- [ ] npm run lint (no errors)

### Configuration Verified
- [ ] TypeScript strict mode enabled
- [ ] Path aliases configured (@/)
- [ ] Test environment set to jsdom
- [ ] Tailwind v4 syntax used
```

#### G5.2 Data Layer - DoD

```markdown
## G5.2 Data Layer Complete Checklist

### Files Must Exist
- [ ] src/services/*.ts (at least 1 service)
- [ ] src/hooks/*.ts (if React state management)
- [ ] src/types/index.ts (data types defined)
- [ ] Mock data files (for development)

### Functionality Verified
- [ ] API service functions defined
- [ ] Error handling in services
- [ ] Type safety for all data
- [ ] State management configured (if needed)

### Validation Commands Must Pass
- [ ] npm run build
- [ ] npm test (service tests pass)
```

#### G5.3 Components - DoD (Per Component)

```markdown
## Component Complete Checklist: [ComponentName]

### Files Must Exist
- [ ] src/components/[ComponentName].tsx
- [ ] src/components/[ComponentName].test.tsx

### Component Quality
- [ ] Props typed with TypeScript interface
- [ ] Default props where appropriate
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Accessible (aria labels, keyboard nav)

### Visual Quality
- [ ] Matches design specification
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Focus states visible
- [ ] Hover states appropriate

### Test Coverage
- [ ] Renders without crashing
- [ ] Props affect output correctly
- [ ] User interactions work
- [ ] Edge cases covered
```

#### G5.4 Integration - DoD

```markdown
## G5.4 Integration Complete Checklist

### Files Must Exist
- [ ] src/App.tsx (routes configured)
- [ ] src/pages/*.tsx (if using pages)

### Integration Verified
- [ ] All components connected
- [ ] Data flows correctly between components
- [ ] Navigation works
- [ ] Error boundaries in place
- [ ] Loading states coordinated

### Demo Requirements
- [ ] Dev server starts without errors
- [ ] Main user flow works end-to-end
- [ ] All routes accessible
- [ ] No console errors in browser
```

#### G5.5 Polish - DoD

```markdown
## G5.5 Polish Complete Checklist

### Visual Polish
- [ ] Consistent spacing
- [ ] Consistent typography
- [ ] Smooth transitions/animations
- [ ] No layout shifts

### Responsive Design
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)
- [ ] Desktop (1024px+)

### Accessibility
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible
- [ ] Color contrast verified
- [ ] Focus management correct

### Performance
- [ ] Lighthouse score ≥ 90
- [ ] No memory leaks
- [ ] Images lazy loaded
- [ ] Code split appropriately

### Final Verification
- [ ] npm run build (production build)
- [ ] npm test (all tests pass)
- [ ] npm run lint (no errors)
- [ ] Manual testing complete
```

#### G6 Testing - DoD

```markdown
## G6 Testing Complete Checklist

### Coverage Requirements
- [ ] Overall coverage ≥ 80%
- [ ] Critical paths 100% covered
- [ ] All services tested
- [ ] All components tested

### Test Types
- [ ] Unit tests complete
- [ ] Integration tests complete
- [ ] E2E tests for critical paths (if required)

### Quality Gates
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Test execution time reasonable (<5 min)

### Reports Generated
- [ ] Coverage report (coverage/lcov-report/index.html)
- [ ] Test results summary
```

#### G7 Security - DoD

```markdown
## G7 Security Complete Checklist

### Vulnerability Scan
- [ ] npm audit: 0 critical
- [ ] npm audit: 0 high
- [ ] Dependencies up to date

### Code Security
- [ ] No hardcoded secrets
- [ ] Input validation on all user inputs
- [ ] Output encoding for XSS prevention
- [ ] CSRF protection (if applicable)

### Auth Security (if applicable)
- [ ] Passwords hashed (bcrypt, 12+ rounds)
- [ ] Tokens stored securely (httpOnly cookies)
- [ ] Session management secure
- [ ] Rate limiting implemented

### Data Security
- [ ] Sensitive data not logged
- [ ] PII handling compliant
- [ ] Error messages don't leak internals

### Documentation
- [ ] THREAT_MODEL.md complete
- [ ] Security decisions logged
```

#### G8 Pre-Deploy - DoD

```markdown
## G8 Pre-Deploy Complete Checklist

### Deployment Config
- [ ] Environment variables documented
- [ ] .env.example complete
- [ ] Deployment scripts ready
- [ ] CI/CD pipeline configured

### Production Readiness
- [ ] Production build works
- [ ] Environment-specific configs ready
- [ ] Monitoring configured
- [ ] Logging configured

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Previous version tagged/saved
- [ ] Database rollback plan (if applicable)

### Final Checks
- [ ] All previous gates approved
- [ ] No outstanding blockers
- [ ] User gave GO decision
```

---

## DoD Enforcement

### Orchestrator Must Verify

Before accepting any handoff:

1. **Run automated checks:**
   ```bash
   npm run build && npm test && npm run lint
   ```

2. **Verify coverage:**
   ```bash
   npm test -- --coverage
   # Check coverage/lcov-report/index.html
   ```

3. **Check file existence:**
   ```bash
   ./scripts/validate-project.sh [path] [gate]
   ```

4. **Request DoD checklist from agent:**
   - Agent must provide filled checklist
   - All items must be checked
   - Any unchecked items must have documented exceptions

### Rejection Response

If DoD not met:

```markdown
## ⛔ HANDOFF REJECTED: Definition of Done Not Met

**Gate:** [gate]
**Agent:** [agent]

### Missing Items
- [ ] [unchecked item 1]
- [ ] [unchecked item 2]

### Failed Checks
- Build: ❌ [error message]
- Tests: ❌ [X of Y failing]
- Coverage: ❌ [actual]% < 80%

### Required Actions
1. [specific action needed]
2. [specific action needed]

Re-submit handoff when all DoD criteria are met.
```

---

## DoD Exceptions

Some DoD items may be waived with user approval:

### Valid Exception Reasons

| Item | Valid Exceptions |
|------|------------------|
| Test coverage < 80% | Auto-generated code, config files |
| E2E tests | MVP/prototype phase |
| Performance score | Known limitation, documented |
| Accessibility AA | User explicitly deprioritized |

### Exception Documentation

```markdown
## DOD-EXCEPTION-XXX

**Date:** YYYY-MM-DD
**Gate:** [gate]
**Item:** [DoD item being waived]
**Reason:** [why exception is valid]
**Approved By:** [User]
**Impact:** [what this means for the project]
**Remediation Plan:** [when/how this will be addressed]
```

All exceptions must be logged in DECISIONS.md.
