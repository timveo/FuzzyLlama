#!/bin/bash
# =============================================================================
# G5 Spec Compliance Validation Script
# =============================================================================
#
# PURPOSE: Validates that implementation code follows spec-first contracts.
# This script is run during G5 (Development) gate to ensure developers
# implemented from specs rather than interpreting requirements.
#
# USAGE: ./scripts/validate-g5-compliance.sh [project-dir] [--stack nodejs|python]
#
# WHAT IT CHECKS:
# 1. All OpenAPI endpoints have corresponding route implementations
# 2. Backend imports validation schemas from specs/ (not custom validation)
# 3. Frontend uses zodResolver with spec schemas (Node.js)
# 4. No custom validation code exists outside specs/
# 5. Response types match spec definitions
#
# INTEGRATION:
# - Uses TruthStore (.truth/truth.json) for spec paths
# - Outputs compliance report to .truth/proofs/G5/
# - Called by validate_g5_compliance() MCP tool
#
# Exit codes:
#   0 - All compliance checks passed
#   1 - One or more compliance checks failed
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="${1:-.}"
FORCE_STACK=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --stack)
            FORCE_STACK="$2"
            shift 2
            ;;
        *)
            if [ -d "$1" ]; then
                PROJECT_DIR="$1"
            fi
            shift
            ;;
    esac
done

TRUTH_FILE="$PROJECT_DIR/.truth/truth.json"

echo "=============================================="
echo "G5 Spec Compliance Validation"
echo "=============================================="
echo ""
echo "Project: $PROJECT_DIR"

# -----------------------------------------------------------------------------
# Stack Detection
# -----------------------------------------------------------------------------
detect_stack() {
    if [ -n "$FORCE_STACK" ]; then
        echo "$FORCE_STACK"
        return
    fi

    # Check TECH_STACK.md first
    if [ -f "$PROJECT_DIR/docs/TECH_STACK.md" ]; then
        if grep -qi "python\|fastapi\|django\|flask\|sqlalchemy\|pydantic" "$PROJECT_DIR/docs/TECH_STACK.md" 2>/dev/null; then
            echo "python"
            return
        elif grep -qi "node\|express\|react\|typescript\|prisma\|zod" "$PROJECT_DIR/docs/TECH_STACK.md" 2>/dev/null; then
            echo "nodejs"
            return
        fi
    fi

    # Fallback to file detection
    if [ -f "$PROJECT_DIR/requirements.txt" ] || [ -f "$PROJECT_DIR/pyproject.toml" ]; then
        echo "python"
    elif [ -f "$PROJECT_DIR/package.json" ]; then
        echo "nodejs"
    else
        echo "unknown"
    fi
}

STACK=$(detect_stack)
echo "Stack: $STACK"
echo ""

# Counters
PASS=0
FAIL=0
WARN=0

# Report content
REPORT=""

add_report() {
    REPORT="$REPORT$1\n"
}

check_pass() {
    echo -e "   ${GREEN}✓${NC} $1"
    ((PASS++))
    add_report "✓ PASS: $1"
}

check_fail() {
    echo -e "   ${RED}✗${NC} $1"
    ((FAIL++))
    add_report "✗ FAIL: $1"
}

check_warn() {
    echo -e "   ${YELLOW}⚠${NC} $1"
    ((WARN++))
    add_report "⚠ WARN: $1"
}

