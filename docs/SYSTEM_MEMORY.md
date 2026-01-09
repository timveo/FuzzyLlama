# System Memory

> **This file persists learnings ACROSS ALL PROJECTS.**
> **Read this file at the START of every new project.**
> **Update this file at the END of every project.**

---

## Purpose

This is the agent system's institutional memory. Unlike per-project MEMORY.md files, this document:

1. **Persists across projects** - Learnings carry forward
2. **Informs future behavior** - Agents read this before starting
3. **Captures systemic issues** - Problems with the agent system itself
4. **Tracks improvements** - What changes were made and why

---

## How to Use

### At Project START:
1. Read the "Critical Learnings" section
2. Check "Recent Failures" for patterns to avoid
3. Review "Protocol Violations" to understand common mistakes

### At Project END:
1. Run retrospective: document what went well/poorly
2. Add any new learnings to appropriate section
3. Update project count and statistics

### When Problems Occur:
1. Check if this is a known issue
2. If new, add to appropriate section
3. If systemic, propose protocol changes

---

## Project Statistics

| Metric | Count |
|--------|-------|
| Total Projects | 6 |
| Successful | 5 |
| With Protocol Violations | 5 |
| Last Updated | 2026-01-04 |

---

## Critical Learnings (Read First!)

> **These are the most important lessons. Read before every project.**

### 1. NEVER Skip the Startup Message
- **Source:** ETF Tracker project (2024-12-10)
- **What Happened:** Jumped straight into coding when user said "build X"
- **Impact:** User felt disconnected, missed learning opportunities
- **Fix Applied:** Added "DO NOT" absolute rules to MANDATORY_STARTUP.md
- **Prevention:** Always display startup message, even if request seems clear

### 2. Development Checkpoints Are Mandatory
- **Source:** ETF Tracker project (2024-12-10)
- **What Happened:** Built entire app without stopping at G5.1-G5.5 checkpoints
- **Impact:** User had no opportunity for course correction during development
- **Fix Applied:** Added checkpoint enforcement to orchestrator.md
- **Prevention:** Stop after foundation, data layer, each component, integration, polish

### 3. Log Decisions As You Go
- **Source:** ETF Tracker project (2024-12-10)
- **What Happened:** Never created DECISIONS.md, decisions not tracked
- **Impact:** No record of why choices were made
- **Fix Applied:** Enhanced DECISIONS.md template with checkpoint sections
- **Prevention:** Create DECISIONS.md at G1, update at every checkpoint

### 4. The First User Interaction Sets the Tone
- **Source:** Comparison of Retirement vs ETF Tracker projects
- **What Happened:** Retirement had good onboarding, ETF Tracker started poorly
- **Impact:** User explicitly complained about ETF Tracker startup experience
- **Learning:** Initial experience is crucial - invest time in proper onboarding

### 5. Commit Code at Every Checkpoint
- **Source:** ETF Tracker project (2024-12-10)
- **What Happened:** Completed entire app with no commits, user asked where repo was
- **Impact:** Risk of losing all work, user had no save points
- **Fix Applied:** Added Git Commit Protocol to DEVELOPMENT_CHECKPOINTS.md
- **Prevention:** Commit after EVERY approved checkpoint (G5.1, G5.2, G5.3, G5.4, G5.5)

### 6. ALWAYS Ask User Type First
- **Source:** ETF Statistics project (2025-12-11)
- **What Happened:** Skipped user type question despite MANDATORY_STARTUP.md requiring it
- **Impact:** Could not tailor explanations appropriately, missed teaching opportunities
- **Fix Applied:** Adding explicit enforcement reminder
- **Prevention:** User type question MUST be the first interaction after understanding request

### 7. Features Must Be Semantically Complete
- **Source:** ETF Statistics project (2025-12-11)
- **What Happened:** Built portfolio allocation pie chart without share quantity input
- **Impact:** Chart was meaningless, required user feedback to identify
- **Fix Applied:** Added share tracking to ticker store
- **Prevention:** Before building any visualization/feature, ask "What data is needed for this to be meaningful?"

### 8. yahoo-finance2 v3 Breaking Change
- **Source:** ETF Statistics project (2025-12-11)
- **What Happened:** Library requires instantiation in v3, old pattern broke
- **Impact:** Server crashed on startup
- **Code Fix:**
  ```typescript
  // v2.x (BROKEN): import yahooFinance from 'yahoo-finance2';
  // v3.x (CORRECT):
  import YahooFinance from 'yahoo-finance2';
  const yahooFinance = new YahooFinance();
  ```
- **Prevention:** Check library changelogs when using major version updates

### 9. AUTO-CONTINUE After Feature Loops Complete
- **Source:** Portfolio Tracker project (2025-12-18)
- **What Happened:** After last Feature Loop accepted, asked "Would you like to add anything?" instead of auto-continuing to G6-G7-G8-G10
- **Impact:** User had to say "continue agent process" 3 times to complete the workflow
- **Fix Applied:** Added AUTO-CONTINUE PROTOCOL to FEATURE_LOOP_PROTOCOL.md and MANDATORY_STARTUP.md Step 10
- **Prevention:** After Feature Loops complete, automatically run G6→G7→G8→G10 without prompting. Only pause at G9 (deployment) if relevant.

### 10. Onboarding Must Be Structured and Proactive
- **Source:** CNDI project (2026-01-04)
- **What Happened:** No overview presented, no structured question approach, user had to ask agent to follow the plan
- **Impact:** User felt disconnected from process, had to drive the onboarding themselves
- **Fix Required:** Onboarding MUST present: (1) Project overview, (2) Structured questions with clear sequence, (3) Visual roadmap before starting
- **Prevention:** Always display MANDATORY_STARTUP flow completely, never assume user knows the process

### 11. G4 Gate Proof is Mandatory
- **Source:** CNDI project (2026-01-04)
- **What Happened:** G4 (Design Approval) was skipped without explicit proof or approval
- **Impact:** No design artifacts created, architecture decisions not formally captured
- **Fix Required:** G4 must either be completed with proof OR explicitly skipped with user approval and documented reason
- **Prevention:** Add G4 validation to gate checklist, require proof artifacts or skip approval

