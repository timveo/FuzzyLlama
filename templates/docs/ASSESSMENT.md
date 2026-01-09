# Project Assessment

> **Template:** Copy this file to your project's `docs/` folder when evaluating an existing application.

---

## Executive Summary

| Attribute | Value |
|-----------|-------|
| Application Name | [name] |
| Assessment Date | YYYY-MM-DD |
| Assessed By | [agent/person] |
| Overall Health Score | [X.X/10] |
| Recommendation | [Enhance / Refactor / Rewrite / Maintain] |

### Key Findings
1. [Most critical finding]
2. [Second most critical]
3. [Third most critical]

### Estimated Effort
- **Quick Wins:** [X hours]
- **Medium Improvements:** [X days]
- **Major Enhancements:** [X weeks]

---

## Weighted Scoring System

> **The overall health score is calculated using weighted categories.**
> **Security issues weight more heavily than cosmetic code quality issues.**

### Category Scores

| Category | Raw Score | Weight | Weighted Score | Agent |
|----------|-----------|--------|----------------|-------|
| Security | [1-10] | **1.5x** | [raw × 1.5] | Security & Privacy Engineer |
| Architecture | [1-10] | **1.2x** | [raw × 1.2] | Architect |
| Code Quality | [1-10] | 1.0x | [raw × 1.0] | Frontend/Backend Developer |
| Testing & Quality | [1-10] | 1.0x | [raw × 1.0] | QA Engineer |
| DevOps & Infra | [1-10] | 0.8x | [raw × 0.8] | DevOps Engineer |
| Documentation | [1-10] | 0.5x | [raw × 0.5] | All agents |
| AI/ML (if applicable) | [1-10] | 1.0x | [raw × 1.0] | ML Engineer |

### Weight Rationale

| Weight | Category | Rationale |
|--------|----------|-----------|
| **1.5x** | Security | Security vulnerabilities can cause catastrophic damage; weighted highest |
| **1.2x** | Architecture | Architectural issues are expensive to fix and limit future growth |
| **1.0x** | Code Quality | Standard weight for maintainability and readability |
| **1.0x** | Testing | Tests prevent regressions and enable safe refactoring |
| **0.8x** | DevOps | Important but can be improved incrementally without code changes |
| **0.5x** | Documentation | Valuable but doesn't affect runtime behavior |

### Overall Score Calculation

```
                    Sum(category_score × weight)
Overall Score = ────────────────────────────────────
                         Sum(weights)

Example (traditional project, no AI/ML):
  Security:     7 × 1.5 = 10.5
  Architecture: 8 × 1.2 = 9.6
  Code Quality: 6 × 1.0 = 6.0
  Testing:      5 × 1.0 = 5.0
  DevOps:       7 × 0.8 = 5.6
  Documentation: 4 × 0.5 = 2.0
  ─────────────────────────
  Total Weighted: 38.7
  Total Weights: 6.0
  Overall Score: 38.7 / 6.0 = 6.45 → 6.5/10
```

### Score Interpretation

| Overall Score | Recommendation | Description |
|---------------|----------------|-------------|
| **8.0 - 10.0** | **MAINTAIN** | Healthy codebase. Minor fixes only. Continue normal operations. |
| **6.0 - 7.9** | **ENHANCE** | Good foundation. Targeted improvements recommended. |
| **4.0 - 5.9** | **REFACTOR** | Structural issues present. Significant rework needed. |
| **1.0 - 3.9** | **REWRITE** | Fundamental problems. Fresh start likely more efficient. |

### Critical Override Rules

Even with a high overall score, certain findings trigger automatic downgrades:

| Finding | Impact |
|---------|--------|
| Critical security vulnerability (unpatched) | Max score capped at 4.0 |
| No authentication on sensitive endpoints | Max score capped at 5.0 |
| Data breach risk (exposed secrets) | Max score capped at 3.0 |
| Build doesn't compile | Max score capped at 2.0 |
| Zero test coverage | Score reduced by 1.0 |

### AI/ML Project Adjustments

For projects with AI/ML components, additional weights apply:

| Category | Additional Weight | Rationale |
|----------|-------------------|-----------|
| AI/ML Score | 1.0x | Model quality, accuracy, cost |
| Prompt Security | Included in Security (1.5x) | Prompt injection risks |
| Model Drift Monitoring | Included in DevOps (0.8x) | Production ML concerns |

