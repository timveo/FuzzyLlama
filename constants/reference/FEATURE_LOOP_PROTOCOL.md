# Feature Loop Protocol (Agile Micro-Sprints)

> **Version:** 4.0.0
> **Last Updated:** 2024-12-18
> **Purpose:** Enable iterative, feature-focused development with cross-functional teams

---

## Overview

A **Feature Loop** is a micro-sprint where a cross-functional team (PM + Dev + QA) collaborates on a single user story from definition to deployment.

### Traditional vs Feature Loop

```
Traditional Flow:
  ALL Requirements → ALL Architecture → ALL Development → ALL Testing
  (Waterfall-style phases, feedback comes late)

Feature Loop Flow:
  Story 1: Refine → Build → Test → Accept
  Story 2: Refine → Build → Test → Accept
  Story 3: Refine → Build → Test → Accept
  (Each story gets immediate feedback)
```

### Benefits

- **Faster feedback** — User sees working features sooner
- **Reduced rework** — Issues caught early per feature
- **Better focus** — Team concentrates on one story at a time
- **Clearer progress** — "3 of 10 features complete" vs "in development"

---

## When to Use Feature Loops

| Project Type | Recommended Approach |
|--------------|---------------------|
| Small MVP (<5 features) | Traditional linear flow |
| Medium project (5-15 features) | Feature loops after architecture |
| Large project (>15 features) | Feature loops with parallel teams |
| Enhancement project | Feature loops by default |
| Prototype/POC | Traditional (speed over process) |

### Feature Loop Triggers

The Orchestrator activates Feature Loop mode when:

1. **G3 (Architecture) is approved** — Foundation is stable
2. **User stories are well-defined** — Clear acceptance criteria exist
3. **Features are loosely coupled** — Can be built independently
4. **User requests iterative approach** — Explicit preference

### Enable/Disable

**Enable Feature Loops:**
```markdown
## Project Configuration
**Development Approach:** Feature Loops
**Loop Strategy:** Sequential
**Max Iterations per Loop:** 3
```

**Disable (Traditional):**
```markdown
## Project Configuration
**Development Approach:** Traditional (Linear)
**Reason:** Tightly coupled features, small scope
```

---

## Feature Loop Structure

### Loop Team Composition

| Role | Agent | Responsibility |
|------|-------|----------------|
| **PM** | Product Manager | Story refinement, acceptance criteria, user acceptance |
| **Dev** | Frontend/Backend Developer | Implementation, unit tests |
| **QA** | QA Engineer | Testing, bug reporting, quality sign-off |
| **Optional** | UX/UI Designer | Design clarifications, tweaks |

### Loop Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                       FEATURE LOOP                               │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  REFINE  │ → │  BUILD   │ → │   TEST   │ → │  ACCEPT  │     │
│  │   (PM)   │   │  (Dev)   │   │   (QA)   │   │  (User)  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       ↑                                              │          │
│       └────────────── ITERATE IF NEEDED ─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Details

#### 1. REFINE (Product Manager)

**Purpose:** Ensure the story is ready for development

**Activities:**
- Review user story and acceptance criteria
- Clarify ambiguous requirements
- Identify edge cases and error states
- Break into sub-tasks if needed
- Confirm API contracts with Backend (if needed)

**Duration:** 30 minutes - 2 hours

**Output:** Refined story ready for BUILD

**Exit Criteria:**
- [ ] Acceptance criteria are clear and testable
- [ ] Edge cases documented
- [ ] Dependencies identified
- [ ] No blocking questions remain

#### 2. BUILD (Developer)

**Purpose:** Implement the feature with passing tests

**Activities:**
- Implement the feature per specifications
- Write unit tests
- Run verification loop (build, test, lint)
- Self-review code quality
- Document any deviations or decisions

**Duration:** 2 hours - 2 days

**Output:** Working implementation with tests

**Exit Criteria:**
- [ ] Feature implemented per acceptance criteria
- [ ] Unit tests written and passing
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Coverage meets threshold (≥80%)

