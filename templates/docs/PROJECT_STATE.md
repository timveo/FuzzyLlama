# Project State Tracker

> **This file tracks approval gates and ensures the workflow is followed.**
> **The orchestrator MUST READ this file before ANY project action.**
> **See `constants/protocols/STATE_DEFINITIONS.md` for complete gate definitions.**

---

## ⚡ MACHINE-READABLE STATE (DO NOT SKIP)

```yaml
CURRENT_GATE: G0_PENDING
SKIP_MODE: false
PROJECT_TYPE: unknown  # traditional / ai_ml / hybrid

# Look up allowed/blocked actions in constants/protocols/STATE_DEFINITIONS.md for CURRENT_GATE
# The STATE_DEFINITIONS.md file is the source of truth for what actions are permitted

REQUIRED_AGENTS: []
ACTIVATED_AGENTS: []
```

### Gate Progression (Full Workflow)
```
G0_PENDING → G1_INTAKE → G2_PRD_PENDING → G2_APPROVED
    ↓
G3_ARCH_PENDING → G3_APPROVED → G4_DESIGN_PENDING → G4_APPROVED
    ↓
DEVELOPMENT → G5_DEV_COMPLETE → G6_TESTING → G6_APPROVED
    ↓
G7_SECURITY → G7_APPROVED → G8_PRE_DEPLOY → G8_APPROVED
    ↓
G9_PRODUCTION → COMPLETE
```

### Update Rules

| Trigger | Action | Update |
|---------|--------|--------|
| User confirms startup | Progress to intake | `CURRENT_GATE = G1_INTAKE` |
| Intake questions complete | Begin PRD creation | `CURRENT_GATE = G2_PRD_PENDING` |
| User approves PRD | PRD locked | `CURRENT_GATE = G2_APPROVED` → `G3_ARCH_PENDING` |
| User approves architecture | Architecture locked | `CURRENT_GATE = G3_APPROVED` → `G4_DESIGN_PENDING` |
| User approves design (or skipped) | Begin development | `CURRENT_GATE = G4_APPROVED` → `DEVELOPMENT` |
| All features complete | Development locked | `CURRENT_GATE = G5_DEV_COMPLETE` → `G6_TESTING` |
| QA approves | Testing complete | `CURRENT_GATE = G6_APPROVED` → `G7_SECURITY` |
| Security approves | Security complete | `CURRENT_GATE = G7_APPROVED` → `G8_PRE_DEPLOY` |
| User gives GO decision | Ready to deploy | `CURRENT_GATE = G8_APPROVED` → `G9_PRODUCTION` |
| Production verified | Project complete | `CURRENT_GATE = COMPLETE` |

### Agent Activation Rules

| Project Type | Required Agents by Phase |
|--------------|--------------------------|
| `traditional` | See `constants/protocols/STATE_DEFINITIONS.md` - Traditional agents only |
| `ai_ml` | See `constants/protocols/STATE_DEFINITIONS.md` - All agents including ML Engineer, Prompt Engineer, Model Evaluator, AIOps Engineer |
| `hybrid` | See `constants/protocols/STATE_DEFINITIONS.md` - All agents |

**When PROJECT_TYPE is set to `ai_ml` or `hybrid`, automatically add to REQUIRED_AGENTS:**
- G3_ARCH_PENDING: ML Engineer, Prompt Engineer
- DEVELOPMENT: ML Engineer, Prompt Engineer
- G6_TESTING: Model Evaluator
- G7_SECURITY: ML Engineer (for model security)
- G8_PRE_DEPLOY: AIOps Engineer

---

## Project Information

| Field | Value |
|-------|-------|
| **Project Name** | {project-name} |
| **Created** | {YYYY-MM-DD} |
| **Project Path** | {/path/to/project} |
| **Project Type** | {traditional / ai_ml / hybrid} |
| **Teaching Level** | {NOVICE / INTERMEDIATE / EXPERT} |
| **Classification** | {NEW_PROJECT / AI_GENERATED / EXISTING_OWN / EXISTING_INHERITED / ENHANCEMENT} |

---

## Gate Status

