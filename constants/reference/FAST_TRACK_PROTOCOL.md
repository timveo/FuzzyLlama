# Fast Track Protocol

> **Version:** 4.0.0
> **Created:** 2025-12-19
> **Purpose:** Streamlined approval process for low-risk changes

---

## Overview

Not all changes require full gate validation. The Fast Track Protocol allows cosmetic and text-only changes to bypass certain gates while maintaining quality standards.

---

## When to Use Fast Track

### Eligible Changes

| Change Type | Examples | Fast Track? |
|-------------|----------|-------------|
| **Text-only** | Copy updates, typo fixes, label changes | YES |
| **CSS-only** | Color tweaks, spacing adjustments, font changes | YES |
| **Static assets** | Image swaps, icon updates | YES |
| **Config tweaks** | Environment variable changes, feature flags | YES |
| **Documentation** | README updates, comment improvements | YES |

### NOT Eligible (Full Process Required)

| Change Type | Reason |
|-------------|--------|
| Logic changes | Could introduce bugs |
| API modifications | Security implications |
| Database schema | Data integrity |
| New dependencies | Security audit needed |
| Authentication changes | Security critical |
| New features | Full design/review needed |

---

## Fast Track Detection

### Automated Detection

Use git diff to determine eligibility:

```bash
# Check if changes are fast-track eligible
./scripts/check-fast-track.sh

# Output: "FAST_TRACK_ELIGIBLE" or "FULL_PROCESS_REQUIRED"
```

### Detection Logic

```bash
#!/bin/bash
# Fast Track Eligibility Check

CHANGED_FILES=$(git diff --name-only HEAD~1)

# Check for code changes
CODE_CHANGES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' | grep -v '\.test\.' | grep -v '\.spec\.')

if [ -n "$CODE_CHANGES" ]; then
    # Check if changes are text-only (strings, comments)
    LOGIC_CHANGES=$(git diff HEAD~1 -- $CODE_CHANGES | grep -E '^[+-]' | grep -v '^[+-]{3}' | grep -vE '^\+.*//|^\+.*\*|^\+.*["'\''].*["'\'']$')

    if [ -n "$LOGIC_CHANGES" ]; then
        echo "FULL_PROCESS_REQUIRED"
        echo "Reason: Logic changes detected"
        exit 1
    fi
fi

# Check for CSS-only changes
CSS_ONLY=$(echo "$CHANGED_FILES" | grep -E '\.(css|scss|less)$')
if [ -n "$CSS_ONLY" ] && [ -z "$CODE_CHANGES" ]; then
    echo "FAST_TRACK_ELIGIBLE"
    echo "Reason: CSS-only changes"
    exit 0
fi

# Check for documentation-only changes
DOCS_ONLY=$(echo "$CHANGED_FILES" | grep -E '\.(md|txt|json)$' | grep -v 'package.json')
if [ -n "$DOCS_ONLY" ] && [ -z "$CODE_CHANGES" ]; then
    echo "FAST_TRACK_ELIGIBLE"
    echo "Reason: Documentation-only changes"
    exit 0
fi

echo "FULL_PROCESS_REQUIRED"
echo "Reason: Mixed or uncertain changes"
```

---

## Fast Track Process

### Gates Skipped

| Gate | Status for Fast Track |
|------|----------------------|
| G1 (Intake) | SKIP - No new scope |
| G2 (PRD) | SKIP - No new requirements |
| G3 (Architecture) | **SKIP** - No structural changes |
| G4 (Design) | SKIP - Visual only |
| G5 (Development) | Condensed - Single checkpoint |
| G6 (Quality) | **REQUIRED** - Always test |
| G7 (Security) | **SKIP** - No security impact |
| G8 (Pre-Deploy) | Condensed - Quick checklist |
| G9 (Production) | **REQUIRED** - Smoke test still runs |

### Fast Track Workflow

```
FAST TRACK FLOW
===============

1. Change Detection
   └─ git diff analysis → "FAST_TRACK_ELIGIBLE"

2. Quick Review (5 min)
   └─ Visual inspection of changes
   └─ Confirm no logic/security impact

3. G6 Mini (Quality)
   └─ npm run lint
   └─ npm test
   └─ Visual regression check (if applicable)

4. G8 Quick Deploy
   └─ Deploy to staging
   └─ 5-minute visual check

5. G9 Smoke Test
   └─ Run production smoke test
   └─ Confirm no regressions

TOTAL TIME: ~15-30 minutes (vs 2-4 hours full process)
```

---

## Fast Track Checklist

### Before Starting

```markdown
## Fast Track Eligibility Check

- [ ] Changes are text/CSS/docs only
- [ ] No new files added (except assets)
- [ ] No package.json changes
- [ ] No API endpoint changes
- [ ] No database queries modified
- [ ] No authentication code touched

**If ANY box is unchecked → Use Full Process**
```

### During Fast Track

```markdown
## Fast Track Progress

### Quick Review
- [ ] Reviewed all changed files
- [ ] Confirmed cosmetic-only nature
- [ ] No hidden logic changes

### G6 Mini
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

### Deploy
- [ ] Deployed to staging
- [ ] Visual check passed
- [ ] Smoke test passed

### Sign-off
- [ ] Fast Track approved by: [Name]
- [ ] Date: YYYY-MM-DD
```

---

## Logging Fast Track Decisions

Add to `docs/DECISIONS.md`:

```markdown
## DEC-XXX: Fast Track Approval

**Date:** YYYY-MM-DD
**Type:** Fast Track
**Changes:** [Brief description]

**Eligibility Check:**
- Change type: CSS-only / Text-only / Docs-only
- Files affected: [count] files
- Lines changed: +X / -Y

**Verification:**
- [ ] Lint passed
- [ ] Tests passed
- [ ] Visual check passed

**Approved By:** [Name]
```

---

## Edge Cases

### When in Doubt, Use Full Process

| Situation | Decision |
|-----------|----------|
| "Mostly CSS but one small JS fix" | Full Process |
| "Just updating an API URL" | Full Process (config change) |
| "Changing button text" | Fast Track OK |
| "Fixing typo in error message" | Fast Track OK |
| "Updating color scheme" | Fast Track OK |
| "Adding new CSS class" | Fast Track OK |
| "Modifying existing CSS class" | Fast Track OK |
| "Adding new component" | Full Process |

### Fast Track Abuse Prevention

The Orchestrator should monitor:

1. **Frequency**: If Fast Track is used >3x/week, review change patterns
2. **Scope creep**: If "cosmetic" changes include logic, flag for review
3. **Regression rate**: If Fast Track changes cause bugs, tighten eligibility

---

## Integration with CI/CD

### GitHub Actions Fast Track Job

```yaml
# .github/workflows/fast-track.yml
name: Fast Track

on:
  pull_request:
    types: [labeled]

jobs:
  fast-track:
    if: contains(github.event.label.name, 'fast-track')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Verify Fast Track Eligibility
        run: |
          ./scripts/check-fast-track.sh
          if [ $? -ne 0 ]; then
            echo "::error::Changes not eligible for fast track"
            exit 1
          fi

      - name: Run Lint
        run: npm run lint

      - name: Run Tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Auto-merge if passing
        if: success()
        run: gh pr merge --auto --squash
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-19 | Initial protocol |
