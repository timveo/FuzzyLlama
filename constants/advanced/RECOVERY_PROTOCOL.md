# Recovery Protocol

> **This protocol defines how to recover from partial states, failed executions, and interrupted workflows.**
> **Related:** [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md) - Autonomic error recovery during development

---

## Self-Healing vs Recovery Protocol

**IMPORTANT:** Before using this Recovery Protocol, understand the distinction:

| Scenario | Use Self-Healing | Use Recovery Protocol |
|----------|------------------|----------------------|
| Build/test fails during development | Yes - agent fixes internally | No |
| Agent exhausted 3 internal fix attempts | No | Yes - escalate to user |
| Context window exhausted | No | Yes - context recovery |
| User returns after session break | No | Yes - session recovery |
| Project state unknown | No | Yes - state reconstruction |
| Quality gate failed after retries | No | Yes - escalation recovery |

**Self-Healing Loop:** Agents automatically fix build/lint/test errors internally (up to 3 attempts). The user never sees these failures. See [SELF_HEALING_PROTOCOL.md](./SELF_HEALING_PROTOCOL.md).

**Recovery Protocol:** Used when self-healing fails, or for broader system-level recovery (context loss, session abandonment, unknown state).

---

## When to Use This Protocol

| Situation | Recovery Type | Section |
|-----------|---------------|---------|
| Self-healing exhausted (3 attempts) | Escalation Recovery | 4 |
| Agent crashed mid-execution | Partial State Recovery | 1 |
| Context window exhausted | Context Recovery | 2 |
| User abandoned session | Session Recovery | 3 |
| Quality gate failed 3x | Escalation Recovery | 4 |
| Conflicting changes detected | Conflict Recovery | 5 |
| Project in unknown state | State Reconstruction | 6 |

---

## 1. Partial State Recovery

When an agent fails to complete its work (crash, timeout, error).

### Detection

Signs of partial state:
- `handoff.status` is `partial` or `blocked`
- Files exist but are incomplete (TODO comments, placeholder code)
- Build fails after agent claimed completion
- PROJECT_STATE.md shows `in_progress` but agent is not active

### Recovery Procedure

```
PARTIAL STATE DETECTED
    │
    ▼
Step 1: ASSESS
    │
    ├── Read PROJECT_STATE.md for last known state
    ├── Read docs/DECISIONS.md for last logged decision
    ├── Run: git log --oneline -10 (find last checkpoint)
    ├── Run: git status (check uncommitted changes)
    │
    ▼
Step 2: IDENTIFY RECOVERY POINT
    │
    ├── Option A: Last Git Checkpoint
    │   └── If commit exists for last approved gate
    │       └── git reset --hard <checkpoint-commit>
    │
    ├── Option B: Salvage Partial Work
    │   └── If partial work is >50% complete
    │       └── Stash: git stash save "partial-<agent>-<gate>"
    │       └── Continue from last approved state
    │       └── Selectively apply: git stash pop
    │
    ├── Option C: Clean Restart
    │   └── If partial work is <50% or corrupted
    │       └── git reset --hard <last-approved-gate>
    │       └── Delete partial files
    │       └── Re-activate agent
    │
    ▼
Step 3: UPDATE STATE
    │
    ├── Update PROJECT_STATE.md:
    │   current_gate: <recovered-gate>
    │   recovery_performed: true
    │   recovery_timestamp: <now>
    │   recovery_type: partial_state
    │   lost_work_summary: <what was lost>
    │
    ├── Log in DECISIONS.md:
    │   ## RECOVERY-XXX: Partial State Recovery
    │   **Date:** YYYY-MM-DD
    │   **Situation:** <what happened>
    │   **Recovery:** <what was done>
    │   **Lost Work:** <what was lost, if any>
    │
    ▼
Step 4: RESUME
    │
    └── Re-activate agent from recovered state
```

### Recovery Commands

```bash
# Find last checkpoint commit
git log --oneline --grep="G5\|checkpoint\|approved" | head -5

# Check what changed since last commit
git diff HEAD

# Stash partial work (preserve it)
git stash save "recovery-$(date +%Y%m%d)-partial-work"

# Reset to last checkpoint
git reset --hard <commit-sha>

# List stashed work
git stash list

# Selectively apply stashed files
git stash show -p stash@{0} | git apply --include="src/components/*"
```

---

## 2. Context Recovery

When context window is exhausted or conversation is lost.

### Detection

- Claude indicates context limit approaching
- Previous conversation history unavailable
- Agent has no memory of prior decisions

### Recovery Procedure

```
CONTEXT EXHAUSTED
    │
    ▼
Step 1: LOAD PROJECT STATE
    │
    ├── Read docs/PROJECT_STATE.md (current gate, agent)
    ├── Read docs/STATUS.md (active tasks, blockers)
    ├── Read docs/DECISIONS.md (recent decisions)
    ├── Read docs/MEMORY.md (project learnings)
    │
    ▼
Step 2: LOAD ARCHIVE IF NEEDED
    │
    ├── Check docs/archive/ for STATUS_ARCHIVE_v*.md
    ├── Read most recent archive for context
    │
    ▼
Step 3: RECONSTRUCT CONTEXT SUMMARY
    │
    ├── Generate context brief:
    │   PROJECT: <name>
    │   TYPE: <traditional/ai_ml/hybrid/enhancement>
    │   CURRENT_GATE: <gate>
    │   ACTIVE_AGENT: <agent>
    │   LAST_APPROVED: <last checkpoint>
    │   BLOCKERS: <any blockers>
    │   NEXT_ACTION: <what to do next>
    │
    ▼
Step 4: PRESENT TO USER
    │
    └── "I've recovered context from project state files.
         We were at [gate] with [agent].
         Last approved checkpoint was [X].
         Ready to continue?"
```

