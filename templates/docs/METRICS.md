# Project Metrics

> **This document tracks quantitative metrics throughout the project lifecycle.**
> **Updated automatically at each gate and manually for significant events.**

> **CRITICAL: All metrics MUST be numeric values. Vague claims like "complete" or "good" are REJECTED.**
> **Reference: [METRICS_THRESHOLDS.md](../../constants/reference/METRICS_THRESHOLDS.md)**

---

## MANDATORY Quality Metrics (Gate Requirements)

**These metrics MUST have numeric values for gates G6, G7, G8 to pass.**

### G6 Quality Gate - MANDATORY

| Metric | Value | Threshold | Status | Command |
|--------|-------|-----------|--------|---------|
| `test_coverage_percent` | __%  | ≥80% | ⬜ | `npm test -- --coverage` |
| `tests_failed` | __ | 0 | ⬜ | `npm test` |
| `lint_errors` | __ | 0 | ⬜ | `npm run lint` |
| `type_errors` | __ | 0 | ⬜ | `npx tsc --noEmit` |
| `lighthouse_accessibility` | __ | ≥90 | ⬜ | `npx lighthouse` |

### G7 Security Gate - MANDATORY

| Metric | Value | Threshold | Status | Command |
|--------|-------|-----------|--------|---------|
| `security_critical` | __ | 0 | ⬜ | `npm audit --json` |
| `security_high` | __ | 0 | ⬜ | `npm audit --json` |
| `security_moderate` | __ | 0 | ⬜ | `npm audit --json` |

### G8 Performance Gate - MANDATORY (Frontend)

| Metric | Value | Threshold | Status | Command |
|--------|-------|-----------|--------|---------|
| `bundle_size_gzipped_kb` | __KB | ≤250KB | ⬜ | Build + gzip |
| `lcp_ms` | __ms | ≤2500ms | ⬜ | Lighthouse |
| `fid_ms` | __ms | ≤100ms | ⬜ | Lighthouse |
| `cls` | __ | ≤0.1 | ⬜ | Lighthouse |
| `ttfb_ms` | __ms | ≤600ms | ⬜ | Lighthouse |

### Validation Status

```
Last Validated: YYYY-MM-DD HH:MM
Tier: [mvp/standard/enterprise]
G6 Compliant: [Yes/No]
G7 Compliant: [Yes/No]
G8 Compliant: [Yes/No]
Blocking Issues: [List any]
```

---

## Project Summary

| Metric | Value |
|--------|-------|
| **Project Name** | [project-name] |
| **Project Type** | [traditional/ai_ml/hybrid/enhancement] |
| **Start Date** | YYYY-MM-DD |
| **Current Gate** | [gate] |
| **Days Elapsed** | [X] |
| **Overall Health** | [Green/Yellow/Red] |

---

## Gate Performance

Track how each gate performed against expectations.

| Gate | Attempts | First Pass? | Time Spent | Blockers | Notes |
|------|----------|-------------|------------|----------|-------|
| G1 Intake | 1 | Yes | 30m | 0 | |
| G2 PRD | 1 | Yes | 2h | 0 | |
| G3 Architecture | 2 | No | 4h | 1 | Needed tech stack clarification |
| G4 Design | - | Skipped | - | - | No formal design phase |
| G5.1 Foundation | 1 | Yes | 1h | 0 | |
| G5.2 Data Layer | 1 | Yes | 1.5h | 0 | |
| G5.3 Components | 4 | Yes | 6h | 0 | 4 component iterations |
| G5.4 Integration | 1 | Yes | 2h | 0 | |
| G5.5 Polish | 2 | No | 3h | 0 | Accessibility fixes needed |
| G6 Testing | 1 | Yes | 2h | 0 | |
| G7 Security | 1 | Yes | 1h | 0 | |
| G8 Pre-Deploy | 1 | Yes | 30m | 0 | |
| G9 Production | 1 | Yes | 1h | 0 | |

### Gate Metrics Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| First-pass rate | 75% | >70% | :white_check_mark: |
| Average attempts | 1.3 | <2 | :white_check_mark: |
| Total blockers | 1 | <5 | :white_check_mark: |
| Total time | 24h | - | - |

---

## Agent Efficiency

Track performance by agent role.

