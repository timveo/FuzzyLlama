# Workflow Validation Matrix

> **Purpose:** Master checklist ensuring all workflows are properly enforced at each phase. Use this to validate the framework is complete.

---

## Validation Summary

| Phase | Enforcement Mechanism | DoD Defined | Human Input Required | Teaching Integrated |
|-------|----------------------|-------------|---------------------|---------------------|
| G0 Pre-Startup | ✅ MANDATORY_STARTUP.md | N/A | ✅ Confirmation | N/A |
| G1 Intake | ✅ UNIFIED_ONBOARDING.md | N/A | ✅ 5 Questions | ✅ Q3 sets level |
| G2 PRD | ✅ STATE_DEFINITIONS.md | ✅ Implicit | ✅ Approval gate | ✅ Per level |
| G3 Architecture | ✅ STATE_DEFINITIONS.md | ✅ Implicit | ✅ Approval gate | ✅ Per level |
| G4 Design | ✅ STATE_DEFINITIONS.md | ✅ Implicit | ✅ Approval gate | ✅ Per level |
| G5.1 Foundation | ✅ DEVELOPMENT_CHECKPOINTS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Checkpoint | ✅ Per level |
| G5.2 Data Layer | ✅ DEVELOPMENT_CHECKPOINTS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Checkpoint | ✅ Per level |
| G5.3 Components | ✅ DEVELOPMENT_CHECKPOINTS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Per component | ✅ Per level |
| G5.4 Integration | ✅ DEVELOPMENT_CHECKPOINTS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Checkpoint + Demo | ✅ Per level |
| G5.5 Polish | ✅ DEVELOPMENT_CHECKPOINTS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Checkpoint | ✅ Per level |
| G6 Testing | ✅ STATE_DEFINITIONS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Approval gate | ✅ Per level |
| G7 Security | ✅ STATE_DEFINITIONS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Approval gate | ✅ Per level |
| G8 Pre-Deploy | ✅ STATE_DEFINITIONS.md | ✅ EXECUTION_PROTOCOL.md | ✅ Go/No-Go | ✅ Per level |
| G9 Production | ✅ STATE_DEFINITIONS.md | ✅ Implicit | ✅ Acceptance | ✅ Per level |
| **G10 Completion** | ✅ PROJECT_COMPLETION_REPORT.md | ✅ Explicit | ✅ Acknowledgment | N/A |

---

## Phase-by-Phase Validation

### G0: Pre-Startup

**Enforcement Files:**
- `constants/protocols/MANDATORY_STARTUP.md`

**Required Actions:**
| Action | Where Defined | Enforcement |
|--------|---------------|-------------|
| Display welcome message | MANDATORY_STARTUP Step 1 | Self-check before ANY action |
| Explain process | MANDATORY_STARTUP | ALLOWED_ACTIONS list |

**Blocked Actions:**
- ❌ Ask intake questions
- ❌ Create PRD
- ❌ Write code
- ❌ Any development action

**Transition Condition:**
- User explicitly confirms startup ("yes", "start", "proceed")

---

### G1: Intake

**Enforcement Files:**
- `constants/protocols/UNIFIED_ONBOARDING.md`
- `constants/protocols/MANDATORY_STARTUP.md`

**Required Actions:**
| Action | Where Defined | Enforcement |
|--------|---------------|-------------|
| Ask Q1: What are you building? | UNIFIED_ONBOARDING.md | MANDATORY - cannot skip |
| Ask Q2: Do you have existing code? | UNIFIED_ONBOARDING.md | MANDATORY - cannot skip |
| Ask Q3: Technical background? | UNIFIED_ONBOARDING.md | MANDATORY - sets teaching level |
| Ask Q4: What does "done" look like? | UNIFIED_ONBOARDING.md | MANDATORY - cannot skip |
| Ask Q5: Any constraints? | UNIFIED_ONBOARDING.md | MANDATORY - cannot skip |
| Create docs/INTAKE.md | UNIFIED_ONBOARDING.md | Stores verbatim + interpreted |
| Set teaching level | TEACHING_PROTOCOL.md | From Q3 answer |
| Classify project type | UNIFIED_ONBOARDING.md | From Q2 answer |

**Blocked Actions:**
- ❌ Create PRD
- ❌ Create architecture
- ❌ Write code

**Transition Condition:**
- All 5 questions answered
- INTAKE.md created
- Classification determined

