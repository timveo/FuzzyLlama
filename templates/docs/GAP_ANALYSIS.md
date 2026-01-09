# Gap Analysis

> **Template:** Use this after completing ASSESSMENT.md to define the gap between current state and desired future state.

---

## Overview

| Attribute | Value |
|-----------|-------|
| Project | [name] |
| Assessment Date | YYYY-MM-DD |
| Analysis Date | YYYY-MM-DD |
| Analyst | [agent/person] |

### Summary

| Category | Current Score | Target Score | Gap |
|----------|---------------|--------------|-----|
| Code Quality | /10 | /10 | |
| Architecture | /10 | /10 | |
| Security | /10 | /10 | |
| Performance | /10 | /10 | |
| Testing | /10 | /10 | |
| Documentation | /10 | /10 | |
| DevOps | /10 | /10 | |
| **Overall** | **/10** | **/10** | |

---

## 1. Functional Gaps

### Missing Features

| ID | Feature | Business Value | Effort | Priority |
|----|---------|----------------|--------|----------|
| FEAT-001 | | High/Med/Low | S/M/L/XL | P0/P1/P2/P3 |
| FEAT-002 | | | | |

### Feature Enhancements

| ID | Current Behavior | Desired Behavior | Business Value | Effort |
|----|------------------|------------------|----------------|--------|
| ENH-001 | | | | |
| ENH-002 | | | | |

### User Experience Gaps

| ID | Current UX Issue | Desired State | Impact |
|----|------------------|---------------|--------|
| UX-001 | | | |
| UX-002 | | | |

---

## 2. Technical Gaps

### Code Quality Gaps

| ID | Current | Target | Gap Description | Remediation |
|----|---------|--------|-----------------|-------------|
| CQ-001 | Test coverage: X% | ≥80% | Missing unit tests for [area] | Add tests for [components] |
| CQ-002 | No TypeScript | Full TypeScript | Type safety missing | Migrate to TypeScript |
| CQ-003 | | | | |

### Architecture Gaps

| ID | Current Architecture | Target Architecture | Migration Path |
|----|---------------------|---------------------|----------------|
| ARCH-001 | Monolith | Modular monolith | Extract [services] |
| ARCH-002 | Tightly coupled | Loosely coupled | Introduce [patterns] |
| ARCH-003 | | | |

### Technology Gaps

| Layer | Current | Target | Reason for Change | Migration Effort |
|-------|---------|--------|-------------------|------------------|
| Frontend | | | | |
| Backend | | | | |
| Database | | | | |
| Infrastructure | | | | |

---

## 3. Security Gaps

| ID | Current State | Required State | Compliance | Priority |
|----|---------------|----------------|------------|----------|
| SEC-001 | No input validation | Comprehensive validation | OWASP | P0 |
| SEC-002 | Secrets in code | Secrets manager | SOC2 | P0 |
| SEC-003 | | | | |

### Compliance Gaps

| Requirement | Current Status | Gap | Remediation |
|-------------|----------------|-----|-------------|
| GDPR | | | |
| SOC2 | | | |
| HIPAA | | | |
| PCI-DSS | | | |

---

## 4. Performance Gaps

| Metric | Current | Target | Gap | Remediation |
|--------|---------|--------|-----|-------------|
| Page Load (p95) | Xs | <2s | Xs | [Actions] |
| API Response (p95) | Xms | <500ms | Xms | [Actions] |
| Database Query (avg) | Xms | <100ms | Xms | [Actions] |
| Memory Usage | XMB | <YMB | XMB | [Actions] |

### Scalability Gaps

| Dimension | Current Capacity | Required Capacity | Gap |
|-----------|------------------|-------------------|-----|
| Concurrent users | | | |
| Requests/second | | | |
| Data volume | | | |
| Geographic reach | | | |

---

## 5. Testing Gaps

