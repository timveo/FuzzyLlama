# Architecture Decision Import

> **Project:** {PROJECT_NAME}
> **Imported:** {DATE}
> **Source:** {ADR_SOURCE}

---

## Purpose

This document captures existing architecture decisions imported at project start. These decisions constrain the solution space and should be respected unless explicitly revisited.

---

## Imported Decisions

### Technology Stack

| Category | Decision | Source | Constraints |
|----------|----------|--------|-------------|
| **Language** | {LANGUAGE} | {ADR-XXX or "New"} | {VERSION_CONSTRAINTS} |
| **Framework** | {FRAMEWORK} | {ADR-XXX or "New"} | {VERSION_CONSTRAINTS} |
| **Database** | {DATABASE} | {ADR-XXX or "New"} | {VERSION_CONSTRAINTS} |
| **Cache** | {CACHE} | {ADR-XXX or "New"} | |
| **Message Queue** | {QUEUE} | {ADR-XXX or "New"} | |
| **AI/ML Provider** | {PROVIDER} | {ADR-XXX or "New"} | {BUDGET_CONSTRAINTS} |

### Architecture Patterns

| Pattern | Decision | Rationale | Trade-offs |
|---------|----------|-----------|------------|
| **Service Architecture** | {Monolith/Microservices/Serverless} | {RATIONALE} | {TRADE_OFFS} |
| **Data Architecture** | {CQRS/Event Sourcing/Traditional} | {RATIONALE} | {TRADE_OFFS} |
| **API Style** | {REST/GraphQL/gRPC} | {RATIONALE} | {TRADE_OFFS} |
| **Auth Pattern** | {JWT/Sessions/OAuth} | {RATIONALE} | {TRADE_OFFS} |

### Infrastructure

| Component | Decision | Provider | Configuration |
|-----------|----------|----------|---------------|
| **Compute** | {K8s/ECS/Lambda/VMs} | {PROVIDER} | {CONFIG_NOTES} |
| **CI/CD** | {GitHub Actions/GitLab/Jenkins} | {PROVIDER} | |
| **Monitoring** | {Datadog/Prometheus/CloudWatch} | {PROVIDER} | |
| **Logging** | {ELK/Loki/CloudWatch} | {PROVIDER} | |
| **Tracing** | {Jaeger/Zipkin/X-Ray} | {PROVIDER} | |

### Compliance Requirements

| Framework | Required | Evidence Location | Owner |
|-----------|----------|-------------------|-------|
| **SOC 2** | {Yes/No} | {LINK} | {OWNER} |
| **GDPR** | {Yes/No} | {LINK} | {OWNER} |
| **HIPAA** | {Yes/No} | {LINK} | {OWNER} |
| **PCI-DSS** | {Yes/No} | {LINK} | {OWNER} |

---

## Detailed ADR Import

### ADR-{XXX}: {DECISION_TITLE}

**Status:** {Accepted/Superseded/Deprecated}
**Date:** {ORIGINAL_DATE}
**Imported:** {IMPORT_DATE}

**Context:**
{ORIGINAL_CONTEXT}

**Decision:**
{ORIGINAL_DECISION}

**Consequences:**
{ORIGINAL_CONSEQUENCES}

**Applicability to This Project:**
- [ ] Fully applicable
- [ ] Partially applicable: {NOTES}
- [ ] Needs revision: {NOTES}

---

## Conflict Detection

### Potential Conflicts with New Requirements

| Imported Decision | New Requirement | Conflict | Resolution |
|-------------------|-----------------|----------|------------|
| {DECISION} | {REQUIREMENT} | {CONFLICT_DESC} | {RESOLUTION} |

### Decisions Needing Revisit

| Decision | Reason to Revisit | Recommended Action |
|----------|-------------------|-------------------|
| {DECISION} | {REASON} | {ACTION} |

---

## Integration Points

### With Product Manager
- Imported constraints affect feature feasibility
- Budget constraints from ADRs apply to new features

### With Architect
- Pre-populated decisions in ARCHITECTURE.md
- Must document any deviations from imported ADRs

### With Development Team
- Tech stack decisions are locked unless explicitly revisited
- Patterns library applies to new code

### With Security Engineer
- Compliance requirements inform security review scope
- Existing security ADRs carry forward

---

## Skipped Gates

Based on imported decisions, the following gates may be streamlined:

| Gate | Normally Covers | Imported Decisions | Status |
|------|-----------------|-------------------|--------|
| G3 (Architecture) | Tech stack selection | Stack pre-selected | Partial skip |
| G3 (Architecture) | Pattern decisions | Patterns pre-selected | Partial skip |
| G7 (Security) | Compliance scope | Scope pre-defined | Full coverage still required |

---

## Change Protocol

### To Modify an Imported Decision

1. **Document the conflict** in this file
2. **Propose alternative** with rationale
3. **Get approval** from original decision owner (if known)
4. **Create new ADR** documenting the change
5. **Update this file** with superseded status

### Example

```markdown
### ADR-005 (Imported) → ADR-NEW-001 (This Project)

**Original:** PostgreSQL for all data storage
**Conflict:** Real-time requirements need event streaming
**Resolution:** Keep PostgreSQL for primary storage, add Redis Streams for real-time
**New ADR:** ADR-NEW-001: Hybrid PostgreSQL + Redis for real-time features
```

---

## Audit Trail

| Date | Action | By | Notes |
|------|--------|-----|-------|
| {DATE} | Initial import | {AGENT/USER} | Imported from {SOURCE} |
| {DATE} | {ACTION} | {AGENT/USER} | {NOTES} |

---

**Import Source:** {FULL_PATH_OR_URL}
**Imported By:** {ORCHESTRATOR_SESSION_ID}
**Validation:** {MANUAL/AUTOMATED}