---

## 1. Repository Overview

### Basic Information

| Attribute | Value |
|-----------|-------|
| Repository URL | |
| Primary Language | |
| Framework(s) | |
| Lines of Code | |
| Number of Files | |
| Last Commit | |
| Commit Frequency | [daily/weekly/monthly/stale] |
| Contributors | |
| License | |

### Directory Structure

```
[Paste or describe directory structure]
```

### Technology Stack

| Layer | Technology | Version | Latest Version | Status |
|-------|------------|---------|----------------|--------|
| Frontend Framework | | | | 🟢/🟡/🔴 |
| UI Library | | | | |
| State Management | | | | |
| Backend Framework | | | | |
| Database | | | | |
| ORM/Query Builder | | | | |
| Authentication | | | | |
| API Style | REST/GraphQL/tRPC | | | |
| Hosting | | | | |
| CI/CD | | | | |

**Status Legend:** 🟢 Current | 🟡 1-2 versions behind | 🔴 Outdated/EOL

---

## 2. Code Quality Assessment

### Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Test Coverage | % | ≥80% | |
| Cyclomatic Complexity (avg) | | <10 | |
| Code Duplication | % | <5% | |
| Documentation Coverage | % | ≥60% | |
| Type Coverage (if TS) | % | ≥90% | |
| Lint Errors | | 0 | |
| Security Vulnerabilities | | 0 critical | |

### Code Organization

| Aspect | Rating (1-5) | Notes |
|--------|--------------|-------|
| File/folder structure | | |
| Naming conventions | | |
| Separation of concerns | | |
| Code reusability | | |
| Error handling | | |
| Logging | | |
| Configuration management | | |

### Patterns Identified

**Good Patterns:**
- [ ] [Pattern 1]
- [ ] [Pattern 2]

**Anti-Patterns:**
- [ ] [Anti-pattern 1]
- [ ] [Anti-pattern 2]

---

## 3. Architecture Assessment

### Current Architecture

```
[Diagram or description of current architecture]
```

### Architecture Characteristics

| Characteristic | Rating (1-5) | Notes |
|----------------|--------------|-------|
| Modularity | | |
| Scalability | | |
| Maintainability | | |
| Testability | | |
| Observability | | |
| Security posture | | |

### Integration Points

| System/Service | Type | Protocol | Health | Notes |
|----------------|------|----------|--------|-------|
| | Internal/External | REST/GraphQL/etc | 🟢/🟡/🔴 | |

### Data Flow

```
[Describe or diagram how data flows through the system]
```

---

## 4. Dependency Assessment

### Production Dependencies

| Package | Current | Latest | Risk | Action |
|---------|---------|--------|------|--------|
| | | | Low/Med/High | Keep/Update/Replace |

### Development Dependencies

| Package | Current | Latest | Risk | Action |
|---------|---------|--------|------|--------|
| | | | | |

### Dependency Health

- **Total dependencies:** 
- **Outdated:** 
- **Deprecated:** 
- **Security vulnerabilities:** 
- **Unmaintained (>1yr):** 

---

## 5. Security Assessment

### Authentication & Authorization

| Aspect | Implementation | Status | Notes |
|--------|----------------|--------|-------|
| Auth method | | 🟢/🟡/🔴 | |
| Session management | | | |
| Password policy | | | |
| MFA support | | | |
| Role-based access | | | |
| API authentication | | | |

### Security Vulnerabilities

| ID | Severity | Category | Location | Remediation |
|----|----------|----------|----------|-------------|
| SEC-001 | Critical/High/Med/Low | | | |

### Data Protection

| Aspect | Status | Notes |
|--------|--------|-------|
| Data encryption at rest | ✅/❌ | |
| Data encryption in transit | | |
| PII handling | | |
| Secrets management | | |
| Input validation | | |
| Output encoding | | |

---

## 5.5 AI-Generated Code Assessment

> **Complete this section if the codebase was generated by AI tools like Lovable.dev, Vercel V0, Bolt.new, Replit Agent, Base44, or similar.**

### Source Information

