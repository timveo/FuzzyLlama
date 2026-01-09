# Retrospective Protocol

> **MANDATORY: Run this protocol at the END of every project.**
> **This is how the agent system learns and improves.**

---

## When to Run

Run a retrospective when:
- Project reaches `completed` or `maintenance` phase
- User explicitly requests a retrospective
- Project is abandoned or paused indefinitely
- Significant issues occurred during the project

---

## Retrospective Process

### Step 1: Run Validation

```bash
# Run full validation on the completed project
./scripts/validate-project.sh /path/to/project full
```

Record the results:
- Number of errors
- Number of warnings
- Specific failures

### Step 2: Protocol Compliance Check

Review each gate and document compliance:

```markdown
## Protocol Compliance

| Gate | Completed? | Issues |
|------|------------|--------|
| Startup Message | Yes/No | [issues] |
| Intake Questions (5) | Yes/No | [issues] |
| G1 - Intake Approval | Yes/No | [issues] |
| G2 - PRD Approval | Yes/No | [issues] |
| G3 - Architecture Approval | Yes/No | [issues] |
| G5.1 - Foundation | Yes/No | [issues] |
| G5.2 - Data Layer | Yes/No | [issues] |
| G5.3 - Components | Yes/No | [issues] |
| G5.4 - Integration | Yes/No | [issues] |
| G5.5 - Polish | Yes/No | [issues] |
| DECISIONS.md maintained | Yes/No | [issues] |
| PROJECT_STATE.md maintained | Yes/No | [issues] |
```

### Step 3: Gather Feedback

Ask the user these questions:

```markdown
---
## Project Retrospective

The project is complete. To help improve future projects, please share your feedback:

### 1. What worked well?
- What aspects of this process did you find helpful?
- Which explanations or checkpoints were valuable?

### 2. What could be improved?
- Where did you feel confused or disconnected?
- What would you change about the process?

### 3. Did you learn what you wanted to learn?
- Rate 1-5: How much did you learn during this project?
- What topics would you like more explanation on?

### 4. Final thoughts?
- Any other feedback or suggestions?
---
```

### Step 4: Analyze and Document

Create a retrospective summary:

```markdown
## Retrospective Summary: [Project Name]

**Date:** YYYY-MM-DD
**Project Type:** [greenfield/enhancement]
**Duration:** [time from start to completion]
**Final Status:** [completed/abandoned/paused]

### What Went Well
1. [Item 1]
2. [Item 2]
3. [Item 3]

### What Went Poorly
1. [Item 1] - Root cause: [cause]
2. [Item 2] - Root cause: [cause]
3. [Item 3] - Root cause: [cause]

### Protocol Violations
- [Violation 1]: [impact]
- [Violation 2]: [impact]

### Technical Learnings
- [Learning 1]
- [Learning 2]

### Process Learnings
- [Learning 1]
- [Learning 2]

### Recommended System Changes
1. [Change 1] - Priority: [High/Medium/Low]
2. [Change 2] - Priority: [High/Medium/Low]
```

### Step 5: Update System Memory

**MANDATORY:** Update `docs/SYSTEM_MEMORY.md` with:

1. **Project Statistics** - Increment project count
2. **Critical Learnings** - Add any new critical lessons
3. **Protocol Violations Log** - Add any violations
4. **Successful Patterns** - Add patterns that worked
5. **Known Technical Gotchas** - Add technical discoveries
6. **Project History** - Add project entry

### Step 6: Implement Improvements (If Needed)

If the retrospective identified systemic issues:

1. **Document the issue** in SYSTEM_MEMORY.md "Pending Improvements"
2. **Propose a fix** with specific file changes
3. **Get user approval** before modifying agent system files
4. **Implement the fix** in the agent system
5. **Update SYSTEM_MEMORY.md** "System Improvements Made" section

---

## Quick Retrospective Template

For simple projects or when time is limited:

```markdown
## Quick Retro: [Project Name]

**Date:** YYYY-MM-DD
**Worked:** [1-2 things that went well]
**Improve:** [1-2 things to improve]
**Violations:** [Any protocol violations? Y/N]
**Action:** [One specific action to take]
```

---

## Retrospective Triggers

The orchestrator should prompt for retrospective when:

| Trigger | Action |
|---------|--------|
| User says "done", "finished", "complete" | Offer retrospective |
| Project moves to `maintenance` phase | Require retrospective |
| User says "retrospective", "retro", "review" | Start retrospective |
| More than 3 protocol violations detected | Require retrospective |

---

## Example Retrospective

```markdown
## Retrospective Summary: ETF Tracker

**Date:** 2024-12-10
**Project Type:** Greenfield
**Duration:** ~2 hours
**Final Status:** Completed (with issues)

### What Went Well
1. Final app works correctly - displays stock data, charts function
2. TanStack Query integration - clean data fetching
3. CORS fix discovered - reusable pattern for future projects

### What Went Poorly
1. Skipped startup message - Root cause: Trigger words activated but protocol not followed
2. Skipped all development checkpoints - Root cause: No enforcement mechanism
3. No DECISIONS.md created - Root cause: No reminder in protocol

### Protocol Violations
- Startup message skipped: User disconnected from process
- G5.1-G5.5 skipped: No course correction opportunities
- DECISIONS.md missing: No decision audit trail

### Technical Learnings
- Yahoo Finance requires CORS proxy
- TypeScript verbatimModuleSyntax requires `import type`
- Tailwind v4 uses different config approach

### Process Learnings
- Initial user experience is critical
- Checkpoints must be enforced, not optional
- Decision logging needs automation/reminders

### Recommended System Changes
1. Add "DO NOT" rules to MANDATORY_STARTUP.md - Priority: High [DONE]
2. Add checkpoint enforcement to orchestrator.md - Priority: High [DONE]
3. Create validation script - Priority: Medium [DONE]
4. Create system memory file - Priority: Medium [DONE]
```

---

## Integration with Orchestrator

Add to orchestrator commands:

```
| "Run retrospective" | Follow retrospective protocol |
| "What did we learn?" | Summarize project learnings |
| "Update system memory" | Add learnings to SYSTEM_MEMORY.md |
```

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-10
**Purpose:** Ensure learnings persist across projects
