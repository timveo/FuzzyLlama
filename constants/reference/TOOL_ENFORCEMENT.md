# Tool Enforcement Protocol

> **Purpose:** Ensure tools defined in STANDARD_TOOLING.md are actually used and verified at runtime. This protocol makes tooling decisions non-negotiable without explicit user override.

---

## Why Enforcement Matters

Documentation alone doesn't prevent:
- Agent using personal preference (Jest instead of Vitest)
- Outdated patterns (Tailwind v3 syntax in 2025)
- Anti-pattern dependencies (lodash, moment, webpack)
- Configuration drift between projects

**This protocol creates automated checkpoints that BLOCK progress until tools are verified.**

---

## Enforcement Points

### 1. G5.1 Foundation - Tool Installation Check

**MANDATORY before G5.1 approval:**

```bash
# Run this check automatically
./scripts/validate-project.sh [path] tools
```

**What gets verified:**

| Check | Pass Criteria | Block If Fail |
|-------|---------------|---------------|
| React version | `react@19.x` in dependencies | YES |
| TypeScript version | `typescript@5.x` in devDependencies | YES |
| Build tool | `vite@6.x` or `vite@7.x`, NO webpack | YES |
| Test runner | `vitest`, NO jest | YES |
| Styling | `tailwindcss@4.x` with `@tailwindcss/postcss` | YES |
| Linting | `eslint` present | YES |

**Anti-patterns blocked:**

| Package | Block Reason |
|---------|--------------|
| `webpack` | Use Vite |
| `jest` | Use Vitest |
| `moment` | Use native Date or date-fns |
| `lodash` | Use native JS methods |
| `axios` (frontend) | Use fetch |
| `sass`/`scss` | Use Tailwind |
| `redux` | Use Zustand |
| `mysql`/`sqlite` (ORM target) | Use PostgreSQL |

---

### 2. Configuration Syntax Verification

**MANDATORY checks for 2025 compliance:**

#### postcss.config.js
```bash
# Must contain '@tailwindcss/postcss', NOT 'tailwindcss'
grep -q "@tailwindcss/postcss" postcss.config.js || FAIL
grep -q "tailwindcss'" postcss.config.js && FAIL "Using v3 syntax"
```

#### src/index.css
```bash
# Must use @import "tailwindcss", NOT @tailwind directives
grep -q '@import "tailwindcss"' src/index.css || \
grep -q "@import 'tailwindcss'" src/index.css || FAIL
grep -q "@tailwind" src/index.css && FAIL "Using v3 @tailwind syntax"
```

#### vite.config.ts
```bash
# Must have Vitest reference
grep -q "vitest/config" vite.config.ts || FAIL "Missing Vitest config reference"
```

#### TypeScript imports
```bash
# Check for type-only imports using 'import type'
# At least 50% of type imports should use 'import type'
```

---

### 3. Verify Script Requirement