| Agent | Activations | Total Time | Avg Duration | Retry Rate | Quality Score |
|-------|-------------|------------|--------------|------------|---------------|
| Orchestrator | 15 | 3h | 12m | 0% | N/A |
| Product Manager | 2 | 2.5h | 75m | 0% | 9/10 |
| Architect | 3 | 4h | 80m | 33% | 8/10 |
| UX/UI Designer | 0 | 0h | - | - | Skipped |
| Frontend Developer | 8 | 10h | 75m | 12% | 9/10 |
| Backend Developer | 4 | 6h | 90m | 0% | 9/10 |
| Data Engineer | 1 | 1h | 60m | 0% | 8/10 |
| QA Engineer | 2 | 2h | 60m | 0% | 9/10 |
| Security Engineer | 1 | 1h | 60m | 0% | 10/10 |
| DevOps Engineer | 2 | 1.5h | 45m | 0% | 9/10 |

### AI/ML Agents (if applicable)

| Agent | Activations | Total Time | Avg Duration | Retry Rate | Quality Score |
|-------|-------------|------------|--------------|------------|---------------|
| ML Engineer | - | - | - | - | - |
| Prompt Engineer | - | - | - | - | - |
| Model Evaluator | - | - | - | - | - |
| AIOps Engineer | - | - | - | - | - |

---

## Cost Tracking

### Estimated API Costs

| Phase | API Calls | Input Tokens | Output Tokens | Est. Cost |
|-------|-----------|--------------|---------------|-----------|
| Intake | 5 | 12K | 8K | $0.30 |
| Planning | 12 | 45K | 32K | $1.20 |
| Architecture | 15 | 60K | 45K | $1.80 |
| Development | 45 | 180K | 150K | $6.00 |
| Testing | 10 | 30K | 20K | $0.80 |
| Security | 5 | 15K | 10K | $0.40 |
| Deployment | 8 | 20K | 15K | $0.55 |
| **Total** | **100** | **362K** | **280K** | **$11.05** |

### Infrastructure Costs (if applicable)

| Service | Monthly Cost | Purpose |
|---------|--------------|---------|
| Vercel | $0 (free tier) | Hosting |
| Supabase | $0 (free tier) | Database |
| OpenAI API | $25/mo | AI features |
| **Total** | **$25/mo** | |

---

## Code Quality Metrics

### Code Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total source files | 47 | - | - |
| Lines of code | 4,250 | - | - |
| Test files | 15 | - | - |
| Test coverage | 82% | >=80% | :white_check_mark: |
| TypeScript strict mode | Yes | Yes | :white_check_mark: |
| ESLint errors | 0 | 0 | :white_check_mark: |
| ESLint warnings | 3 | <10 | :white_check_mark: |

### Complexity Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Avg cyclomatic complexity | 4.2 | <10 | :white_check_mark: |
| Max cyclomatic complexity | 12 | <20 | :white_check_mark: |
| Avg file size (LOC) | 90 | <200 | :white_check_mark: |
| Max file size (LOC) | 245 | <500 | :white_check_mark: |

### Dependency Health

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total dependencies | 23 | <50 | :white_check_mark: |
| Dev dependencies | 18 | <30 | :white_check_mark: |
| Outdated packages | 2 | <5 | :white_check_mark: |
| Critical vulnerabilities | 0 | 0 | :white_check_mark: |
| High vulnerabilities | 0 | 0 | :white_check_mark: |

---

## Performance Metrics

### Frontend Performance (Lighthouse)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Performance score | 94 | >=90 | :white_check_mark: |
| Accessibility score | 98 | >=90 | :white_check_mark: |
| Best Practices score | 100 | >=90 | :white_check_mark: |
| SEO score | 92 | >=90 | :white_check_mark: |

### Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP (Largest Contentful Paint) | 1.2s | <2.5s | :white_check_mark: |
| FID (First Input Delay) | 45ms | <100ms | :white_check_mark: |
| CLS (Cumulative Layout Shift) | 0.02 | <0.1 | :white_check_mark: |
| TTFB (Time to First Byte) | 180ms | <600ms | :white_check_mark: |

### Bundle Size

| Bundle | Size | Gzipped | Target |
|--------|------|---------|--------|
| Main bundle | 245KB | 78KB | <300KB |
| Vendor bundle | 180KB | 55KB | <200KB |
| CSS | 25KB | 8KB | <50KB |
| **Total** | **450KB** | **141KB** | <500KB :white_check_mark: |

### API Performance

| Endpoint | p50 | p95 | p99 | Target |
|----------|-----|-----|-----|--------|
| GET /api/users | 45ms | 120ms | 180ms | <500ms |
| POST /api/users | 80ms | 200ms | 350ms | <500ms |
| GET /api/search | 150ms | 400ms | 600ms | <1000ms |

---

## AI/ML Metrics (if applicable)