### 12. Agents Must Maintain Gate Plan Focus
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Agents lost focus frequently, went off on tangents, didn't track gate progress
- **Impact:** User had to repeatedly redirect agents back to the gate plan
- **Fix Required:** Agents must: (1) Check current gate status before each action, (2) Report gate progress regularly, (3) Stay on track with explicit gate plan
- **Prevention:** Add "Current Gate: Gx" status indicator to agent communications

### 13. Development Unit Tests Are Part of Development, Not QA ✅ FIXED
- **Source:** CNDI project (2026-01-04)
- **What Happened:** At QA stage (G6), no unit tests existed from development phase
- **Impact:** Had to create tests at QA time instead of during development
- **Fix Required:** Unit tests MUST be written during G5 development, with proof at each checkpoint
- **Prevention:** Add unit test requirement to G5 development checklist with mandatory proof
- **Fix Implemented (2026-01-07):**
  - Added `coverage_report` to G5 proof requirements (was only required at G6)
  - Created `validateQualityMetricsForG5()` method with lower coverage thresholds than G6
  - G5 thresholds: MVP ≥40%, Standard ≥60%, Enterprise ≥70% (G6 is higher: 60%/80%/90%)
  - G5 gate now BLOCKS if test coverage is below threshold
  - Updated `validate_quality_metrics` tool to support G5 validation
  - Error messages explicitly state: "Unit tests are part of DEVELOPMENT (G5), not QA (G6)"

### 14. Integration Tests Need Owner and Proof ✅ FIXED
- **Source:** CNDI project (2026-01-04)
- **What Happened:** No integration tests at QA stage, no clear ownership
- **Impact:** Integration testing was an afterthought, not properly planned
- **Fix Required:** Integration test plan must be defined at G4, executed at G6 with documented proof
- **Prevention:** Add integration test owner/plan to G4, add proof requirement to G6
- **Fix Implemented (2026-01-07):**
  - Added `IntegrationTestPlan` and `IntegrationTestScenario` interfaces to TruthStore
  - Added MCP tools: `initialize_integration_test_plan`, `add_integration_test_scenario`, `update_integration_test_scenario`, `get_integration_test_plan`, `validate_integration_tests`
  - G3 gate: Architect MUST call `initialize_integration_test_plan()` to identify backend integration points
  - G4 gate: UX/UI Designer MUST call `add_integration_test_scenario()` for UI→API flows
  - G5 phase: Backend/Frontend Developers MUST update scenario status to `written` → `passing`
  - G6 gate: QA MUST call `validate_integration_tests()` which BLOCKS if critical/high tests not passing
  - Ownership: architect (API+DB), backend (API+external), frontend (UI+API), qa (E2E)

### 15. QA Exit Must Validate PRD Epic Completion ✅ FIXED
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Confusion about which epics were required for MVP (HIGH only? All?)
- **Impact:** Epic 4 was almost missed because it was marked MEDIUM priority
- **Fix Required:** G6 QA exit must explicitly verify ALL PRD epics (not just HIGH priority) are complete
- **Prevention:** Add PRD epic completion checklist to G6 gate requirements
- **Fix Implemented (2026-01-07):**
  - Added `EpicCompletionTracking` to TruthStore with story-level status tracking
  - Added MCP tools: `initialize_epic_completion`, `update_story_status`, `get_story_status`, `get_epic_completion`, `validate_epic_completion`
  - G6 gate now calls `validateEpicCompletionForG6()` which BLOCKS unless ALL stories are `complete` or explicitly `deferred` with reason
  - Priority labels (HIGH/MEDIUM/LOW) do NOT affect this requirement - ALL stories must be addressed
  - Workflow: Architect calls `initialize_epic_completion` after `chunk_docs` → Developers call `update_story_status` as they complete work → G6 validates all epics complete

### 16. Agents Must Communicate Progress During Work
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Very limited communication while agents worked, user had no visibility
- **Impact:** User felt disconnected, didn't know what was happening
- **Fix Required:** Agents must provide ongoing status updates: current task, progress %, estimated completion
- **Prevention:** Add communication protocol requiring updates every N minutes or after each significant action

### 17. ALL Gates Require Explicit User Approval
- **Source:** CNDI project (2026-01-04)
- **What Happened:** G7 (Security) was glossed over, marked approved without running security scans
- **Impact:** Security gate was bypassed, vulnerability not discovered until user caught it
- **Fix Required:** Every gate (G2-G9) must have explicit user approval with "Approve Gx" confirmation
- **Prevention:** Never proceed past a gate without explicit approval statement from user

### 18. Communicate API Key Requirements Before QA
- **Source:** CNDI project (2026-01-04)
- **What Happened:** User not informed that API keys would be needed for full QA testing
- **Impact:** Some tests were skipped, QA was incomplete
- **Fix Required:** At G5 completion, communicate list of required API keys for full QA
- **Prevention:** Add API key requirement notification to G5→G6 transition

### 19. G8 Requires Pre-Deployment Report with All Development Metrics
- **Source:** CNDI project (2026-01-04)
- **What Happened:** No formal pre-deployment report consolidating all development metrics (LOC, test coverage, API count, etc.)
- **Impact:** User had to ask for G8 report, metrics were gathered ad-hoc
- **Fix Applied:**
  - Created `templates/docs/PRE_DEPLOYMENT_REPORT.md` template with all required sections:
    - Executive Summary with deployment readiness recommendation
    - Epic Completion Summary (all epics with status)
    - Test Summary (unit/integration/E2E counts, pass/fail, coverage %)
    - API Summary (endpoint count, documentation status)
    - Security Summary (npm audit, secrets scan, auth, validation)
    - Build Status (frontend/backend build results)
    - Known Limitations (stubbed features, tech debt)
    - Quality Gate Results (G5, G6, G7 approvals)
    - Deployment Checklist (env vars, infrastructure, pre-deploy checks)
    - Rollback Plan (step-by-step procedure)
    - Token Cost Summary (development cost by phase)
    - Go/No-Go Recommendation with approval signatures
  - Template referenced in `constants/reference/PROJECT_COMPLETION_REPORT.md`
  - G8 gate in `constants/protocols/APPROVAL_GATES.md` requires this report