### Context Recovery Template

```markdown
## Project Context Recovery

**Project:** [name]
**Path:** [path]
**Recovered At:** YYYY-MM-DDTHH:MM:SSZ

### Current State
- **Gate:** G5.3_COMPONENTS
- **Agent:** Frontend Developer
- **Progress:** 3/7 components complete

### Recent Decisions
1. [G5.1] Foundation approved - YYYY-MM-DD
2. [G5.2] Data layer approved - YYYY-MM-DD
3. [G5.3] Button component approved - YYYY-MM-DD

### Active Work
- Building: SearchBar component
- Blocked by: None
- Dependencies: Data layer complete

### Next Steps
1. Complete SearchBar component
2. Present checkpoint for approval
3. Continue to ResultsList component

### References
- PRD: docs/PRD.md
- Architecture: docs/ARCHITECTURE.md
- Decisions: docs/DECISIONS.md
```

---

## 3. Session Recovery

When user abandons session and returns later.

### Detection

- User says "continue", "resume", "where were we"
- PROJECT_STATE.md shows stale timestamp (>24h old)
- No recent git commits

### Recovery Procedure

```
SESSION RESUMED
    │
    ▼
Step 1: VERIFY PROJECT STATE
    │
    ├── Run: ./scripts/validate-project.sh [path] [current-gate]
    ├── Check for uncommitted changes: git status
    ├── Check for stashed work: git stash list
    │
    ▼
Step 2: PRESENT STATUS SUMMARY
    │
    ├── Show:
    │   - Current phase and gate
    │   - What was last completed
    │   - Any pending work
    │   - Time since last activity
    │
    ▼
Step 3: OFFER OPTIONS
    │
    ├── A) Continue from last checkpoint
    ├── B) Review recent changes first
    ├── C) Rollback to previous checkpoint
    ├── D) Start fresh from current gate
    │
    ▼
Step 4: EXECUTE USER CHOICE
```

### Session Recovery Message Template

```markdown
## Welcome Back!

**Project:** [name]
**Last Active:** [X days/hours ago]

### Where We Left Off
- **Phase:** Development
- **Gate:** G5.3_COMPONENTS (Component 4 of 7)
- **Last Completed:** SearchResults component

### Pending Work
- [ ] FilterPanel component (not started)
- [ ] Pagination component (not started)
- [ ] Integration (G5.4)
- [ ] Polish (G5.5)

### Uncommitted Changes
```
M src/components/SearchResults.tsx
A src/components/FilterPanel.tsx (incomplete)
```

### Your Options
A) **Continue** - Pick up where we left off with FilterPanel
B) **Review** - Let me show you what was built since your last approval
C) **Rollback** - Go back to last approved checkpoint (SearchResults)
D) **Fresh Start** - Restart current gate from scratch

**Your choice:** ___
```

---

## 4. Escalation Recovery

When self-healing exhausts 3 internal attempts OR quality gate fails 3 times and requires user intervention.

### Detection

**From Self-Healing Loop:**
- `verification.self_healing_log.total_attempts >= 3`
- `verification.self_healing_log.final_status = "escalated"`
- `verification.escalation.triggered = true`

**From Quality Gate:**
- `retry_context.attempt_number >= 3`
- `retry_context.auto_escalate = true` triggered

### Recovery Procedure

```
ESCALATION TRIGGERED
    │
    ▼
Step 1: PRESENT FULL HISTORY
    │
    ├── Show all 3 attempts
    ├── Show what was tried each time
    ├── Show why each attempt failed
    │
    ▼
Step 2: ANALYZE ROOT CAUSE
    │
    ├── Pattern analysis:
    │   - Same failure each time? → Fundamental blocker
    │   - Different failures? → Unstable implementation
    │   - Regression? → Test coverage gap
    │
    ▼
Step 3: PRESENT OPTIONS
    │
    ├── A) Reduce scope (remove failing feature)
    ├── B) Change approach (different implementation)
    ├── C) Accept with conditions (known limitation)
    ├── D) External help (need specialist)
    ├── E) Pause project (reassess requirements)
    │
    ▼
Step 4: DOCUMENT DECISION
    │
    └── Log in DECISIONS.md with full context
```

### Escalation Recovery Template

```markdown
## ESCALATION: Gate [X] Failed 3 Times

**Gate:** G6_TESTING
**Criterion:** Test coverage >= 80%
**Attempts:** 3

### Attempt History

| Attempt | Result | Action Taken |
|---------|--------|--------------|
| 1 | 72% coverage | Added unit tests for auth |
| 2 | 76% coverage | Added tests for API layer |
| 3 | 78% coverage | Added integration tests |

### Analysis
The remaining 2% coverage is in:
- Legacy utility functions (not worth testing)
- Error handling edge cases (hard to simulate)

### Root Cause
Test coverage metric includes code that is:
1. Auto-generated (Prisma client)
2. Configuration files
3. Third-party integration wrappers

### Options

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A** | Exclude auto-generated code from coverage | Recommended |
| **B** | Lower threshold to 75% for this project | Acceptable |
| **C** | Add more tests (diminishing returns) | Not recommended |
| **D** | Proceed with 78% documented | Acceptable |

### Your Decision
OPTION: ___
RATIONALE: ___
```

---

## 4.5 Model Tier Escalation

When the current model tier cannot complete a task due to complexity or context limits.

### Detection Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| **Repeated failures** | `attempt_number >= 2` AND same error pattern | Consider tier upgrade |
| **Context exhaustion** | `context_remaining < 30%` mid-phase | Consider tier upgrade |
| **Complexity overflow** | Agent cannot reason through problem | Consider tier upgrade |
| **Quality shortfall** | Output quality below threshold despite retries | Consider tier upgrade |

