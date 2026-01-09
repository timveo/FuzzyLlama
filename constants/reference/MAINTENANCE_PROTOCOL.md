# Maintenance Protocol

> **Version:** 4.0.0
> **Created:** 2025-12-19
> **Purpose:** Define the post-G9 operational workflow for deployed projects

---

## Overview

After G9 (Production Acceptance), the project enters **Maintenance Mode**. This protocol defines how the Orchestrator transitions from "Builder" mode to "Janitor" mode, focusing on monitoring, updates, and bug triage rather than new feature development.

---

## Mode Transition

### Builder Mode (G0-G9)
- Full project context loaded
- All agents available
- Feature development workflow
- Heavy documentation updates

### Maintenance Mode (Post-G9)
- Minimal context (monitoring focus)
- Limited agent set (DevOps, QA, Security)
- Reactive workflow (respond to issues)
- Light documentation (incident logs)

---

## Entering Maintenance Mode

### Trigger
Maintenance Mode begins automatically when:
1. G9 (Production Acceptance) is approved
2. G10 (Completion Report) is filed

### Context Unloading

To reduce token usage, the Orchestrator should:

```markdown
## Maintenance Mode Context

### Essential Files (Keep Loaded)
- docs/ARCHITECTURE.md (reference only)
- docs/DECISIONS.md (recent entries)
- docs/COMPLETION_REPORT.md

### Unload from Active Context
- docs/PRD.md (requirements complete)
- docs/INTAKE.md (onboarding complete)
- All design documents
- Historical STATUS.md entries

### New Focus Areas
- Monitoring dashboards
- Error logs
- Dependency updates
- User feedback
```

---

## Maintenance Mode Responsibilities

### 1. Monitoring (Daily)

| Task | Frequency | Tool |
|------|-----------|------|
| Check error rates | Daily | Sentry/DataDog |
| Review performance metrics | Daily | Monitoring dashboard |
| Check health endpoint | Continuous | Uptime monitor |
| Review user feedback | Weekly | Support tickets |

### Monitoring Checklist
```markdown
## Daily Monitoring Check

**Date:** YYYY-MM-DD
**Performed By:** DevOps Agent

### Error Monitoring
- [ ] Error rate < 1%
- [ ] No new critical errors
- [ ] All alerts acknowledged

### Performance
- [ ] P95 latency < 2s
- [ ] Uptime > 99.5%
- [ ] No memory leaks detected

### User Feedback
- [ ] Support tickets reviewed
- [ ] No critical user complaints

**Status:** GREEN / YELLOW / RED
**Notes:** [Any issues observed]
```

### 2. Dependency Updates (Weekly)

```bash
# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Update patch versions (safe)
npm update

# For major updates, create maintenance ticket
```

### Dependency Update Protocol

| Update Type | Action | Gate Required |
|-------------|--------|---------------|
| Patch (x.x.X) | Auto-update, run tests | None |
| Minor (x.X.0) | Update, run full test suite | Quick review |
| Major (X.0.0) | Create maintenance ticket | Full review |
| Security fix | Immediate update | Fast Track |

### 3. Bug Triage (As Needed)

```markdown
## Bug Triage Template

### BUG-XXX: [Title]

**Reported:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low
**Source:** User report / Monitoring / QA

**Description:**
[What's happening]

**Impact:**
[Who/what is affected]

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]

**Triage Decision:**
- [ ] Hot fix (deploy immediately)
- [ ] Scheduled fix (next maintenance window)
- [ ] Backlog (low priority)
- [ ] Won't fix (documented reason)

**Assigned To:** [Agent/Developer]
**Target Resolution:** YYYY-MM-DD
```

### Bug Severity Guidelines

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Production down, data loss, security breach | < 1 hour |
| **High** | Major feature broken, significant user impact | < 24 hours |
| **Medium** | Minor feature broken, workaround exists | < 1 week |
| **Low** | Cosmetic issue, edge case | Next release |

---

## Maintenance Workflows

### Hot Fix Workflow

```
CRITICAL BUG DETECTED
        │
        ▼
┌───────────────────┐
│ 1. Acknowledge    │
│    (< 15 min)     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. Assess Impact  │
│    - Users affected│
│    - Data at risk │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. Implement Fix  │
│    - Minimal change│
│    - No refactoring│
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. Fast Track     │
│    - Lint + Test  │
│    - Smoke test   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. Deploy         │
│    - Direct to prod│
│    - Monitor closely│
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 6. Post-mortem    │
│    - Root cause   │
│    - Prevention   │
└───────────────────┘
```

### Scheduled Maintenance Workflow

