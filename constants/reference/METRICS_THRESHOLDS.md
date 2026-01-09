# Metrics Thresholds Reference

## Overview

All project metrics MUST be reported as **numeric values**. Vague claims like "complete", "good", or "done" are **REJECTED** by the gate validation system.

## Gate Requirements

### G6 - Quality Gate (MANDATORY)

| Metric | MVP | Standard | Enterprise | Command to Measure |
|--------|-----|----------|------------|-------------------|
| `test_coverage_percent` | ≥60% | ≥80% | ≥90% | `npm test -- --coverage` |
| `tests_failed` | 0 | 0 | 0 | `npm test` |
| `lint_errors` | 0 | 0 | 0 | `npm run lint` |
| `lint_warnings` | ≤20 | ≤10 | 0 | `npm run lint` |
| `type_errors` | 0 | 0 | 0 | `npx tsc --noEmit` |
| `lighthouse_performance` | ≥80 | ≥90 | ≥95 | `npx lighthouse` |
| `lighthouse_accessibility` | ≥85 | ≥90 | ≥95 | `npx lighthouse` |
| `lighthouse_best_practices` | ≥80 | ≥90 | ≥95 | `npx lighthouse` |
| `lighthouse_seo` | ≥80 | ≥90 | ≥95 | `npx lighthouse` |

### G7 - Security Gate (MANDATORY)

| Metric | MVP | Standard | Enterprise | Command to Measure |
|--------|-----|----------|------------|-------------------|
| `security_critical` | 0 | 0 | 0 | `npm audit --json` |
| `security_high` | 0 | 0 | 0 | `npm audit --json` |
| `security_moderate` | ≤3 | 0 | 0 | `npm audit --json` |

### G8 - Performance Gate (MANDATORY)

| Metric | MVP | Standard | Enterprise | Command to Measure |
|--------|-----|----------|------------|-------------------|
| `bundle_size_gzipped_kb` | ≤100KB | ≤250KB | ≤500KB | `npm run build && gzip -c dist/*.js \| wc -c` |
| `lcp_ms` (Largest Contentful Paint) | ≤3000ms | ≤2500ms | ≤2000ms | Lighthouse / PageSpeed |
| `fid_ms` (First Input Delay) | ≤150ms | ≤100ms | ≤50ms | Lighthouse / PageSpeed |
| `cls` (Cumulative Layout Shift) | ≤0.15 | ≤0.1 | ≤0.05 | Lighthouse / PageSpeed |
| `ttfb_ms` (Time to First Byte) | ≤800ms | ≤600ms | ≤400ms | Lighthouse / PageSpeed |
| `api_response_p95_ms` | ≤1000ms | ≤500ms | ≤300ms | Load testing tool |

## MCP Tools for Metrics

### Recording Metrics

```
update_quality_metrics({
  project_path: "/path/to/project",
  test_coverage_percent: 85,
  tests_passed: 42,
  tests_failed: 0,
  lint_errors: 0,
  type_errors: 0,
  lighthouse_performance: 92,
  lighthouse_accessibility: 94
})
```

### Validating Before Gate

```
validate_quality_metrics({
  project_path: "/path/to/project",
  gate: "G6",
  tier: "standard"
})
```

Returns:
```json
{
  "compliant": true,
  "checks": [
    { "name": "Test Coverage", "passed": true, "value": "85%", "threshold": ">=80%" }
  ],
  "blocking_issues": [],
  "missing_metrics": []
}
```

### Getting Summary Report

```
get_metrics_summary({
  project_path: "/path/to/project"
})
```

## How to Collect Metrics

### Test Coverage

```bash
# Jest with coverage
npm test -- --coverage --coverageReporters=json-summary

# Read from coverage/coverage-summary.json
cat coverage/coverage-summary.json | jq '.total.lines.pct'
```

### Lint Errors/Warnings

```bash
# ESLint with JSON output
npm run lint -- --format json --output-file eslint-report.json

# Count errors and warnings
cat eslint-report.json | jq '[.[] | .errorCount] | add'
cat eslint-report.json | jq '[.[] | .warningCount] | add'
```

### TypeScript Errors

```bash
# TypeScript with error count
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

### Security Vulnerabilities

```bash
# npm audit with JSON
npm audit --json | jq '.metadata.vulnerabilities'
```

### Lighthouse Scores

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse.json

# Extract scores
cat lighthouse.json | jq '.categories.performance.score * 100'
cat lighthouse.json | jq '.categories.accessibility.score * 100'
```

### Bundle Size

```bash
# After build
npm run build
du -sk dist/ | cut -f1  # Total size in KB

# Gzipped size
gzip -c dist/main.js | wc -c | awk '{print $1/1024}'
```

### Core Web Vitals

Use Lighthouse or PageSpeed Insights API:
```bash
# PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=YOUR_URL&strategy=mobile"
```

## Gate Validation Flow

1. **Run measurements** using commands above
2. **Record metrics** via `update_quality_metrics`
3. **Validate** via `validate_quality_metrics`
4. **If compliant=false**: Fix blocking issues, re-measure, re-validate
5. **If compliant=true**: Proceed with gate presentation

## Example: Complete G6 Validation

```bash
# 1. Run tests with coverage
npm test -- --coverage

# 2. Run lint
npm run lint

# 3. Run typecheck
npx tsc --noEmit

# 4. Run Lighthouse
npx lighthouse http://localhost:3000 --output=json

# 5. Record all metrics via MCP tool
update_quality_metrics({
  project_path: "/path/to/project",
  test_coverage_percent: 87,
  tests_passed: 156,
  tests_failed: 0,
  tests_skipped: 2,
  test_execution_time_ms: 4500,
  lint_errors: 0,
  lint_warnings: 3,
  type_errors: 0,
  lighthouse_performance: 94,
  lighthouse_accessibility: 96,
  lighthouse_best_practices: 92,
  lighthouse_seo: 100
})

# 6. Validate for G6
validate_quality_metrics({
  project_path: "/path/to/project",
  gate: "G6",
  tier: "standard"
})

# Expected output:
# { compliant: true, checks: [...], blocking_issues: [], missing_metrics: [] }
```

## Anti-Patterns (REJECTED)

❌ "Tests complete" - Missing numeric coverage
❌ "All tests pass" - Missing test count
❌ "Good performance" - Missing Lighthouse scores
❌ "Security reviewed" - Missing vulnerability counts
❌ "Build optimized" - Missing bundle size

## Required Format (ACCEPTED)

✅ "Test coverage: 87% (156 passed, 0 failed)"
✅ "Lighthouse: Performance 94, Accessibility 96"
✅ "Security: 0 critical, 0 high, 2 moderate vulnerabilities"
✅ "Bundle: 145KB gzipped"
✅ "Core Web Vitals: LCP 1.8s, FID 45ms, CLS 0.05"
