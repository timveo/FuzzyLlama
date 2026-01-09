# Conflict Resolution Framework

> **This framework provides structured decision trees for resolving conflicts between agents, requirements, and constraints.**

---

## Overview

Conflicts are normal in complex projects. This framework ensures:
1. Conflicts are identified early
2. Resolution follows a consistent process
3. Decisions are documented
4. User maintains control over critical choices

---

## Conflict Types

| Type | Description | Resolution Owner |
|------|-------------|------------------|
| Architecture Disagreement | Agents propose different technical approaches | User + Architect |
| Requirement Conflict | Feature violates locked constraint | User + Product Manager |
| Resource Conflict | Timeline vs quality vs scope trade-off | User |
| Technical Dependency | Circular or blocking dependencies | Architect |
| Design Conflict | UX vs technical feasibility | User + UX Designer |
| Security vs Usability | Security requirement impacts UX | User + Security Engineer |

---

## 1. Architecture Disagreement

**When agents propose different technical solutions.**

### Detection Signals
- Multiple valid approaches identified
- Agent expresses uncertainty: "We could either..."
- Different agents recommend different tools/patterns
- User asks "which approach is better?"

### Decision Tree

```
ARCHITECTURE DISAGREEMENT DETECTED
    │
    ▼
Step 1: DOCUMENT BOTH APPROACHES
    │
    ├── Approach A:
    │   - Technology/pattern
    │   - Pros
    │   - Cons
    │   - Estimated effort
    │   - Long-term implications
    │
    ├── Approach B:
    │   - Technology/pattern
    │   - Pros
    │   - Cons
    │   - Estimated effort
    │   - Long-term implications
    │
    ▼
Step 2: CHECK CONSTRAINTS
    │
    ├── Does either violate locked constraints?
    │   - YES → Eliminate that approach
    │   - NO → Continue
    │
    ├── Does either conflict with approved architecture?
    │   - YES → Eliminate that approach
    │   - NO → Continue
    │
    ▼
Step 3: EVALUATE AGAINST SUCCESS METRICS
    │
    ├── Which better supports:
    │   - Performance requirements?
    │   - Scalability needs?
    │   - Maintainability goals?
    │   - Team expertise?
    │   - Budget constraints?
    │
    ▼
Step 4: PRESENT TO USER
    │
    ├── Use comparison template (below)
    ├── Provide recommendation with rationale
    ├── Wait for user decision
    │
    ▼
Step 5: DOCUMENT & IMPLEMENT
    │
    └── Log in DECISIONS.md with full context
```

### Comparison Template

```markdown
## ARCH-CONFLICT-XXX: [Brief Description]

**Date:** YYYY-MM-DD
**Agents Involved:** [list]
**Component:** [what's being decided]

### Context
[Why this decision needs to be made]

### Option A: [Name]
**Technology:** [tech stack]
**Proposed By:** [agent]

| Aspect | Assessment |
|--------|------------|
| Performance | [rating + explanation] |
| Scalability | [rating + explanation] |
| Maintainability | [rating + explanation] |
| Learning Curve | [rating + explanation] |
| Community Support | [rating + explanation] |
| Cost | [estimate] |

**Pros:**
- [pro 1]
- [pro 2]

**Cons:**
- [con 1]
- [con 2]

### Option B: [Name]
**Technology:** [tech stack]
**Proposed By:** [agent]

| Aspect | Assessment |
|--------|------------|
| Performance | [rating + explanation] |
| Scalability | [rating + explanation] |
| Maintainability | [rating + explanation] |
| Learning Curve | [rating + explanation] |
| Community Support | [rating + explanation] |
| Cost | [estimate] |

**Pros:**
- [pro 1]
- [pro 2]

**Cons:**
- [con 1]
- [con 2]

### Recommendation
**Recommended:** Option [A/B]
**Rationale:** [why this is recommended]

### User Decision
**Chosen:** ___
**Date:** ___
**Additional Notes:** ___
```

---

## 2. Requirement Conflict

**When a new requirement conflicts with locked constraints or approved decisions.**

### Detection Signals
- Feature request contradicts PRD
- New requirement conflicts with locked component
- Scope change impacts approved architecture
- "But we agreed to..." discussions

### Decision Tree