**package.json MUST contain:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run build && npm test && npm run lint"
  }
}
```

**Enforcement:**
- `verify` script MUST exist
- `verify` script MUST include build + test + lint
- Gates MUST run `npm run verify` to pass

---

## Automated Enforcement Script

Add to `scripts/validate-project.sh`:

### Tool Validation Function

```bash
# ============================================
# TOOL ENFORCEMENT VALIDATION
# ============================================
validate_tools() {
    echo "--- Standard Tool Enforcement ---"

    cd "$PROJECT_PATH"

    if [ ! -f "package.json" ]; then
        fail "package.json not found"
        return 1
    fi

    echo ""
    echo "=== Required Tools Check ==="

    # React 19.x
    if grep -q '"react".*"[^"]*19\.' package.json 2>/dev/null || \
       grep -q '"react".*"\^19\.' package.json 2>/dev/null; then
        pass "React 19.x installed"
    else
        REACT_VER=$(grep '"react"' package.json | grep -oE '[0-9]+\.[0-9]+')
        if [ -n "$REACT_VER" ]; then
            warn "React version: $REACT_VER (19.x preferred)"
        else
            fail "React not found in dependencies"
        fi
    fi

    # TypeScript 5.x
    if grep -q '"typescript"' package.json 2>/dev/null; then
        TS_VER=$(grep '"typescript"' package.json | grep -oE '[0-9]+\.[0-9]+')
        if echo "$TS_VER" | grep -q "^5\."; then
            pass "TypeScript 5.x installed ($TS_VER)"
        else
            warn "TypeScript version: $TS_VER (5.x preferred)"
        fi
    else
        fail "TypeScript not found"
    fi

    # Vite (NOT webpack)
    if grep -q '"vite"' package.json 2>/dev/null; then
        pass "Vite installed"
    else
        fail "Vite not found - required build tool"
    fi

    if grep -q '"webpack"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: webpack found - use Vite instead"
    else
        pass "No webpack (correct)"
    fi

    # Vitest (NOT jest)
    if grep -q '"vitest"' package.json 2>/dev/null; then
        pass "Vitest installed"
    else
        fail "Vitest not found - required test runner"
    fi

    if grep -q '"jest"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: jest found - use Vitest instead"
    else
        pass "No jest (correct)"
    fi

    # Tailwind CSS 4.x
    if grep -q '"tailwindcss"' package.json 2>/dev/null; then
        TAILWIND_VER=$(grep '"tailwindcss"' package.json | grep -oE '[0-9]+\.[0-9]+')
        if echo "$TAILWIND_VER" | grep -q "^4\."; then
            pass "Tailwind CSS 4.x installed"
        else
            warn "Tailwind version: $TAILWIND_VER (4.x required for 2025)"
        fi
    else
        fail "Tailwind CSS not found"
    fi

    # @tailwindcss/postcss (v4 requirement)
    if grep -q '"@tailwindcss/postcss"' package.json 2>/dev/null; then
        pass "@tailwindcss/postcss installed (v4 requirement)"
    else
        fail "@tailwindcss/postcss not found (required for Tailwind v4)"
    fi

    # ESLint
    if grep -q '"eslint"' package.json 2>/dev/null; then
        pass "ESLint installed"
    else
        fail "ESLint not found"
    fi

    echo ""
    echo "=== Anti-Pattern Check ==="

    # Check for anti-pattern packages
    ANTI_PATTERNS=("moment" "lodash" "sass" "scss" "redux" "jquery")

    for pkg in "${ANTI_PATTERNS[@]}"; do
        if grep -q "\"$pkg\"" package.json 2>/dev/null; then
            fail "ANTI-PATTERN: '$pkg' found - see STANDARD_TOOLING.md for alternatives"
        fi
    done

    # axios in frontend (OK in backend)
    if grep -q '"axios"' package.json 2>/dev/null; then
        if [ -f "src/main.tsx" ] || [ -f "src/App.tsx" ]; then
            warn "axios found in frontend - prefer fetch or TanStack Query"
        fi
    fi

    echo ""
    echo "=== Configuration Syntax Check ==="

    # postcss.config.js - Tailwind v4 syntax
    if [ -f "postcss.config.js" ]; then
        if grep -q "@tailwindcss/postcss" postcss.config.js 2>/dev/null; then
            pass "postcss.config.js uses Tailwind v4 syntax"
        else
            if grep -q "'tailwindcss'" postcss.config.js 2>/dev/null || \
               grep -q '"tailwindcss"' postcss.config.js 2>/dev/null; then
                fail "postcss.config.js uses Tailwind v3 syntax - update to '@tailwindcss/postcss'"
            else
                warn "postcss.config.js syntax could not be verified"
            fi
        fi
    else
        warn "postcss.config.js not found"
    fi

    # src/index.css - Tailwind v4 syntax
    if [ -f "src/index.css" ]; then
        if grep -q '@import.*tailwindcss' src/index.css 2>/dev/null; then
            pass "src/index.css uses Tailwind v4 @import syntax"
        else
            if grep -q "@tailwind" src/index.css 2>/dev/null; then
                fail "src/index.css uses Tailwind v3 @tailwind syntax - update to @import \"tailwindcss\""
            else
                warn "src/index.css may not import Tailwind correctly"
            fi
        fi
    else
        warn "src/index.css not found"
    fi

    # vite.config.ts - Vitest reference
    if [ -f "vite.config.ts" ]; then
        if grep -q "vitest/config" vite.config.ts 2>/dev/null; then
            pass "vite.config.ts has Vitest reference"
        else
            fail "vite.config.ts missing /// <reference types=\"vitest/config\" />"
        fi
    else
        if [ -f "vite.config.js" ]; then
            warn "Using vite.config.js - recommend vite.config.ts for TypeScript"
        else
            fail "vite.config.ts not found"
        fi
    fi

    echo ""
    echo "=== Verify Script Check ==="

    # Check for verify script
    if grep -q '"verify"' package.json 2>/dev/null; then
        pass "verify script exists"

        # Check verify script content
        VERIFY_SCRIPT=$(grep -A1 '"verify"' package.json | tail -1)
        if echo "$VERIFY_SCRIPT" | grep -q "build" && \
           echo "$VERIFY_SCRIPT" | grep -q "test" && \
           echo "$VERIFY_SCRIPT" | grep -q "lint"; then
            pass "verify script includes build + test + lint"
        else
            warn "verify script may be incomplete - should include build, test, and lint"
        fi
    else
        fail "verify script missing - add: \"verify\": \"npm run build && npm test && npm run lint\""
    fi

    # Actually run verify if it exists
    if grep -q '"verify"' package.json 2>/dev/null; then
        echo ""
        echo "=== Running npm run verify ==="
        if npm run verify 2>/dev/null; then
            pass "npm run verify passed"
        else
            fail "npm run verify failed - fix build/test/lint errors before proceeding"
        fi
    fi
}
```

---

## Integration with Gates

### G5.1 Foundation

Before approval, orchestrator MUST:

```bash
./scripts/validate-project.sh [path] tools
```

**If validation fails:**
```markdown
## ⛔ G5.1 BLOCKED: Tool Enforcement Failed