#### 3. TEST (QA Engineer)

**Purpose:** Verify the feature works correctly

**Activities:**
- Review implementation against acceptance criteria
- Run integration tests
- Perform exploratory testing
- Test edge cases and error states
- Report any issues found

**Duration:** 1 hour - 4 hours

**Output:** Test results and issue report

**Exit Criteria:**
- [ ] All acceptance criteria verified
- [ ] Integration tests passing
- [ ] No critical/high bugs found
- [ ] Edge cases tested

**If issues found:** Return to BUILD phase with issue details

#### 4. ACCEPT (User)

**Purpose:** User validates the feature meets their needs

**Activities:**
- Demo the feature to user
- User tests the feature
- Gather feedback
- Approve or request changes

**Duration:** 15 minutes - 1 hour

**Output:** User acceptance or change requests

**Exit Criteria:**
- [ ] User has seen the feature working
- [ ] User confirms it meets their needs
- [ ] User explicitly approves

**If changes requested:** Return to BUILD or REFINE as needed

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

### State Transitions

| From | To | Trigger | Agent |
|------|----|---------|-------|
| QUEUED | REFINING | Loop starts | Orchestrator |
| REFINING | BUILDING | Story refined | PM → Dev |
| BUILDING | TESTING | Implementation complete | Dev → QA |
| TESTING | ACCEPTING | Tests pass | QA → User |
| TESTING | BUILDING | Issues found | QA → Dev |
| ACCEPTING | COMPLETE | User approves | User |
| ACCEPTING | BUILDING | Changes requested | User → Dev |
| ACCEPTING | REFINING | Requirements unclear | User → PM |

---

## Orchestrator Behavior

### Entering Loop Mode

After G3 (Architecture) approval:

```markdown
---
## 🔄 ENTERING FEATURE LOOP MODE

**Project:** [name]
**Project Path:** [path]
**Trigger:** G3 approved, user stories defined

### Features Queued
1. [US-001] User authentication
2. [US-002] Dashboard view
3. [US-003] Settings page
4. [US-004] User profile

### Loop Configuration
- **Strategy:** Sequential (one at a time)
- **Max Iterations:** 3 per feature
- **Max Time Per Iteration:** 4 hours
- **Team:** PM + Frontend Developer + QA Engineer

### Starting Feature Loop 1: [US-001] User Authentication

**Current Phase:** REFINE
**Active Agent:** Product Manager
---
```

### During a Loop

The Orchestrator:
1. Tracks current loop state in STATUS.md
2. Uses lightweight loop handoffs (see schema)
3. Coordinates phase transitions
4. Handles iterations (max 3)
5. Marks loop complete when user accepts

### Exiting Loop Mode

When all feature loops complete:

```markdown
---
## ✅ FEATURE LOOPS COMPLETE

**Project:** [name]
**Features Completed:** 10/10
**Total Iterations:** 14 (avg 1.4 per feature)
**Total Duration:** [X hours]

### Proceeding to Full Testing (G6)

All individual features tested. Now running:
- Full integration test suite
- Performance testing
- Security scan

**Next Phase:** testing
**Next Agent:** QA Engineer (full regression)
---
```

### ⚠️ AUTO-CONTINUE PROTOCOL (CRITICAL)

**After the last Feature Loop is accepted, the system MUST automatically continue through verification gates WITHOUT waiting for user prompts.**

```
Feature Loop N accepted
    │
    ▼ (AUTO-CONTINUE - NO USER PROMPT)
G6: Run build, lint, tests
    │
    ▼ (AUTO-CONTINUE - NO USER PROMPT)
G7: Run security audit (npm audit)
    │
    ▼ (AUTO-CONTINUE - NO USER PROMPT)
G8: Pre-deployment checklist
    │
    ▼ (PAUSE FOR DECISION)
G9: Production deployment (if applicable)
    │
    ▼ (AUTO-CONTINUE)
G10: Generate completion report, present to user
```