### Model Tier Reference

| Tier | Model | Best For | Context | Cost |
|------|-------|----------|---------|------|
| **Tier 1** | Haiku | Simple tasks, quick answers | 200K | $ |
| **Tier 2** | Sonnet | Most development work | 200K | $$ |
| **Tier 3** | Opus | Complex architecture, difficult debugging | 200K | $$$ |

### Tier Escalation Procedure

```
TIER UPGRADE NEEDED
    │
    ▼
Step 1: DETECT NEED
    │
    ├── 2+ failures on same task with current tier
    ├── Context window < 30% remaining mid-phase
    ├── Agent explicitly requests higher tier
    │
    ▼
Step 2: PRESERVE WORK
    │
    ├── Save current progress to git
    ├── Update STATUS.md with partial work
    ├── Document what was attempted in DECISIONS.md
    │
    ▼
Step 3: PRESENT UPGRADE OPTION
    │
    ├── Show current tier and its limitations
    ├── Explain why upgrade needed
    ├── Show cost implications
    ├── Get user approval
    │
    ▼
Step 4: EXECUTE UPGRADE
    │
    ├── If approved → Continue with higher tier
    ├── If denied → Try alternative approach or reduce scope
    │
    ▼
Step 5: CONTINUE TASK
    │
    └── Higher tier agent reads STATUS.md and continues
```

### Tier Escalation Template

```markdown
## MODEL TIER ESCALATION REQUEST

**Current Tier:** Tier 1 (Haiku)
**Requested Tier:** Tier 2 (Sonnet)
**Gate:** G5.3 (Component Development)
**Task:** Building complex data visualization component

### Why Upgrade Needed

**Attempts with current tier:** 2
**Failure pattern:** Unable to reason through complex state management for real-time chart updates

**Specific limitation:**
- Task requires coordinating 5+ interconnected state pieces
- Haiku struggling with multi-step reasoning for this complexity
- Same logical error repeated in both attempts

### Work Preserved

**Files saved:**
- `src/components/DataChart.tsx` (partial - 60% complete)
- `src/hooks/useChartData.ts` (working)

**Progress:**
- Basic chart rendering: ✅
- Data fetching: ✅
- Real-time updates: ❌ (blocked)
- Interactive zoom: ❌ (not started)

### Cost Implication

| Option | Est. Cost to Complete Task |
|--------|---------------------------|
| Continue with Tier 1 | $0.10 (likely to fail again) |
| Upgrade to Tier 2 | $0.50 (likely to succeed) |
| Reduce scope | $0.05 (removes features) |

### Options

| Option | Description |
|--------|-------------|
| **A: Upgrade** | Switch to Sonnet for this component, return to Haiku after |
| **B: Simplify** | Remove real-time updates, build static chart instead |
| **C: Retry** | Try one more time with different approach on Haiku |
| **D: Skip** | Mark component as out of scope, document limitation |

**Recommendation:** A (Upgrade) - This is a core feature, worth the additional cost.

**Your choice:** ___
```

### Tier Downgrade (After Complex Task)

After completing a complex task with a higher tier, consider returning to a lower tier:

```
TASK COMPLETE WITH HIGHER TIER
    │
    ▼
Question: Is remaining work simpler?
    │
    ├── YES → Downgrade to save costs
    │         Log: "Returning to Tier 1 for remaining simple tasks"
    │
    └── NO → Continue with current tier
              Log: "Continuing with Tier 2 due to ongoing complexity"
```

### Preserving Work Across Tier Changes

**CRITICAL:** When changing tiers, the new model has NO memory of previous work.

**Required handoff for tier change:**

```json
{
  "tier_handoff": {
    "from_tier": "Tier 1 (Haiku)",
    "to_tier": "Tier 2 (Sonnet)",
    "reason": "Context exhaustion during G5.3",
    "timestamp": "2024-12-19T10:30:00Z"
  },
  "preserved_context": {
    "current_gate": "G5.3",
    "current_task": "DataChart component - real-time updates",
    "files_created": ["src/components/DataChart.tsx", "src/hooks/useChartData.ts"],
    "partial_work": "Chart renders, data fetches, real-time updates not working",
    "next_step": "Implement WebSocket subscription for real-time data",
    "blockers": "State management for coordinating updates"
  },
  "references": {
    "status_file": "docs/STATUS.md",
    "decisions_file": "docs/DECISIONS.md",
    "prd_section": "docs/PRD.md#data-visualization"
  }
}
```

---

## 5. Conflict Recovery

When parallel agents create conflicting changes.

### Detection

- Git merge conflicts
- Type definition mismatches
- API contract violations between frontend/backend

### Recovery Procedure

```
CONFLICT DETECTED
    │
    ▼
Step 1: IDENTIFY CONFLICT TYPE
    │
    ├── Git conflict → File-level merge needed
    ├── Type mismatch → Interface reconciliation needed
    ├── API mismatch → Contract alignment needed
    │
    ▼
Step 2: DETERMINE OWNER
    │
    ├── Shared types (src/types/*) → Architect owns
    ├── API contracts (docs/API.yaml) → Backend owns
    ├── UI contracts (props) → Frontend owns
    │
    ▼
Step 3: RESOLVE
    │
    ├── For Git conflicts:
    │   └── Owner agent resolves, other agent reviews
    │
    ├── For Type mismatches:
    │   └── Create CONFLICT-XXX in DECISIONS.md
    │   └── Present both versions to user
    │   └── User decides canonical version
    │
    ├── For API mismatches:
    │   └── API.yaml is source of truth
    │   └── Frontend adapts to backend contract
    │   └── If backend needs change → new PR
    │
    ▼
Step 4: VALIDATE
    │
    └── Run: npm run build && npm run test
```