| Gate | Status | Approved By | Date | Est. Cost | Notes |
|------|--------|-------------|------|-----------|-------|
| **G0: Startup Confirmation** | ⏳ Pending | | | $0.00 | User confirmed they want guided process |
| **G1: Intake Complete** | ⏳ Pending | | | $0.00 | All intake questions answered |
| **G2: PRD Approved** | ⏳ Pending | | | $0.00 | docs/PRD.md approved |
| **G3: Architecture Approved** | ⏳ Pending | | | $0.00 | docs/ARCHITECTURE.md approved |
| **G4: Design Approved** | ⏳ Pending | | | $0.00 | UX/UI designs approved (if applicable) |
| **G5: Development Complete** | ⏳ Pending | | | $0.00 | Code complete, builds passing |
| **G6: QA Approved** | ⏳ Pending | | | $0.00 | Testing complete, quality gates met |
| **G7: Security Approved** | ⏳ Pending | | | $0.00 | Security review complete |
| **G8: Pre-Deploy Go/No-Go** | ⏳ Pending | | | $0.00 | Ready for production |
| **G9: Production Accepted** | ⏳ Pending | | | $0.00 | Deployed and stable |
| **TOTAL** | - | - | - | **$0.00** | Cumulative project cost |

### Gate Status Legend
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Approved - User approved, can proceed
- ⏭️ Skipped - User explicitly skipped (document reason)
- ❌ Rejected - Needs rework

---

## Current Phase

**Active Phase:** {intake / planning / architecture / design / development / testing / deployment}
**Active Agent:** {agent name}
**Blocking Gate:** {gate that must be passed to proceed}

---

## Approvals Log

### G0: Startup Confirmation
- **Date:**
- **User Response:**
- **Learning Level Selected:**

### G2: PRD Approval
- **Date:**
- **User Response:**
- **Changes Requested:**
- **Final Approval:**

### G3: Architecture Approval
- **Date:**
- **User Response:**
- **Tech Stack Confirmed:**
- **Changes Requested:**
- **Final Approval:**

---

## Skip Mode (if applicable)

| Field | Value |
|-------|-------|
| **Planning Skipped** | Yes / No |
| **Skip Confirmed** | {timestamp} |
| **Reason Given** | {user's reason} |
| **Implications Acknowledged** | Yes / No |

---

## Checkpoints During Development

| Checkpoint | Component | Explained | User Acknowledged | Notes |
|------------|-----------|-----------|-------------------|-------|
| 1 | | ⏳ | ⏳ | |
| 2 | | ⏳ | ⏳ | |
| 3 | | ⏳ | ⏳ | |

---

## Cost Tracking

### Budget Configuration (from INTAKE.md)

| Setting | Value |
|---------|-------|
| **User Budget** | ${budget} or "No limit" |
| **Alert Threshold** | ${alert_at} or "Not set" |
| **Track Costs** | Yes / No |

### Per-Gate Cost Breakdown

| Gate | Input Tokens | Output Tokens | Est. Cost | Cumulative |
|------|--------------|---------------|-----------|------------|
| G0-G1 | 0 | 0 | $0.00 | $0.00 |
| G2 (PRD) | 0 | 0 | $0.00 | $0.00 |
| G3 (Arch) | 0 | 0 | $0.00 | $0.00 |
| G4 (Design) | 0 | 0 | $0.00 | $0.00 |
| G5 (Dev) | 0 | 0 | $0.00 | $0.00 |
| G6 (Test) | 0 | 0 | $0.00 | $0.00 |
| G7 (Security) | 0 | 0 | $0.00 | $0.00 |
| G8-G9 (Deploy) | 0 | 0 | $0.00 | $0.00 |
| **TOTAL** | **0** | **0** | **$0.00** | - |

### Cost Alerts

| Threshold | Status | Action |
|-----------|--------|--------|
| 50% of budget | ⬜ Not reached | Continue |
| 80% of budget | ⬜ Not reached | Warning to user |
| 100% of budget | ⬜ Not reached | Pause and confirm |

### Cost Update Instructions

After each gate completion:
1. Log tokens used in the gate
2. Update cumulative total
3. Check against budget thresholds
4. Alert user if threshold crossed

See `constants/reference/AGENT_COST_TRACKING.md` for detailed cost estimation.

---

## Gate Retry History

Track retry attempts to identify patterns and prevent infinite loops.

| Gate | Attempt | Date | Error | Resolution |
|------|---------|------|-------|------------|
| - | - | - | - | - |

### Retry Rules
- Max 3 retries per gate before escalation
- Each retry must document what changed
- If same error 3x → escalate to user

---

## Enforcement Rules

The orchestrator MUST:

1. **Check G2 (PRD Approved) = ✅** before any code is written
2. **Check G3 (Architecture Approved) = ✅** before development phase starts
3. **Log all approvals** with timestamp and user response
4. **Present learning content** appropriate to user's stated level
5. **Pause for checkpoints** during development

---

## Version

**Template Version:** 1.0.0
**Last Updated:** 2024-12-09