| Test Type | Current Coverage | Target Coverage | Gap | Effort to Close |
|-----------|------------------|-----------------|-----|-----------------|
| Unit | % | 80% | % | |
| Integration | % | 60% | % | |
| E2E | % | Critical paths | | |
| Performance | None/Basic/Comprehensive | | | |
| Security | None/Basic/Comprehensive | | | |

### Missing Test Scenarios

| ID | Scenario | Type | Priority |
|----|----------|------|----------|
| TEST-001 | | Unit/Integration/E2E | |
| TEST-002 | | | |

---

## 6. Documentation Gaps

| Document | Current State | Required State | Effort |
|----------|---------------|----------------|--------|
| API Reference | None/Outdated/Current | | |
| Architecture | | | |
| Deployment | | | |
| Onboarding | | | |
| Runbooks | | | |

---

## 7. DevOps Gaps

| Capability | Current | Target | Gap |
|------------|---------|--------|-----|
| CI/CD Pipeline | | | |
| Monitoring | | | |
| Alerting | | | |
| Logging | | | |
| Disaster Recovery | | | |
| Infrastructure as Code | | | |

---

## 8. Skill/Knowledge Gaps

| Technology/Skill | Current Team Proficiency | Required Proficiency | Gap |
|------------------|--------------------------|---------------------|-----|
| | None/Basic/Intermediate/Expert | | |

### Training Needs

| Skill | Who | Training Method | Timeline |
|-------|-----|-----------------|----------|
| | | | |

---

## 9. Gap Prioritization Matrix

### Impact vs Effort Matrix

```
         │ Low Effort │ Medium Effort │ High Effort │
─────────┼────────────┼───────────────┼─────────────┤
High     │ DO FIRST   │ PLAN          │ CONSIDER    │
Impact   │ [IDs]      │ [IDs]         │ [IDs]       │
─────────┼────────────┼───────────────┼─────────────┤
Medium   │ DO FIRST   │ PLAN          │ DEFER       │
Impact   │ [IDs]      │ [IDs]         │ [IDs]       │
─────────┼────────────┼───────────────┼─────────────┤
Low      │ QUICK WIN  │ DEFER         │ DON'T DO    │
Impact   │ [IDs]      │ [IDs]         │ [IDs]       │
─────────┴────────────┴───────────────┴─────────────┘
```

### Prioritized Gap List

| Rank | ID | Gap | Category | Impact | Effort | Dependencies |
|------|-----|-----|----------|--------|--------|--------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

---

## 10. Gap Closure Roadmap

### Phase 1: Foundation (Weeks 1-2)
> Focus: Critical security and stability gaps

| Gap ID | Action | Owner | Deliverable |
|--------|--------|-------|-------------|
| | | | |

### Phase 2: Quality (Weeks 3-4)
> Focus: Code quality and testing gaps

| Gap ID | Action | Owner | Deliverable |
|--------|--------|-------|-------------|
| | | | |

### Phase 3: Enhancement (Weeks 5-8)
> Focus: Performance and feature gaps

| Gap ID | Action | Owner | Deliverable |
|--------|--------|-------|-------------|
| | | | |

### Phase 4: Optimization (Weeks 9-12)
> Focus: Polish and optimization

| Gap ID | Action | Owner | Deliverable |
|--------|--------|-------|-------------|
| | | | |

---

## 11. Success Metrics

### How We'll Know Gaps Are Closed

| Gap Category | Metric | Current | Target | Measurement Method |
|--------------|--------|---------|--------|-------------------|
| Code Quality | Test coverage | % | 80% | CI pipeline |
| Security | Vulnerability count | X | 0 critical | Security scan |
| Performance | API p95 | Xms | <500ms | APM tool |
| | | | | |

---

## 12. Risks & Dependencies

### Risks to Gap Closure

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | | | |
| Resource constraints | | | |
| Technical complexity | | | |

### External Dependencies

| Dependency | Gap IDs Affected | Status | Mitigation |
|------------|------------------|--------|------------|
| | | | |

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Technical Lead | | | ☐ |
| Product Owner | | | ☐ |
| Stakeholder | | | ☐ |