### Conflict Resolution Template

```markdown
## CONFLICT-XXX: [Description]

**Date:** YYYY-MM-DD
**Agents Involved:** Frontend Developer, Backend Developer
**Files Affected:** src/types/user.ts, src/api/userService.ts

### Conflict Description
Frontend expects `User.createdAt` as `Date` object.
Backend returns `User.createdAt` as ISO string.

### Version A (Frontend)
```typescript
interface User {
  createdAt: Date;
}
```

### Version B (Backend)
```typescript
interface User {
  createdAt: string; // ISO 8601
}
```

### Resolution Options

| Option | Description | Impact |
|--------|-------------|--------|
| **A** | Backend returns Date | Backend change, 2h work |
| **B** | Frontend parses string | Frontend change, 30min work |
| **C** | Keep string, document | No code change, documentation |

### Decision
**Chosen:** Option B
**Rationale:** Frontend can easily parse ISO strings. Keeps API JSON-friendly.
**Approved By:** [User]

### Implementation
- [x] Frontend: Add date parsing in userService.ts
- [x] Types: Keep as string, add JSDoc explaining format
- [x] Tests: Updated to use ISO strings
```

---

## 6. State Reconstruction

When project is in completely unknown state.

### Detection

- PROJECT_STATE.md missing or corrupted
- Git history doesn't match expected flow
- User reports "something is wrong"

### Recovery Procedure

```
UNKNOWN STATE
    │
    ▼
Step 1: GATHER EVIDENCE
    │
    ├── File system:
    │   ls -la docs/
    │   ls -la src/
    │   cat package.json
    │
    ├── Git history:
    │   git log --oneline -20
    │   git log --all --oneline -20
    │
    ├── Existing docs:
    │   cat docs/PRD.md (if exists)
    │   cat docs/ARCHITECTURE.md (if exists)
    │   cat docs/DECISIONS.md (if exists)
    │
    ▼
Step 2: INFER STATE
    │
    ├── Evidence → Inferred Gate:
    │   - Only INTAKE.md → G1 (Intake)
    │   - PRD.md exists → G2+ (Post-planning)
    │   - ARCHITECTURE.md exists → G3+ (Post-architecture)
    │   - src/ has files → G5+ (Development)
    │   - Tests exist → G5.5+ or G6 (Testing)
    │   - Build passes → G5_DEV_COMPLETE+
    │
    ▼
Step 3: VALIDATE INFERENCE
    │
    ├── Run validation for inferred gate:
    │   ./scripts/validate-project.sh [path] [inferred-gate]
    │
    ├── If validation passes → State confirmed
    ├── If validation fails → Try earlier gate
    │
    ▼
Step 4: RECONSTRUCT STATE FILES
    │
    ├── Create/update PROJECT_STATE.md:
    │   current_gate: [inferred]
    │   reconstructed: true
    │   reconstruction_timestamp: [now]
    │   confidence: [high/medium/low]
    │
    ├── Create/update STATUS.md from template
    │
    ▼
Step 5: CONFIRM WITH USER
    │
    └── "Based on the files present, I believe we're at [gate].
         [X] files exist, build [passes/fails].
         Does this match your understanding?"
```

### State Reconstruction Report

```markdown
## State Reconstruction Report

**Project:** [path]
**Timestamp:** YYYY-MM-DDTHH:MM:SSZ

### Evidence Gathered

| Check | Result |
|-------|--------|
| docs/INTAKE.md | Present |
| docs/PRD.md | Present |
| docs/ARCHITECTURE.md | Present |
| docs/DECISIONS.md | Present (12 entries) |
| src/ files | 47 .tsx files |
| tests/ files | 15 .test.tsx files |
| package.json | Present, 23 dependencies |
| Build | Passes |
| Tests | 14/15 passing |

### Git Analysis
- **Total commits:** 23
- **Last commit:** 2 days ago
- **Commit pattern:** Follows checkpoint convention
- **Last checkpoint commit:** "feat: integration complete (G5.4)"

### Inferred State
- **Gate:** G5.5_POLISH (high confidence)
- **Agent:** Frontend Developer
- **Phase:** development_polish

### Confidence Assessment
| Factor | Score |
|--------|-------|
| Documentation completeness | 9/10 |
| Code file count | 9/10 |
| Git history clarity | 8/10 |
| Build status | 10/10 |
| **Overall Confidence** | **HIGH** |

### Recommended Action
Continue from G5.5_POLISH. All prior gates appear complete.

### Files Reconstructed
- [x] docs/PROJECT_STATE.md (created)
- [x] docs/STATUS.md (updated)
```

---

## Recovery Checklist

Before resuming work after any recovery:

- [ ] PROJECT_STATE.md reflects current state
- [ ] STATUS.md is up to date
- [ ] DECISIONS.md has recovery logged
- [ ] Git working tree is clean (or stashed)
- [ ] Build passes
- [ ] User has confirmed state understanding
- [ ] Recovery type documented for future reference

---

## Anti-Patterns

1. **Don't guess state** — Always verify with validation script
2. **Don't discard uncommitted work** — Stash first, decide later
3. **Don't skip logging** — Recovery decisions are decisions too
4. **Don't assume user remembers** — Always present context summary
5. **Don't recover silently** — User must confirm recovery action

---

## 7. Phase-Specific Recovery Flows

When a gate fails or encounters issues, use the specific recovery flow for that phase.

### 7.1 G2 (PRD) Recovery

**Failure Scenarios:**
- PRD rejected by user
- Requirements unclear after multiple attempts
- Scope creep detected

