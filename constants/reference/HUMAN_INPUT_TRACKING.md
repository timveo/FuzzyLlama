# Human Input Tracking Protocol

> **Purpose:** Ensure ALL human input is captured, modifications are tracked, and the impact of human decisions is traceable throughout the project lifecycle.

---

## Overview

This protocol ensures:
1. **Every human input is captured** - No feedback is lost
2. **Modifications are linked to input** - Changes traceable to user decisions
3. **Impact is measurable** - Understand how human input shapes the project
4. **Audit trail exists** - Complete history of human-AI collaboration

---

## Input Types

| Input Type | When Captured | Where Stored |
|------------|---------------|--------------|
| **Initial Requirements** | G1 Intake | `docs/INTAKE.md` |
| **Gate Approvals** | G1-G9 | `docs/DECISIONS.md` |
| **Feedback/Corrections** | Any time | `docs/FEEDBACK_LOG.md` |
| **Change Requests** | Any time | `docs/CHANGE_REQUESTS.md` |
| **Clarifications** | When asked | `docs/DECISIONS.md` |
| **Preference Choices** | When presented | `docs/DECISIONS.md` |
| **Rejections/Revisions** | At gates | `docs/FEEDBACK_LOG.md` |

---

## 1. INTAKE.md - Initial Requirements

**Purpose:** Capture the user's original vision and requirements.

### Required Fields

```markdown
# Project Intake

**Project:** [name]
**Date:** YYYY-MM-DD
**User Type:** [Novice / Intermediate / Expert]

---

## Q1: What are you building?

**User Response:**
> [Exact user response - verbatim]

**Interpreted As:**
- Primary function: [interpretation]
- Target users: [interpretation]
- Core value proposition: [interpretation]

---

## Q2: What type of project is this?

**User Response:**
> [Exact user response]

**Classified As:** [traditional / ai_ml / hybrid / enhancement]
**Classification Reasoning:** [why this classification]

---

## Q3: What is the scale/complexity?

**User Response:**
> [Exact user response]

**Interpreted Scale:**
- Users at launch: [number]
- Features scope: [small / medium / large]
- Timeline expectation: [if mentioned]

---

## Q4: Are there AI/ML components?

**User Response:**
> [Exact user response]

**AI Components Identified:**
- [Component 1]: [description]
- [Component 2]: [description]

---

## Q5: Any constraints or requirements?

**User Response:**
> [Exact user response]

**Constraints Captured:**
| Constraint | Type | Impact |
|------------|------|--------|
| [constraint] | [budget/timeline/tech/compliance] | [high/medium/low] |

---

## Additional Context Provided

**User Said:**
> [Any additional context verbatim]

**Interpreted As:**
- [interpretation 1]
- [interpretation 2]

---

## Intake Summary

| Aspect | User Said | System Interpreted |
|--------|-----------|-------------------|
| Project Type | "[quote]" | [classification] |
| Scale | "[quote]" | [interpretation] |
| Key Features | "[quote]" | [list] |
| Constraints | "[quote]" | [list] |

---

## Confirmation

**Presented to User:**
> [Summary that was presented for confirmation]

**User Confirmed:** [Yes / No / With modifications]
**Modifications Requested:**
- [modification 1]
- [modification 2]
```

---

## 2. FEEDBACK_LOG.md - Continuous Feedback Tracking

**Purpose:** Capture ALL feedback, corrections, and guidance provided by users throughout the project.

### Template

```markdown
# Feedback Log

**Project:** [name]
**Last Updated:** YYYY-MM-DD

---

## Feedback Entry Format

Each feedback entry must include:
1. **Timestamp** - When feedback was given
2. **Context** - What was being reviewed
3. **Verbatim Input** - Exact user words
4. **Interpreted Action** - What we understood
5. **Modifications Made** - What changed
6. **Files Affected** - What was modified
7. **Verification** - How we confirmed the change was correct

---

## Feedback Entries

### FB-001: [Brief Description]

**Date:** YYYY-MM-DD HH:MM
**Gate/Phase:** [G2 / G5.3 / etc.]
**Context:** [What was being presented/reviewed]

**User Input (Verbatim):**
> [Exact words from user]

**Interpretation:**
We understood this to mean: [interpretation]

**Action Taken:**
| Action | File | Before | After |
|--------|------|--------|-------|
| [action] | [file] | [before state] | [after state] |

**Verification:**
- [ ] Change implemented
- [ ] User confirmed change is correct
- [ ] Tests updated (if applicable)
- [ ] Documentation updated

**Follow-up Feedback:** [None / See FB-XXX]

---

### FB-002: [Brief Description]

[Same format...]

---

## Feedback Summary by Phase

| Phase | Feedback Count | Major Changes | Minor Changes |
|-------|---------------|---------------|---------------|
| G2 (PRD) | X | Y | Z |
| G3 (Arch) | X | Y | Z |
| G5.X (Dev) | X | Y | Z |
| G6 (Test) | X | Y | Z |
| G7 (Sec) | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

---

## Feedback Patterns

### Recurring Themes
- [Theme 1]: Mentioned X times
- [Theme 2]: Mentioned X times

### Learnings for Future
- [Learning 1]
- [Learning 2]
```