```
REQUIREMENT CONFLICT DETECTED
    │
    ▼
Step 1: IDENTIFY THE CONFLICT
    │
    ├── New Requirement: [what user/agent is requesting]
    ├── Conflicting Constraint: [what it conflicts with]
    ├── Source of Constraint: [PRD, Architecture, User decision]
    │
    ▼
Step 2: ASSESS SEVERITY
    │
    ├── CRITICAL (blocks project):
    │   → Must resolve before continuing
    │   → Escalate to user immediately
    │
    ├── HIGH (impacts architecture):
    │   → Resolve before next gate
    │   → May require re-approval
    │
    ├── MEDIUM (impacts scope):
    │   → Can defer to next planning session
    │   → Document for backlog
    │
    ├── LOW (cosmetic conflict):
    │   → Make judgment call
    │   → Document decision
    │
    ▼
Step 3: DETERMINE OPTIONS
    │
    ├── Option A: REJECT new requirement
    │   - Keep original constraint
    │   - Document why rejected
    │
    ├── Option B: MODIFY new requirement
    │   - Find compromise that satisfies both
    │   - Document adaptation
    │
    ├── Option C: UNLOCK constraint
    │   - Get user approval to change locked item
    │   - Update all affected documents
    │   - May require re-approval of gates
    │
    ├── Option D: SCOPE SPLIT
    │   - Move conflicting feature to v2
    │   - Keep current scope intact
    │
    ▼
Step 4: PRESENT TO USER
    │
    ├── Show conflict clearly
    ├── Explain each option's impact
    ├── Provide recommendation
    ├── Get explicit approval
    │
    ▼
Step 5: EXECUTE & DOCUMENT
    │
    ├── Update relevant documents
    ├── Log in DECISIONS.md
    └── Notify affected agents
```

### Conflict Resolution Template

```markdown
## REQ-CONFLICT-XXX: [Brief Description]

**Date:** YYYY-MM-DD
**Reported By:** [agent/user]
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]

### The Conflict

**New Requirement:**
> [exact text of new requirement]

**Conflicting Constraint:**
> [exact text of original constraint]

**Source:** [PRD section/Architecture decision/User statement]
**Locked:** [Yes/No]

### Impact Analysis

| If We Accept New Requirement | If We Keep Original Constraint |
|------------------------------|--------------------------------|
| [impact 1] | [impact 1] |
| [impact 2] | [impact 2] |
| [impact 3] | [impact 3] |

### Resolution Options

| Option | Description | Impact | Effort |
|--------|-------------|--------|--------|
| A | Reject new requirement | [impact] | None |
| B | Modify requirement to [X] | [impact] | [effort] |
| C | Unlock constraint, change to [X] | [impact] | [effort] |
| D | Defer to v2 | [impact] | None |

### Recommendation
**Recommended:** Option [X]
**Rationale:** [explanation]

### Decision
**User Choice:** ___
**Date:** ___
**Documents to Update:**
- [ ] PRD.md
- [ ] ARCHITECTURE.md
- [ ] [other]
```

---

## 3. Resource Conflict (Iron Triangle)

**When timeline, quality, or scope must be traded off.**

### The Iron Triangle

```
        SCOPE
          △
         /|\
        / | \
       /  |  \
      /   |   \
     /    |    \
    /     |     \
   /_______|______\
TIMELINE ←----→ QUALITY

You can optimize for TWO, but not all three.
```

### Detection Signals
- Deadline pressure with incomplete features
- Quality issues discovered late
- "We don't have time to test this properly"
- User asks to add features without extending timeline

### Decision Tree

```
RESOURCE CONFLICT DETECTED
    │
    ▼
Step 1: IDENTIFY CURRENT STATE
    │
    ├── Timeline: [remaining time]
    ├── Scope: [remaining features, % complete]
    ├── Quality: [test coverage, bug count, debt]
    │
    ▼
Step 2: DETERMINE CONSTRAINTS
    │
    ├── Is timeline FIXED? (e.g., launch event)
    │   → Can only adjust scope or quality
    │
    ├── Is scope FIXED? (e.g., contractual)
    │   → Can only adjust timeline or quality
    │
    ├── Is quality FIXED? (e.g., safety critical)
    │   → Can only adjust timeline or scope
    │
    ▼
Step 3: PRESENT TRADE-OFF OPTIONS
    │
    ├── Option A: REDUCE SCOPE
    │   - Cut features to hit deadline
    │   - Maintain quality
    │   - List what gets cut
    │
    ├── Option B: EXTEND TIMELINE
    │   - Keep all features
    │   - Maintain quality
    │   - Estimate new deadline
    │
    ├── Option C: REDUCE QUALITY
    │   - Keep features and deadline
    │   - Accept technical debt
    │   - Document debt created
    │
    ├── Option D: HYBRID
    │   - Slight reduction in each area
    │   - Balanced trade-off
    │
    ▼
Step 4: USER DECIDES
    │
    └── Document decision and rationale
```

### Trade-off Template

