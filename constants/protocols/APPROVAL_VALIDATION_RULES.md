# Approval Validation Rules

> **Version:** 1.0.0
> **Last Updated:** 2026-01-06

---

## Purpose

This is the **SINGLE SOURCE OF TRUTH** for approval validation logic. All agents and protocols must use these rules when validating user responses at gates.

---

## Core Principle

**Gates are HARD STOPS. Never proceed without explicit user approval.**

- "ok" is NOT approval (ambiguous - could mean "I understand")
- Silence is NOT approval
- Moving on without response is NOT approval

---

## Approval Categories

### ✅ APPROVED (proceed immediately)

| Phrase | Notes |
|--------|-------|
| "approved" / "approve" | Explicit approval |
| "yes" / "yep" / "yeah" | Affirmative |
| "continue" / "proceed" / "go ahead" | Explicit proceed |
| "let's go" / "let's build" | Enthusiastic proceed |
| "looks good" / "looks great" | Positive assessment |
| "perfect" / "great" | Positive assessment |
| "ship it" / "do it" / "build it" | Action-oriented approval |
| "LGTM" / "sounds good" / "that works" | Common approval phrases |
| "A" / "B" / "C" | Option selection (valid at decision points) |

**Regex Pattern:**
```regex
/^(approved?|yes|yep|yeah|continue|proceed|go\s*ahead|let'?s\s*go|looks?\s*(good|great)|perfect|great|ship\s*it|do\s*it|build\s*it|let'?s\s*build|lgtm|sounds?\s*good|that\s*works?|[abc])$/i
```

---

### ⚠️ AMBIGUOUS (clarify before proceeding)

| Phrase | Why Ambiguous | Clarification |
|--------|---------------|---------------|
| "ok" / "okay" / "k" | Could mean "I understand" not "I approve" | "To confirm, should I proceed with this approach?" |
| "sure" | Uncertain commitment | "Would you like to proceed, or discuss further?" |
| "I guess" / "maybe" | Uncertainty | "Would you like to proceed, or discuss further?" |
| "fine" / "whatever" | Passive/disengaged | "I want to make sure this meets your needs. Any concerns?" |
| *No response / silence* | No input | "Would you like to proceed with this approach?" |

**Regex Pattern:**
```regex
/^(ok(ay)?|k|sure|i\s*guess|maybe|fine|whatever)$/i
```

**Required Action:** Ask clarifying question. NEVER proceed on ambiguous response.

---

### ❌ REJECTED (revise required)

| Phrase | Action |
|--------|--------|
| "no" / "nope" | Ask what changes are needed |
| "not quite" / "change this" | Request specific feedback |
| "I don't like" / "that's wrong" | Ask for direction |
| "try again" | Revise and re-present |
| "wait" / "hold on" / "stop" | Pause and ask what's needed |

**Regex Pattern:**
```regex
/^(no(pe)?|not\s*quite|change\s*this|i\s*don'?t\s*like|that'?s\s*wrong|try\s*again|wait|hold\s*on|stop)$/i
```

---

## Validation Logic

```typescript
function validateApprovalResponse(response: string): ApprovalResult {
  const normalized = response.trim().toLowerCase();

  const APPROVED = /^(approved?|yes|yep|yeah|continue|proceed|go\s*ahead|let'?s\s*go|looks?\s*(good|great)|perfect|great|ship\s*it|do\s*it|build\s*it|let'?s\s*build|lgtm|sounds?\s*good|that\s*works?|[abc])$/i;

  const AMBIGUOUS = /^(ok(ay)?|k|sure|i\s*guess|maybe|fine|whatever)$/i;

  const REJECTED = /^(no(pe)?|not\s*quite|change\s*this|i\s*don'?t\s*like|that'?s\s*wrong|try\s*again|wait|hold\s*on|stop)$/i;

  if (APPROVED.test(normalized)) {
    return { status: "APPROVED", proceed: true };
  }

  if (AMBIGUOUS.test(normalized)) {
    return {
      status: "AMBIGUOUS",
      proceed: false,
      clarify: "To confirm, should I proceed with this approach?"
    };
  }

  if (REJECTED.test(normalized)) {
    return { status: "REJECTED", proceed: false, revise: true };
  }

  // Unknown response - treat as ambiguous
  return {
    status: "UNKNOWN",
    proceed: false,
    clarify: "I want to make sure I understand. Would you like me to proceed, or would you like changes?"
  };
}
```

---

## MCP Tool Integration

Use the `validate_approval_response()` MCP tool to validate user responses:

```typescript
validate_approval_response({
  project_id: "[project_id]",
  gate: "G3",
  user_response: "[user's exact text]"
})

// Returns:
// { status: "APPROVED" | "AMBIGUOUS" | "REJECTED" | "UNKNOWN", proceed: boolean, clarify?: string }
```

---

## Clarification Templates

### For Ambiguous Responses

```markdown
To confirm, should I proceed with this approach?
- Say "yes" or "approved" to proceed
- Say "no" or describe changes if you'd like revisions
```

### For Unknown Responses

```markdown
I want to make sure I understand your response. Would you like me to:
- Proceed with the current approach?
- Make specific changes?
Please clarify so I can best help you.
```

### For Rejected Responses

```markdown
I understand you'd like changes. Could you please specify:
- What aspects need revision?
- What direction would you prefer?
```

---

## Logging Requirements

Every approval validation MUST be logged via `log_decision()`:

```typescript
log_decision({
  project_id: "[project_id]",
  decision_type: "gate_approval",
  gate: "G3",
  user_response: "[exact user text]",
  validation_result: "APPROVED",
  timestamp: "[ISO timestamp]"
})
```

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Approval Gates | `constants/protocols/APPROVAL_GATES.md` | Gate definitions |
| Mandatory Startup | `constants/protocols/MANDATORY_STARTUP.md` | Startup protocol |
| Orchestrator | `agents/orchestrator.md` | Orchestrator instructions |

---

## Version History

- **1.0.0** (2026-01-06): Initial consolidation from three source files