**Human Input Tracking:**
- `docs/INTAKE.md` captures verbatim responses
- Per `constants/HUMAN_INPUT_TRACKING.md`

---

### G2: PRD Creation

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`

**Required Deliverables:**
| Deliverable | Where Defined | Verification |
|-------------|---------------|--------------|
| docs/INTAKE.md | STATE_DEFINITIONS.md | Must exist before G2 |
| docs/PRD.md | APPROVAL_GATES.md | Complete before approval |

**Required Actions:**
| Action | Where Defined | Enforcement |
|--------|---------------|-------------|
| Create PRD | STATE_DEFINITIONS.md | ALLOWED_ACTIONS |
| Present for approval | APPROVAL_GATES.md | G2 format |
| Explain decisions | TEACHING_PROTOCOL.md | Per teaching level |

**Blocked Actions:**
- ❌ Create architecture
- ❌ Write code
- ❌ Create designs

**Approval Gate:**
- Present PRD.md summary
- User stories count
- Scope boundaries
- Options: Approve / Revise / Major Rework

**Transition Condition:**
- User explicitly approves PRD
- Decision logged in DECISIONS.md

---

### G3: Architecture

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`
- `agents/architect.md`

**Required Deliverables:**
| Deliverable | Where Defined | Verification |
|-------------|---------------|--------------|
| docs/PRD.md (approved) | STATE_DEFINITIONS.md | Must exist |
| docs/ARCHITECTURE.md | APPROVAL_GATES.md | Complete before approval |
| docs/TECH_STACK.md | architect.md | Tech decisions documented |
| docs/API.yaml | STATE_DEFINITIONS.md | If API project |
| ADRs | architect.md | Architecture Decision Records |

**Required Actions:**
| Action | Where Defined | Enforcement |
|--------|---------------|-------------|
| Create architecture | STATE_DEFINITIONS.md | ALLOWED_ACTIONS |
| Create system diagrams | STATE_DEFINITIONS.md | ALLOWED_ACTIONS |
| Define API contracts | STATE_DEFINITIONS.md | ALLOWED_ACTIONS |
| Create database schema | STATE_DEFINITIONS.md | ALLOWED_ACTIONS |
| Present for approval | APPROVAL_GATES.md | G3 format |
| Explain tech choices | TEACHING_PROTOCOL.md | Per teaching level |

**Blocked Actions:**
- ❌ Write application code
- ❌ Create UI designs (can happen parallel)
- ❌ Deploy

**Approval Gate:**
- Present ARCHITECTURE.md summary
- Tech stack with rationale
- System diagram
- Key ADRs
- Options: Approve / Revise / Alternative Review

**Transition Condition:**
- User explicitly approves architecture
- Decision logged in DECISIONS.md

---