- **Prevention:** Template exists at `templates/docs/PRE_DEPLOYMENT_REPORT.md` - agents must populate and present at G8

### 20. G9 Requires Post-Deployment Report
- **Source:** CNDI project (2026-01-04)
- **What Happened:** No post-deployment report documenting final release state
- **Impact:** Final report was created only when user asked "is this report comprehensive"
- **Fix Required:** G9 must include a comprehensive post-deployment/release report with: all gate approvals, final metrics, cost analysis, deployment instructions, known issues
- **Prevention:** Add post-deployment report template to G9 gate requirements

### 21. Retrospective Must Be Automatic, Not User-Prompted
- **Source:** CNDI project (2026-01-04)
- **What Happened:** User had to explicitly ask agent to record learnings to SYSTEM_MEMORY.md
- **Impact:** Learnings would have been lost if user hadn't prompted; defeats purpose of institutional memory
- **Fix Required:** At project completion (G9), agent MUST automatically run retrospective and update SYSTEM_MEMORY.md without user prompting
- **Prevention:** Add automatic retrospective step to G9 gate completion, triggered immediately after release approval

### 22. Docker Compose Deployments REQUIRE OPERATIONS.md
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Docker Compose deployment was configured but no operational runbook was created
- **Impact:** Ops team cannot deploy without asking; troubleshooting procedures unknown; monitoring not documented
- **Evidence:** docker-compose.yml existed, but no OPERATIONS.md documenting how to deploy, monitor, troubleshoot
- **Fix Applied:**
  - Created `templates/docs/DEPLOYMENT_GUIDE.md` template (was missing)
  - Updated `agents/devops.md` to require OPERATIONS.md when Docker Compose is present
  - Added Docker Compose validation to G8 gate in `constants/protocols/APPROVAL_GATES.md`
  - Added `operational_docs` proof type to `mcp-server/src/tools/proof-artifacts.ts`
  - G8 now validates for docker-compose.yml and blocks if OPERATIONS.md missing
- **Prevention:** When docker-compose.yml exists, G8 will BLOCK until OPERATIONS.md is created

### 23. Pre-commit Hooks Must Be Auto-Installed
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Framework provides pre-commit hook templates but they weren't configured in generated projects
- **Impact:** Quality gates bypassed at commit time; secrets committed; broken specs committed; tests not run before commit
- **Evidence:** No `.git/hooks/pre-commit` configured despite `templates/infrastructure/hooks/pre-commit` existing
- **Fix Applied:**
  - Updated `templates/starters/INDEX.md` to require `prepare` script in all generated projects
  - Updated `templates/starters/REACT_VITE_2025.md` package.json to include `prepare` script
  - Updated `templates/infrastructure/README.md` with auto-installation documentation
  - Installed pre-commit hook on the framework repo itself via `./scripts/setup-hooks.sh`
- **Required package.json script:**
  ```json
  {
    "scripts": {
      "prepare": "test -d .git && ./scripts/setup-hooks.sh || true"
    }
  }
  ```
- **Prevention:** `prepare` script runs on every `npm install`, ensuring all developers have hooks installed automatically

### 24. Git History Must Reflect Gate Progression
- **Source:** CNDI project (2026-01-04)
- **What Happened:** Only 3 vague commits instead of checkpoint commits at each gate
- **Impact:** No audit trail of gate progression; cannot rollback to specific gates; history doesn't tell project story
- **Evidence:** CNDI had only "Initial commit", "Simple UI update", "Consolidate env files" - no gate commits
- **Expected:** `feat: G2 PRD approval`, `feat: G3 Architecture approval`, `feat: G5.1 Foundation`, etc.
- **Fix Applied (v1.5.0) - AUTO-COMMIT:**
  - **Simple process**: Gate approval → check for commit → **auto-create if missing**
  - Added `createCheckpointCommit()` function - automatically commits at gate approval
  - Added `checkpoint_commit` field to `GateStatus` type in truth-store
  - Commit hash recorded in gate status for audit trail
  - Files changed: `truth-store.ts`, `gates.ts`, `DEVELOPMENT_CHECKPOINTS.md`
- **Prevention:** System auto-creates commits - no agent action required, impossible to forget

---

## Protocol Violations Log

> **Track every time the system violated its own protocols.**