```
MAINTENANCE WINDOW
        │
        ▼
┌───────────────────┐
│ 1. Pre-maintenance│
│    - Notify users │
│    - Backup data  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. Dependency     │
│    Updates        │
│    - npm update   │
│    - Security fix │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. Bug Fixes      │
│    - Scheduled    │
│    - Tested       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. Deploy & Test  │
│    - Staging first│
│    - Full smoke   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. Production     │
│    - Deploy       │
│    - Verify       │
│    - Notify users │
└───────────────────┘
```

---

## Maintenance Documentation

### Incident Log

Create `docs/INCIDENT_LOG.md`:

```markdown
# Incident Log

## INC-001: [Title]

**Date:** YYYY-MM-DD HH:MM
**Duration:** X hours
**Severity:** Critical / High

### Timeline
- HH:MM - Issue detected
- HH:MM - Team notified
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Resolved

### Impact
- Users affected: X
- Revenue impact: $X (if applicable)
- Data affected: None / [description]

### Root Cause
[Technical explanation]

### Resolution
[What was done to fix it]

### Prevention
- [ ] [Action item 1]
- [ ] [Action item 2]

### Lessons Learned
[What we learned from this incident]
```

### Maintenance Window Log

Create `docs/MAINTENANCE_LOG.md`:

```markdown
# Maintenance Log

## MW-001: [Date] Scheduled Maintenance

**Window:** YYYY-MM-DD HH:MM - HH:MM
**Duration:** X hours
**Type:** Dependency Update / Bug Fix / Security Patch

### Changes Applied
1. [Change 1]
2. [Change 2]

### Packages Updated
| Package | From | To |
|---------|------|-----|
| react | 18.2.0 | 18.3.0 |

### Bugs Fixed
- BUG-XXX: [Description]

### Verification
- [ ] Smoke test passed
- [ ] Monitoring normal
- [ ] No user complaints

**Performed By:** [Name]
```

---

## Agent Availability in Maintenance Mode

| Agent | Available | Use Case |
|-------|-----------|----------|
| Orchestrator | Yes (limited) | Triage coordination |
| DevOps | **Primary** | Deployment, monitoring |
| QA Engineer | **Primary** | Bug verification, testing |
| Security Engineer | **Primary** | Security patches, audits |
| Frontend Dev | On-call | Bug fixes only |
| Backend Dev | On-call | Bug fixes only |
| Product Manager | No | New features = exit maintenance |
| Architect | No | Structural changes = exit maintenance |
| UX/UI Designer | No | Design changes = exit maintenance |

---

## Exiting Maintenance Mode

### Triggers for Exiting
1. **New Feature Request** → Return to G1 (new project cycle)
2. **Major Refactor Needed** → Return to G3 (architecture review)
3. **Technology Migration** → Return to G2 (re-planning)

### Exit Process

```markdown
## Maintenance Mode Exit Request

**Date:** YYYY-MM-DD
**Reason:** [New feature / Major refactor / Migration]

**Description:**
[What needs to be done]

**Recommended Entry Point:**
- [ ] G1 - New scope to define
- [ ] G2 - Existing scope, new requirements
- [ ] G3 - Architecture changes needed
- [ ] G5 - Development only (enhancement)

**Context to Reload:**
- [ ] docs/PRD.md
- [ ] docs/ARCHITECTURE.md
- [ ] docs/DECISIONS.md (full history)

**Approved By:** [User]
**New Project ID:** [If creating new project]
```

---

## Metrics to Track

### Maintenance KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | > 99.5% | Monthly |
| Error rate | < 1% | Daily |
| Mean time to resolution (MTTR) | < 4 hours | Per incident |
| Dependency freshness | < 30 days behind | Weekly |
| Security vulnerabilities | 0 critical/high | Weekly |

### Monthly Maintenance Report

```markdown
## Monthly Maintenance Report: [Month Year]

### Uptime
- Total: XX.X%
- Planned downtime: X hours
- Unplanned downtime: X hours

### Incidents
| Severity | Count | MTTR |
|----------|-------|------|
| Critical | 0 | N/A |
| High | X | X hours |
| Medium | X | X hours |

### Bug Fixes Deployed
- Total: X
- Critical: X
- High: X
- Medium: X

### Dependency Updates
- Security patches: X
- Minor updates: X
- Major updates: X

### User Feedback Summary
- Total tickets: X
- Bugs reported: X
- Feature requests: X (logged for future)

### Health Assessment
**Overall Status:** GREEN / YELLOW / RED
**Recommendation:** Continue maintenance / Plan enhancement cycle
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-19 | Initial protocol |