### G4: Design (if UI project)

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`

**Required Deliverables:**
| Deliverable | Where Defined | Verification |
|-------------|---------------|--------------|
| docs/ARCHITECTURE.md (approved) | STATE_DEFINITIONS.md | Must exist |
| docs/DESIGN.md | APPROVAL_GATES.md | Complete before approval |
| Wireframes/mockups | APPROVAL_GATES.md | Design assets |

**Blocked Actions:**
- ❌ Write application code
- ❌ Deploy

**Approval Gate:**
- Present wireframes/mockups
- User flow diagrams
- Design system overview
- Options: Approve / Revise / User Testing

**Transition Condition:**
- User explicitly approves designs
- Decision logged in DECISIONS.md

---

### G5.1: Foundation

**Enforcement Files:**
- `constants/DEVELOPMENT_CHECKPOINTS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`
- `constants/protocols/STATE_DEFINITIONS.md`

**Required Deliverables:**
| File | Required | Verification |
|------|----------|--------------|
| package.json | ✅ | With dependencies + verify script |
| tsconfig.json | ✅ | TypeScript strict mode |
| vite.config.ts | ✅ | With Vitest config |
| postcss.config.js | ✅ | Tailwind v4 syntax |
| tailwind.config.js | ✅ | Tailwind config |
| .env.example | ✅ | Environment template |
| src/main.tsx | ✅ | Entry point |
| src/App.tsx | ✅ | Root component |
| src/index.css | ✅ | @import "tailwindcss" |
| src/test/setup.ts | ✅ | Test setup |
| src/types/index.ts | ✅ | Type definitions |

**Definition of Done:**
- [ ] All files exist
- [ ] `npm install` succeeds
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] TypeScript strict mode enabled
- [ ] Tailwind v4 syntax used

**Blocked Actions:**
- ❌ Create components
- ❌ Create services
- ❌ Write business logic

**Checkpoint Presentation:**
- List all types/interfaces
- Show folder structure
- Explain configuration decisions
- **MUST show build output**

**Transition Condition:**
- User explicitly approves ("A", "yes", "approve")
- Build verification passes
- Git commit created

---

### G5.2: Data Layer

**Enforcement Files:**
- `constants/DEVELOPMENT_CHECKPOINTS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`

**Required Deliverables:**
| File | Required | Verification |
|------|----------|--------------|
| src/services/*.ts | ✅ | At least 1 service |
| src/hooks/*.ts | If React | State management hooks |
| src/types/index.ts | ✅ | Data types defined |
| Mock data files | ✅ | For development |

**Definition of Done:**
- [ ] API service functions defined
- [ ] Error handling in services
- [ ] Type safety for all data
- [ ] State management configured
- [ ] `npm run build` passes
- [ ] `npm test` passes (service tests)

**Blocked Actions:**
- ❌ Create UI components
- ❌ Create pages
- ❌ Style components

**Checkpoint Presentation:**
- List all services
- Explain data flow
- API integration approach
- Demo with mock data

**Transition Condition:**
- User explicitly approves
- Git commit created

---

### G5.3: Components (Iterative)

**Enforcement Files:**
- `constants/DEVELOPMENT_CHECKPOINTS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`

**Per-Component Deliverables:**
| File | Required | Verification |
|------|----------|--------------|
| src/components/[Name].tsx | ✅ | Component code |
| src/components/[Name].test.tsx | ✅ | Component tests |

**Per-Component Definition of Done:**
- [ ] Props typed with TypeScript interface
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Accessible (aria labels, keyboard nav)
- [ ] Matches design specification
- [ ] Responsive
- [ ] Tests written and passing

**CRITICAL RULE:**
> Build ONE component at a time. Get approval for EACH component.
> Do NOT batch multiple components.

**Blocked Actions:**
- ❌ Skip to next component without approval
- ❌ Build multiple components at once

**Checkpoint Presentation (per component):**
```markdown
## 🚦 COMPONENT CHECKPOINT: {Name}

**File:** src/components/{Name}.tsx
**Purpose:** {one-line}

### What It Does
{2-3 sentences}

### Key Decisions Made
- {decision 1}
- {decision 2}

### Build Verification
$ npm run build
{actual output}

### Your Options
A) Approve, continue to next
B) Request changes
C) Skip to integration
D) Pause
```

**Transition Condition:**
- All planned components approved, OR
- User chooses to skip to integration

---

### G5.4: Integration

**Enforcement Files:**
- `constants/DEVELOPMENT_CHECKPOINTS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`

**Required Deliverables:**
| File | Required | Verification |
|------|----------|--------------|
| src/App.tsx | ✅ | Routes configured |
| src/pages/*.tsx | If pages | All pages created |

**Definition of Done:**
- [ ] All components connected
- [ ] Data flows correctly
- [ ] Navigation works
- [ ] Error boundaries in place
- [ ] Loading states coordinated
- [ ] Dev server starts without errors
- [ ] Main user flow works end-to-end
- [ ] No console errors

**DEMO REQUIRED:**
- User MUST see working demo
- Walk through main user flows
- Command: `npm run dev`

**Blocked Actions:**
- ❌ Add new components
- ❌ Change data architecture

**Checkpoint Presentation:**
- Show how components connect
- Demonstrate full user flow
- **Live demo mandatory**

**Transition Condition:**
- User explicitly approves after seeing demo
- Git commit created

---

### G5.5: Polish

**Enforcement Files:**
- `constants/DEVELOPMENT_CHECKPOINTS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`

**Definition of Done:**
- [ ] Consistent spacing and typography
- [ ] Smooth transitions/animations
- [ ] Responsive: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible
- [ ] Color contrast verified (WCAG AA)
- [ ] Lighthouse score ≥ 90
- [ ] `npm run build` passes (production)
- [ ] `npm test` passes
- [ ] `npm run lint` passes

**Blocked Actions:**
- ❌ Add new features
- ❌ Change architecture
- ❌ Add new components

**Checkpoint Presentation:**
- Before/after comparisons
- Accessibility improvements
- Final demo

**Transition Condition:**
- User explicitly approves OR chooses "ship as-is"
- Git commit created

---

### G6: Testing

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/EXECUTION_PROTOCOL.md`
- `constants/protocols/APPROVAL_GATES.md`