**Rules:**
1. **DO NOT** ask "Would you like to continue?" between G6-G7-G8
2. **DO NOT** ask "Is there anything else?" before completing G10
3. **DO** announce each gate as you enter it (e.g., "Running G6 Testing...")
4. **DO** report results briefly before moving to next gate
5. **ONLY** pause at G9 if deployment is relevant (skip for local-only projects)
6. **ALWAYS** end with G10 completion report

**Why:** Verification gates (G6-G8) are automated checks, not decision points. Asking the user to manually trigger each one creates unnecessary friction and breaks the workflow continuity.

---

## Loop Handoffs (Lightweight)

Within a loop, use lightweight handoffs instead of full handoff schema:

```json
{
  "loop_handoff": {
    "story_id": "US-001",
    "story_title": "User authentication",
    "from_agent": "Frontend Developer",
    "to_agent": "QA Engineer",
    "phase_transition": "BUILD → TEST",
    "timestamp": "2024-12-18T14:30:00Z",
    "iteration": 1
  },
  "deliverables": {
    "files_changed": [
      "src/components/Login.tsx",
      "src/services/auth.ts",
      "src/hooks/useAuth.ts"
    ],
    "files_created": [
      "src/components/Login.test.tsx"
    ],
    "tests_added": 8
  },
  "verification": {
    "build": "passing",
    "tests": "15/15 passing",
    "coverage": "85%",
    "lint": "0 errors"
  },
  "notes": "Login form complete with validation. Ready for QA.",
  "known_limitations": [
    "Social login not yet implemented (US-005)"
  ]
}
```

### Loop Handoff vs Full Handoff

| Aspect | Loop Handoff | Full Handoff |
|--------|--------------|--------------|
| Use when | Within a feature loop | Phase/gate transitions |
| Size | Lightweight (~20 fields) | Comprehensive (~50 fields) |
| Validation | Basic checks | Full schema validation |
| Files | Changed files list | Full files_created with checksums |
| Context | Single story focus | Full project context |

---

## Parallel Feature Loops

For large projects, run multiple loops in parallel:

```
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL LOOPS                            │
│                                                              │
│  Loop Team A                    Loop Team B                  │
│  ┌─────────────────────┐       ┌─────────────────────┐      │
│  │ PM + Frontend + QA  │       │ PM + Backend + QA   │      │
│  │                     │       │                     │      │
│  │ US-001: Auth UI     │       │ US-002: Auth API    │      │
│  │ US-003: Dashboard   │       │ US-004: User API    │      │
│  │ US-005: Settings    │       │ US-006: Data API    │      │
│  └─────────────────────┘       └─────────────────────┘      │
│                                                              │
│  ═══════════════ SYNC POINTS ════════════════               │
│  • API contract alignment                                    │
│  • Shared state/types                                        │
│  • Integration testing                                       │
└─────────────────────────────────────────────────────────────┘
```

### Sync Points

Parallel loops must synchronize at:

| Sync Type | When | What |
|-----------|------|------|
| API Contract | Before BUILD | Agree on endpoint signatures |
| Shared Types | Before BUILD | TypeScript interfaces |
| Integration | After individual TEST | End-to-end verification |
| Security | After all loops | Full security review |

### Sync Point Format

```markdown
---
## 🔗 LOOP SYNC POINT

**Teams:** A, B
**Sync Type:** API Contract
**Timestamp:** 2024-12-18T15:00:00Z

### Issue Identified
Frontend expects: `GET /api/users`
Backend provides: `GET /api/v1/users`

### Resolution Required
- [ ] Agree on endpoint path
- [ ] Update API contract doc
- [ ] Both teams align implementation

### Decision
[Team decision here]

### Sync Complete
- [ ] Both teams confirmed alignment
---
```

---

## Integration with Quality Gates

Feature Loops integrate with the existing gate system:

| Loop Event | Equivalent Gate | Notes |
|------------|-----------------|-------|
| Story refined | Mini-G2 | Requirements for one story |
| Feature built | Mini-G5 | Development for one story |
| Feature tested | Mini-G6 | Testing for one story |
| Feature accepted | User approval | Per-feature sign-off |
| **All loops complete** | **Full G6** | Proceed to system-wide testing |