| Date | Project | Violation | Severity | Root Cause | Fixed? |
|------|---------|-----------|----------|------------|--------|
| 2024-12-10 | ETF Tracker | Skipped startup message | Critical | Trigger words activated but startup not displayed | Yes |
| 2024-12-10 | ETF Tracker | Skipped G5.1-G5.5 checkpoints | Critical | No enforcement mechanism for sub-gates | Yes |
| 2024-12-10 | ETF Tracker | Never created DECISIONS.md | High | No reminder/enforcement to create it | Partial |
| 2024-12-10 | ETF Tracker | PROJECT_STATE.md not maintained | Medium | No protocol for ongoing updates | No |
| 2024-12-10 | ETF Tracker | No git commits during development | High | No commit protocol existed | Yes |
| 2025-12-11 | ETF Statistics | Skipped user type question | Critical | Read protocol but didn't follow it | Yes - v2.2.0 |
| 2025-12-11 | ETF Statistics | No teaching moments offered | High | Forgot to offer explanations at decisions | Yes - v2.2.0 |
| 2025-12-11 | ETF Statistics | Skipped G4 without explicit approval | Medium | Assumed skip was acceptable | Yes - v2.2.0 |
| 2025-12-11 | ETF Statistics | Never offered G6-G7 gates | High | User had to say "stop here" | Yes - v2.2.0 |
| 2025-12-11 | ETF Statistics | Built meaningless portfolio allocation | High | Didn't think through data requirements | Yes - v2.2.0 |
| 2025-12-18 | Portfolio Tracker | Stopped after Feature Loops instead of auto-continuing | High | Incorrectly treated workflow completion as decision point | Yes - Auto-Continue Protocol |
| 2026-01-04 | CNDI | No structured onboarding, user had to ask for plan | Critical | Agent did not follow MANDATORY_STARTUP | No - Fix Required |
| 2026-01-04 | CNDI | G4 skipped without proof or explicit approval | High | No enforcement mechanism for G4 | No - Fix Required |
| 2026-01-04 | CNDI | Agents lost focus, strayed from gate plan | High | No gate status tracking during work | No - Fix Required |
| 2026-01-04 | CNDI | No unit tests during development phase | High | Tests treated as QA task not dev task | No - Fix Required |
| 2026-01-04 | CNDI | No integration tests, no ownership | Medium | Integration testing not in gate requirements | No - Fix Required |
| 2026-01-04 | CNDI | Epic 4 almost missed (MEDIUM priority confusion) | High | PRD epic completion not validated at G6 | No - Fix Required |
| 2026-01-04 | CNDI | Limited communication during agent work | Medium | No progress communication protocol | No - Fix Required |
| 2026-01-04 | CNDI | G7 Security glossed over, scan not run | Critical | No explicit approval requirement for each gate | No - Fix Required |
| 2026-01-04 | CNDI | API key requirements not communicated before QA | Medium | No G5→G6 transition checklist for dependencies | No - Fix Required |
| 2026-01-04 | CNDI | No pre-deployment report at G8 | High | No G8 report template, user had to ask | Yes - Learning #19 |
| 2026-01-04 | CNDI | No post-deployment report at G9 | High | No G9 report template, created ad-hoc | No - Fix Required |
| 2026-01-04 | CNDI | Retrospective not automatic, user had to prompt | High | No auto-retrospective at G9 completion | No - Fix Required |
| 2026-01-04 | CNDI | No OPERATIONS.md despite Docker Compose deployment | High | DevOps agent didn't require ops docs for Docker | Yes - Learning #22 |
| 2026-01-04 | CNDI | Only 3 vague commits, no gate checkpoint commits | High | No enforcement mechanism for checkpoint commits | Yes - v1.5.0 |

---

## Successful Patterns

> **Patterns that worked well - repeat these.**

### Teaching Tone with New Coders
- **Project:** Retirement Calculator
- **Pattern:** Explain every decision, use analogies, offer "why" explanations
- **Result:** User engaged, learned, approved each step
- **When to Use:** User indicates they're new to coding

### CORS Proxy for Browser API Calls
- **Project:** ETF Tracker
- **Pattern:** Use `https://corsproxy.io/?` to wrap blocked API endpoints
- **Result:** Fixed Yahoo Finance API blocking
- **When to Use:** Any browser-based app calling third-party APIs without CORS headers

### TanStack Query for Data Fetching
- **Project:** ETF Tracker
- **Pattern:** Use TanStack Query for caching, loading states, error handling
- **Result:** Clean data management with minimal boilerplate
- **When to Use:** React apps with external data fetching

### Delightful Startup Experience (v2.0)
- **Project:** ETF Tracker v2 (2024-12-10)
- **Pattern:** Conversational, visual, enthusiastic onboarding instead of "Question 1 of 5"
- **Key Elements:**
  - Start with "Let's build something awesome together!"
  - Visual roadmap: `🎯 UNDERSTAND → 📐 DESIGN → 💻 BUILD → ✨ SHIP`
  - ASCII mockups showing what we'll build
  - Natural conversation instead of rigid numbered questions
  - Adapt explanations to user's stated learning level
  - Visual feature boxes before PRD approval
- **Result:** User feels engaged, excited, and in control
- **When to Use:** ALWAYS - this is the new standard
- **File:** `constants/protocols/MANDATORY_STARTUP.md` (v2.0)

---

## Known Technical Gotchas

> **Technical issues discovered across projects.**

### Yahoo Finance API
- **Issue:** Blocks direct browser requests (CORS)
- **Solution:** Use CORS proxy
- **Discovered:** ETF Tracker project

### TypeScript verbatimModuleSyntax
- **Issue:** Requires `import type` for type-only imports
- **Solution:** Use `import type { X }` instead of `import { X }`
- **Discovered:** ETF Tracker project

### Tailwind v4
- **Issue:** Different configuration from v3
- **Solution:** Uses `@tailwindcss/vite` plugin, CSS-based config
- **Discovered:** ETF Tracker project

---

## System Improvements Made

> **Changes made to the agent system based on learnings.**

### 2024-12-10: Phase 1 Fixes (ETF Tracker Retrospective)

1. **MANDATORY_STARTUP.md** - Added "DO NOT" absolute rules section
   - 5 explicit prohibitions
   - Self-check checklist before any action
   - File: `constants/protocols/MANDATORY_STARTUP.md:8-50`

2. **orchestrator.md** - Added development checkpoint enforcement
   - G5.1-G5.5 breakdown with visual tree
   - Explicit "DO NOT skip" instruction
   - File: `agents/orchestrator.md:571-597`

3. **DECISIONS.md template** - Added checkpoint logging sections
   - Per-gate approval logging
   - Per-component logging for G5.3
   - File: `templates/docs/DECISIONS.md:49-112`

### 2024-12-10: Phase 2 Fixes (Validation)

1. **validate-project.sh** - Created validation script
   - Checks all gates and checkpoints
   - Verifies file structure and builds
   - File: `scripts/validate-project.sh`

2. **orchestrator.md** - Added validation instructions
   - Usage documentation
   - Gate-to-command mapping
   - File: `agents/orchestrator.md:964-1010`

### 2024-12-10: Phase 3 Fixes (Feedback Loop)

1. **SYSTEM_MEMORY.md** - Created this file
   - Cross-project learning persistence
   - Protocol violation tracking
   - Improvement history

2. **RETROSPECTIVE_PROTOCOL.md** - Created mandatory retrospective process
   - End-of-project checklist
   - Learning capture template

### 2024-12-10: Phase 4 Fixes (Complete Gate Coverage)

1. **orchestrator.md** - Added G4, G6-G9 gate enforcement
   - G4: Design Approval (with skip conditions)
   - G6: Quality/Testing Sign-off
   - G7: Security Acceptance
   - G8: Go/No-Go Pre-Deployment
   - G9: Production Acceptance
   - Gate skip conditions documented
   - File: `agents/orchestrator.md:642-932`

