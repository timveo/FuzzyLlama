# Technical Debt Registry

> **Template:** Track and prioritize technical debt discovered during assessment or accumulated over time.

---

## Summary

| Metric | Value |
|--------|-------|
| Project | [name] |
| Last Updated | YYYY-MM-DD |
| Total Debt Items | |
| Critical Items | |
| Estimated Total Effort | [X person-days] |
| Estimated Interest/Month | [X hours maintenance overhead] |

### Debt by Category

| Category | Count | Critical | Total Effort |
|----------|-------|----------|--------------|
| Code Quality | | | |
| Architecture | | | |
| Dependencies | | | |
| Testing | | | |
| Security | | | |
| Documentation | | | |
| Infrastructure | | | |
| **Total** | | | |

### Debt Trend

```
[Track debt over time - add entries each sprint/month]

Month     | Added | Resolved | Net | Total
----------|-------|----------|-----|------
2024-01   |       |          |     |
2024-02   |       |          |     |
```

---

## Debt Registry

### Code Quality Debt

| ID | Title | Description | Location | Impact | Effort | Interest | Priority |
|----|-------|-------------|----------|--------|--------|----------|----------|
| TD-CQ-001 | | | `path/to/file` | H/M/L | S/M/L/XL | H/M/L | P0-P3 |
| TD-CQ-002 | | | | | | | |

<details>
<summary>TD-CQ-001: [Title]</summary>

**Description:**
[Detailed description of the debt]

**Root Cause:**
[How this debt was incurred]

**Impact:**
- [Impact 1]
- [Impact 2]

**Interest (ongoing cost):**
- [X hours/sprint] extra maintenance
- [Impact on velocity]

**Remediation Plan:**
1. [Step 1]
2. [Step 2]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Dependencies:**
- [Dependency 1]

</details>

---

### Architecture Debt

| ID | Title | Description | Impact | Effort | Interest | Priority |
|----|-------|-------------|--------|--------|----------|----------|
| TD-AR-001 | | | | | | |
| TD-AR-002 | | | | | | |

<details>
<summary>TD-AR-001: [Title]</summary>

**Description:**
[Detailed description]

**Current State:**
[How it works now]

**Desired State:**
[How it should work]

**Root Cause:**
[Why this happened]

**Impact:**
- [Impact on scalability]
- [Impact on maintainability]
- [Impact on performance]

**Interest (ongoing cost):**
- [Cost per sprint/month]

**Remediation Plan:**
1. [Step 1]
2. [Step 2]

**Risk if Not Addressed:**
[What happens if we ignore this]

</details>

---

### Dependency Debt

| ID | Package | Current | Latest | Risk | Effort | Priority |
|----|---------|---------|--------|------|--------|----------|
| TD-DEP-001 | | | | H/M/L | | |
| TD-DEP-002 | | | | | | |

#### Outdated Dependencies

```
[Output from npm outdated / pip list --outdated]
```

#### Deprecated Dependencies

| Package | Deprecated Since | Replacement | Migration Effort |
|---------|------------------|-------------|------------------|
| | | | |

#### Security Vulnerabilities

| Package | Vulnerability | Severity | Fix Version | CVE |
|---------|---------------|----------|-------------|-----|
| | | Critical/High/Med/Low | | |

---

### Testing Debt

| ID | Title | Description | Coverage Gap | Effort | Priority |
|----|-------|-------------|--------------|--------|----------|
| TD-TEST-001 | | | X% | | |
| TD-TEST-002 | | | | | |

#### Untested Areas

| Component/Module | Current Coverage | Risk Level | Priority |
|------------------|------------------|------------|----------|
| | % | | |

#### Missing Test Types

| Test Type | Status | Gap Description |
|-----------|--------|-----------------|
| Unit tests | Partial/None | |
| Integration tests | | |
| E2E tests | | |
| Performance tests | | |
| Security tests | | |

---

### Security Debt

| ID | Title | Severity | OWASP Category | Effort | Priority |
|----|-------|----------|----------------|--------|----------|
| TD-SEC-001 | | Critical/High/Med/Low | | | P0 |
| TD-SEC-002 | | | | | |