**Recovery Flow:**

```
G2 FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── User rejected PRD → Go to Step 2A
    ├── Requirements unclear → Go to Step 2B
    ├── Scope creep → Go to Step 2C
    │
    ▼
Step 2A: PRD REJECTION RECOVERY
    │
    ├── Ask user for specific feedback
    ├── Document feedback in DECISIONS.md
    ├── Revise PRD sections identified
    ├── Present revised PRD for approval
    │
    ▼
Step 2B: UNCLEAR REQUIREMENTS RECOVERY
    │
    ├── Schedule clarification session
    ├── Use structured questions:
    │   1. "What problem are we solving?"
    │   2. "Who is the primary user?"
    │   3. "What does success look like?"
    │   4. "What's the minimum viable feature set?"
    ├── Document answers in INTAKE.md
    ├── Revise PRD based on new clarity
    │
    ▼
Step 2C: SCOPE CREEP RECOVERY
    │
    ├── Compare current scope vs original INTAKE.md
    ├── List all added features
    ├── Present to user:
    │   - Original scope
    │   - Current scope
    │   - Impact on timeline/budget
    ├── User decides: Accept expanded scope OR trim to original
    ├── Update PRD and DECISIONS.md
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    └── Run: ./scripts/validate-project.sh [path] g2
```

---

### 7.2 G3 (Architecture) Recovery

**Failure Scenarios:**
- Architecture rejected by user
- Tech stack conflicts discovered
- Performance concerns identified
- Integration blockers found

**Recovery Flow:**

```
G3 FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── Architecture rejected → Go to Step 2A
    ├── Tech stack conflict → Go to Step 2B
    ├── Performance concern → Go to Step 2C
    ├── Integration blocker → Go to Step 2D
    │
    ▼
Step 2A: ARCHITECTURE REJECTION RECOVERY
    │
    ├── Ask: "What aspects concern you?"
    ├── Common concerns:
    │   - Too complex → Simplify, remove layers
    │   - Too simple → Add abstraction layers
    │   - Wrong tech choice → Present alternatives
    │   - Cost concerns → Optimize infrastructure
    ├── Document feedback in DECISIONS.md
    ├── Create Alternative Architecture (v2)
    ├── Present comparison table
    │
    ▼
Step 2B: TECH STACK CONFLICT RECOVERY
    │
    ├── Identify conflicting technologies
    ├── Research compatibility solutions
    ├── Options:
    │   A) Replace conflicting tech
    │   B) Add compatibility layer
    │   C) Accept limitation, document workaround
    ├── Update ARCHITECTURE.md with resolution
    │
    ▼
Step 2C: PERFORMANCE CONCERN RECOVERY
    │
    ├── Document specific concern:
    │   - Expected load (users, requests/sec)
    │   - Current design capacity estimate
    │   - Gap analysis
    ├── Propose optimizations:
    │   - Caching strategy
    │   - Database indexing
    │   - CDN usage
    │   - Horizontal scaling plan
    ├── Add performance targets to ARCHITECTURE.md
    │
    ▼
Step 2D: INTEGRATION BLOCKER RECOVERY
    │
    ├── Identify blocked integration
    ├── Research alternatives:
    │   - Different API/service
    │   - Self-hosted solution
    │   - Build custom component
    ├── Update architecture with new approach
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    └── Run: ./scripts/validate-project.sh [path] g3
```

---

### 7.3 G5 (Development) Recovery

**Failure Scenarios:**
- Build fails
- Tests fail
- Component rejected by user
- Code quality issues
- Performance regression

**Recovery Flow:**

```
G5.X FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── Build fails → Go to Step 2A
    ├── Tests fail → Go to Step 2B
    ├── Component rejected → Go to Step 2C
    ├── Code quality issues → Go to Step 2D
    ├── Performance regression → Go to Step 2E
    │
    ▼
Step 2A: BUILD FAILURE RECOVERY
    │
    ├── Run: npm run build 2>&1 | tee build-error.log
    ├── Parse error output:
    │   - TypeScript errors → Fix type issues
    │   - Import errors → Check paths, dependencies
    │   - Syntax errors → Fix code syntax
    │   - Missing dependencies → npm install
    ├── Fix ONE error at a time (cascade effect)
    ├── Re-run build after each fix
    ├── Commit when build passes
    │
    ▼
Step 2B: TEST FAILURE RECOVERY
    │
    ├── Run: npm test -- --verbose 2>&1 | tee test-error.log
    ├── For each failing test:
    │   1. Is test correct? → Fix implementation
    │   2. Is test wrong? → Fix test
    │   3. Is test flaky? → Stabilize or skip with TODO
    ├── Run specific test: npm test -- [test-file]
    ├── Ensure all tests pass before continuing
    │
    ▼
Step 2C: COMPONENT REJECTION RECOVERY
    │
    ├── Ask user: "What needs to change?"
    ├── Document feedback in DECISIONS.md
    ├── Categories:
    │   - Visual: Update styling
    │   - Functional: Fix behavior
    │   - UX: Improve interaction
    │   - Remove: Delete and rebuild
    ├── Make changes in isolation
    ├── Present updated component for approval
    │
    ▼
Step 2D: CODE QUALITY RECOVERY
    │
    ├── Run: npm run lint 2>&1 | tee lint-errors.log
    ├── Common issues:
    │   - ESLint errors → Fix or configure rules
    │   - Type safety → Add proper types
    │   - Unused imports → Clean up
    │   - Console.log → Remove or replace with logger
    ├── Run: npm run lint --fix (auto-fix where possible)
    ├── Manual fix remaining issues
    │
    ▼
Step 2E: PERFORMANCE REGRESSION RECOVERY
    │
    ├── Identify regression:
    │   - Run Lighthouse before/after
    │   - Check bundle size: npm run analyze
    │   - Profile React renders
    ├── Common fixes:
    │   - Large bundle → Code splitting, lazy loading
    │   - Slow renders → Memoization, virtualization
    │   - Memory leaks → Cleanup useEffect
    ├── Document fix in DECISIONS.md
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    ├── Run: npm run build && npm test
    └── Run: ./scripts/validate-project.sh [path] g5.X
```