### Post-Loop Gates

After all feature loops complete:
1. **G6 (Testing)** — Full regression, integration, E2E
2. **G7 (Security)** — Full security review
3. **G8 (Pre-deployment)** — Deployment readiness
4. **G9 (Production)** — Production acceptance

---

## STATUS.md Tracking

### Loop Status Section

Add to STATUS.md when in loop mode:

```markdown
## Feature Loops

### Configuration
- **Mode:** Feature Loops
- **Strategy:** Sequential
- **Max Iterations:** 3
- **Max Time Per Iteration:** 4 hours

### Active Loop
| Story | Phase | Agent | Started | Iteration |
|-------|-------|-------|---------|-----------|
| US-001 | BUILD | Frontend Developer | 2024-12-18T14:00:00Z | 1 |

### Loop Queue
1. US-002: Dashboard view
2. US-003: Settings page
3. US-004: User profile

### Completed Loops
| Story | Title | Duration | Iterations | Issues Found |
|-------|-------|----------|------------|--------------|
| US-000 | Project setup | 2h | 1 | 0 |

### Loop Metrics
- **Completed:** 1/4
- **Avg Iterations:** 1.0
- **Avg Duration:** 2h
```

---

## Iteration Timeout Protocol

### Time Limits

| Phase | Max Duration | Extension Allowed |
|-------|--------------|-------------------|
| REFINE | 1 hour | No - escalate to user |
| BUILD | 4 hours | Yes - 2 hours with user approval |
| TEST | 2 hours | No - escalate to user |
| ACCEPT | 24 hours | Yes - waiting for user |
| **Total per iteration** | **4 hours** | **6 hours max with approval** |

### Timeout Detection

Track start time for each phase in STATUS.md:

```markdown
### Active Loop
| Story | Phase | Agent | Started | Deadline | Iteration |
|-------|-------|-------|---------|----------|-----------|
| US-001 | BUILD | Frontend Developer | 2024-12-18T14:00:00Z | 2024-12-18T18:00:00Z | 1 |
```

### Timeout Handling Procedure

```
TIMEOUT APPROACHING (30 min before deadline)
    │
    ▼
Step 1: ALERT AGENT
    │
    ├── "⏱️ BUILD phase for US-001 has 30 minutes remaining."
    ├── "Progress: 60% complete"
    │
    ▼
Step 2: ASSESS STATUS
    │
    ├── If completable → Push to finish
    ├── If not completable → Prepare timeout escalation
    │
    ▼
Step 3: AT DEADLINE
    │
    ├── Save current progress to git
    ├── Update STATUS.md
    ├── Trigger escalation
```

### Timeout Escalation Template

```markdown
## ⏱️ ITERATION TIMEOUT: [Story ID]

**Story:** US-001 - User Authentication
**Phase:** BUILD
**Iteration:** 2/3
**Time Spent:** 4 hours (limit reached)

### Progress Made
- Login form: ✅ Complete
- Validation: ✅ Complete
- API integration: 🔄 In progress (60%)
- Error handling: ❌ Not started
- Tests: ❌ Not started

### Why Timeout
[Brief explanation - e.g., "API integration more complex than estimated due to refresh token handling"]

### Options

| Option | Description | Impact |
|--------|-------------|--------|
| **A: Extend** | Grant 2 more hours to complete | Delays subsequent features |
| **B: Defer** | Ship partial feature, add remaining to backlog | Feature incomplete but functional |
| **C: Simplify** | Remove complex parts (e.g., skip refresh tokens) | Reduced scope but on-time |
| **D: Skip** | Mark feature as blocked, move to next | Feature not delivered |
| **E: Continue Tomorrow** | Pause, resume in next session | Timeline extends |

**Recommendation:** [Based on feature priority and remaining work]

**Your choice:** ___
```

### Timeout Rules