```markdown
## RESOURCE-CONFLICT-XXX: [Brief Description]

**Date:** YYYY-MM-DD
**Gate:** [current gate]
**Deadline:** [if applicable]

### Current State

| Dimension | Status | Details |
|-----------|--------|---------|
| Timeline | [X days remaining] | [milestone dates] |
| Scope | [X/Y features complete] | [list incomplete] |
| Quality | [X% coverage, Y bugs] | [quality metrics] |

### Constraint
**FIXED:** [Timeline/Scope/Quality]
**Reason:** [why this cannot change]

### Options

#### Option A: Reduce Scope
**Cut these features:**
- [ ] [Feature 1] - saves [X days]
- [ ] [Feature 2] - saves [X days]

**Impact:** [user impact of cutting]
**Recommendation:** [Yes/No] - [rationale]

#### Option B: Extend Timeline
**New deadline:** [date]
**Delay:** [X days/weeks]

**Impact:** [business impact of delay]
**Recommendation:** [Yes/No] - [rationale]

#### Option C: Accept Technical Debt
**Debt items:**
- [ ] Skip [test type] - saves [X days]
- [ ] Defer [refactoring] - saves [X days]

**Future cost:** [estimated time to repay]
**Risk:** [what could go wrong]
**Recommendation:** [Yes/No] - [rationale]

#### Option D: Hybrid Approach
- Scope: Cut [feature X]
- Timeline: Extend by [Y days]
- Quality: Defer [Z tests] to post-launch

**Impact:** [combined impact]
**Recommendation:** [Yes/No] - [rationale]

### Recommendation
**Recommended:** Option [X]
**Rationale:** [detailed explanation]

### Decision
**User Choice:** ___
**Date:** ___
```

---

## 4. Technical Dependency Conflict

**When components have circular or blocking dependencies.**

### Detection Signals
- "I need X to be done before I can start Y"
- Agent is blocked waiting for another agent
- Circular reference detected
- Integration issues due to timing

### Decision Tree

```
DEPENDENCY CONFLICT DETECTED
    │
    ▼
Step 1: MAP THE DEPENDENCY
    │
    ├── A depends on B?
    ├── B depends on A? (circular)
    ├── Both depend on C?
    │
    ▼
Step 2: IDENTIFY CONFLICT TYPE
    │
    ├── CIRCULAR: A → B → A
    │   → Must break the cycle
    │
    ├── BLOCKING: A → B (B not started)
    │   → Re-order work
    │
    ├── PARALLEL: Both need C first
    │   → Prioritize C
    │
    ▼
Step 3: RESOLVE
    │
    ├── For CIRCULAR:
    │   1. Identify shared interface
    │   2. Define contract first
    │   3. Both implement against contract
    │   4. Integrate when both ready
    │
    ├── For BLOCKING:
    │   1. Prioritize blocking work
    │   2. OR use mock/stub temporarily
    │   3. OR find alternative approach
    │
    ├── For PARALLEL:
    │   1. Complete C first
    │   2. Then unblock A and B
    │
    ▼
Step 4: DOCUMENT
    │
    └── Update dependency graph
```

### Resolution Template

```markdown
## DEP-CONFLICT-XXX: [Brief Description]

**Date:** YYYY-MM-DD
**Components:** [A], [B]
**Type:** [CIRCULAR/BLOCKING/PARALLEL]

### Dependency Map
```
[A] ─── depends on ───> [B]
 ↑                        │
 └─── depends on ─────────┘
```

### Analysis
[Explain the conflict]

### Resolution
**Approach:** [how we're breaking the dependency]

**Steps:**
1. [step 1]
2. [step 2]
3. [step 3]

### Interface Contract (if applicable)
```typescript
// Shared interface both components will use
interface SharedContract {
  // ...
}
```

### Updated Order
1. [First] - [agent]
2. [Second] - [agent]
3. [Third] - [agent]
```

---

## 5. Design vs Technical Feasibility

**When UX requirements are technically difficult or expensive.**

### Detection Signals
- "This animation will hurt performance"
- "That layout isn't possible with current constraints"
- Designer and developer disagree on approach
- User experience vs technical complexity

### Decision Tree