---

### 7.4 G6 (Testing/QA) Recovery

**Failure Scenarios:**
- Test coverage below threshold
- Critical bugs found
- Accessibility failures
- Performance test failures

**Recovery Flow:**

```
G6 FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── Coverage < 80% → Go to Step 2A
    ├── Critical bug found → Go to Step 2B
    ├── Accessibility failure → Go to Step 2C
    ├── Performance failure → Go to Step 2D
    │
    ▼
Step 2A: COVERAGE RECOVERY
    │
    ├── Run: npm test -- --coverage
    ├── Identify uncovered files:
    │   - Generate coverage report
    │   - Sort by coverage % (ascending)
    ├── Prioritize:
    │   1. Business-critical code
    │   2. Complex functions
    │   3. Error handling paths
    ├── Write tests for top 5 uncovered areas
    ├── Re-run coverage check
    ├── If still < 80% after 3 attempts:
    │   → Escalate to user (see Section 4)
    │
    ▼
Step 2B: CRITICAL BUG RECOVERY
    │
    ├── Document bug:
    │   - Steps to reproduce
    │   - Expected vs actual behavior
    │   - Severity: CRITICAL/HIGH/MEDIUM/LOW
    ├── If CRITICAL:
    │   1. Stop all other work
    │   2. Revert to last known good state (git)
    │   3. Fix bug in isolation
    │   4. Add regression test
    │   5. Cherry-pick fix forward
    ├── If HIGH:
    │   1. Create bug fix branch
    │   2. Fix and test
    │   3. Add to current release
    ├── Update STATUS.md with bug status
    │
    ▼
Step 2C: ACCESSIBILITY RECOVERY
    │
    ├── Run: npx axe-core or Lighthouse accessibility
    ├── Common WCAG failures and fixes:
    │   - Missing alt text → Add alt="" or descriptive text
    │   - Low contrast → Adjust colors (4.5:1 ratio)
    │   - Missing labels → Add <label> or aria-label
    │   - Keyboard nav → Add tabIndex, focus management
    │   - Skip links → Add "skip to content" link
    ├── Fix issues by severity (critical first)
    ├── Re-run accessibility tests
    │
    ▼
Step 2D: PERFORMANCE RECOVERY
    │
    ├── Run performance tests:
    │   - Lighthouse: Performance score
    │   - Web Vitals: LCP, FID, CLS
    │   - Load test: k6 or similar
    ├── Identify bottlenecks:
    │   - Slow API calls → Caching, optimization
    │   - Large JS bundle → Code splitting
    │   - Image size → Compression, lazy loading
    │   - Render blocking → Defer, async scripts
    ├── Apply fixes incrementally
    ├── Measure improvement after each fix
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    └── Run: ./scripts/validate-project.sh [path] g6
```

---

### 7.5 G7 (Security) Recovery

**Failure Scenarios:**
- Critical/High vulnerabilities found
- Authentication/authorization issues
- Data exposure risks
- Secrets in code detected

**Recovery Flow:**

```
G7 FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── Critical vulnerability → Go to Step 2A
    ├── Auth issue → Go to Step 2B
    ├── Data exposure → Go to Step 2C
    ├── Secrets in code → Go to Step 2D
    │
    ▼
Step 2A: CRITICAL VULNERABILITY RECOVERY
    │
    ├── Run: npm audit --json
    ├── For each critical/high:
    │   1. Check if fix available: npm audit fix
    │   2. If no fix: Check if exploitable in our context
    │   3. If exploitable: Find alternative package
    │   4. If not exploitable: Document exception
    ├── NEVER proceed with known exploitable critical
    ├── Update THREAT_MODEL.md with findings
    │
    ▼
Step 2B: AUTH ISSUE RECOVERY
    │
    ├── Review auth implementation:
    │   - Token storage (httpOnly cookies, not localStorage)
    │   - Token expiry (short-lived access, refresh tokens)
    │   - Password hashing (bcrypt, 12+ rounds)
    │   - Session management (secure, httpOnly, sameSite)
    ├── Common fixes:
    │   - Add CSRF protection
    │   - Implement rate limiting
    │   - Add account lockout
    │   - Fix session fixation
    ├── Add auth-specific tests
    │
    ▼
Step 2C: DATA EXPOSURE RECOVERY
    │
    ├── Identify exposure:
    │   - API returns sensitive fields
    │   - Logs contain PII
    │   - Error messages reveal internals
    ├── Fixes:
    │   - Add response DTOs (filter fields)
    │   - Sanitize logs
    │   - Generic error messages externally
    │   - Add data classification
    ├── Review all API responses
    │
    ▼
Step 2D: SECRETS IN CODE RECOVERY
    │
    ├── IMMEDIATE ACTIONS:
    │   1. Revoke exposed secrets (API keys, etc.)
    │   2. Generate new secrets
    │   3. Remove from code history:
    │      git filter-branch or BFG Repo Cleaner
    ├── Prevent future exposure:
    │   - Add .env to .gitignore
    │   - Use secret scanning (GitHub, GitGuardian)
    │   - Add pre-commit hooks
    ├── Document incident in DECISIONS.md
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    ├── Run: ./scripts/validate-project.sh [path] security-full
    └── Run: ./scripts/validate-project.sh [path] g7
```