**Quality Gates:**
| Metric | Threshold | Verification |
|--------|-----------|--------------|
| Test coverage | ≥ 80% | `npm test -- --coverage` |
| Critical bugs | 0 | Bug report |
| Accessibility | WCAG AA | Audit results |
| Performance | Targets met | Lighthouse |

**Definition of Done:**
- [ ] Overall coverage ≥ 80%
- [ ] Critical paths 100% covered
- [ ] All services tested
- [ ] All components tested
- [ ] Unit tests complete
- [ ] Integration tests complete
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Coverage report generated

**Approval Gate:**
- Test results summary
- Bug report by severity
- Coverage metrics
- Options: Sign Off / Conditional / Fail

**Transition Condition:**
- All quality gates met
- User approves QA results

---

### G7: Security

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`

**Security Gates:**
| Check | Requirement | Verification |
|-------|-------------|--------------|
| npm audit | 0 critical, 0 high | `npm audit` |
| OWASP Top 10 | Reviewed | Checklist |
| Secrets | Properly managed | Scan |
| Input validation | All inputs | Code review |

**Definition of Done:**
- [ ] npm audit: 0 critical, 0 high
- [ ] No hardcoded secrets
- [ ] Input validation on all user inputs
- [ ] Output encoding for XSS
- [ ] CSRF protection (if applicable)
- [ ] Passwords hashed (bcrypt 12+)
- [ ] Tokens stored securely
- [ ] Rate limiting implemented
- [ ] THREAT_MODEL.md complete

**Approval Gate:**
- Security scan results
- Vulnerability summary
- Threat model summary
- Compliance status
- Options: Accept / Accept with Plan / Reject

**Transition Condition:**
- Security gates passed
- User approves security report

---

### G8: Pre-Deploy

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`

**Go/No-Go Checklist:**
- [ ] All gates G0-G7 approved
- [ ] Build passing
- [ ] Tests passing
- [ ] Security approved
- [ ] Deployment config ready
- [ ] Rollback plan documented
- [ ] Environment variables documented
- [ ] CI/CD pipeline configured
- [ ] Monitoring configured
- [ ] User confirms GO

**Approval Gate:**
- Deployment readiness checklist
- Rollback plan
- Monitoring setup
- Options: Go / Delay / Staged

**Transition Condition:**
- User gives explicit GO decision

---

### G9: Production

**Enforcement Files:**
- `constants/protocols/STATE_DEFINITIONS.md`
- `constants/protocols/APPROVAL_GATES.md`

**Definition of Done:**
- [ ] Production deployment successful
- [ ] Functionality verified
- [ ] Metrics within acceptable range
- [ ] No critical errors
- [ ] User feedback collected

**Approval Gate:**
- Production metrics
- User feedback summary
- Open issues
- Options: Accept / Extend / Issues

**Transition Condition:**
- User accepts production deployment
- Proceed to G10 (Completion Report)

---

### G10: Project Completion (MANDATORY)

**Enforcement Files:**
- `constants/PROJECT_COMPLETION_REPORT.md`

**Required Deliverables:**
| Deliverable | Location | Required |
|-------------|----------|----------|
| Completion Report | `docs/COMPLETION_REPORT.md` | ✅ MANDATORY |

**Definition of Done:**
- [ ] Executive Summary complete
- [ ] All features documented with status
- [ ] Technical stack documented
- [ ] Timeline metrics calculated
- [ ] Quality metrics captured (coverage, lint, security)
- [ ] Code metrics collected (LOC, files, components)
- [ ] Security summary complete
- [ ] Testing summary with pass/fail counts
- [ ] Deployment info documented (URL, env vars)
- [ ] User acceptance recorded
- [ ] Agent cost metrics (if tracked)

**Completion Presentation:**
```markdown
## Project Complete!

**Project:** [Name]
**Duration:** [X days/weeks]
**Features Delivered:** [X of Y]

### Key Metrics
| Metric | Value |
|--------|-------|
| Test Coverage | [X%] |
| Lighthouse Score | [X] |
| Security Issues | [0 critical] |
| Agent Cost | $[X.XX] |

**Full report:** docs/COMPLETION_REPORT.md

Congratulations on shipping! Is there anything else you'd like to review?
```

**Transition Condition:**
- Completion report generated
- User acknowledges project complete