---

## 3. CHANGE_REQUESTS.md - Formal Change Tracking

**Purpose:** Track formal changes to approved deliverables (scope changes, requirement changes).

### Template

```markdown
# Change Request Log

**Project:** [name]
**Last Updated:** YYYY-MM-DD

---

## Change Request Format

### CR-001: [Title]

**Submitted:** YYYY-MM-DD
**Submitted By:** [User / Agent]
**Status:** [Pending / Approved / Rejected / Implemented]

#### Original State
**Document:** [PRD.md / ARCHITECTURE.md / etc.]
**Section:** [section name]
**Original Content:**
```
[original text/specification]
```

#### Requested Change
**User Request (Verbatim):**
> [Exact words]

**Interpreted Change:**
[What we understood the change to be]

#### Impact Analysis

| Impact Area | Before | After | Severity |
|-------------|--------|-------|----------|
| Scope | [before] | [after] | [High/Med/Low] |
| Timeline | [before] | [after] | [High/Med/Low] |
| Architecture | [before] | [after] | [High/Med/Low] |
| Cost | [before] | [after] | [High/Med/Low] |

**Affected Documents:**
- [ ] PRD.md
- [ ] ARCHITECTURE.md
- [ ] [other]

**Affected Code:**
- [ ] [file/component]

#### Decision

**Presented to User:**
> [Summary of impact analysis presented]

**User Decision:** [Approved / Rejected / Modified]
**Decision Date:** YYYY-MM-DD
**Decision Rationale:**
> [User's reasoning if provided]

#### Implementation

**Implemented:** [Yes / No / Partial]
**Implementation Date:** YYYY-MM-DD
**Changes Made:**

| File | Change Description | Commit |
|------|-------------------|--------|
| [file] | [description] | [hash] |

**Verification:**
- [ ] Change matches user request
- [ ] User confirmed implementation
- [ ] Related documents updated
- [ ] Tests pass

---

## Change Request Summary

| ID | Title | Status | Impact | Approved By |
|----|-------|--------|--------|-------------|
| CR-001 | [title] | [status] | [H/M/L] | [user] |
| CR-002 | [title] | [status] | [H/M/L] | [user] |
```

---

## 4. DECISIONS.md - Enhanced Decision Tracking

**Addition to existing template:**

```markdown
## Human Input Trail

For each decision, track the human input that led to it:

### DECISION-XXX: [Title]

**Human Input That Triggered This Decision:**
> [Exact user input that led to this decision point]

**Input Classification:**
- Type: [Question / Feedback / Approval / Rejection / Preference]
- Source: [Gate approval / Ad-hoc feedback / Clarification request]

**Options Presented to Human:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | [desc] | [pros] | [cons] |
| B | [desc] | [pros] | [cons] |
| C | [desc] | [pros] | [cons] |

**Human Response (Verbatim):**
> [Exact response]

**Interpreted Decision:** [Option X with modifications]

**Modifications from Human Input:**
1. [modification 1]
2. [modification 2]

**Implementation of Decision:**

| Change | File | Before | After |
|--------|------|--------|-------|
| [change] | [file] | [before] | [after] |

**Verification:**
- [ ] Human confirmed interpretation correct
- [ ] Changes implemented as understood
- [ ] Human saw and approved final result
```

---

## 5. Input Capture Protocol

### At Every Human Interaction

```
HUMAN INPUT DETECTED
    │
    ▼
Step 1: CAPTURE VERBATIM
    │
    ├── Record exact words
    ├── Include timestamp
    ├── Note context (what was being discussed)
    │
    ▼
Step 2: INTERPRET
    │
    ├── State interpretation clearly
    ├── If ambiguous, ask for clarification
    ├── Document interpretation in relevant log
    │
    ▼
Step 3: VERIFY INTERPRETATION
    │
    ├── Present interpretation back to user
    ├── "I understand you want X. Is that correct?"
    ├── Wait for confirmation
    │
    ▼
Step 4: IMPLEMENT
    │
    ├── Make changes based on confirmed interpretation
    ├── Document changes made
    ├── Link to original input (FB-XXX, CR-XXX)
    │
    ▼
Step 5: VERIFY IMPLEMENTATION
    │
    ├── Show user the change
    ├── Confirm it matches their intent
    ├── If not, return to Step 1
    │
    ▼
Step 6: LOG
    │
    └── Update FEEDBACK_LOG.md or CHANGE_REQUESTS.md
```

---

## 6. Modification Tracking

### Code Modification Tracking

When code changes based on human input:

```markdown
## CODE-MOD-XXX

**Input Reference:** FB-XXX / CR-XXX / DEC-XXX
**Date:** YYYY-MM-DD

### Human Input
> [Verbatim input that triggered this change]

### Files Modified

| File | Line(s) | Change Type | Description |
|------|---------|-------------|-------------|
| [file] | [lines] | [add/modify/delete] | [description] |

### Before

```[language]
[original code]
```

### After

```[language]
[modified code]
```

### Git Commit
```
commit [hash]
Author: [agent]
Date: YYYY-MM-DD

    [Commit message]

    Based on user feedback (FB-XXX): "[brief quote]"
```

### Verification
- [ ] Code compiles
- [ ] Tests pass
- [ ] User confirmed change is correct
```

### Document Modification Tracking

When documents change based on human input:

```markdown
## DOC-MOD-XXX

**Input Reference:** FB-XXX / CR-XXX / DEC-XXX
**Date:** YYYY-MM-DD
**Document:** [document name]

### Human Input
> [Verbatim input]

### Section Modified
**Section:** [section name]

### Before
> [Original text]

### After
> [Modified text]

### Reason for Change
[Why this change addresses the human input]

### Verification
- [ ] Document updated
- [ ] Change matches user intent
- [ ] Related documents checked for consistency
```

---

## 7. Input Audit Trail

### Weekly Input Summary

Generate weekly:

```markdown
## Input Summary: Week of YYYY-MM-DD

### Total Human Inputs: X

| Type | Count | Major Impact | Minor Impact |
|------|-------|--------------|--------------|
| Approvals | X | Y | Z |
| Feedback | X | Y | Z |
| Corrections | X | Y | Z |
| Change Requests | X | Y | Z |
| Clarifications | X | Y | Z |

### Key Inputs This Week

1. **[Input Type]:** "[Brief quote]"
   - Impact: [description]
   - Files affected: [list]

2. **[Input Type]:** "[Brief quote]"
   - Impact: [description]
   - Files affected: [list]

### Pending Actions from Human Input

| Input ID | Description | Status | Assigned To |
|----------|-------------|--------|-------------|
| FB-XXX | [desc] | [status] | [agent] |

### Patterns Observed

- [Pattern 1]
- [Pattern 2]
```

### Project-End Input Report

```markdown
## Human Input Report: [Project Name]

**Project Duration:** YYYY-MM-DD to YYYY-MM-DD
**Total Human Inputs:** XXX

### Input Statistics

| Category | Count | % of Total |
|----------|-------|------------|
| Initial Requirements | X | X% |
| Gate Approvals | X | X% |
| Feedback/Corrections | X | X% |
| Change Requests | X | X% |
| Clarifications | X | X% |

### Impact Analysis

#### Requirements Changes
- Original requirements: X
- Final requirements: Y
- Net change: +/-Z%
- Key changes driven by human input:
  1. [change 1]
  2. [change 2]

#### Architecture Changes
- Original decisions: X
- Changed based on feedback: Y
- Key architectural changes:
  1. [change 1]
  2. [change 2]

#### Code Modifications
- Total code modifications from feedback: X
- Files affected: Y
- Lines changed: Z

### Feedback Response Metrics

| Metric | Value |
|--------|-------|
| Average response time to feedback | X hours |
| First-attempt accuracy rate | X% |
| Revision cycles per gate | X |
| User satisfaction (if captured) | X/10 |

### Lessons Learned

#### What Worked
- [lesson 1]
- [lesson 2]

#### What Could Improve
- [improvement 1]
- [improvement 2]

### Recommendations for Future

Based on human input patterns:
1. [recommendation 1]
2. [recommendation 2]
```

---

## 8. Integration with Existing Systems

### Update to APPROVAL_GATES.md

Add to each gate approval:

```markdown
### Human Input Captured at This Gate

**Gate:** [gate name]

#### Pre-Approval Input
> [Any feedback given before formal approval]

#### Approval Input
**Decision:** [Approved / Rejected / Modified]
**Exact Response:**
> [Verbatim response]

#### Modifications Requested
- [modification 1]
- [modification 2]

#### Modifications Implemented
| Modification | Status | Verification |
|--------------|--------|--------------|
| [mod 1] | [done/pending] | [verified by user?] |
```

### Update to STATE_DEFINITIONS.md

Add to each gate:

```yaml
HUMAN_INPUT_REQUIREMENTS:
  - Must capture verbatim approval/rejection
  - Must document any requested modifications
  - Must link modifications to implementation
  - Must verify implementation matches intent
```

---

## 9. Validation Checklist

Before advancing to any gate, verify:

- [ ] All human inputs captured in appropriate log
- [ ] Interpretations verified with user
- [ ] Modifications linked to original input
- [ ] Implementation verified against intent
- [ ] Documentation updated

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Comprehensive human input tracking and modification traceability
