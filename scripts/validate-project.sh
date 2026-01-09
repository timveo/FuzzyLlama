#!/bin/bash
#
# Project Validation Script
#
# This script validates that a project follows the agent system protocols.
# Run this after each gate to ensure compliance.
#
# Usage: ./scripts/validate-project.sh /path/to/project [gate]
#
# Gates: startup, g1, g2, g3, g4, g5.1, g5.2, g5.3, g5.4, g5.5, g6, g7, g8, g9, full, complete
# Special: handoff, locked-check, accessibility, security-full, coverage, tools
#
# Tool enforcement: Use 'tools' to validate standard tooling (STANDARD_TOOLING.md)

# Don't use set -e - we handle errors ourselves and want validation to continue
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (where agent system lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SYSTEM_DIR="$(dirname "$SCRIPT_DIR")"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Project path required${NC}"
    echo "Usage: ./scripts/validate-project.sh /path/to/project [gate]"
    echo ""
    echo "Gates: startup, g1, g2, g3, g4, g5.1, g5.2, g5.3, g5.4, g5.5, g6, g7, g8, g9, full, complete"
    echo "Special commands:"
    echo "  handoff <file>     - Validate a handoff JSON file against schema"
    echo "  locked-check       - Check if any locked components were modified"
    echo "  accessibility      - Run accessibility audit (requires build)"
    echo "  security-full      - Run comprehensive security scan"
    exit 1
fi

PROJECT_PATH="$1"
GATE="${2:-full}"

# Verify project exists
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_PATH${NC}"
    exit 1
fi

echo "========================================"
echo "Project Validation: $PROJECT_PATH"
echo "Gate: $GATE"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((ERRORS++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# ============================================
# SCHEMA VALIDATION (P1)
# ============================================
validate_handoff_json() {
    local handoff_file="$1"

    echo "--- Handoff JSON Schema Validation ---"

    if [ ! -f "$handoff_file" ]; then
        fail "Handoff file not found: $handoff_file"
        return 1
    fi

    # Check if ajv-cli is available
    if command -v npx &> /dev/null; then
        # Validate against schema
        SCHEMA_PATH="$AGENT_SYSTEM_DIR/schemas/handoff.schema.json"

        if [ -f "$SCHEMA_PATH" ]; then
            info "Validating against $SCHEMA_PATH"

            # Try to validate with ajv
            if npx ajv validate -s "$SCHEMA_PATH" -d "$handoff_file" 2>/dev/null; then
                pass "Handoff JSON is valid against schema"
            else
                # If ajv not installed, try basic JSON validation
                if python3 -c "import json; json.load(open('$handoff_file'))" 2>/dev/null; then
                    warn "JSON is valid but schema validation unavailable (install ajv-cli for full validation)"
                else
                    fail "Invalid JSON in handoff file"
                fi
            fi
        else
            warn "Schema file not found at $SCHEMA_PATH"
        fi
    else
        # Fallback to basic JSON validation
        if python3 -c "import json; json.load(open('$handoff_file'))" 2>/dev/null; then
            pass "Handoff file is valid JSON"
            warn "Install ajv-cli for full schema validation: npm install -g ajv-cli"
        else
            fail "Invalid JSON in handoff file"
        fi
    fi

    # Check required fields manually
    if grep -q '"handoff"' "$handoff_file" && \
       grep -q '"next_agent"' "$handoff_file" && \
       grep -q '"next_action"' "$handoff_file"; then
        pass "Required handoff fields present (handoff, next_agent, next_action)"
    else
        fail "Missing required handoff fields"
    fi

    # Check for idempotency key (P2 enhancement)
    if grep -q '"idempotency_key"' "$handoff_file"; then
        pass "Idempotency key present"
    else
        warn "Idempotency key not present (recommended for production)"
    fi
}

# ============================================
# LOCKED COMPONENTS CHECK (P1)
# ============================================
check_locked_components() {
    echo "--- Locked Components Check ---"

    local intake_file="$PROJECT_PATH/docs/INTAKE.md"
    local violations=0

    if [ ! -f "$intake_file" ]; then
        warn "INTAKE.md not found - cannot check locked components"
        return 0
    fi

    # Extract locked components from INTAKE.md
    # Look for patterns like "Locked: frontend_design, database_schema"
    local locked_line=$(grep -i "locked\|locked_components\|do not modify" "$intake_file" 2>/dev/null | head -1)

    if [ -z "$locked_line" ]; then
        info "No locked components specified in INTAKE.md"
        return 0
    fi

    info "Locked components line: $locked_line"

    # Get changed files since last commit (or all tracked files if no commits)
    cd "$PROJECT_PATH"
    local changed_files=""

    if git rev-parse HEAD~1 &>/dev/null; then
        changed_files=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
    else
        changed_files=$(git ls-files 2>/dev/null)
    fi

    # Check each locked component type
    if echo "$locked_line" | grep -qi "database_schema\|database\|schema"; then
        if echo "$changed_files" | grep -q "prisma/schema.prisma\|schema.sql\|migrations/"; then
            fail "LOCKED COMPONENT MODIFIED: database_schema"
            ((violations++))
        else
            pass "database_schema: Not modified"
        fi
    fi

    if echo "$locked_line" | grep -qi "frontend_design\|ui_design\|design"; then
        if echo "$changed_files" | grep -q "\.css$\|tailwind\.config\|theme\|styles/"; then
            fail "LOCKED COMPONENT MODIFIED: frontend_design (styling files changed)"
            ((violations++))
        else
            pass "frontend_design: Not modified"
        fi
    fi

    if echo "$locked_line" | grep -qi "api_contracts\|api\|endpoints"; then
        if echo "$changed_files" | grep -q "API\.yaml\|openapi\|swagger\|routes/"; then
            fail "LOCKED COMPONENT MODIFIED: api_contracts"
            ((violations++))
        else
            pass "api_contracts: Not modified"
        fi
    fi

    if echo "$locked_line" | grep -qi "auth\|authentication"; then
        if echo "$changed_files" | grep -q "auth\|login\|session\|jwt"; then
            fail "LOCKED COMPONENT MODIFIED: auth_approach"
            ((violations++))
        else
            pass "auth_approach: Not modified"
        fi
    fi

    if echo "$locked_line" | grep -qi "tech_stack\|stack\|framework"; then
        if echo "$changed_files" | grep -q "package\.json"; then
            # Check if dependencies changed significantly
            if git diff HEAD~1 HEAD -- package.json 2>/dev/null | grep -q "dependencies"; then
                warn "package.json dependencies modified - verify tech_stack compliance"
            fi
        fi
    fi

    if [ $violations -gt 0 ]; then
        fail "Total locked component violations: $violations"
        echo ""
        echo -e "${RED}ACTION REQUIRED: Revert changes to locked components or get explicit user approval${NC}"
        return 1
    else
        pass "All locked components intact"
        return 0
    fi
}

# ============================================
# ACCESSIBILITY VALIDATION (P1 Enhancement)
# ============================================
validate_accessibility() {
    echo "--- Accessibility Validation ---"

    cd "$PROJECT_PATH"

    # Check if build exists
    if [ ! -d "dist" ] && [ ! -d "build" ] && [ ! -d ".next" ]; then
        warn "No build directory found - run 'npm run build' first"
        return 0
    fi

    # Try Lighthouse CI
    if command -v npx &> /dev/null; then
        if [ -f "lighthouserc.json" ] || [ -f "lighthouserc.js" ]; then
            info "Running Lighthouse CI..."
            if npx lhci autorun 2>/dev/null; then
                pass "Lighthouse CI passed"
            else
                warn "Lighthouse CI failed or not configured"
            fi
        else
            info "No Lighthouse config found (lighthouserc.json)"
        fi

        # Try axe-core
        info "Checking for axe-core accessibility tests..."
        if grep -rq "axe\|@axe-core" package.json 2>/dev/null; then
            pass "axe-core is configured for accessibility testing"
        else
            warn "Consider adding @axe-core/react or similar for accessibility testing"
        fi
    fi

    # Manual WCAG checks
    echo ""
    echo "Manual WCAG Checklist (verify in browser):"
    echo "  [ ] All images have alt text"
    echo "  [ ] Color contrast meets 4.5:1 ratio"
    echo "  [ ] All interactive elements are keyboard accessible"
    echo "  [ ] Focus states are visible"
    echo "  [ ] Form inputs have labels"
}

# ============================================
# SECURITY FULL SCAN (P1 Enhancement)
# ============================================
validate_security_full() {
    echo "--- Comprehensive Security Scan ---"

    cd "$PROJECT_PATH"

    # npm audit
    if [ -f "package.json" ]; then
        echo ""
        info "Running npm audit..."
        npm audit --json 2>/dev/null > /tmp/npm-audit-$$.json

        CRITICAL=$(grep -c '"severity":"critical"' /tmp/npm-audit-$$.json 2>/dev/null | tr -d '[:space:]' || echo "0")
        HIGH=$(grep -c '"severity":"high"' /tmp/npm-audit-$$.json 2>/dev/null | tr -d '[:space:]' || echo "0")
        MODERATE=$(grep -c '"severity":"moderate"' /tmp/npm-audit-$$.json 2>/dev/null | tr -d '[:space:]' || echo "0")

        # Ensure we have valid integers (fallback to 0 if empty or invalid)
        [[ "$CRITICAL" =~ ^[0-9]+$ ]] || CRITICAL=0
        [[ "$HIGH" =~ ^[0-9]+$ ]] || HIGH=0
        [[ "$MODERATE" =~ ^[0-9]+$ ]] || MODERATE=0

        if [ "$CRITICAL" -gt 0 ]; then
            fail "Critical vulnerabilities: $CRITICAL"
        else
            pass "No critical vulnerabilities"
        fi

        if [ "$HIGH" -gt 0 ]; then
            fail "High vulnerabilities: $HIGH"
        else
            pass "No high vulnerabilities"
        fi

        if [ "$MODERATE" -gt 0 ]; then
            warn "Moderate vulnerabilities: $MODERATE"
        fi

        rm -f /tmp/npm-audit-$$.json
    fi

    # Check for secrets in code
    echo ""
    info "Scanning for potential secrets..."

    SECRET_PATTERNS="password\s*=\s*['\"][^'\"]+['\"]|api_key\s*=\s*['\"][^'\"]+['\"]|secret\s*=\s*['\"][^'\"]+['\"]|token\s*=\s*['\"][^'\"]+['\"]"

    if [ -d "src" ]; then
        SECRETS_FOUND=$(grep -rE "$SECRET_PATTERNS" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "process\.env\|import\.meta\.env" | head -5)
        if [ -n "$SECRETS_FOUND" ]; then
            echo "$SECRETS_FOUND"
            fail "Potential hardcoded secrets found in source code"
        else
            pass "No obvious hardcoded secrets in source"
        fi
    else
        info "No src/ directory to scan for secrets"
    fi

    # Check .gitignore
    echo ""
    info "Checking .gitignore..."
    if [ -f ".gitignore" ]; then
        for pattern in ".env" ".env.local" "*.pem" "*.key" "credentials"; do
            if grep -q "$pattern" .gitignore 2>/dev/null; then
                pass ".gitignore includes: $pattern"
            else
                warn ".gitignore missing: $pattern"
            fi
        done
    else
        fail ".gitignore file not found"
    fi

    # Check for Snyk if available
    if command -v snyk &> /dev/null; then
        echo ""
        info "Running Snyk scan..."
        if snyk test --json 2>/dev/null | grep -q '"ok": true'; then
            pass "Snyk scan passed"
        else
            warn "Snyk found issues - run 'snyk test' for details"
        fi
    else
        info "Snyk not installed - consider 'npm install -g snyk' for deeper analysis"
    fi

    # OWASP dependency check note
    echo ""
    info "For OWASP dependency check, run: npx owasp-dependency-check"
}

# ============================================
# TOOL ENFORCEMENT VALIDATION (STANDARD_TOOLING.md)
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

    # React 19.x (or 18.x acceptable)
    if grep -q '"react"' package.json 2>/dev/null; then
        REACT_VER=$(grep '"react"' package.json | grep -oE '[0-9]+\.[0-9]+' | head -1)
        if echo "$REACT_VER" | grep -qE "^(19|18)\."; then
            pass "React installed ($REACT_VER)"
        else
            warn "React version: $REACT_VER (18.x or 19.x preferred)"
        fi
    else
        fail "React not found in dependencies"
    fi

    # TypeScript 5.x
    if grep -q '"typescript"' package.json 2>/dev/null; then
        TS_VER=$(grep '"typescript"' package.json | grep -oE '[0-9]+\.[0-9]+' | head -1)
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
        pass "Vite installed (correct build tool)"
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
        pass "Vitest installed (correct test runner)"
    else
        fail "Vitest not found - required test runner"
    fi

    if grep -q '"jest"' package.json 2>/dev/null; then
        # Check if this is an override
        if [ -f "$PROJECT_PATH/docs/INTAKE.md" ] && grep -qi "override.*jest\|jest.*override" "$PROJECT_PATH/docs/INTAKE.md" 2>/dev/null; then
            warn "jest found but allowed via user override in INTAKE.md"
        else
            fail "ANTI-PATTERN: jest found - use Vitest instead"
        fi
    else
        pass "No jest (correct)"
    fi

    # Tailwind CSS
    if grep -q '"tailwindcss"' package.json 2>/dev/null; then
        TAILWIND_VER=$(grep '"tailwindcss"' package.json | grep -oE '[0-9]+\.[0-9]+' | head -1)
        if echo "$TAILWIND_VER" | grep -q "^4\."; then
            pass "Tailwind CSS 4.x installed"
        elif echo "$TAILWIND_VER" | grep -q "^3\."; then
            warn "Tailwind version: $TAILWIND_VER (4.x recommended for 2025)"
        else
            pass "Tailwind CSS installed ($TAILWIND_VER)"
        fi
    else
        warn "Tailwind CSS not found (may be optional for some projects)"
    fi

    # @tailwindcss/postcss (v4 requirement)
    if grep -q '"@tailwindcss/postcss"' package.json 2>/dev/null; then
        pass "@tailwindcss/postcss installed (Tailwind v4 compatible)"
    else
        # Only fail if tailwind v4 is detected
        if grep -q '"tailwindcss".*"[^"]*4\.' package.json 2>/dev/null; then
            fail "@tailwindcss/postcss not found (required for Tailwind v4)"
        else
            info "@tailwindcss/postcss not found (OK for Tailwind v3)"
        fi
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
    ANTI_FOUND=0

    if grep -q '"moment"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: 'moment' found - use native Date or date-fns"
        ((ANTI_FOUND++))
    fi

    if grep -q '"lodash"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: 'lodash' found - use native JS methods"
        ((ANTI_FOUND++))
    fi

    if grep -q '"sass"' package.json 2>/dev/null || grep -q '"node-sass"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: 'sass' found - use Tailwind CSS"
        ((ANTI_FOUND++))
    fi

    if grep -q '"redux"' package.json 2>/dev/null && ! grep -q '"@reduxjs/toolkit"' package.json 2>/dev/null; then
        warn "ANTI-PATTERN: 'redux' found - prefer Zustand for simpler state"
        ((ANTI_FOUND++))
    fi

    if grep -q '"jquery"' package.json 2>/dev/null; then
        fail "ANTI-PATTERN: 'jquery' found - use React"
        ((ANTI_FOUND++))
    fi

    # axios in frontend (OK in backend)
    if grep -q '"axios"' package.json 2>/dev/null; then
        if [ -f "src/main.tsx" ] || [ -f "src/App.tsx" ]; then
            warn "axios found in frontend - prefer fetch or TanStack Query"
        else
            info "axios found (OK for backend)"
        fi
    fi

    if [ $ANTI_FOUND -eq 0 ]; then
        pass "No anti-pattern packages detected"
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
                warn "postcss.config.js may use Tailwind v3 syntax - verify or update to '@tailwindcss/postcss'"
            else
                info "postcss.config.js syntax could not be verified"
            fi
        fi
    else
        info "postcss.config.js not found (may use CSS-in-JS or other styling)"
    fi

    # src/index.css - Tailwind v4 syntax
    if [ -f "src/index.css" ]; then
        if grep -q '@import.*tailwindcss' src/index.css 2>/dev/null; then
            pass "src/index.css uses Tailwind v4 @import syntax"
        else
            if grep -q "@tailwind" src/index.css 2>/dev/null; then
                warn "src/index.css uses Tailwind v3 @tailwind syntax - update to @import \"tailwindcss\" for v4"
            else
                info "src/index.css may not use Tailwind"
            fi
        fi
    fi

    # vite.config.ts - Vitest reference
    if [ -f "vite.config.ts" ]; then
        if grep -q "vitest" vite.config.ts 2>/dev/null; then
            pass "vite.config.ts has Vitest configuration"
        else
            warn "vite.config.ts may be missing Vitest configuration"
        fi
    elif [ -f "vite.config.js" ]; then
        if grep -q "vitest" vite.config.js 2>/dev/null; then
            pass "vite.config.js has Vitest configuration"
        else
            warn "vite.config.js may be missing Vitest configuration"
        fi
    fi

    # vitest.config.ts (alternative)
    if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
        pass "Separate Vitest config file found"
    fi

    echo ""
    echo "=== Verify Script Check ==="

    # Check for verify script
    if grep -q '"verify"' package.json 2>/dev/null; then
        pass "verify script exists in package.json"

        # Check verify script content
        VERIFY_LINE=$(grep -A1 '"verify"' package.json | grep -v '"verify"' | head -1)
        if echo "$VERIFY_LINE" | grep -q "build" && \
           echo "$VERIFY_LINE" | grep -q "test"; then
            pass "verify script includes build and test"
        else
            warn "verify script may be incomplete - should include build and test"
        fi
    else
        fail "verify script missing - add: \"verify\": \"npm run build && npm test && npm run lint\""
    fi

    echo ""
    echo "=== Running npm run verify ==="

    # Actually run verify if it exists
    if grep -q '"verify"' package.json 2>/dev/null; then
        if npm run verify > /tmp/verify-output-$$.log 2>&1; then
            pass "npm run verify PASSED"
        else
            fail "npm run verify FAILED"
            echo "Last 10 lines of output:"
            tail -10 /tmp/verify-output-$$.log
        fi
        rm -f /tmp/verify-output-$$.log
    else
        # Try individual commands
        echo "No verify script - running individual checks..."

        BUILD_OK=true
        TEST_OK=true
        LINT_OK=true

        if grep -q '"build"' package.json 2>/dev/null; then
            if npm run build > /dev/null 2>&1; then
                pass "npm run build passed"
            else
                fail "npm run build failed"
                BUILD_OK=false
            fi
        fi

        if grep -q '"test"' package.json 2>/dev/null; then
            if npm test -- --passWithNoTests > /dev/null 2>&1; then
                pass "npm test passed"
            else
                warn "npm test failed or not configured"
                TEST_OK=false
            fi
        fi

        if grep -q '"lint"' package.json 2>/dev/null; then
            if npm run lint > /dev/null 2>&1; then
                pass "npm run lint passed"
            else
                warn "npm run lint failed"
                LINT_OK=false
            fi
        fi
    fi
}

# ============================================
# BACKEND TOOL ENFORCEMENT VALIDATION
# ============================================
validate_backend_tools() {
    echo "--- Backend Tool Enforcement ---"

    cd "$PROJECT_PATH"

    # Detect if this is a backend project
    BACKEND_DIR=""
    if [ -d "backend" ]; then
        BACKEND_DIR="backend"
    elif [ -d "server" ]; then
        BACKEND_DIR="server"
    elif [ -f "src/server.ts" ] || [ -f "src/app.ts" ]; then
        BACKEND_DIR="."
    fi

    if [ -z "$BACKEND_DIR" ]; then
        info "No backend directory detected - skipping backend validation"
        return 0
    fi

    echo "Backend directory: $BACKEND_DIR"
    cd "$PROJECT_PATH/$BACKEND_DIR"

    if [ ! -f "package.json" ]; then
        fail "Backend package.json not found"
        return 1
    fi

    echo ""
    echo "=== Backend Required Tools ==="

    # Express
    if grep -q '"express"' package.json 2>/dev/null; then
        EXPRESS_VER=$(grep '"express"' package.json | grep -oE '[0-9]+\.[0-9]+' | head -1)
        pass "Express installed ($EXPRESS_VER)"
    else
        warn "Express not found (may use different framework)"
    fi

    # TypeScript (backend)
    if grep -q '"typescript"' package.json 2>/dev/null; then
        pass "TypeScript installed (backend)"
    else
        fail "TypeScript not found in backend"
    fi

    # Prisma
    if grep -q '"prisma"' package.json 2>/dev/null || grep -q '"@prisma/client"' package.json 2>/dev/null; then
        pass "Prisma ORM installed"
    else
        warn "Prisma not found (may use different ORM)"
    fi

    # Zod
    if grep -q '"zod"' package.json 2>/dev/null; then
        pass "Zod validation installed"
    else
        warn "Zod not found - recommended for validation"
    fi

    # Auth packages (if auth project)
    if grep -q '"bcrypt"' package.json 2>/dev/null || grep -q '"bcryptjs"' package.json 2>/dev/null; then
        pass "bcrypt installed for password hashing"
    fi

    if grep -q '"jsonwebtoken"' package.json 2>/dev/null; then
        pass "jsonwebtoken installed for JWT auth"
    fi

    echo ""
    echo "=== Backend Anti-Pattern Check ==="

    # Check for MySQL/SQLite instead of PostgreSQL
    if grep -q '"mysql"' package.json 2>/dev/null || grep -q '"mysql2"' package.json 2>/dev/null; then
        warn "MySQL found - PostgreSQL recommended per STANDARD_TOOLING.md"
    fi

    if grep -q '"sqlite3"' package.json 2>/dev/null || grep -q '"better-sqlite3"' package.json 2>/dev/null; then
        warn "SQLite found - PostgreSQL recommended for production"
    fi

    # Check for alternative frameworks (not blocked, just noted)
    if grep -q '"fastify"' package.json 2>/dev/null; then
        warn "Fastify found - Express is standard per STANDARD_TOOLING.md"
    fi

    if grep -q '"koa"' package.json 2>/dev/null; then
        warn "Koa found - Express is standard per STANDARD_TOOLING.md"
    fi

    echo ""
    echo "=== Backend Testing Tools ==="

    # Supertest
    if grep -q '"supertest"' package.json 2>/dev/null; then
        pass "Supertest installed for API testing"
    else
        warn "Supertest not found - recommended for API testing"
    fi

    # Vitest (backend)
    if grep -q '"vitest"' package.json 2>/dev/null; then
        pass "Vitest installed for backend testing"
    else
        fail "Vitest not found in backend - required test runner"
    fi

    cd "$PROJECT_PATH"
}

# ============================================
# PROJECT TYPE DETECTION
# ============================================
detect_project_type() {
    cd "$PROJECT_PATH"

    HAS_FRONTEND=false
    HAS_BACKEND=false

    # Check for frontend
    if [ -f "src/main.tsx" ] || [ -f "src/App.tsx" ] || [ -f "src/index.tsx" ]; then
        HAS_FRONTEND=true
    fi
    if [ -d "frontend" ]; then
        HAS_FRONTEND=true
    fi

    # Check for backend
    if [ -f "src/server.ts" ] || [ -f "src/app.ts" ]; then
        HAS_BACKEND=true
    fi
    if [ -d "backend" ] || [ -d "server" ]; then
        HAS_BACKEND=true
    fi
    if [ -f "prisma/schema.prisma" ]; then
        HAS_BACKEND=true
    fi

    if [ "$HAS_FRONTEND" = true ] && [ "$HAS_BACKEND" = true ]; then
        echo "full-stack"
    elif [ "$HAS_FRONTEND" = true ]; then
        echo "frontend"
    elif [ "$HAS_BACKEND" = true ]; then
        echo "backend"
    else
        echo "unknown"
    fi
}

# ============================================
# STARTUP VALIDATION
# ============================================
validate_startup() {
    echo "--- Startup Protocol Validation ---"

    # Check docs directory exists
    if [ -d "$PROJECT_PATH/docs" ]; then
        pass "docs/ directory exists"
    else
        fail "docs/ directory missing"
    fi

    # Check INTAKE.md exists
    if [ -f "$PROJECT_PATH/docs/INTAKE.md" ]; then
        pass "docs/INTAKE.md exists"

        # Check intake has answers (not just template)
        if grep -q "Q1:" "$PROJECT_PATH/docs/INTAKE.md" 2>/dev/null; then
            pass "INTAKE.md appears to have answers"
        else
            warn "INTAKE.md may be incomplete"
        fi
    else
        fail "docs/INTAKE.md missing - intake questions not captured"
    fi
}

# ============================================
# G1 (Intake Approval) VALIDATION
# ============================================
validate_g1() {
    echo "--- G1 (Intake) Validation ---"

    validate_startup

    # Check PROJECT_STATE.md exists
    if [ -f "$PROJECT_PATH/docs/PROJECT_STATE.md" ]; then
        pass "docs/PROJECT_STATE.md exists"
    else
        fail "docs/PROJECT_STATE.md missing"
    fi
}

# ============================================
# G2 (PRD Approval) VALIDATION
# ============================================
validate_g2() {
    echo "--- G2 (PRD) Validation ---"

    validate_g1

    # Check PRD.md exists
    if [ -f "$PROJECT_PATH/docs/PRD.md" ]; then
        pass "docs/PRD.md exists"

        # Check PRD has required sections
        if grep -q "## Features" "$PROJECT_PATH/docs/PRD.md" 2>/dev/null || \
           grep -q "## Core Features" "$PROJECT_PATH/docs/PRD.md" 2>/dev/null; then
            pass "PRD.md has Features section"
        else
            warn "PRD.md may be missing Features section"
        fi

        if grep -q "## Success Criteria" "$PROJECT_PATH/docs/PRD.md" 2>/dev/null || \
           grep -q "## Success Metrics" "$PROJECT_PATH/docs/PRD.md" 2>/dev/null; then
            pass "PRD.md has Success Criteria"
        else
            warn "PRD.md may be missing Success Criteria"
        fi
    else
        fail "docs/PRD.md missing - PRD not created before code"
    fi

    # Check DECISIONS.md exists
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        pass "docs/DECISIONS.md exists"
    else
        warn "docs/DECISIONS.md missing - decisions not being logged"
    fi
}

# ============================================
# G3 (Architecture Approval) VALIDATION
# ============================================
validate_g3() {
    echo "--- G3 (Architecture) Validation ---"

    validate_g2

    # Check ARCHITECTURE.md exists
    if [ -f "$PROJECT_PATH/docs/ARCHITECTURE.md" ]; then
        pass "docs/ARCHITECTURE.md exists"

        # Check for tech stack section
        if grep -qi "tech stack\|technology" "$PROJECT_PATH/docs/ARCHITECTURE.md" 2>/dev/null; then
            pass "ARCHITECTURE.md has tech stack section"
        else
            warn "ARCHITECTURE.md may be missing tech stack"
        fi
    else
        fail "docs/ARCHITECTURE.md missing - architecture not documented before code"
    fi

    # Spec-First validation (MANDATORY for G3)
    echo ""
    echo "--- G3 Spec-First Validation ---"
    validate_spec_scripts
}

# ============================================
# SPEC SCRIPTS VALIDATION (Spec-First Enforcement)
# ============================================
validate_spec_scripts() {
    # Detect stack type
    local STACK_TYPE="unknown"

    if [ -f "$PROJECT_PATH/docs/TECH_STACK.md" ]; then
        if grep -qi "python\|fastapi\|django\|flask" "$PROJECT_PATH/docs/TECH_STACK.md" 2>/dev/null; then
            STACK_TYPE="python"
        elif grep -qi "node\|express\|react\|typescript" "$PROJECT_PATH/docs/TECH_STACK.md" 2>/dev/null; then
            STACK_TYPE="nodejs"
        fi
    fi

    # Fallback detection from files
    if [ "$STACK_TYPE" = "unknown" ]; then
        if [ -f "$PROJECT_PATH/requirements.txt" ] || [ -f "$PROJECT_PATH/pyproject.toml" ]; then
            STACK_TYPE="python"
        elif [ -f "$PROJECT_PATH/package.json" ]; then
            STACK_TYPE="nodejs"
        fi
    fi

    info "Detected stack: $STACK_TYPE"

    # Check spec files exist
    if [ -f "$PROJECT_PATH/specs/openapi.yaml" ]; then
        pass "specs/openapi.yaml exists"
    else
        fail "specs/openapi.yaml MISSING - required for Spec-First"
    fi

    if [ -f "$PROJECT_PATH/specs/database-schema.json" ]; then
        pass "specs/database-schema.json exists"
    else
        warn "specs/database-schema.json missing (recommended)"
    fi

    # Stack-specific validation
    if [ "$STACK_TYPE" = "nodejs" ]; then
        validate_nodejs_spec_scripts
    elif [ "$STACK_TYPE" = "python" ]; then
        validate_python_spec_scripts
    else
        warn "Could not detect stack type - skipping spec script validation"
    fi
}

# Node.js spec script validation
validate_nodejs_spec_scripts() {
    echo ""
    echo "=== Node.js Spec Scripts Check ==="

    # Check prisma schema exists
    if [ -f "$PROJECT_PATH/prisma/schema.prisma" ]; then
        pass "prisma/schema.prisma exists"
    else
        fail "prisma/schema.prisma MISSING - required for Spec-First"
    fi

    # Check Zod schemas exist
    if [ -f "$PROJECT_PATH/specs/schemas/index.ts" ]; then
        pass "specs/schemas/index.ts exists"
    else
        fail "specs/schemas/index.ts MISSING - required for Spec-First"
    fi

    # Check specs/tsconfig.json exists
    if [ -f "$PROJECT_PATH/specs/tsconfig.json" ]; then
        pass "specs/tsconfig.json exists"
    else
        fail "specs/tsconfig.json MISSING - required for Zod compilation"
    fi

    # Check package.json has validate:specs script (CRITICAL ENFORCEMENT)
    if [ -f "$PROJECT_PATH/package.json" ]; then
        if grep -q '"validate:specs"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            pass "package.json has validate:specs script"

            # Verify it includes all required validations
            VALIDATE_LINE=$(grep -A1 '"validate:specs"' "$PROJECT_PATH/package.json" | tr -d '\n')

            if echo "$VALIDATE_LINE" | grep -q "swagger-cli\|validate:openapi"; then
                pass "validate:specs includes OpenAPI validation"
            else
                fail "validate:specs MISSING OpenAPI validation (swagger-cli)"
            fi

            if echo "$VALIDATE_LINE" | grep -q "prisma validate\|validate:prisma"; then
                pass "validate:specs includes Prisma validation"
            else
                fail "validate:specs MISSING Prisma validation"
            fi

            if echo "$VALIDATE_LINE" | grep -q "tsc\|validate:schemas"; then
                pass "validate:specs includes TypeScript/Zod validation"
            else
                fail "validate:specs MISSING Zod schema compilation (tsc)"
            fi
        else
            fail "package.json MISSING validate:specs script"
            echo ""
            echo -e "${RED}REQUIRED: Add to package.json scripts:${NC}"
            echo '  "validate:specs": "npm run validate:openapi && npm run validate:prisma && npm run validate:schemas",'
            echo '  "validate:openapi": "swagger-cli validate specs/openapi.yaml",'
            echo '  "validate:prisma": "prisma validate",'
            echo '  "validate:schemas": "tsc --noEmit -p specs/tsconfig.json"'
        fi

        # Check swagger-cli is in devDependencies
        if grep -q '"@apidevtools/swagger-cli"\|"swagger-cli"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            pass "swagger-cli in dependencies"
        else
            fail "swagger-cli NOT in devDependencies - add: npm install -D @apidevtools/swagger-cli"
        fi
    fi
}

# Python spec script validation
validate_python_spec_scripts() {
    echo ""
    echo "=== Python Spec Scripts Check ==="

    # Check SQLAlchemy models exist
    if [ -f "$PROJECT_PATH/src/models/__init__.py" ]; then
        pass "src/models/__init__.py exists"
    else
        fail "src/models/__init__.py MISSING - required for Spec-First"
    fi

    # Check Pydantic schemas exist
    if [ -f "$PROJECT_PATH/specs/schemas/__init__.py" ]; then
        pass "specs/schemas/__init__.py exists"
    else
        fail "specs/schemas/__init__.py MISSING - required for Spec-First"
    fi

    # Check Makefile has validate-specs target
    if [ -f "$PROJECT_PATH/Makefile" ]; then
        if grep -q "validate-specs\|validate_specs" "$PROJECT_PATH/Makefile" 2>/dev/null; then
            pass "Makefile has validate-specs target"

            # Verify it includes required validations
            if grep -q "swagger-cli" "$PROJECT_PATH/Makefile" 2>/dev/null; then
                pass "Makefile includes OpenAPI validation"
            else
                fail "Makefile MISSING OpenAPI validation (swagger-cli)"
            fi

            if grep -q "from src.models import\|from src.models import \*" "$PROJECT_PATH/Makefile" 2>/dev/null; then
                pass "Makefile includes SQLAlchemy model validation"
            else
                warn "Makefile may be missing SQLAlchemy validation"
            fi

            if grep -q "from specs.schemas import\|from specs.schemas import \*" "$PROJECT_PATH/Makefile" 2>/dev/null; then
                pass "Makefile includes Pydantic schema validation"
            else
                warn "Makefile may be missing Pydantic validation"
            fi
        else
            fail "Makefile MISSING validate-specs target"
            echo ""
            echo -e "${RED}REQUIRED: Add to Makefile:${NC}"
            echo ".PHONY: validate-specs"
            echo "validate-specs:"
            echo "	swagger-cli validate specs/openapi.yaml"
            echo '	python -c "from src.models import *; print('\''SQLAlchemy models OK'\'')"'
            echo '	python -c "from specs.schemas import *; print('\''Pydantic schemas OK'\'')"'
        fi
    elif [ -f "$PROJECT_PATH/pyproject.toml" ]; then
        # Check for pytest marker or script in pyproject.toml
        if grep -q "validate" "$PROJECT_PATH/pyproject.toml" 2>/dev/null; then
            pass "pyproject.toml may have validation config"
        else
            warn "No Makefile found - ensure validate-specs command exists"
            echo "  Option 1: Create Makefile with validate-specs target"
            echo "  Option 2: Add pytest test in tests/test_specs.py"
        fi
    else
        fail "No Makefile or pyproject.toml found for Python project"
    fi
}