1. **Hard limit:** No iteration can exceed 6 hours total (with extension)
2. **No infinite loops:** After 3 iterations, feature must be accepted, deferred, or skipped
3. **User visibility:** All timeouts logged in DECISIONS.md
4. **Cost awareness:** Include cost estimate for extension option

### Preventing Timeouts

Best practices to avoid hitting time limits:

1. **Scope properly in REFINE:** Break large features into smaller stories
2. **Estimate honestly in BUILD:** Flag complexity early
3. **Test incrementally:** Don't wait until end to test
4. **Communicate blockers:** Surface issues immediately, don't wait for timeout

---

## Example Loop Session

```markdown
## Feature Loop: US-001 User Authentication

### Story
**As a** user
**I want to** log in with email and password
**So that** I can access my account

### Acceptance Criteria
- [ ] Email/password form displayed
- [ ] Validation on submit
- [ ] Error messages for invalid credentials
- [ ] Redirect to dashboard on success
- [ ] Session persists on refresh

---

### Iteration 1

**REFINE Phase** (PM)
- Clarified: Social login not in MVP (separate story)
- Added: Password reset link (UI only, flow is US-008)
- Edge cases: Empty fields, invalid email format, wrong password
- Duration: 45 min

**BUILD Phase** (Frontend Dev)
- Created: Login.tsx, Login.test.tsx, useAuth.ts
- Tests: 8 unit tests, all passing
- Build: ✅ passing
- Coverage: 85%
- Duration: 3h

**TEST Phase** (QA)
- Ran integration tests: 12/12 passing
- Exploratory testing: Found issue
- **Issue:** Error message shows "undefined" on network failure
- Recommendation: Fix error handling, then accept
- Duration: 1h

**Status:** BLOCKED → Loop back to BUILD

---

### Iteration 2

**BUILD Phase** (Frontend Dev)
- Fixed: Error handling for network failures
- Added: 1 new test for network error case
- Tests: 9/9 passing
- Build: ✅ passing
- Duration: 30 min

**TEST Phase** (QA)
- Re-ran tests: 14/14 passing
- Verified: Network error now shows "Unable to connect"
- No issues found
- Duration: 30 min

**ACCEPT Phase** (User)
- Demoed login flow
- Tested error states
- Feedback: "Looks good!"
- **Decision:** APPROVED ✅

**Status:** COMPLETE

---

### Loop Summary
- **Total Duration:** 5h 45min
- **Iterations:** 2
- **Issues Found:** 1
- **Final Status:** Accepted
```

---

## Failure Handling

### Max Iterations Exceeded

If a loop reaches 3 iterations without acceptance:

```markdown
---
## ⚠️ LOOP ITERATION LIMIT REACHED

**Story:** US-001 User Authentication
**Iterations:** 3 (maximum)
**Status:** Not accepted

### Iteration History
1. Issue: Missing validation
2. Issue: Error handling broken
3. Issue: UX feedback from user

### Options
1. **Extend loop** — Allow 1-2 more iterations (requires user approval)
2. **Descope** — Remove problematic parts, complete core functionality
3. **Defer** — Move to backlog, proceed with other features
4. **Escalate** — Technical review needed

### Recommendation
[Orchestrator recommendation based on analysis]

**User decision required.**
---
```

### Partial Feature Acceptance

When a user wants to ship most of a feature but defer specific parts:

```markdown
---
## PARTIAL ACCEPTANCE: [Story ID]

**Story:** US-001 - User Authentication
**Status:** PARTIAL ACCEPT

### What's Being Accepted
| Component | Status | Ship? |
|-----------|--------|-------|
| Login form UI | ✅ Complete | YES |
| Email validation | ✅ Complete | YES |
| Password validation | ✅ Complete | YES |
| Basic error handling | ✅ Complete | YES |
| Remember me checkbox | 🔄 80% complete | YES (as-is) |
| Social login buttons | ❌ Not started | NO - defer |
| Password strength meter | ❌ Not started | NO - defer |

### Deferred Items → Backlog

These items will be added to the product backlog:

| New Story | Priority | Original Story |
|-----------|----------|----------------|
| US-015: Social Login Integration | P2 | From US-001 |
| US-016: Password Strength Indicator | P3 | From US-001 |

### Acceptance Criteria Adjustment

**Original criteria:** 7 items
**Accepted criteria:** 5 items (71%)
**Deferred criteria:** 2 items

**Deferred acceptance criteria moved to new stories:**
- "User can log in with Google" → US-015
- "Password strength shown during input" → US-016

### Documentation

**Log in DECISIONS.md:**
```
## PARTIAL-ACCEPT-001: US-001 User Authentication