### Model Performance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Model accuracy | - | >=90% | - |
| Model latency (p95) | - | <2000ms | - |
| Hallucination rate | - | <2% | - |
| User satisfaction | - | >=4.0/5 | - |

### AI Cost Efficiency

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Cost per 1K requests | - | <$1.00 | - |
| Cache hit rate | - | >50% | - |
| Prompt tokens per request | - | <2000 | - |

---

## Quality Gate History

### Test Results Over Time

| Date | Tests | Passed | Failed | Skipped | Coverage |
|------|-------|--------|--------|---------|----------|
| 2024-01-15 | 45 | 42 | 3 | 0 | 72% |
| 2024-01-16 | 52 | 50 | 2 | 0 | 78% |
| 2024-01-17 | 58 | 58 | 0 | 0 | 82% |

### Security Scan History

| Date | Critical | High | Medium | Low | Status |
|------|----------|------|--------|-----|--------|
| 2024-01-15 | 0 | 2 | 5 | 12 | Blocked |
| 2024-01-16 | 0 | 0 | 3 | 12 | Passed |
| 2024-01-17 | 0 | 0 | 1 | 10 | Passed |

---

## Blocker Analysis

### Blockers Encountered

| ID | Gate | Description | Duration | Resolution |
|----|------|-------------|----------|------------|
| BLOCK-001 | G3 | Tech stack decision needed | 4h | User clarified React preference |
| BLOCK-002 | G5.5 | Accessibility contrast issues | 2h | Updated color palette |

### Blocker Categories

| Category | Count | Avg Resolution Time |
|----------|-------|---------------------|
| Requirements clarity | 1 | 4h |
| Technical issues | 0 | - |
| External dependencies | 0 | - |
| Quality failures | 1 | 2h |
| **Total** | **2** | **3h** |

---

## Retry Analysis

### Retries by Gate

| Gate | Retries | Reason | Outcome |
|------|---------|--------|---------|
| G3 | 1 | Missing ADR for database choice | Passed on retry |
| G5.5 | 1 | Accessibility audit failed | Passed on retry |

### Retry Patterns

| Pattern | Occurrences | Prevention |
|---------|-------------|------------|
| Missing documentation | 1 | Add checklist to gate |
| Quality threshold not met | 1 | Earlier validation |

---

## Time Tracking

### Time by Phase

| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Intake | 30m | 30m | 0% |
| Planning | 2h | 2h | 0% |
| Architecture | 3h | 4h | +33% |
| Design | 2h | Skipped | -100% |
| Development | 12h | 14h | +17% |
| Testing | 2h | 2h | 0% |
| Security | 1h | 1h | 0% |
| Deployment | 2h | 1.5h | -25% |
| **Total** | **24.5h** | **24.5h** | **0%** |

### Time by Activity

| Activity | Hours | Percentage |
|----------|-------|------------|
| Coding | 12h | 49% |
| Documentation | 4h | 16% |
| Testing | 3h | 12% |
| Review/Approval | 3h | 12% |
| Configuration | 2.5h | 10% |
| **Total** | **24.5h** | **100%** |

---

## Trends

### Velocity Trend

| Week | Gates Completed | Blockers | Retries |
|------|-----------------|----------|---------|
| Week 1 | G1-G3 | 1 | 1 |
| Week 2 | G5.1-G5.5, G6-G9 | 1 | 1 |

### Quality Trend

| Week | Coverage | Lint Errors | Security Issues |
|------|----------|-------------|-----------------|
| Week 1 | 65% | 12 | 7 |
| Week 2 | 82% | 0 | 1 |

---

## Recommendations

Based on metrics analysis:

### What Worked Well
1. First-pass rate of 75% exceeded target
2. Security gate passed on first attempt
3. Performance metrics all green

### Areas for Improvement
1. Architecture phase took 33% longer - add tech stack template
2. Two retries could have been prevented with earlier checks
3. Consider adding design phase for future projects

### Action Items
- [ ] Create tech stack decision template for G3
- [ ] Add accessibility pre-check to G5.3 component workflow
- [ ] Document common blocker resolutions in SYSTEM_MEMORY.md

---

## Appendix: Metric Definitions

| Metric | Definition | How Measured |
|--------|------------|--------------|
| First-pass rate | % of gates passing on first attempt | Gates passed first / Total gates |
| Retry rate | % of agent activations requiring retry | Retries / Total activations |
| Quality score | Subjective 1-10 rating of deliverable | User feedback at gate |
| Time spent | Wall clock time for gate | Timestamp diff |
| Coverage | % of code covered by tests | jest --coverage |

---

**Last Updated:** YYYY-MM-DD
**Generated By:** Orchestrator