2. **DECISIONS.md template** - Added G4-G9 logging sections
   - Each gate has approval/skip tracking
   - Metrics fields for G6 (coverage), G7 (vulnerabilities), G9 (error rate)
   - File: `templates/docs/DECISIONS.md:110-144`

3. **validate-project.sh** - Added G4-G9 validation
   - G4: Design artifacts check
   - G6: Test execution, coverage check
   - G7: npm audit, security docs
   - G8: Deployment config check
   - G9: Monitoring tool check
   - New `complete` gate for full lifecycle validation
   - File: `scripts/validate-project.sh:343-592`

### 2024-12-10: Phase 5 Fixes (Delightful Startup)

1. **MANDATORY_STARTUP.md** - Complete rewrite for delightful experience (v2.0)
   - Added Tone Guidelines (BE warm/collaborative, DON'T BE robotic/bureaucratic)
   - Conversational questions instead of "Question 1 of 5"
   - Visual roadmap: `🎯 UNDERSTAND → 📐 DESIGN → 💻 BUILD → ✨ SHIP`
   - ASCII mockup templates for feature visualization
   - Complete example showing ideal conversation flow
   - Emphasis on enthusiasm and teaching
   - File: `constants/protocols/MANDATORY_STARTUP.md` (v2.0)

### 2025-12-11: Phase 6 Fixes (ETF Statistics Retrospective)

1. **MANDATORY_STARTUP.md** - Enhanced to v2.2.0
   - **User Type Question Enforcement**: Added prominent section making user type question mandatory, not optional. Includes explicit checklist item and detailed explanation of why it matters.
   - **Teaching Moments Section (Step 7)**: New section with table of when to offer teaching moments, example format, and frequency guidelines by user type.
   - **Feature Completeness Check (Step 8)**: New checklist to ask "What data does this feature need?" before building any feature. Includes example of portfolio allocation mistake and common feature dependencies table.
   - **Gate Completion Protocol (Step 10)**: New section requiring agents to offer G6-G9 gates after development, never assuming user wants to stop.
   - File: `constants/protocols/MANDATORY_STARTUP.md` (v2.2.0)

2. **SYSTEM_MEMORY.md** - Updated with ETF Statistics learnings
   - Added Critical Learnings #6, #7, #8
   - Added 5 new protocol violations to log
   - Added Project 4 (ETF Statistics) to history
   - File: `docs/SYSTEM_MEMORY.md`

---

## Pending Improvements

> **Known issues not yet fixed.**

| Issue | Priority | Proposed Fix | Status |
|-------|----------|--------------|--------|
| ~~PROJECT_STATE.md not auto-updated~~ | ~~Medium~~ | ~~Add reminders in checkpoint templates~~ | **FIXED** (v1.6.0) |
| No automated retrospective trigger | Low | Add to project completion gate | Not Started |
| ~~Validation script not auto-run~~ | ~~Low~~ | ~~Consider pre-commit hook~~ | **FIXED** (v1.2.0) |
| ~~Pre-commit hooks not auto-installed~~ | ~~High~~ | ~~Add prepare script to starter templates~~ | **FIXED** (v1.3.0) |
| **MANDATORY_STARTUP not enforced** | Critical | Add checklist validation before any coding starts | Not Started |
| ~~**G4 Design requires proof or skip approval**~~ | ~~High~~ | ~~Add G4 artifacts checklist, require explicit skip approval~~ | **FIXED** (v1.4.0) |
| **No gate status tracking during work** | High | Add "Current Gate: Gx" indicator to agent communications | Not Started |
| ~~**Unit tests not part of G5 development**~~ | ~~High~~ | ~~Add unit test proof requirement to G5 checkpoints~~ | **FIXED** (2026-01-07) |
| ~~**Integration tests have no owner**~~ | ~~Medium~~ | ~~Add integration test plan to G4, proof to G6~~ | **FIXED** (2026-01-07) |
| ~~**PRD epic completion not validated at G6**~~ | ~~High~~ | ~~Add epic completion checklist to G6 requirements~~ | **FIXED** (2026-01-07) |
| **No progress communication protocol** | Medium | Add status update requirements every N actions | Not Started |
| **Gates don't require explicit approval** | Critical | Add "Approve Gx" requirement before proceeding | Not Started |
| **API key requirements not communicated** | Medium | Add dependency checklist to G5→G6 transition | Not Started |
| **No pre-deployment report at G8** | High | Add G8 report template with all dev metrics | Not Started |
| **No post-deployment report at G9** | High | Add G9 report template with final release metrics | Not Started |
| **Retrospective not automatic at G9** | High | Auto-trigger retrospective after G9 approval | Not Started |

### Recently Fixed (v1.7.0 - 2026-01-07)

**Medium Priority:**
- **Integration Test Planning & Ownership**: Integration tests now have clear ownership and are planned during design phase, not as an afterthought at QA.
  - **Location**: `mcp-server/src/state/truth-store.ts`, `mcp-server/src/tools/metrics-tools.ts`
  - **New interfaces**: `IntegrationTestPlan`, `IntegrationTestScenario` with status tracking
  - **New MCP tools**: `initialize_integration_test_plan`, `add_integration_test_scenario`, `update_integration_test_scenario`, `get_integration_test_plan`, `validate_integration_tests`
  - **Ownership model**:
    - **G3 (Architect)**: Initialize plan with backend integration scenarios (API+DB, auth, external services)
    - **G4 (UX/UI Designer)**: Add UI→API integration scenarios from design flows
    - **G5 (Backend/Frontend Dev)**: Write tests, update status to `written` → `passing`
    - **G6 (QA)**: Validate all critical/high tests pass using `validate_integration_tests()`
  - **Gate enforcement**: G6 BLOCKS if critical/high integration tests are not passing
  - **Impact**: Integration tests are now planned during architecture/design phases with clear ownership, ensuring issues are caught early rather than discovered late at QA

### Recently Fixed (v1.6.0 - 2026-01-07)

**Medium Priority:**
- **PROJECT_STATE.md Sync Tool**: Added `render_project_state` MCP tool to sync truth store to PROJECT_STATE.md
  - **Location**: `mcp-server/src/tools/document-tools.ts`
  - **Tool name**: `render_project_state`
  - **Purpose**: Renders PROJECT_STATE.md from truth store data (`.truth/truth.json`)
  - **When to call**: After gate transitions, at session start, when user asks about project status
  - **Output includes**: Current gate, gate status table, project info, phase progress, cost tracking, blockers
  - **Impact**: PROJECT_STATE.md now stays in sync with actual project state instead of being stale after initial creation

### Recently Fixed (v1.5.0 - 2026-01-06)

**High Priority:**
- **Git Checkpoint Commit Enforcement (AUTO-COMMIT)**: Commits are now **automatically created** at gate approval.
  - **Simple process**: Gate approval → check for commit → auto-create if missing
  - Added `checkpoint_commit` field to `GateStatus` type in `mcp-server/src/state/truth-store.ts`
  - Added `createCheckpointCommit()` and `validateCheckpointCommit()` in `mcp-server/src/tools/gates.ts`
  - Added `checkpoint_commit_created` and `checkpoint_commit_failed` event types
  - Commit hash recorded in gate status for audit trail and rollback capability
  - **No agent action required** - the system handles it automatically
  - Updated `constants/reference/DEVELOPMENT_CHECKPOINTS.md` with enforcement documentation
  - **Impact**: Git history will now reflect gate progression with commits like:
    - `feat: G2 PRD approval - requirements finalized`
    - `feat: G5 Development complete - all features implemented`
    - `feat: G6 QA approval - all tests passing`

### Recently Fixed (v1.4.0 - 2026-01-06)

**High Priority:**
- **G4 Design Gate Enforcement**: G4 (Design Approval) can no longer be skipped for UI projects without explicit artifacts.
  - Added UI detection in `approve_gate()` function in `mcp-server/src/tools/gates.ts`
  - G4 now requires: 3 design options in `designs/options/`, comparison.html, approved design in `designs/final/`
  - G4 can ONLY be skipped for non-UI projects (API-only, CLI, backend service, library)
  - Added `design_approval` proof type to truth-store and proof-artifacts
  - `force_without_proofs: true` still works but logs CRITICAL protocol violation
  - Files changed: `gates.ts`, `proof-artifacts.ts`, `truth-store.ts`

### Recently Fixed (v1.3.0 - 2026-01-06)

**High Priority:**
- **Pre-commit hooks auto-installed**: Added `prepare` script requirement to starter templates that runs `./scripts/setup-hooks.sh` on `npm install`. Updated `templates/starters/INDEX.md`, `templates/starters/REACT_VITE_2025.md`, and `templates/infrastructure/README.md`. Installed hooks on framework repo.

### Recently Fixed (v1.2.0 - 2025-12-19)

**Critical/High Priority:**
- **Validation script auto-run**: Added pre-commit hooks in `templates/infrastructure/hooks/` and `scripts/setup-hooks.sh`
- **Data Schema Mapping**: Added mandatory verification that UI elements have data sources (APPROVAL_GATES.md G4, product-manager.md)
- **G9 Smoke Test**: Added mandatory Playwright smoke test requirement for production acceptance (APPROVAL_GATES.md, validate-project.sh)
- **Infrastructure Templates**: Added `templates/infrastructure/` with Dockerfile, docker-compose.yml, nginx.conf, GitHub Actions CI/CD

**Lower Priority (also fixed):**
- **Fast Track Protocol**: Added `FAST_TRACK_PROTOCOL.md` for streamlined cosmetic/text-only change approval
- **Maintenance Mode**: Added `MAINTENANCE_PROTOCOL.md` defining post-G9 "Janitor mode" workflow
- **Cost-to-Complete Projections**: Added PRD-based cost estimation to `AGENT_COST_TRACKING.md` (v1.1.0)

**New Files Created:**
```
constants/
├── FAST_TRACK_PROTOCOL.md      # Cosmetic change fast-track
├── MAINTENANCE_PROTOCOL.md     # Post-G9 operations

templates/infrastructure/
├── Dockerfile                  # Multi-stage Node.js build
├── docker-compose.yml          # Local dev with PostgreSQL/Redis
├── nginx.conf                  # Static site config
├── README.md                   # Usage docs
├── hooks/pre-commit            # Git validation hook
└── github-workflows/
    ├── ci.yml                  # Lint, test, build, security
    └── deploy.yml              # Vercel staging/production

scripts/
├── setup-hooks.sh              # One-command hook installation
└── check-fast-track.sh         # Fast track eligibility check
```

---

## Project History

> **Brief record of all projects for pattern analysis.**

### Project 1: [Unknown - Before ETF Tracker]
- **Status:** Completed
- **Notes:** Referenced as having better startup than ETF Tracker

### Project 2: Retirement Calculator
- **Status:** Completed
- **What Worked:** Teaching tone, good onboarding
- **What Failed:** Unknown
- **Learnings Captured:** Yes (teaching tone pattern)

### Project 3: ETF Tracker
- **Status:** Completed (with issues)
- **What Worked:** Final app works, CORS fix, TanStack Query
- **What Failed:** Skipped startup, skipped checkpoints, no decision logging
- **Learnings Captured:** Yes (this retrospective)

### Project 4: ETF Statistics
- **Date:** 2025-12-11
- **Status:** Completed (with protocol violations)
- **What Worked:**
  - Clean React + TypeScript architecture
  - Express proxy for Yahoo Finance (using yahoo-finance2 v3)
  - Good user feedback response cycle
  - Portfolio tracking with share quantities
  - TanStack Query caching
  - Recharts visualizations
- **What Failed:**
  - Skipped user type question
  - No teaching moments offered
  - Skipped G4 design without approval
  - Never offered G6-G7 gates
  - Built portfolio allocation without share data initially
- **Learnings Captured:** Yes (Critical Learnings #6-8, Violations Log updated)
- **Technical Discoveries:**
  - yahoo-finance2 v3 requires `new YahooFinance()` instantiation
  - Tailwind v4 uses `@tailwindcss/vite` plugin

### Project 5: Portfolio Tracker
- **Date:** 2025-12-18
- **Status:** Completed (with 1 protocol violation)
- **Purpose:** End-to-end test of the Multi-Agent Framework
- **What Worked:**
  - Full onboarding flow (5 questions)
  - Feature Loop pattern (3 loops, all accepted)
  - User feedback incorporated (charts added after initial feedback)
  - Clean React + TypeScript + Vite architecture
  - LocalStorage persistence (simplified architecture per user request)
  - Recharts visualizations
  - Price alerts with notifications
  - Dividend calendar with list/calendar views
- **What Failed:**
  - Stopped after Feature Loops completed instead of auto-continuing to G6-G10
  - Required user to say "continue agent process" 3 times
- **Learnings Captured:** Yes (Critical Learning #9, Violations Log updated)
- **Fix Applied:** Added AUTO-CONTINUE PROTOCOL to FEATURE_LOOP_PROTOCOL.md and MANDATORY_STARTUP.md

---

## Review Schedule

| Review | Frequency | What to Do |
|--------|-----------|------------|
| Project Start | Every project | Read Critical Learnings |
| Project End | Every project | Run retrospective, update this file |
| Monthly | Monthly | Review pending improvements |

### Project 6: CNDI Proto-1 (Contract Navigator for Defense Industry)
- **Date:** 2026-01-04
- **Status:** Completed at G5 (stopped at G6)
- **Purpose:** AI-Native SaaS platform for defense tech startups
- **Tech Stack:** Python/FastAPI + React
- **What Worked:**
  - Gate approval process caught G7 security skip (user caught it)
  - Full MVP delivered: 6 epics, 35 endpoints, 224 tests
  - Cost tracking: ~$18 development cost
  - Comprehensive final report with cost analysis
  - Docker Compose deployment ready
  - FastAPI + Next.js architecture worked well
- **What Failed:**
  - No structured onboarding (user had to request plan)
  - G4 Design skipped without proof
  - Agents lost focus, didn't track gate progress
  - No unit tests during development (created at QA)
  - No integration tests planned or owned
  - Epic 4 almost missed (MEDIUM priority confusion)
  - Limited progress communication during work
  - G7 Security glossed over (user caught missing scan)
  - API key requirements not communicated before QA
  - No pre-deployment report at G8 (user had to ask)
  - No post-deployment report at G9 (created ad-hoc)
  - Retrospective not automatic (user had to prompt to capture learnings)
- **Learnings Captured:** Yes (Critical Learnings #10-21, 12 new violations logged)
- **Technical Discoveries:**
  - Python `safety check` for dependency CVE scanning
  - CVE-2024-23342 in ecdsa package (timing attack, low risk if not using ECDSA)
  - Claude Opus 4.5 pricing: $15/1M input, $75/1M output tokens
- **Fixes Required:**
  - Enforce MANDATORY_STARTUP flow
  - G4 proof or explicit skip approval
  - Gate status tracking during agent work
  - Unit tests as part of G5 development checkpoints
  - Integration test ownership in G4
  - PRD epic completion validation at G6
  - Progress communication protocol
  - Explicit approval for every gate
  - API key requirements at G5→G6 transition
  - G8 pre-deployment report template
  - G9 post-deployment report template
  - Auto-trigger retrospective at G9 completion

### Project 7: CNDI Proto-2
- **Date:** 2026-01-07 to 2026-01-08
- **Status:** Completed (G1-G9 all passed)
- **Purpose:** Second iteration of CNDI with improved framework
- **Tech Stack:** Next.js 15 + Express + TypeScript
- **What Worked:**
  - All gates G1-G9 completed
  - Better documentation (17 docs including COMPLETION_REPORT.md)
  - 84 tests (54 unit + 30 API smoke tests)
  - 0 security vulnerabilities
  - Lighthouse scores: Performance 100, SEO 100
  - Lessons learned documented in COMPLETION_REPORT.md
- **What Failed:**
  - G4 Design was skipped (used shadcn/ui components)
  - Test pass rate only 85% (some tests failing)
  - No actual deployment (documentation mode only)
- **Learnings Captured:** Yes (in project's own COMPLETION_REPORT.md)
- **Key Insight:** Framework v4.0.0 produced better results than v3.x

### Project 8: CNDI Proto-3
- **Date:** 2026-01-08
- **Status:** Completed (G1-G8, G9 pending deployment)
- **Purpose:** Third iteration with framework v5.x
- **Tech Stack:** React 19 + Vite + Express + TypeScript
- **GitHub:** https://github.com/timveo/cndi-proto-3
- **What Worked:**
  - Proper agent spawning verified (4 parallel agents at G5)
  - AI agents activated correctly (ML Engineer, Prompt Engineer)
  - Best test coverage: 274 tests, 82%+ coverage
  - All P0 features (13/13) complete
  - 0 security vulnerabilities
  - Security fixes applied (IDOR, XSS, CSP)
  - ADR folder for architecture decisions
  - CI/CD pipelines created (GitHub Actions)
- **What Failed:**
  - **ZERO git commits until user asked at project end** (217 files, 62K lines uncommitted)
  - Context compaction caused confusion about what agents were spawned
  - No COMPLETION_REPORT auto-generated (only PROJECT_SUMMARY.md when user asked)
  - No visible agent spawn log (had to grep jsonl files to verify)
  - Token/cost tracking still not implemented
  - Project directory confusion (running from MAPC, creating in cndi-proto-3)
- **Learnings Captured:** Yes (Critical Learnings #25-30 added below)
- **Key Insight:** Learning #24 "Git commits auto-created" was marked FIXED but didn't work

---

## Critical Learnings (Continued from Proto-3)

### 25. Git Auto-Commit Fix Did NOT Work
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** Learning #24 claimed git checkpoint commits were "FIXED in v1.5.0" with auto-commit, but proto-3 had ZERO commits until user manually asked
- **Impact:** 217 files, 62,095 lines of code were uncommitted; risk of losing all work
- **Evidence:** `git log` showed no commits; user had to request "create the initial commit"
- **Root Cause:** The MCP tool `createCheckpointCommit()` exists but was never called by orchestrator
- **Fix Required:**
  1. Orchestrator MUST call `createCheckpointCommit()` after EVERY gate approval
  2. Add validation: if gate approved but no commit exists, BLOCK next gate
  3. Consider making it truly automatic in `approve_gate()` function itself
- **Prevention:** Add commit verification to gate readiness checks

### 26. Context Compaction Loses Agent Spawn History
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** After context compaction, I incorrectly claimed agents weren't properly spawned when they actually were
- **Impact:** Caused confusion; I said "agents were NOT spawned" when grep of logs proved they were
- **Evidence:** Had to grep jsonl files to find: "Frontend Developer - G5.1 review", "ML Engineer - G5.1 review", etc.
- **Fix Required:**
  1. Add `docs/AGENT_LOG.md` that records each agent spawn with timestamp, gate, task, and outcome
  2. Include agent spawn summary in context compaction
  3. STATUS.md should include "Agents spawned this session" section
- **Prevention:** Persistent agent spawn log survives context compaction

### 27. Project Directory vs Orchestrator Directory Confusion
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** Claude Code running from `/Multi-Agent-Product-Creator/` created files in `/cndi-proto-3/`. Logs stored under MAPC, not the project.
- **Impact:** Confusing file paths; logs not co-located with project
- **Fix Required:**
  1. Orchestrator should `cd` to project directory at session start
  2. Or: Store logs in project's `.claude/` directory, not MAPC's
  3. Clear indication in STATUS.md of "Working Directory" vs "Project Directory"
- **Prevention:** Session start protocol includes directory verification

### 28. COMPLETION_REPORT Not Auto-Generated
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** Proto-2 had comprehensive COMPLETION_REPORT.md, but proto-3 only got PROJECT_SUMMARY.md when user asked "Is there a final document?"
- **Impact:** Inconsistent deliverables between projects; user had to prompt for final doc
- **Fix Required:**
  1. Add COMPLETION_REPORT.md to G8 or G9 mandatory deliverables
  2. Template should include: gate history, agent spawns, test metrics, security audit, cost summary
  3. Auto-generate at project completion, not on user request
- **Prevention:** G9 gate checklist requires COMPLETION_REPORT.md exists

### 29. No Visible Agent Spawn Log
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** No way to see which agents were spawned without grep-ing jsonl log files
- **Impact:** User asked "I saw agents being spawned" and I couldn't verify without digging through logs
- **Evidence:** Required `grep -o '"description":"[^"]*G5[^"]*"' *.jsonl` to find spawns
- **Fix Required:**
  1. Create `docs/AGENT_LOG.md` updated after each agent spawn
  2. Format: `| Timestamp | Gate | Agent | Task | Duration | Outcome |`
  3. MCP tool `record_agent_spawn()` should also append to this file
- **Prevention:** Human-readable agent history always available

### 30. Token/Cost Tracking Still Not Implemented After 8 Projects
- **Source:** CNDI Proto-3 (2026-01-08)
- **What Happened:** Cost tracking mentioned in learnings since project #3, marked as "pending improvement", still not working
- **Impact:** Cannot answer "how much did this project cost?" accurately; only rough estimates
- **Evidence:** Proto-2 COMPLETION_REPORT estimated ~$10.20 "based on typical usage"; proto-3 had no cost data
- **Fix Required:**
  1. Actually implement token counting in MCP server
  2. Track per-agent, per-gate token usage
  3. Generate COST_LOG.md with running totals
  4. Include in COMPLETION_REPORT.md
- **Prevention:** Make cost tracking a blocking requirement - can't approve G9 without cost summary

---

## Protocol Violations Log (Proto-3 Additions)

| Date | Project | Violation | Severity | Root Cause | Fixed? |
|------|---------|-----------|----------|------------|--------|
| 2026-01-08 | CNDI Proto-3 | Zero git commits despite "auto-commit" being marked FIXED | Critical | MCP tool exists but orchestrator never calls it | No - Learning #25 |
| 2026-01-08 | CNDI Proto-3 | No COMPLETION_REPORT generated | High | Not in mandatory deliverables | No - Learning #28 |
| 2026-01-08 | CNDI Proto-3 | Agent spawn history lost in context compaction | Medium | No persistent agent log | No - Learning #26 |
| 2026-01-08 | CNDI Proto-3 | No token/cost tracking | High | Never implemented despite 8 projects | No - Learning #30 |

---

## Pending Improvements (Updated)

| Issue | Priority | Proposed Fix | Status |
|-------|----------|--------------|--------|
| **Git auto-commit not actually working** | Critical | Call `createCheckpointCommit()` in orchestrator after gate approval | Not Started |
| **No agent spawn log** | High | Create `docs/AGENT_LOG.md` updated by `record_agent_spawn()` | Not Started |
| **No COMPLETION_REPORT auto-generated** | High | Add to G9 mandatory deliverables | Not Started |
| **Token/cost tracking not implemented** | High | Implement in MCP server, block G9 without cost summary | Not Started |
| **Context compaction loses spawn history** | Medium | Include agent spawn summary in compaction | Not Started |
| **Project vs orchestrator directory confusion** | Medium | cd to project dir at session start | Not Started |

---

## Comparison: Proto-1 vs Proto-2 vs Proto-3

| Metric | Proto-1 | Proto-2 | Proto-3 |
|--------|---------|---------|---------|
| Framework Version | v3.x | v4.0.0 | v5.x |
| Tech Stack | Python/FastAPI + React | Next.js 15 + Express | React 19/Vite + Express |
| Gates Completed | G1-G5 | G1-G9 ✅ | G1-G8 ✅ |
| Tests | 190 | 84 | 274 |
| Test Coverage | Not measured | 85% pass | 82%+ coverage |
| P0 Features | Unknown | 16/16 | 13/13 |
| Security Vulns | Not reviewed | 0 | 0 |
| Git Commits | Yes | Yes | **No** → Fixed manually |
| Deployed | No | No (docs) | No |
| Agent Spawning | Unknown | Unknown | Verified ✅ |

**Key Insight:** Proto-3 had the best test coverage and proper agent spawning, but basic git hygiene regressed.

---

**Last Updated:** 2026-01-08
**Updated By:** CNDI Proto-3 Retrospective