**Date:** YYYY-MM-DD
**Decision:** Partial acceptance - ship 71% of criteria

**Rationale:**
User wants to launch sooner. Social login and password strength are nice-to-have.

**Deferred to:**
- US-015 (Social Login) - Priority P2
- US-016 (Password Strength) - Priority P3

**User approval:** "Ship the core login, we can add social later"
```

### Validation

Before accepting partial feature:

1. **Core functionality works:** ✅
2. **Tests pass for accepted scope:** ✅
3. **Deferred items documented:** ✅
4. **New stories created in backlog:** ✅
5. **User explicitly approved partial:** ✅

---
```

### Partial Acceptance Rules

1. **Minimum viable:** At least 60% of acceptance criteria must be met
2. **Core functionality required:** Cannot defer essential functionality
3. **User must explicitly approve:** "Partial accept" requires clear user confirmation
4. **Deferred items tracked:** Every deferred item becomes a new backlog story
5. **No silent deferrals:** Cannot claim "complete" with hidden incomplete items

### Partial Acceptance Conversation

```
User: "This is taking too long, can we ship what we have?"

Agent: "We can do a partial acceptance. Here's the current status:

Currently Complete:
- Login form and validation (core)
- Basic error handling

Not Yet Done:
- Social login buttons
- Password strength meter

Option A: Full - Complete all items (est. 2 more hours)
Option B: Partial - Ship login now, defer social/strength to backlog
Option C: Minimal - Ship just login form, defer everything else

Which approach works for you?"

User: "Let's do B - ship the core, add social later"

Agent: "Got it. I'll:
1. Mark US-001 as PARTIAL COMPLETE
2. Create US-015 for Social Login (P2)
3. Create US-016 for Password Strength (P3)
4. Proceed to next feature loop

Confirming: Ship login with basic features, social login deferred to US-015. Correct?"
```

### Blocked Loop

If a loop is blocked by external dependency:

```markdown
---
## 🚫 LOOP BLOCKED

**Story:** US-003 Payment Integration
**Blocked By:** BLOCK-001 - Stripe API credentials not available

### Impact
- Cannot complete BUILD phase
- Other loops can proceed

### Options
1. **Wait** — Pause this loop, continue others
2. **Mock** — Build with mock API, integrate later
3. **Reorder** — Move to end of queue

**User decision required.**
---
```

---

## Configuration Options

### Loop Strategy

| Strategy | Description | Best For |
|----------|-------------|----------|
| `Sequential` | One loop at a time | Small teams, tight dependencies |
| `Parallel` | Multiple loops simultaneously | Large teams, independent features |
| `Hybrid` | Start sequential, parallelize later | Growing teams |

### Iteration Limits

| Setting | Default | Range | Notes |
|---------|---------|-------|-------|
| `max_iterations` | 3 | 1-5 | Per feature loop |
| `escalation_threshold` | 3 | 2-5 | When to involve user |

### Team Size

| Team Size | Recommended Strategy |
|-----------|---------------------|
| 1 person (solo) | Sequential, user = approver |
| 2-3 people | Sequential with dedicated QA |
| 4+ people | Consider parallel loops |

---

## Metrics to Track

| Metric | Target | Alert |
|--------|--------|-------|
| Avg iterations per loop | <2 | >2.5 |
| First-pass acceptance rate | >60% | <40% |
| Avg loop duration | Project-dependent | >2x estimate |
| Blocked loop rate | <10% | >20% |
| User acceptance rate | >90% | <80% |