---

### 7.6 G8/G9 (Deployment) Recovery

**Failure Scenarios:**
- Deployment fails
- Production errors after deploy
- Rollback required
- Environment configuration issues

**Recovery Flow:**

```
G8/G9 FAILURE DETECTED
    │
    ▼
Step 1: IDENTIFY FAILURE TYPE
    │
    ├── Deployment fails → Go to Step 2A
    ├── Production errors → Go to Step 2B
    ├── Rollback needed → Go to Step 2C
    ├── Config issues → Go to Step 2D
    │
    ▼
Step 2A: DEPLOYMENT FAILURE RECOVERY
    │
    ├── Check deployment logs
    ├── Common causes:
    │   - Build fails in CI → Fix build locally first
    │   - Missing env vars → Add to deployment config
    │   - Permission issues → Check service accounts
    │   - Resource limits → Scale up or optimize
    ├── Fix and retry deployment
    ├── If 3 failures: Escalate to user
    │
    ▼
Step 2B: PRODUCTION ERROR RECOVERY
    │
    ├── Severity assessment:
    │   - Site down → Immediate rollback (Step 2C)
    │   - Partial failure → Hotfix or rollback
    │   - Minor issue → Schedule fix
    ├── Collect evidence:
    │   - Error logs
    │   - User reports
    │   - Monitoring alerts
    ├── Root cause analysis:
    │   - When did it start?
    │   - What changed?
    │   - What's the blast radius?
    │
    ▼
Step 2C: ROLLBACK PROCEDURE
    │
    ├── DECISION: Rollback needed?
    │   - User-impacting errors → YES
    │   - Data corruption risk → YES
    │   - Security vulnerability → YES
    │   - Minor UI bug → NO (hotfix instead)
    │
    ├── EXECUTE ROLLBACK:
    │   1. Notify stakeholders
    │   2. Execute rollback:
    │      - Vercel: vercel rollback [deployment-url]
    │      - Railway: railway rollback
    │      - Kubernetes: kubectl rollout undo
    │   3. Verify rollback successful
    │   4. Monitor for 15 minutes
    │
    ├── POST-ROLLBACK:
    │   1. Document in DECISIONS.md
    │   2. Root cause analysis
    │   3. Fix in development
    │   4. Add regression tests
    │   5. Re-attempt deployment
    │
    ▼
Step 2D: CONFIG ISSUE RECOVERY
    │
    ├── Compare environments:
    │   - Local vs staging vs production
    │   - Missing variables
    │   - Wrong values
    ├── Fix configuration:
    │   - Update .env.example
    │   - Update deployment secrets
    │   - Document in ARCHITECTURE.md
    ├── Test with staging before production
    │
    ▼
Step 3: VALIDATE & CONTINUE
    │
    └── Run: ./scripts/validate-project.sh [path] g9
```

---

## 8. Blocker Escalation Matrix

When recovery fails after maximum attempts, escalate based on this matrix:

| Blocker Type | Max Attempts | Escalate To | Action Required |
|--------------|--------------|-------------|-----------------|
| PRD unclear | 3 | User | Clarification session |
| Architecture rejected | 2 | User + Architect | Alternative design |
| Build failure | 5 | Backend Dev | Debug session |
| Test coverage < 80% | 3 | User | Accept or extend |
| Critical security vuln | 1 | User + Security | Block deployment |
| Deployment failure | 3 | DevOps + User | Infrastructure review |
| Production error | 1 | User | Rollback decision |

### Escalation Template

```markdown
## ESCALATION: [Blocker Type]

**Gate:** [Current Gate]
**Attempts:** [X] of [Max]
**Date:** YYYY-MM-DD

### Blocker Summary
[1-2 sentence description of the issue]

### Attempts Made
| Attempt | Action Taken | Result |
|---------|--------------|--------|
| 1 | [action] | [result] |
| 2 | [action] | [result] |
| 3 | [action] | [result] |

### Impact
- **Timeline:** [Delay estimate]
- **Scope:** [What's affected]
- **Risk:** [If not resolved]

### Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | [option] | [pros] | [cons] |
| B | [option] | [pros] | [cons] |
| C | [option] | [pros] | [cons] |

### Recommendation
[Your recommended option with rationale]

### Decision Required
Please choose an option: A / B / C / Other: ___
```

---

## 9. Recovery Metrics

Track recovery events to identify systemic issues:

```json
{
  "recovery_metrics": {
    "project": "[name]",
    "period": "YYYY-MM-DD to YYYY-MM-DD",
    "total_recoveries": 5,
    "by_type": {
      "partial_state": 1,
      "context_exhausted": 2,
      "session_abandoned": 1,
      "escalation": 1
    },
    "by_gate": {
      "G5.3": 2,
      "G6": 2,
      "G7": 1
    },
    "average_recovery_time_minutes": 15,
    "escalation_rate": "20%",
    "patterns_identified": [
      "G5.3 recoveries due to component complexity",
      "G6 recoveries due to test environment issues"
    ],
    "process_improvements": [
      "Added component complexity assessment before G5.3",
      "Created test environment setup script"
    ]
  }
}
```

---

## 10. Mid-Session Crash Recovery

When the orchestrator or agent crashes mid-session, or context is lost between gates.

### 10.1 Detection Scenarios

| Scenario | How to Detect | Recovery Path |
|----------|--------------|---------------|
| Crash after G3, before G4 spawn | G3 approved but G4 not started | Resume from G4 |
| Crash mid-G5 (between agents) | Some agents completed, others pending | Check handoffs |
| Crash after G5 agents, before G5 approval | All handoffs present but G5 pending | Resume G5 approval |
| Crash after staging deploy (G8) | Staging URL exists but G9 pending | Resume from G9 |