<details>
<summary>TD-SEC-001: [Title]</summary>

**Severity:** Critical/High/Medium/Low

**OWASP Category:** [e.g., A01:2021-Broken Access Control]

**Description:**
[What the vulnerability is]

**Location:**
- `path/to/file:line`

**Proof of Concept:**
[How to reproduce]

**Impact:**
[What could happen if exploited]

**Remediation:**
1. [Fix step 1]
2. [Fix step 2]

**References:**
- [Link to OWASP]
- [Link to CVE if applicable]

</details>

---

### Documentation Debt

| ID | Title | Description | Effort | Priority |
|----|-------|-------------|--------|----------|
| TD-DOC-001 | | | | |
| TD-DOC-002 | | | | |

#### Missing Documentation

| Document | Status | Impact | Owner |
|----------|--------|--------|-------|
| README | Missing/Outdated/Incomplete | | |
| API docs | | | |
| Architecture | | | |
| Runbooks | | | |

---

### Infrastructure Debt

| ID | Title | Description | Risk | Effort | Priority |
|----|-------|-------------|------|--------|----------|
| TD-INF-001 | | | | | |
| TD-INF-002 | | | | | |

#### Infrastructure Gaps

| Area | Current State | Desired State | Risk |
|------|---------------|---------------|------|
| Monitoring | | | |
| Alerting | | | |
| Backup | | | |
| DR | | | |
| IaC | | | |

---

## Prioritization Framework

### Scoring Criteria

**Impact Score (1-5):**
- 5: Blocks critical features, security vulnerability, data loss risk
- 4: Significant performance/reliability impact
- 3: Moderate impact on velocity or quality
- 2: Minor inconvenience
- 1: Cosmetic/nice-to-have

**Effort Score (1-5):**
- 1: < 1 day
- 2: 1-3 days
- 3: 1-2 weeks
- 4: 2-4 weeks
- 5: > 1 month

**Interest Score (1-5):**
- 5: Growing rapidly, affects every change
- 4: Noticeable overhead on most work
- 3: Regular friction
- 2: Occasional impact
- 1: Minimal ongoing cost

**Priority = (Impact × 2 + Interest) / Effort**

### Prioritized Debt Backlog

| Rank | ID | Title | Impact | Effort | Interest | Score | Sprint |
|------|-----|-------|--------|--------|----------|-------|--------|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

---

## Debt Payment Plan

### Sprint Allocation
> Recommended: 15-20% of sprint capacity for debt reduction

| Sprint | Capacity | Debt Allocation | Items to Address |
|--------|----------|-----------------|------------------|
| Sprint N | | 20% | TD-XXX-001, TD-XXX-002 |
| Sprint N+1 | | 20% | |
| Sprint N+2 | | 20% | |

### Debt-Free Goals

| Category | Current Debt | Target | Target Date |
|----------|--------------|--------|-------------|
| Critical Security | X items | 0 | |
| Test Coverage | X% | 80% | |
| Outdated Deps | X packages | 0 critical | |

---

## Debt Prevention

### Definition of Done Updates
To prevent new debt, add to Definition of Done:
- [ ] Unit tests for new code (≥80% coverage)
- [ ] No new lint errors
- [ ] No new security vulnerabilities
- [ ] Documentation updated
- [ ] No hardcoded values

### Code Review Checklist Additions
- [ ] Does this add technical debt? If yes, is it logged?
- [ ] Are there TODO/FIXME comments? Are they tracked?
- [ ] Is test coverage maintained?

### Automated Prevention
| Check | Tool | Enforcement |
|-------|------|-------------|
| Lint | ESLint/Prettier | CI blocks on error |
| Security | npm audit / Snyk | CI blocks on critical |
| Coverage | Jest/pytest | CI blocks if < threshold |
| Complexity | SonarQube | Warning on high complexity |

---

## Appendix: Debt Discovery Log

| Date | Source | Items Found | Items Logged |
|------|--------|-------------|--------------|
| | Code review | | |
| | Security scan | | |
| | Performance test | | |
| | Dependency audit | | |
| | Team retrospective | | |