# ============================================
# G5.1 (Foundation) VALIDATION
# ============================================
validate_g5_1() {
    echo "--- G5.1 (Foundation) Validation ---"

    validate_g3

    # Check package.json exists
    if [ -f "$PROJECT_PATH/package.json" ]; then
        pass "package.json exists"

        # Check it has dependencies
        if grep -q '"dependencies"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            pass "package.json has dependencies"
        else
            warn "package.json missing dependencies section"
        fi
    else
        fail "package.json missing"
    fi

    # Check tsconfig.json exists (if TypeScript project)
    if [ -f "$PROJECT_PATH/tsconfig.json" ]; then
        pass "tsconfig.json exists"
    else
        warn "tsconfig.json missing (OK if not TypeScript)"
    fi

    # Check types directory or file
    if [ -d "$PROJECT_PATH/src/types" ] || [ -f "$PROJECT_PATH/src/types.ts" ] || \
       ls "$PROJECT_PATH/src"/*.d.ts 1> /dev/null 2>&1; then
        pass "Type definitions found"
    else
        warn "No type definitions found in src/"
    fi

    # Check DECISIONS.md has G5.1 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G5.1" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G5.1 decision logged in DECISIONS.md"
        else
            fail "G5.1 decision NOT logged in DECISIONS.md"
        fi
    fi

    # TOOL ENFORCEMENT - Required at G5.1
    echo ""
    echo "--- Standard Tool Enforcement (G5.1 Required) ---"
    validate_tools

    # BACKEND TOOL ENFORCEMENT - If backend detected
    echo ""
    PROJECT_TYPE=$(detect_project_type)
    echo "Project Type Detected: $PROJECT_TYPE"

    if [ "$PROJECT_TYPE" = "backend" ] || [ "$PROJECT_TYPE" = "full-stack" ]; then
        validate_backend_tools
    fi
}

# ============================================
# G5.2 (Data Layer) VALIDATION
# ============================================
validate_g5_2() {
    echo "--- G5.2 (Data Layer) Validation ---"

    validate_g5_1

    # Check services directory
    if [ -d "$PROJECT_PATH/src/services" ]; then
        pass "src/services/ directory exists"

        SERVICE_COUNT=$(find "$PROJECT_PATH/src/services" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
        if [ "$SERVICE_COUNT" -gt 0 ]; then
            pass "Found $SERVICE_COUNT service file(s)"
        else
            warn "No service files found in src/services/"
        fi
    else
        warn "src/services/ directory missing"
    fi

    # Check hooks directory (for React projects)
    if [ -d "$PROJECT_PATH/src/hooks" ]; then
        pass "src/hooks/ directory exists"
    fi

    # Check DECISIONS.md has G5.2 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G5.2" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G5.2 decision logged in DECISIONS.md"
        else
            fail "G5.2 decision NOT logged in DECISIONS.md"
        fi
    fi
}

# ============================================
# G5.3 (Components) VALIDATION
# ============================================
validate_g5_3() {
    echo "--- G5.3 (Components) Validation ---"

    validate_g5_2

    # Check components directory
    if [ -d "$PROJECT_PATH/src/components" ]; then
        pass "src/components/ directory exists"

        COMPONENT_COUNT=$(find "$PROJECT_PATH/src/components" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l)
        if [ "$COMPONENT_COUNT" -gt 0 ]; then
            pass "Found $COMPONENT_COUNT component file(s)"
        else
            fail "No component files found in src/components/"
        fi
    else
        fail "src/components/ directory missing"
    fi

    # Check DECISIONS.md has G5.3 entries
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G5.3" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G5.3 decision(s) logged in DECISIONS.md"
        else
            fail "G5.3 decision(s) NOT logged in DECISIONS.md"
        fi
    fi
}

# ============================================
# G5.4 (Integration) VALIDATION
# ============================================
validate_g5_4() {
    echo "--- G5.4 (Integration) Validation ---"

    validate_g5_3

    # Check App entry point
    if [ -f "$PROJECT_PATH/src/App.tsx" ] || [ -f "$PROJECT_PATH/src/App.jsx" ] || \
       [ -f "$PROJECT_PATH/src/app.tsx" ] || [ -f "$PROJECT_PATH/src/app.jsx" ]; then
        pass "App entry point exists"
    else
        warn "App.tsx/App.jsx not found"
    fi

    # Check main entry point
    if [ -f "$PROJECT_PATH/src/main.tsx" ] || [ -f "$PROJECT_PATH/src/main.ts" ] || \
       [ -f "$PROJECT_PATH/src/index.tsx" ] || [ -f "$PROJECT_PATH/src/index.ts" ]; then
        pass "Main entry point exists"
    else
        warn "main.tsx or index.tsx not found"
    fi

    # Check DECISIONS.md has G5.4 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G5.4" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G5.4 decision logged in DECISIONS.md"
        else
            fail "G5.4 decision NOT logged in DECISIONS.md"
        fi
    fi
}

# ============================================
# G5.5 (Polish) VALIDATION
# ============================================
validate_g5_5() {
    echo "--- G5.5 (Polish) Validation ---"

    validate_g5_4

    # Check CSS/styling exists
    if ls "$PROJECT_PATH/src"/*.css 1> /dev/null 2>&1 || \
       [ -f "$PROJECT_PATH/tailwind.config.js" ] || \
       [ -f "$PROJECT_PATH/tailwind.config.ts" ]; then
        pass "Styling configuration found"
    else
        warn "No CSS or Tailwind config found"
    fi

    # Check DECISIONS.md has G5.5 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G5.5" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G5.5 decision logged in DECISIONS.md"
        else
            fail "G5.5 decision NOT logged in DECISIONS.md"
        fi
    fi
}

# ============================================
# G4 (Design) VALIDATION
# ============================================
validate_g4() {
    echo "--- G4 (Design) Validation ---"

    validate_g3

    # Check for design artifacts (optional gate)
    if [ -d "$PROJECT_PATH/docs/designs" ]; then
        pass "docs/designs/ directory exists"

        # Check for wireframes or mockups
        DESIGN_FILES=$(find "$PROJECT_PATH/docs/designs" -type f 2>/dev/null | wc -l)
        if [ "$DESIGN_FILES" -gt 0 ]; then
            pass "Found $DESIGN_FILES design file(s)"
        else
            warn "docs/designs/ directory is empty"
        fi
    else
        warn "docs/designs/ directory not found (G4 may be skipped)"
    fi

    # Check DECISIONS.md has G4 entry (or skip notation)
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G4" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G4 decision logged in DECISIONS.md"
        else
            warn "G4 decision NOT logged in DECISIONS.md (may be skipped)"
        fi
    fi
}

# ============================================
# G6 (Testing/Quality) VALIDATION
# ============================================
validate_g6() {
    echo "--- G6 (Testing/Quality) Validation ---"

    validate_g5_5

    # Check for test files
    TEST_COUNT=$(find "$PROJECT_PATH" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | wc -l)
    if [ "$TEST_COUNT" -gt 0 ]; then
        pass "Found $TEST_COUNT test file(s)"
    else
        warn "No test files found"
    fi

    # Try to run tests
    if [ -f "$PROJECT_PATH/package.json" ]; then
        if grep -q '"test"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            echo "Running npm test..."
            cd "$PROJECT_PATH"
            if npm test -- --passWithNoTests > /dev/null 2>&1; then
                pass "Tests passing"
            else
                warn "Tests failing or not configured"
            fi
        else
            warn "No test script in package.json"
        fi
    fi

    # Check DECISIONS.md has G6 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G6" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G6 decision logged in DECISIONS.md"
        else
            warn "G6 decision NOT logged in DECISIONS.md (may be skipped)"
        fi
    fi

    # Run coverage validation
    validate_test_coverage
}

# ============================================
# TEST COVERAGE VALIDATION (Technical Enforcement)
# ============================================
validate_test_coverage() {
    echo ""
    echo "--- Test Coverage Validation ---"

    cd "$PROJECT_PATH"

    # Check if coverage script exists
    if ! grep -q '"coverage"\|"test:coverage"' "$PROJECT_PATH/package.json" 2>/dev/null; then
        # Check if vitest or jest is configured for coverage
        if grep -q '"test"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            info "Running tests with coverage (npm test -- --coverage)"

            # Try to run coverage
            COVERAGE_OUTPUT=$(npm test -- --coverage --coverageReporters=text 2>&1) || true

            if echo "$COVERAGE_OUTPUT" | grep -q "All files"; then
                # Parse coverage from output
                COVERAGE_LINE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | head -1)

                # Extract percentage (handles different formats)
                COVERAGE_PCT=$(echo "$COVERAGE_LINE" | grep -oE '[0-9]+\.?[0-9]*' | head -1)

                if [ -n "$COVERAGE_PCT" ]; then
                    # Convert to integer for comparison
                    COVERAGE_INT=$(echo "$COVERAGE_PCT" | cut -d'.' -f1)

                    echo "Coverage: ${COVERAGE_PCT}%"

                    if [ "$COVERAGE_INT" -ge 80 ]; then
                        pass "Test coverage is ${COVERAGE_PCT}% (≥80% required)"
                    elif [ "$COVERAGE_INT" -ge 70 ]; then
                        warn "Test coverage is ${COVERAGE_PCT}% (≥80% required, currently below threshold)"
                    else
                        fail "Test coverage is ${COVERAGE_PCT}% (≥80% required)"
                    fi
                else
                    warn "Could not parse coverage percentage from output"
                fi
            else
                warn "Coverage report not generated - ensure tests are configured with coverage support"
            fi
        else
            warn "No test script found in package.json"
        fi
    else
        # Use dedicated coverage script
        info "Running coverage script..."
        COVERAGE_OUTPUT=$(npm run coverage 2>&1 || npm run test:coverage 2>&1) || true

        if echo "$COVERAGE_OUTPUT" | grep -q "All files"; then
            COVERAGE_LINE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | head -1)
            COVERAGE_PCT=$(echo "$COVERAGE_LINE" | grep -oE '[0-9]+\.?[0-9]*' | head -1)

            if [ -n "$COVERAGE_PCT" ]; then
                COVERAGE_INT=$(echo "$COVERAGE_PCT" | cut -d'.' -f1)

                echo "Coverage: ${COVERAGE_PCT}%"

                if [ "$COVERAGE_INT" -ge 80 ]; then
                    pass "Test coverage is ${COVERAGE_PCT}% (≥80% required)"
                elif [ "$COVERAGE_INT" -ge 70 ]; then
                    warn "Test coverage is ${COVERAGE_PCT}% (≥80% required, currently below threshold)"
                else
                    fail "Test coverage is ${COVERAGE_PCT}% (≥80% required)"
                fi
            fi
        fi
    fi

    # Check for coverage report file
    if [ -d "$PROJECT_PATH/coverage" ]; then
        pass "Coverage directory exists"

        if [ -f "$PROJECT_PATH/coverage/lcov-report/index.html" ]; then
            pass "LCOV HTML report generated (coverage/lcov-report/index.html)"
        else
            info "LCOV HTML report not found (optional)"
        fi

        if [ -f "$PROJECT_PATH/coverage/coverage-summary.json" ]; then
            # Parse JSON for exact coverage
            if command -v node &> /dev/null; then
                TOTAL_COVERAGE=$(node -e "
                    const summary = require('$PROJECT_PATH/coverage/coverage-summary.json');
                    const total = summary.total;
                    const avg = (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4;
                    console.log(avg.toFixed(2));
                " 2>/dev/null) || TOTAL_COVERAGE=""

                if [ -n "$TOTAL_COVERAGE" ]; then
                    info "Coverage from summary.json: ${TOTAL_COVERAGE}%"

                    COVERAGE_INT=$(echo "$TOTAL_COVERAGE" | cut -d'.' -f1)
                    if [ "$COVERAGE_INT" -lt 80 ]; then
                        # Output detailed breakdown
                        echo ""
                        echo "Coverage Breakdown:"
                        node -e "
                            const summary = require('$PROJECT_PATH/coverage/coverage-summary.json');
                            const total = summary.total;
                            console.log('  Lines:      ' + total.lines.pct.toFixed(2) + '%');
                            console.log('  Statements: ' + total.statements.pct.toFixed(2) + '%');
                            console.log('  Functions:  ' + total.functions.pct.toFixed(2) + '%');
                            console.log('  Branches:   ' + total.branches.pct.toFixed(2) + '%');
                        " 2>/dev/null || true
                    fi
                fi
            fi
        fi
    else
        info "No coverage directory found - run 'npm test -- --coverage' to generate"
    fi

    # Check for coverage threshold configuration
    echo ""
    echo "Coverage Threshold Configuration:"

    # Check vitest config
    if [ -f "$PROJECT_PATH/vite.config.ts" ] || [ -f "$PROJECT_PATH/vitest.config.ts" ]; then
        if grep -q "coverage" "$PROJECT_PATH/vite.config.ts" 2>/dev/null || \
           grep -q "coverage" "$PROJECT_PATH/vitest.config.ts" 2>/dev/null; then
            pass "Coverage configured in Vite/Vitest config"

            # Check for threshold
            if grep -q "thresholds\|threshold" "$PROJECT_PATH/vite.config.ts" 2>/dev/null || \
               grep -q "thresholds\|threshold" "$PROJECT_PATH/vitest.config.ts" 2>/dev/null; then
                pass "Coverage thresholds configured"
            else
                warn "Coverage thresholds not configured - add thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 }"
            fi
        else
            warn "Coverage not configured in Vite/Vitest config"
        fi
    fi

    # Check jest config
    if [ -f "$PROJECT_PATH/jest.config.js" ] || [ -f "$PROJECT_PATH/jest.config.ts" ]; then
        if grep -q "coverageThreshold" "$PROJECT_PATH/jest.config.js" 2>/dev/null || \
           grep -q "coverageThreshold" "$PROJECT_PATH/jest.config.ts" 2>/dev/null; then
            pass "Coverage thresholds configured in Jest"
        else
            warn "Coverage thresholds not configured in Jest - add coverageThreshold: { global: { lines: 80, branches: 80, functions: 80, statements: 80 } }"
        fi
    fi

    # Check package.json for jest coverage config
    if grep -q '"coverageThreshold"' "$PROJECT_PATH/package.json" 2>/dev/null; then
        pass "Coverage thresholds configured in package.json"
    fi
}

# ============================================
# G7 (Security) VALIDATION
# ============================================
validate_g7() {
    echo "--- G7 (Security) Validation ---"

    validate_g6

    # Run npm audit
    if [ -f "$PROJECT_PATH/package.json" ]; then
        echo "Running npm audit..."
        cd "$PROJECT_PATH"
        AUDIT_RESULT=$(npm audit --json 2>/dev/null | grep -c '"severity":"critical"' || echo "0")
        if [ "$AUDIT_RESULT" -eq 0 ]; then
            pass "No critical vulnerabilities found"
        else
            warn "Critical vulnerabilities found - run npm audit for details"
        fi
    fi

    # Check for security documentation
    if [ -f "$PROJECT_PATH/docs/SECURITY.md" ]; then
        pass "docs/SECURITY.md exists"
    else
        warn "docs/SECURITY.md not found"
    fi

    # Check for .env.example (no secrets in code)
    if [ -f "$PROJECT_PATH/.env.example" ]; then
        pass ".env.example exists"
    else
        warn ".env.example not found"
    fi

    # Check no .env file committed
    if [ -f "$PROJECT_PATH/.env" ]; then
        warn ".env file exists - ensure it's in .gitignore"
    else
        pass "No .env file in repository"
    fi

    # Check DECISIONS.md has G7 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G7" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G7 decision logged in DECISIONS.md"
        else
            warn "G7 decision NOT logged in DECISIONS.md (may be skipped)"
        fi
    fi
}

# ============================================
# G8 (Pre-Deploy) VALIDATION
# ============================================
validate_g8() {
    echo "--- G8 (Pre-Deploy) Validation ---"

    validate_g7

    # Check for deployment configuration
    if [ -f "$PROJECT_PATH/Dockerfile" ] || [ -f "$PROJECT_PATH/docker-compose.yml" ] || \
       [ -f "$PROJECT_PATH/vercel.json" ] || [ -f "$PROJECT_PATH/netlify.toml" ] || \
       [ -d "$PROJECT_PATH/.github/workflows" ]; then
        pass "Deployment configuration found"
    else
        warn "No deployment configuration found"
    fi

    # Check for environment documentation
    if [ -f "$PROJECT_PATH/.env.example" ]; then
        pass "Environment variables documented"
    else
        warn "Environment variables not documented"
    fi

    # Check DECISIONS.md has G8 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G8" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G8 decision logged in DECISIONS.md"
        else
            warn "G8 decision NOT logged in DECISIONS.md (may be skipped)"
        fi
    fi
}

# ============================================
# G9 (Post-Deploy) VALIDATION
# ============================================
validate_g9() {
    echo "--- G9 (Post-Deploy) Validation ---"

    validate_g8

    echo ""
    echo "=== Synthetic Smoke Test Check ==="

    # Check for smoke test file (MANDATORY)
    SMOKE_TEST_FOUND=false
    if [ -f "$PROJECT_PATH/tests/e2e/smoke.spec.ts" ]; then
        pass "Smoke test exists: tests/e2e/smoke.spec.ts"
        SMOKE_TEST_FOUND=true
    elif [ -f "$PROJECT_PATH/e2e/smoke.spec.ts" ]; then
        pass "Smoke test exists: e2e/smoke.spec.ts"
        SMOKE_TEST_FOUND=true
    elif [ -f "$PROJECT_PATH/tests/smoke.spec.ts" ]; then
        pass "Smoke test exists: tests/smoke.spec.ts"
        SMOKE_TEST_FOUND=true
    else
        fail "SMOKE TEST MISSING - G9 CANNOT BE APPROVED"
        echo "  Required: tests/e2e/smoke.spec.ts"
        echo "  See APPROVAL_GATES.md G9 section for template"
    fi

    # Check smoke test has required elements
    if [ "$SMOKE_TEST_FOUND" = true ]; then
        SMOKE_FILE=$(find "$PROJECT_PATH" -name "smoke.spec.ts" -type f 2>/dev/null | head -1)

        if grep -q "PROD_URL\|production" "$SMOKE_FILE" 2>/dev/null; then
            pass "Smoke test references production URL"
        else
            warn "Smoke test should reference PROD_URL environment variable"
        fi

        if grep -q "/health" "$SMOKE_FILE" 2>/dev/null; then
            pass "Smoke test checks health endpoint"
        else
            warn "Smoke test should check /health endpoint"
        fi

        if grep -q "login\|auth" "$SMOKE_FILE" 2>/dev/null; then
            pass "Smoke test includes authentication check"
        else
            info "Smoke test may not include auth (OK if no auth required)"
        fi
    fi

    # Check for Playwright or Cypress
    if grep -q '"@playwright/test"\|"playwright"' "$PROJECT_PATH/package.json" 2>/dev/null; then
        pass "Playwright installed for E2E testing"
    elif grep -q '"cypress"' "$PROJECT_PATH/package.json" 2>/dev/null; then
        pass "Cypress installed for E2E testing"
    else
        if [ "$SMOKE_TEST_FOUND" = true ]; then
            fail "E2E framework missing - install @playwright/test or cypress"
        fi
    fi

    echo ""
    echo "=== Monitoring Configuration ==="

    # Check for monitoring/logging configuration
    if grep -rq "sentry\|datadog\|newrelic\|logrocket" "$PROJECT_PATH/package.json" 2>/dev/null; then
        pass "Monitoring/logging tool configured"
    else
        warn "No monitoring tool detected in package.json"
    fi

    echo ""
    echo "=== Health Endpoint Check ==="

    # Check for health endpoint in code
    if grep -rq '"/health"\|/health' "$PROJECT_PATH/src" 2>/dev/null; then
        pass "Health endpoint found in source code"
    else
        warn "No /health endpoint detected - recommended for production monitoring"
    fi

    # Check DECISIONS.md has G9 entry
    if [ -f "$PROJECT_PATH/docs/DECISIONS.md" ]; then
        if grep -q "G9" "$PROJECT_PATH/docs/DECISIONS.md" 2>/dev/null; then
            pass "G9 decision logged in DECISIONS.md"
        else
            warn "G9 decision NOT logged in DECISIONS.md (may be skipped)"
        fi
    fi

    echo ""
    echo "--- G9 Summary ---"
    if [ "$SMOKE_TEST_FOUND" = true ]; then
        pass "G9 requirements met - smoke test exists"
        echo "  Remember: Run smoke test against production before approval"
        echo "  Command: PROD_URL=https://your-app.com npx playwright test tests/e2e/smoke.spec.ts"
    else
        fail "G9 BLOCKED - smoke test required"
    fi
}

# ============================================
# FULL VALIDATION (Development Complete)
# ============================================
validate_full() {
    echo "--- Full Development Validation ---"

    validate_g5_5

    echo ""
    echo "--- Build Verification ---"

    # Try to run build
    if [ -f "$PROJECT_PATH/package.json" ]; then
        if grep -q '"build"' "$PROJECT_PATH/package.json" 2>/dev/null; then
            echo "Running npm run build..."
            cd "$PROJECT_PATH"
            if npm run build > /dev/null 2>&1; then
                pass "Build successful"
            else
                fail "Build failed"
            fi
        else
            warn "No build script in package.json"
        fi
    fi

    echo ""
    echo "--- File Count Summary ---"

    TOTAL_TS=$(find "$PROJECT_PATH/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    echo "Total TypeScript/TSX files: $TOTAL_TS"

    if [ "$TOTAL_TS" -lt 5 ]; then
        fail "Very few source files ($TOTAL_TS) - may indicate incomplete implementation"
    elif [ "$TOTAL_TS" -lt 10 ]; then
        warn "Relatively few source files ($TOTAL_TS)"
    else
        pass "Good number of source files ($TOTAL_TS)"
    fi
}

# ============================================
# COMPLETE VALIDATION (All Gates)
# ============================================
validate_complete() {
    echo "--- Complete Project Validation (All Gates) ---"

    validate_g9

    echo ""
    echo "--- Git Commit History ---"

    cd "$PROJECT_PATH"
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    if [ "$COMMIT_COUNT" -gt 5 ]; then
        pass "Good commit history ($COMMIT_COUNT commits)"
    elif [ "$COMMIT_COUNT" -gt 0 ]; then
        warn "Few commits ($COMMIT_COUNT) - should have checkpoint commits"
    else
        fail "No git commits found"
    fi
}

# ============================================
# MAIN EXECUTION
# ============================================
echo ""

case $GATE in
    startup)
        validate_startup
        ;;
    g1)
        validate_g1
        ;;
    g2)
        validate_g2
        ;;
    g3)
        validate_g3
        ;;
    g4)
        validate_g4
        ;;
    g5.1)
        validate_g5_1
        ;;
    g5.2)
        validate_g5_2
        ;;
    g5.3)
        validate_g5_3
        ;;
    g5.4)
        validate_g5_4
        ;;
    g5.5)
        validate_g5_5
        ;;
    g6)
        validate_g6
        ;;
    g7)
        validate_g7
        ;;
    g8)
        validate_g8
        ;;
    g9)
        validate_g9
        ;;
    full)
        validate_full
        ;;
    complete)
        validate_complete
        ;;
    # Special validation commands (P1 enhancements)
    handoff)
        HANDOFF_FILE="${3:-$PROJECT_PATH/docs/last-handoff.json}"
        validate_handoff_json "$HANDOFF_FILE"
        ;;
    locked-check)
        check_locked_components
        ;;
    accessibility)
        validate_accessibility
        ;;
    security-full)
        validate_security_full
        ;;
    coverage)
        validate_test_coverage
        ;;
    tools)
        validate_tools
        ;;
    backend-tools)
        validate_backend_tools
        ;;
    project-type)
        PROJECT_TYPE=$(detect_project_type)
        echo "Detected project type: $PROJECT_TYPE"
        ;;
    *)
        echo -e "${RED}Unknown gate: $GATE${NC}"
        echo "Valid gates: startup, g1, g2, g3, g4, g5.1, g5.2, g5.3, g5.4, g5.5, g6, g7, g8, g9, full, complete"
        echo "Special: handoff, locked-check, accessibility, security-full, coverage, tools, backend-tools, project-type"
        exit 1
        ;;
esac

# ============================================
# SUMMARY
# ============================================
echo ""
echo "========================================"
echo "VALIDATION SUMMARY"
echo "========================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}VALIDATION FAILED${NC}"
    echo "Fix the errors above before proceeding to the next gate."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
    echo "Consider addressing the warnings above."
    exit 0
else
    echo -e "${GREEN}VALIDATION PASSED${NC}"
    exit 0
fi