The following tool requirements were not met:

### Errors (Must Fix)
- [ ] Vitest not found - install with: npm install -D vitest
- [ ] postcss.config.js uses v3 syntax - see STANDARD_TOOLING.md

### Warnings (Should Fix)
- [ ] axios found in frontend - prefer fetch

**Action:** Fix all errors before G5.1 can be approved.
```

### G5.4 Integration

Re-run tool check to catch any drift:

```bash
./scripts/validate-project.sh [path] tools
```

**Additional check:** Verify no new anti-pattern packages were added since G5.1.

---

## User Override Process

If user explicitly requests a non-standard tool in Q5 (constraints):

### 1. Log Override in INTAKE.md

```markdown
## Q5: Constraints

**User said:**
> "I need to use Jest because my team is familiar with it"
> "We have an existing MySQL database"

**Overrides Granted:**

| Override ID | Standard Tool | Requested Tool | Reason | Approved |
|-------------|---------------|----------------|--------|----------|
| OVERRIDE-001 | Vitest | Jest | Team familiarity | Yes (Q5) |
| OVERRIDE-002 | PostgreSQL | MySQL | Existing infrastructure | Yes (Q5) |
```

### 2. Generalized Override Detection

```bash
# ============================================
# OVERRIDE CHECKING FUNCTION
# ============================================
check_override() {
    local ACTUAL_TOOL="$1"
    local TOOL_LOWER=$(echo "$ACTUAL_TOOL" | tr '[:upper:]' '[:lower:]')

    # Check INTAKE.md for override table entry
    if [ -f "$PROJECT_PATH/docs/INTAKE.md" ]; then
        if grep -qi "OVERRIDE.*$TOOL_LOWER\|$TOOL_LOWER.*Override" "$PROJECT_PATH/docs/INTAKE.md" 2>/dev/null; then
            return 0  # Override exists
        fi
    fi

    # Check TECH_STACK.md for deviation entry
    if [ -f "$PROJECT_PATH/docs/TECH_STACK.md" ]; then
        if grep -qi "Deviation.*$TOOL_LOWER\|$TOOL_LOWER" "$PROJECT_PATH/docs/TECH_STACK.md" 2>/dev/null; then
            # Verify it's in deviations section, not just mentioned
            if grep -A20 "Deviations from Standard" "$PROJECT_PATH/docs/TECH_STACK.md" 2>/dev/null | grep -qi "$TOOL_LOWER"; then
                return 0  # Documented deviation
            fi
        fi
    fi

    return 1  # No override found
}

# Usage in validation
validate_with_override() {
    local ANTI_TOOL="$1"
    local STANDARD_TOOL="$2"
    local FAIL_MSG="$3"

    if grep -q "\"$ANTI_TOOL\"" package.json 2>/dev/null; then
        if check_override "$ANTI_TOOL"; then
            info "$ANTI_TOOL allowed via user override"
        else
            fail "$FAIL_MSG"
        fi
    else
        pass "No $ANTI_TOOL (correct)"
    fi
}

# Example calls
validate_with_override "jest" "vitest" "ANTI-PATTERN: jest found - use Vitest"
validate_with_override "webpack" "vite" "ANTI-PATTERN: webpack found - use Vite"
validate_with_override "mysql" "postgresql" "MySQL found - PostgreSQL recommended"
```

### 3. Document in TECH_STACK.md

```markdown
## Deviations from Standard