| Attribute | Value |
|-----------|-------|
| Generation Tool | [Lovable / V0 / Bolt / Replit / Base44 / Cursor / Other] |
| Generation Date | YYYY-MM-DD (approx) |
| Iteration Count | [How many prompt cycles] |
| Original Prompt | [Preserved? Y/N] |
| Deployed? | [Y/N - where?] |

### Tool-Specific Considerations

| If Tool Is... | Expect... | Focus Assessment On... |
|---------------|-----------|------------------------|
| **Lovable.dev** | Supabase backend, good UI | RLS policies, auth flow |
| **Vercel V0** | UI only, no backend | Everything backend |
| **Bolt.new** | Full-stack but shallow | Business logic, middleware |
| **Replit Agent** | Quick prototype, deployed | Code quality, security |
| **Base44** | Structured but rigid | Flexibility, customization |

### AI-Generation Red Flags

Check for common AI-generation anti-patterns:

| Check | Found | Severity | Notes |
|-------|-------|----------|-------|
| **Code Quality** | | | |
| Excessive `any` types | ✅/❌ | High | |
| `// @ts-ignore` comments | ✅/❌ | High | |
| Unused imports/variables | ✅/❌ | Low | |
| Inconsistent naming conventions | ✅/❌ | Medium | |
| Copy-paste code duplication | ✅/❌ | Medium | |
| God components (500+ lines) | ✅/❌ | High | |
| **Security** | | | |
| Hardcoded API keys/secrets | ✅/❌ | Critical | |
| Tokens in localStorage | ✅/❌ | High | |
| No input validation | ✅/❌ | High | |
| Overly permissive CORS | ✅/❌ | High | |
| Missing auth checks on routes | ✅/❌ | Critical | |
| SQL/NoSQL injection vectors | ✅/❌ | Critical | |
| **Architecture** | | | |
| Business logic in components | ✅/❌ | High | |
| Direct DB calls from frontend | ✅/❌ | High | |
| No service/repository layer | ✅/❌ | High | |
| Inline fetch() calls | ✅/❌ | Medium | |
| No error boundaries | ✅/❌ | Medium | |
| **State Management** | | | |
| Prop drilling >3 levels | ✅/❌ | Medium | |
| Race conditions in async | ✅/❌ | High | |
| Stale closure issues | ✅/❌ | High | |
| No loading states | ✅/❌ | Medium | |
| No error states | ✅/❌ | Medium | |

### Supabase-Specific Checks (if applicable)

| Check | Status | Notes |
|-------|--------|-------|
| RLS policies exist | ✅/❌ | |
| RLS policies are restrictive | ✅/❌ | |
| No `service_role` key in frontend | ✅/❌ | |
| Proper foreign key relationships | ✅/❌ | |
| Indexes on query columns | ✅/❌ | |
| Edge Functions for sensitive ops | ✅/❌ | |
| Auth hooks configured | ✅/❌ | |

### Keep vs. Rebuild Assessment

| Layer | Quality (1-10) | Recommendation | Rationale |
|-------|----------------|----------------|-----------|
| UI Components | /10 | Keep/Enhance/Rebuild | |
| Page Layouts | /10 | Keep/Enhance/Rebuild | |
| Routing | /10 | Keep/Enhance/Rebuild | |
| State Management | /10 | Keep/Enhance/Rebuild | |
| API Integration | /10 | Keep/Enhance/Rebuild | |
| Backend Logic | /10 | Keep/Enhance/Rebuild | |
| Database Schema | /10 | Keep/Enhance/Rebuild | |
| Authentication | /10 | Keep/Enhance/Rebuild | |

### AI-Generated Code Summary

| Metric | Value |
|--------|-------|
| Lines of Code | |
| Files Generated | |
| Test Files | (usually 0) |
| Console.log Count | |
| TODO/FIXME Count | |
| Type Coverage | % |
| Critical Security Issues | |

### Recommended Transition Path

☐ **ENHANCE** — Keep most code, targeted fixes (Score 7+)
☐ **HYBRID** — Keep frontend, rebuild backend (Score 5-7)
☐ **REFACTOR** — Major restructuring needed (Score 4-5)
☐ **REBUILD** — Use as reference only (Score <4)

**Transition Effort Estimate:**
- Frontend work: [X hours]
- Backend work: [X hours]
- Testing work: [X hours]
- Total: [X hours]