# -----------------------------------------------------------------------------
# 1. OpenAPI Endpoint Coverage
# -----------------------------------------------------------------------------
check_openapi_coverage() {
    echo "1. OpenAPI Endpoint Coverage"
    echo "   -------------------------"
    add_report "\n## 1. OpenAPI Endpoint Coverage"

    OPENAPI_FILE=""
    if [ -f "$PROJECT_DIR/specs/openapi.yaml" ]; then
        OPENAPI_FILE="$PROJECT_DIR/specs/openapi.yaml"
    elif [ -f "$PROJECT_DIR/specs/openapi.yml" ]; then
        OPENAPI_FILE="$PROJECT_DIR/specs/openapi.yml"
    fi

    if [ -z "$OPENAPI_FILE" ]; then
        check_warn "No OpenAPI spec found at specs/openapi.yaml"
        return
    fi

    # Count endpoints in OpenAPI
    ENDPOINT_COUNT=$(grep -c "operationId:" "$OPENAPI_FILE" 2>/dev/null || echo "0")
    echo "   Endpoints defined in spec: $ENDPOINT_COUNT"
    add_report "Endpoints in spec: $ENDPOINT_COUNT"

    # Count implemented routes
    ROUTE_COUNT=0
    if [ "$STACK" = "nodejs" ]; then
        # Count Express/Fastify route handlers
        if [ -d "$PROJECT_DIR/src" ]; then
            ROUTE_COUNT=$(grep -rE "\.(get|post|put|patch|delete)\s*\(" "$PROJECT_DIR/src" --include="*.ts" --include="*.js" 2>/dev/null | wc -l | tr -d ' ')
        fi
        if [ -d "$PROJECT_DIR/backend/src" ]; then
            ROUTE_COUNT=$((ROUTE_COUNT + $(grep -rE "\.(get|post|put|patch|delete)\s*\(" "$PROJECT_DIR/backend/src" --include="*.ts" --include="*.js" 2>/dev/null | wc -l | tr -d ' ')))
        fi
    elif [ "$STACK" = "python" ]; then
        # Count FastAPI/Flask route handlers
        if [ -d "$PROJECT_DIR/src" ]; then
            ROUTE_COUNT=$(grep -rE "@(app|router)\.(get|post|put|patch|delete)" "$PROJECT_DIR/src" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')
        fi
    fi

    echo "   Routes implemented: $ROUTE_COUNT"
    add_report "Routes implemented: $ROUTE_COUNT"

    if [ "$ROUTE_COUNT" -ge "$ENDPOINT_COUNT" ] && [ "$ENDPOINT_COUNT" -gt 0 ]; then
        check_pass "All OpenAPI endpoints appear to be implemented ($ROUTE_COUNT/$ENDPOINT_COUNT)"
    elif [ "$ENDPOINT_COUNT" -eq 0 ]; then
        check_warn "No endpoints defined in OpenAPI spec"
    else
        check_fail "Missing route implementations ($ROUTE_COUNT/$ENDPOINT_COUNT)"
    fi
    echo ""
}

# -----------------------------------------------------------------------------
# 2. Validation Schema Usage (No Custom Validation)
# -----------------------------------------------------------------------------
check_validation_usage() {
    echo "2. Validation Schema Usage"
    echo "   -----------------------"
    add_report "\n## 2. Validation Schema Usage"

    if [ "$STACK" = "nodejs" ]; then
        # Check for imports from specs/schemas
        SPEC_IMPORTS=$(grep -r "from.*specs/schemas\|from.*@/specs/schemas" "$PROJECT_DIR/src" "$PROJECT_DIR/backend/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
        echo "   Spec schema imports: $SPEC_IMPORTS"
        add_report "Spec schema imports: $SPEC_IMPORTS"

        if [ "$SPEC_IMPORTS" -gt 0 ]; then
            check_pass "Using validation schemas from specs/ ($SPEC_IMPORTS imports)"
        else
            check_fail "No imports from specs/schemas found - custom validation suspected"
        fi

        # Check for inline Zod schemas (outside specs/)
        INLINE_ZOD=$(grep -rE "z\.object\(|z\.string\(\)|z\.number\(\)" "$PROJECT_DIR/src" "$PROJECT_DIR/backend/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "specs/schemas" | grep -v "node_modules" | wc -l | tr -d ' ')

        if [ "$INLINE_ZOD" -gt 0 ]; then
            check_warn "Found $INLINE_ZOD inline Zod definitions outside specs/schemas"
            add_report "Inline Zod definitions: $INLINE_ZOD (should be 0)"
        else
            check_pass "No inline Zod schemas found outside specs/"
        fi

    elif [ "$STACK" = "python" ]; then
        # Check for imports from specs.schemas
        SPEC_IMPORTS=$(grep -r "from specs.schemas import\|from specs.schemas." "$PROJECT_DIR/src" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')
        echo "   Spec schema imports: $SPEC_IMPORTS"
        add_report "Spec schema imports: $SPEC_IMPORTS"

        if [ "$SPEC_IMPORTS" -gt 0 ]; then
            check_pass "Using Pydantic schemas from specs/ ($SPEC_IMPORTS imports)"
        else
            check_fail "No imports from specs.schemas found - custom validation suspected"
        fi

        # Check for response_model usage
        RESPONSE_MODEL=$(grep -r "response_model=" "$PROJECT_DIR/src" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$RESPONSE_MODEL" -gt 0 ]; then
            check_pass "Using response_model for API responses ($RESPONSE_MODEL usages)"
        else
            check_warn "No response_model usage found - responses may not be validated"
        fi

        # Check for inline Pydantic models in api/
        INLINE_PYDANTIC=$(grep -rE "class.*\(BaseModel\)" "$PROJECT_DIR/src/api" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')

        if [ "$INLINE_PYDANTIC" -gt 0 ]; then
            check_warn "Found $INLINE_PYDANTIC inline Pydantic models in src/api/"
            add_report "Inline Pydantic in api/: $INLINE_PYDANTIC (should be 0)"
        else
            check_pass "No inline Pydantic models in api/ directory"
        fi
    fi
    echo ""
}

# -----------------------------------------------------------------------------
# 3. Frontend Validation (Node.js only)
# -----------------------------------------------------------------------------
check_frontend_validation() {
    if [ "$STACK" != "nodejs" ]; then
        return
    fi

    echo "3. Frontend Validation"
    echo "   -------------------"
    add_report "\n## 3. Frontend Validation"

    FRONTEND_DIR=""
    if [ -d "$PROJECT_DIR/frontend/src" ]; then
        FRONTEND_DIR="$PROJECT_DIR/frontend/src"
    elif [ -d "$PROJECT_DIR/src/components" ]; then
        FRONTEND_DIR="$PROJECT_DIR/src"
    fi

    if [ -z "$FRONTEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
        echo "   No frontend directory found"
        add_report "No frontend directory found"
        return
    fi

    # Check for zodResolver usage
    ZOD_RESOLVER=$(grep -r "zodResolver" "$FRONTEND_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$ZOD_RESOLVER" -gt 0 ]; then
        check_pass "Using zodResolver for form validation ($ZOD_RESOLVER usages)"
    else
        check_warn "No zodResolver usage found - forms may not use spec schemas"
    fi

    # Check for spec schema imports in frontend
    FE_SPEC_IMPORTS=$(grep -r "from.*specs/schemas" "$FRONTEND_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$FE_SPEC_IMPORTS" -gt 0 ]; then
        check_pass "Frontend imports from specs/schemas ($FE_SPEC_IMPORTS imports)"
    else
        check_warn "Frontend doesn't import from specs/schemas"
    fi

    # Check for custom interfaces/types
    CUSTOM_TYPES=$(grep -rE "^(interface|type)\s+\w+\s*=" "$FRONTEND_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "specs/" | wc -l | tr -d ' ')

    if [ "$CUSTOM_TYPES" -gt 5 ]; then
        check_warn "Found $CUSTOM_TYPES custom type definitions - consider using z.infer<typeof Schema>"
    else
        check_pass "Minimal custom type definitions ($CUSTOM_TYPES)"
    fi
    echo ""
}

# -----------------------------------------------------------------------------
# 4. Database Schema Compliance
# -----------------------------------------------------------------------------
check_db_compliance() {
    echo "4. Database Schema Compliance"
    echo "   --------------------------"
    add_report "\n## 4. Database Schema Compliance"

    if [ "$STACK" = "nodejs" ]; then
        if [ -f "$PROJECT_DIR/prisma/schema.prisma" ]; then
            # Check if Prisma client is used
            PRISMA_USAGE=$(grep -r "prisma\." "$PROJECT_DIR/src" "$PROJECT_DIR/backend/src" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

            if [ "$PRISMA_USAGE" -gt 0 ]; then
                check_pass "Using Prisma client for database operations ($PRISMA_USAGE usages)"
            else
                check_fail "Prisma schema exists but Prisma client not used"
            fi

            # Check for raw SQL (should use Prisma)
            RAW_SQL=$(grep -rE "execute.*SELECT|query.*SELECT" "$PROJECT_DIR/src" "$PROJECT_DIR/backend/src" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

            if [ "$RAW_SQL" -gt 0 ]; then
                check_warn "Found $RAW_SQL raw SQL queries - prefer Prisma ORM"
            else
                check_pass "No raw SQL detected - using Prisma ORM correctly"
            fi
        else
            check_warn "No Prisma schema found at prisma/schema.prisma"
        fi

    elif [ "$STACK" = "python" ]; then
        if [ -d "$PROJECT_DIR/src/models" ]; then
            # Check if SQLAlchemy models are imported
            MODEL_IMPORTS=$(grep -r "from src.models import\|from .models import" "$PROJECT_DIR/src" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')

            if [ "$MODEL_IMPORTS" -gt 0 ]; then
                check_pass "Using SQLAlchemy models ($MODEL_IMPORTS imports)"
            else
                check_warn "SQLAlchemy models exist but not imported in code"
            fi

            # Check for raw SQL
            RAW_SQL=$(grep -rE "execute\(.*SELECT|text\(.*SELECT" "$PROJECT_DIR/src" --include="*.py" 2>/dev/null | wc -l | tr -d ' ')

            if [ "$RAW_SQL" -gt 3 ]; then
                check_warn "Found $RAW_SQL raw SQL queries - prefer ORM methods"
            else
                check_pass "Minimal raw SQL ($RAW_SQL) - using ORM correctly"
            fi
        else
            check_warn "No src/models directory found"
        fi
    fi
    echo ""
}

# -----------------------------------------------------------------------------
# 5. Spec Integrity Check
# -----------------------------------------------------------------------------
check_spec_integrity() {
    echo "5. Spec Integrity"
    echo "   ---------------"
    add_report "\n## 5. Spec Integrity"

    if [ -f "$TRUTH_FILE" ]; then
        # Check if specs are locked (they should be at G5)
        SPECS_LOCKED=$(grep -A 10 '"specs"' "$TRUTH_FILE" 2>/dev/null | grep -o '"locked"[[:space:]]*:[[:space:]]*true' | head -1 || true)

        if [ -n "$SPECS_LOCKED" ]; then
            check_pass "Specs are locked (G3 approved)"
        else
            check_warn "Specs are not locked - G3 may not have been approved"
        fi
    else
        check_warn "No TruthStore found - cannot verify spec lock status"
    fi
    echo ""
}

# -----------------------------------------------------------------------------
# Run All Checks
# -----------------------------------------------------------------------------
add_report "# G5 Spec Compliance Report"
add_report "Project: $PROJECT_DIR"
add_report "Stack: $STACK"
add_report "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

check_openapi_coverage
check_validation_usage
check_frontend_validation
check_db_compliance
check_spec_integrity

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=============================================="
echo "Summary"
echo "=============================================="
echo ""
echo -e "   Passed:   ${GREEN}$PASS${NC}"
echo -e "   Failed:   ${RED}$FAIL${NC}"
echo -e "   Warnings: ${YELLOW}$WARN${NC}"
echo ""

add_report "\n## Summary"
add_report "- Passed: $PASS"
add_report "- Failed: $FAIL"
add_report "- Warnings: $WARN"

# -----------------------------------------------------------------------------
# Save Report
# -----------------------------------------------------------------------------
PROOF_DIR="$PROJECT_DIR/.truth/proofs/G5"
if [ ! -d "$PROOF_DIR" ]; then
    mkdir -p "$PROOF_DIR"
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S")
REPORT_FILE="$PROOF_DIR/compliance-report-$TIMESTAMP.md"
echo -e "$REPORT" > "$REPORT_FILE"
echo "Report saved: $REPORT_FILE"

# -----------------------------------------------------------------------------
# Final Result
# -----------------------------------------------------------------------------
if [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}G5 compliance check FAILED${NC}"
    echo "Fix the issues above before requesting G5 approval."
    exit 1
else
    if [ $WARN -gt 3 ]; then
        echo ""
        echo -e "${YELLOW}G5 compliance check PASSED with warnings${NC}"
        echo "Consider addressing warnings before G5 approval."
        exit 0
    else
        echo ""
        echo -e "${GREEN}G5 compliance check PASSED${NC}"
        exit 0
    fi
fi