```
DESIGN CONFLICT DETECTED
    │
    ▼
Step 1: QUANTIFY THE GAP
    │
    ├── Design requirement: [what UX wants]
    ├── Technical limitation: [why it's hard]
    ├── Impact: [performance, complexity, time]
    │
    ▼
Step 2: EXPLORE ALTERNATIVES
    │
    ├── Can we achieve 80% of the UX with 20% of the effort?
    ├── Is there a different pattern that works?
    ├── Can we use a library/component that does this?
    │
    ▼
Step 3: PRESENT OPTIONS
    │
    ├── Option A: Full implementation as designed
    │   - Effort: [X days]
    │   - Risk: [performance, bugs]
    │
    ├── Option B: Simplified version
    │   - What changes: [description]
    │   - Effort: [X days]
    │   - UX impact: [description]
    │
    ├── Option C: Alternative approach
    │   - Different design: [description]
    │   - Effort: [X days]
    │   - UX impact: [description]
    │
    ├── Option D: Defer to v2
    │   - Ship without this feature
    │   - Add later when more time
    │
    ▼
Step 4: USER DECIDES
    │
    └── Balance UX importance vs technical cost
```

---

## 6. Security vs Usability

**When security requirements make the product harder to use.**

### Detection Signals
- "Users will hate entering a password every time"
- "MFA adds friction to the signup flow"
- "Session timeout is too aggressive"
- Security engineer vs product manager disagreement

### Decision Tree

```
SECURITY/UX CONFLICT DETECTED
    │
    ▼
Step 1: ASSESS THE RISK
    │
    ├── What's being protected? [data sensitivity]
    ├── What's the threat? [attack vector]
    ├── What's the likelihood? [probability]
    ├── What's the impact if breached? [consequences]
    │
    ▼
Step 2: ASSESS THE UX IMPACT
    │
    ├── How often does user encounter this?
    ├── What's the user frustration level?
    ├── Will users abandon the flow?
    ├── Are there accessibility concerns?
    │
    ▼
Step 3: FIND THE BALANCE
    │
    ├── Can we add security progressively?
    │   (low friction for low-risk, high for high-risk)
    │
    ├── Can we use better UX patterns?
    │   (biometrics instead of passwords)
    │
    ├── Can we make it user-configurable?
    │   (let users choose their security level)
    │
    ▼
Step 4: DOCUMENT DECISION
    │
    ├── If favoring security: Document UX trade-off
    ├── If favoring UX: Document accepted risk
    └── Log in DECISIONS.md and THREAT_MODEL.md
```

### Template

```markdown
## SEC-UX-CONFLICT-XXX: [Brief Description]

**Date:** YYYY-MM-DD
**Security Requirement:** [requirement]
**UX Concern:** [concern]

### Risk Assessment
| Factor | Assessment |
|--------|------------|
| Data Sensitivity | [HIGH/MEDIUM/LOW] |
| Threat Likelihood | [HIGH/MEDIUM/LOW] |
| Breach Impact | [HIGH/MEDIUM/LOW] |
| **Overall Risk** | [HIGH/MEDIUM/LOW] |

### UX Assessment
| Factor | Assessment |
|--------|------------|
| Frequency of Friction | [per session/day/action] |
| User Frustration | [HIGH/MEDIUM/LOW] |
| Abandonment Risk | [HIGH/MEDIUM/LOW] |
| **Overall UX Impact** | [HIGH/MEDIUM/LOW] |

### Options

| Option | Security | UX | Recommendation |
|--------|----------|-----|----------------|
| A: Full security | ✅ | ❌ | [Yes/No] |
| B: Balanced | ⚠️ | ⚠️ | [Yes/No] |
| C: Full UX | ❌ | ✅ | [Yes/No] |

### Decision
**Chosen:** Option [X]
**Rationale:** [explanation]
**Accepted Risk:** [if any]
**UX Trade-off:** [if any]
```

---

## General Conflict Resolution Principles

### 1. Escalate Early
Don't let conflicts fester. If unresolved after one attempt, escalate to user.

### 2. Document Everything
Every conflict and resolution goes in DECISIONS.md.

### 3. User Has Final Say
On any non-technical conflict, user decides.

### 4. Architect Has Technical Authority
On purely technical conflicts, architect's recommendation carries weight.

### 5. Security Cannot Be Compromised
For critical security issues, security engineer can block deployment.

### 6. No Silent Resolutions
Never resolve a conflict without notifying affected parties.

---

## Conflict Log Template

Add to DECISIONS.md for every conflict:

```markdown
## CONFLICT-XXX: [Type] - [Brief Description]

**Date:** YYYY-MM-DD
**Type:** [Architecture/Requirement/Resource/Dependency/Design/Security]
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Agents Involved:** [list]

### Summary
[1-2 sentence description]

### Options Considered
1. [Option A]
2. [Option B]
3. [Option C]

### Decision
**Chosen:** [Option X]
**Decided By:** [User/Architect/etc.]
**Rationale:** [why this option]

### Impact
- [impact 1]
- [impact 2]

### Follow-up Required
- [ ] [action item 1]
- [ ] [action item 2]
```

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Purpose:** Structured conflict resolution for multi-agent workflows