| Override ID | Standard Tool | Actual Tool | Reason | Approved By | Date |
|-------------|---------------|-------------|--------|-------------|------|
| OVERRIDE-001 | Vitest | Jest | Team familiarity | User (Q5) | 2024-12-18 |
| OVERRIDE-002 | PostgreSQL | MySQL | Existing DB | User (Q5) | 2024-12-18 |
```

### 4. Log in DECISIONS.md

```markdown
## OVERRIDE-XXX: Tool Deviation

**Date:** YYYY-MM-DD
**Gate:** G1 (Intake)
**Type:** Tool Override

### Standard Tool
[Tool from STANDARD_TOOLING.md]

### Requested Tool
[Tool user wants to use]

### User Justification
> "[Verbatim from Q5 response]"

### Impact Assessment
- **Compatibility:** [High/Medium/Low risk]
- **Team Knowledge:** [Available/Training needed]
- **Migration Path:** [Easy/Moderate/Difficult]

### Decision
- **Approved:** Yes/No
- **Conditions:** [Any conditions on the override]
- **Review Date:** [When to reconsider if temporary]
```

### Override Categories

| Category | Examples | Override Allowed | Conditions |
|----------|----------|------------------|------------|
| **Test Runner** | Jest, Mocha | Yes | Team familiarity |
| **Database** | MySQL, SQLite | Yes | Existing infrastructure |
| **Styling** | Sass, CSS-in-JS | Yes | Design system requirements |
| **Build Tool** | Webpack | Discouraged | Strong justification needed |
| **Framework** | Next.js, Remix | Yes | Project requirements |
| **State Mgmt** | Redux, MobX | Yes | Team preference |
| **Anti-Patterns** | Lodash, Moment | No | Security/performance concerns |

### Override Validation at Gates

| Gate | Override Check |
|------|----------------|
| G1 | Capture overrides in Q5 response |
| G3 | Verify TECH_STACK.md documents deviations |
| G5.1 | Skip validation for overridden tools |
| G5.4 | Confirm no undocumented deviations added |
| G6 | Override tools must still pass tests |

---

## Enforcement Checklist Summary

### At G5.1 (MANDATORY)

- [ ] React 19.x installed
- [ ] TypeScript 5.x installed
- [ ] Vite installed (no webpack)
- [ ] Vitest installed (no jest)
- [ ] Tailwind CSS 4.x installed
- [ ] @tailwindcss/postcss installed
- [ ] ESLint installed
- [ ] No anti-pattern packages
- [ ] postcss.config.js uses v4 syntax
- [ ] src/index.css uses @import syntax
- [ ] vite.config.ts has Vitest reference
- [ ] verify script exists and includes build+test+lint
- [ ] `npm run verify` passes

### At G5.4 (Re-verify)

- [ ] All G5.1 checks still pass
- [ ] No new anti-pattern packages added
- [ ] Configuration files unchanged (or improved)

### At G6 (Testing)

- [ ] Coverage configured in Vitest
- [ ] Test threshold of 80% enforced in config
- [ ] All tests pass with `npm run verify`

---

## Quick Reference: Enforcement Commands

```bash
# Full tool validation
./scripts/validate-project.sh /path/to/project tools

# Just check package.json for anti-patterns
grep -E "moment|lodash|jquery|sass|webpack|jest" package.json

# Check Tailwind v4 syntax
grep "@tailwindcss/postcss" postcss.config.js
grep '@import.*tailwindcss' src/index.css

# Check verify script
npm run verify

# Check specific tool versions
npm list react typescript vite vitest tailwindcss
```

---

## Error Recovery

### If Wrong Tool Already Installed

```bash
# Remove anti-pattern and install correct tool
npm uninstall jest
npm install -D vitest

# Update configuration
# ... (follow STANDARD_TOOLING.md)

# Re-run verification
./scripts/validate-project.sh . tools
```

### If Configuration Syntax Wrong

```bash
# Update postcss.config.js
# Change: plugins: { tailwindcss: {} }
# To:     plugins: { '@tailwindcss/postcss': {} }

# Update src/index.css
# Change: @tailwind base; @tailwind components; @tailwind utilities;
# To:     @import "tailwindcss";
```

---

## Version

**Version:** 1.1.0
**Created:** 2024-12-18
**Updated:** 2024-12-18
**Purpose:** Automated enforcement of standard tooling decisions
**Companion to:** STANDARD_TOOLING.md, EXTERNAL_TOOLS.md
**Changes:** Generalized override mechanism with check_override() function and override categories