**Final State:** `COMPLETE`

---

## Cross-Cutting Concerns

### Human Input Tracking (All Phases)

**Enforcement File:** `constants/HUMAN_INPUT_TRACKING.md`

| Input Type | Captured In | When |
|------------|-------------|------|
| Initial requirements | docs/INTAKE.md | G1 |
| Gate approvals | docs/DECISIONS.md | G1-G9 |
| Feedback/corrections | docs/FEEDBACK_LOG.md | Any time |
| Change requests | docs/CHANGE_REQUESTS.md | Any time |
| Clarifications | docs/DECISIONS.md | When asked |

### Teaching Protocol (All Phases)

**Enforcement File:** `constants/reference/TEACHING_PROTOCOL.md`

| Teaching Level | Behavior | Frequency |
|----------------|----------|-----------|
| NOVICE | Full explanations, define terms | 10-15 teaching moments |
| INTERMEDIATE | Key decisions, offer options | 5-8 teaching moments |
| EXPERT | Concise, trade-offs only | 0-2 teaching moments |

### Git Commit Protocol (G5+)

**Enforcement File:** `constants/DEVELOPMENT_CHECKPOINTS.md`

| Event | Commit? |
|-------|---------|
| G5.1 approved | Yes |
| G5.2 approved | Yes |
| Each G5.3 component approved | Yes |
| G5.4 approved | Yes |
| G5.5 approved | Yes |
| Bug fix | Yes |
| End of session | Yes |

### Agent Cost Tracking (Optional)

**Enforcement File:** `constants/reference/AGENT_COST_TRACKING.md`

| Event | Tracking Action |
|-------|-----------------|
| Session start | Log start time, phase |
| Gate completion | Log estimated tokens/cost |
| Session end | Update COST_LOG.md |
| Budget threshold | Display alert |

**Cost alerts (if budget set):**
- 50% budget → Info alert
- 75% budget → Warning
- 90% budget → Prompt for decision

### Standard Tooling (All Development)

**Enforcement Files:**
- `constants/reference/STANDARD_TOOLING.md` - Tool definitions
- `constants/reference/TOOL_ENFORCEMENT.md` - Enforcement protocol
- `scripts/validate-project.sh tools` - Automated validation

| Phase | Enforcement Action | Automated Check |
|-------|-------------------|-----------------|
| G1 Intake | Capture tool constraints from Q5 | N/A |
| G3 Architecture | TECH_STACK.md must reference standard tools | N/A |
| G5.1 Foundation | **MANDATORY** tool validation | `./scripts/validate-project.sh [path] g5.1` |
| G5.4 Integration | Verify no unauthorized tool additions | Re-run tools check |

**Tool Selection Hierarchy:**
1. User constraint (Q5) → Highest priority
2. Starter template → If using a starter
3. Standard tooling → Default (STANDARD_TOOLING.md)
4. Agent preference → NOT ALLOWED

**Automated Enforcement (G5.1):**

The validation script (`tools` command) checks:
- Required tools: React, TypeScript, Vite, Vitest, Tailwind, ESLint
- Anti-patterns blocked: webpack, jest, moment, lodash, sass, jquery
- Configuration syntax: Tailwind v4, Vitest in vite.config
- Verify script: Must exist and include build + test + lint
- `npm run verify` must pass

**If tool validation fails, G5.1 CANNOT be approved.**

**Deviation requires:**
- User approval (explicit in Q5)
- Override logged in INTAKE.md
- ADR documenting why
- Update to TECH_STACK.md

---

## Gaps Identified & Status

| Gap | Status | Resolution |
|-----|--------|------------|
| Teaching level not in agent prompts | ✅ FIXED | Added to orchestrator, architect, frontend-dev, backend-dev |
| No unified onboarding | ✅ FIXED | Created UNIFIED_ONBOARDING.md |
| Teaching protocol missing | ✅ FIXED | Created TEACHING_PROTOCOL.md |
| No workflow validation master doc | ✅ FIXED | This document |
| No agent cost tracking | ✅ FIXED | Created AGENT_COST_TRACKING.md |
| No standard tooling enforcement | ✅ FIXED | Created STANDARD_TOOLING.md |
| No completion report | ✅ FIXED | Created PROJECT_COMPLETION_REPORT.md + G10 |
| No automated tool verification | ✅ FIXED | Created TOOL_ENFORCEMENT.md + validate-project.sh tools |

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Master validation matrix for workflow enforcement