### 10.2 State Recovery Using .truth/truth.json

The TruthStore persists all state to `.truth/truth.json`. This is the single source of truth for recovery.

**Key fields to check:**

```json
{
  "gates": {
    "G1": { "status": "approved", "approved_at": "..." },
    "G2": { "status": "approved", "approved_at": "..." },
    "G3": { "status": "approved", "approved_at": "..." },
    "G4": { "status": "skipped" },
    "G5": { "status": "pending" }
  },
  "agent_spawns": [
    { "agent_name": "Frontend Developer", "gate": "G5", "status": "completed" },
    { "agent_name": "Backend Developer", "gate": "G5", "status": "running" }
  ],
  "handoffs": [
    { "from_agent": "Frontend Developer", "to_agent": "QA Engineer", "gate": "G5", "status": "complete" }
  ]
}
```

### 10.3 Recovery Procedure

```
SESSION CRASHED / CONTEXT LOST
    │
    ▼
Step 1: READ TRUTH STORE
    │
    ├── Read: .truth/truth.json
    ├── Check: gates → which gates approved/pending
    ├── Check: agent_spawns → which agents completed
    ├── Check: handoffs → which handoffs recorded
    │
    ▼
Step 2: IDENTIFY RECOVERY POINT
    │
    ├── Case A: Between gates
    │   └── Resume from next unapproved gate
    │
    ├── Case B: Mid-G5 (some agents completed)
    │   └── Check which agents have handoffs
    │   └── Resume by spawning remaining agents
    │
    ├── Case C: All G5 agents done, G5 not approved
    │   └── Resume by presenting G5 for approval
    │
    ├── Case D: G5 approved, G6-G8 not complete
    │   └── Resume from next unapproved gate
    │
    ▼
Step 3: VERIFY CODE STATE
    │
    ├── Run: git status
    ├── Run: npm run build (if applicable)
    ├── Run: npm test (if applicable)
    │
    ├── If build/tests pass → Code state is good
    ├── If build/tests fail → May need to fix before resuming
    │
    ▼
Step 4: PRESENT RECOVERY STATUS
    │
    └── "Session recovered from .truth/truth.json.
         Last approved gate: G3
         Pending agents: Backend Developer (G5)
         Ready to continue?"
```

### 10.4 G5 Sub-Gate Recovery

G5 has multiple sub-gates (G5.1-G5.5). Recovery depends on progress tracking.

**Check agent_spawns and handoffs:**

```
G5 Recovery Decision Tree:
    │
    ├── No agent_spawns for G5?
    │   └── Start fresh: spawn all required agents
    │
    ├── Some spawns, no completions?
    │   └── Check if agents are still running
    │   └── If timeout exceeded: re-spawn failed agents
    │
    ├── Some completions, some pending?
    │   └── Check handoffs for completed agents
    │   └── Spawn only the missing agents
    │
    └── All completions, no G5 approval?
        └── All handoffs should exist
        └── Present G5 for approval
```

### 10.5 AI/ML Project Recovery (ai_ml/hybrid)

For AI/ML projects, G5 requires additional agents:

| Standard G5 | AI/ML G5 |
|-------------|----------|
| Frontend Developer | Frontend Developer |
| Backend Developer | Backend Developer |
| - | ML Engineer |
| - | Prompt Engineer |

**Recovery check for AI/ML:**

```
Check .truth/truth.json for:
- project_type in state → "ai_ml" or "hybrid"

If AI/ML project:
  Required G5 agents = [Frontend, Backend, ML Engineer, Prompt Engineer]
  Check agent_spawns for all 4
  Check handoffs for all 4
```

### 10.6 Recovery Commands

```bash
# Check truth store state
cat .truth/truth.json | jq '.gates'
cat .truth/truth.json | jq '.agent_spawns'
cat .truth/truth.json | jq '.handoffs'

# Check project type
cat docs/STATUS.md | grep -i "project_type"

# Verify code state
git status
npm run build
npm test

# Check for uncommitted agent work
git diff HEAD
git log --oneline -5
```

### 10.7 Recovery Template

```markdown
## Session Recovery Report

**Recovered At:** YYYY-MM-DDTHH:MM:SSZ
**Recovery Method:** .truth/truth.json analysis

### Gate Status (from truth store)
| Gate | Status | Timestamp |
|------|--------|-----------|
| G1 | approved | 2024-01-01T10:00:00Z |
| G2 | approved | 2024-01-01T11:00:00Z |
| G3 | approved | 2024-01-01T12:00:00Z |
| G4 | skipped | 2024-01-01T12:05:00Z |
| G5 | pending | - |

### Agent Spawn Status (G5)
| Agent | Status | Handoff |
|-------|--------|---------|
| Frontend Developer | completed | ✅ |
| Backend Developer | running | ❌ |
| ML Engineer | not_spawned | - |
| Prompt Engineer | not_spawned | - |

### Code State
- Build: ✅ Passes
- Tests: ✅ 45/45 passing
- Git: Clean working tree

### Recovery Action
1. Backend Developer spawn appears stalled - will re-spawn
2. ML Engineer needs to be spawned (AI/ML project)
3. Prompt Engineer needs to be spawned (AI/ML project)

### Resume Point
Spawn remaining G5 agents: [Backend Developer, ML Engineer, Prompt Engineer]
```

---

## Version

**Version:** 2.2.0
**Created:** 2024-12-11
**Updated:** 2026-01-08
**Purpose:** Define recovery procedures for all failure modes with phase-specific flows
**Changes:**
- 2.2.0: Added Section 10 - Mid-Session Crash Recovery with truth store analysis
- 2.1.0: Added self-healing protocol integration