**See:** `constants/LOVABLE_TRANSITION.md` for detailed transition protocol.

---

## 6. Performance Assessment

### Current Performance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Page Load (p50) | | <2s | |
| Page Load (p95) | | <4s | |
| API Response (p50) | | <200ms | |
| API Response (p95) | | <500ms | |
| Time to Interactive | | <3s | |
| Lighthouse Score | | ≥90 | |
| Core Web Vitals - LCP | | <2.5s | |
| Core Web Vitals - FID | | <100ms | |
| Core Web Vitals - CLS | | <0.1 | |

### Bottlenecks Identified

| ID | Location | Impact | Cause | Suggested Fix |
|----|----------|--------|-------|---------------|
| PERF-001 | | High/Med/Low | | |

### Resource Usage

| Resource | Current | Trend | Notes |
|----------|---------|-------|-------|
| Memory | | ↑/→/↓ | |
| CPU | | | |
| Database connections | | | |
| API rate limits | | | |

---

## 7. Testing Assessment

### Test Coverage by Type

| Type | Exists | Coverage | Quality (1-5) |
|------|--------|----------|---------------|
| Unit tests | ✅/❌ | % | |
| Integration tests | | | |
| E2E tests | | | |
| API tests | | | |
| Performance tests | | | |
| Security tests | | | |

### Test Infrastructure

| Aspect | Tool/Status | Notes |
|--------|-------------|-------|
| Test runner | | |
| Mocking | | |
| CI integration | | |
| Test data management | | |

### Test Gaps

- [ ] [Gap 1]
- [ ] [Gap 2]

---

## 8. Documentation Assessment

### Documentation Inventory

| Document | Exists | Current | Quality (1-5) |
|----------|--------|---------|---------------|
| README | ✅/❌ | ✅/❌ | |
| API documentation | | | |
| Architecture docs | | | |
| Setup/installation | | | |
| Deployment guide | | | |
| Contributing guide | | | |
| Code comments | | | |
| Inline JSDoc/TSDoc | | | |

### Documentation Gaps

- [ ] [Gap 1]
- [ ] [Gap 2]

---

## 9. DevOps & Infrastructure Assessment

### CI/CD Pipeline

| Stage | Implemented | Tool | Notes |
|-------|-------------|------|-------|
| Build | ✅/❌ | | |
| Lint | | | |
| Test | | | |
| Security scan | | | |
| Deploy (staging) | | | |
| Deploy (production) | | | |

### Infrastructure

| Aspect | Current Setup | Notes |
|--------|---------------|-------|
| Hosting provider | | |
| Compute | | |
| Database hosting | | |
| CDN | | |
| SSL/TLS | | |
| Monitoring | | |
| Logging | | |
| Alerting | | |
| Backup strategy | | |

### Environment Management

| Environment | Exists | Parity with Prod | Notes |
|-------------|--------|------------------|-------|
| Local dev | ✅/❌ | | |
| Staging | | | |
| Production | | | |

---

## 10. Business Context

### Usage & Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| Active users | | |
| Requests/day | | |
| Revenue (if applicable) | | |
| Error rate | | |
| Support tickets/week | | |

### Stakeholder Feedback

| Source | Key Feedback |
|--------|--------------|
| Users | |
| Developers | |
| Operations | |
| Business | |

### Known Pain Points

1. [Pain point 1]
2. [Pain point 2]
3. [Pain point 3]

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security breach | H/M/L | H/M/L | |
| Performance degradation | | | |
| Key dependency EOL | | | |
| Knowledge loss (bus factor) | | | |
| Scaling limitations | | | |

---

## 12. Recommendations Summary

### Immediate Actions (This Week)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P0 | | | |
| P0 | | | |

### Short-term (This Month)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P1 | | | |
| P1 | | | |

### Medium-term (This Quarter)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P2 | | | |
| P2 | | | |

### Long-term (6+ Months)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P3 | | | |

---

## Assessment Sign-off

| Role | Agent | Date | Approved |
|------|-------|------|----------|
| Technical Lead | Architect | | ☐ |
| Security | Security & Privacy Engineer | | ☐ |
| Quality | QA Engineer | | ☐ |
| Operations | DevOps Engineer | | ☐ |
