#!/bin/bash
# =============================================================================
# G3 Spec Validation Script
# =============================================================================
#
# PURPOSE: Validates that all spec files exist and are valid before G3 approval.
# USAGE: ./scripts/validate-specs.sh [project-dir] [--stack nodejs|python]
#
# This script checks (auto-detects stack or use --stack flag):
#
# NODE.JS STACK:
# 1. All required spec files exist (openapi.yaml, schema.prisma, schemas/index.ts)
# 2. OpenAPI spec is valid (swagger-cli)
# 3. Prisma schema is valid (prisma validate)
# 4. Zod schemas compile (tsc --noEmit)
# 5. package.json has validate:specs script
#
# PYTHON STACK:
# 1. All required spec files exist (openapi.yaml, models/__init__.py, schemas/__init__.py)
# 2. OpenAPI spec is valid (swagger-cli)
# 3. SQLAlchemy models import successfully
# 4. Pydantic schemas import successfully
# 5. Makefile has validate-specs target
#
# Exit codes:
#   0 - All validations passed
#   1 - One or more validations failed
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory (default to current directory)
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

echo "=============================================="
echo "G3 Spec Validation"
echo "=============================================="
echo ""
echo "Project: $PROJECT_DIR"

PASS=0
FAIL=0
SKIP=0

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
    if [ -f "$PROJECT_DIR/requirements.txt" ] || [ -f "$PROJECT_DIR/pyproject.toml" ] || [ -f "$PROJECT_DIR/setup.py" ]; then
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

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
check_file() {
    local file="$1"
    local description="$2"
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
        ((PASS++))
        return 0
    else
        echo -e "   ${RED}✗${NC} $file - MISSING"
        ((FAIL++))
        return 1
    fi
}

check_file_optional() {
    local file="$1"
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
        ((PASS++))
        return 0
    else
        echo -e "   ${YELLOW}⚠${NC} $file - missing (optional)"
        ((SKIP++))
        return 1
    fi
}

# -----------------------------------------------------------------------------
# OpenAPI Validation (Both Stacks)
# -----------------------------------------------------------------------------
validate_openapi() {
    echo "2. OpenAPI Validation"
    echo "   ------------------"

    if [ -f "$PROJECT_DIR/specs/openapi.yaml" ]; then
        if command -v swagger-cli &> /dev/null; then
            if swagger-cli validate "$PROJECT_DIR/specs/openapi.yaml" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} OpenAPI spec is valid"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} OpenAPI validation failed"
                ((FAIL++))
            fi
        elif [ -f "$PROJECT_DIR/node_modules/.bin/swagger-cli" ]; then
            if "$PROJECT_DIR/node_modules/.bin/swagger-cli" validate "$PROJECT_DIR/specs/openapi.yaml" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} OpenAPI spec is valid"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} OpenAPI validation failed"
                ((FAIL++))
            fi
        elif command -v npx &> /dev/null; then
            if npx --yes @apidevtools/swagger-cli validate "$PROJECT_DIR/specs/openapi.yaml" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} OpenAPI spec is valid"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} OpenAPI validation failed"
                ((FAIL++))
            fi
        else
            echo -e "   ${YELLOW}⚠${NC} swagger-cli not installed (skipping)"
            echo "     Install with: npm install -g @apidevtools/swagger-cli"
            ((SKIP++))
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot validate - file missing"
    fi

    echo ""
}

# -----------------------------------------------------------------------------
# Node.js Stack Validation
# -----------------------------------------------------------------------------
validate_nodejs() {
    echo "1. Required Files (Node.js)"
    echo "   ------------------------"

    check_file "specs/openapi.yaml" "OpenAPI specification"
    check_file "prisma/schema.prisma" "Prisma database schema"
    check_file "specs/schemas/index.ts" "Zod schema index"
    check_file "specs/tsconfig.json" "TypeScript config for specs"
    check_file_optional "specs/database-schema.json" "Universal database schema"

    echo ""

    validate_openapi

    # Prisma Validation
    echo "3. Prisma Validation"
    echo "   -----------------"

    if [ -f "$PROJECT_DIR/prisma/schema.prisma" ]; then
        # Check if DATABASE_URL is set or .env exists
        if [ -z "$DATABASE_URL" ] && [ ! -f "$PROJECT_DIR/.env" ]; then
            echo -e "   ${YELLOW}⚠${NC} DATABASE_URL not set, creating temporary .env"
            echo "DATABASE_URL=postgresql://localhost:5432/temp" > "$PROJECT_DIR/.env.temp"
            export DOTENV_CONFIG_PATH="$PROJECT_DIR/.env.temp"
            CLEANUP_ENV=1
        fi

        if command -v prisma &> /dev/null; then
            if (cd "$PROJECT_DIR" && prisma validate 2>/dev/null); then
                echo -e "   ${GREEN}✓${NC} Prisma schema is valid"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} Prisma validation failed"
                ((FAIL++))
            fi
        elif [ -f "$PROJECT_DIR/node_modules/.bin/prisma" ]; then
            if (cd "$PROJECT_DIR" && ./node_modules/.bin/prisma validate 2>/dev/null); then
                echo -e "   ${GREEN}✓${NC} Prisma schema is valid"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} Prisma validation failed"
                ((FAIL++))
            fi
        else
            echo -e "   ${YELLOW}⚠${NC} prisma not installed (skipping)"
            echo "     Install with: npm install prisma"
            ((SKIP++))
        fi

        # Cleanup temporary env file
        if [ "$CLEANUP_ENV" = "1" ]; then
            rm -f "$PROJECT_DIR/.env.temp"
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot validate - file missing"
    fi

    echo ""

    # Zod Schema Compilation
    echo "4. Zod Schema Compilation"
    echo "   ----------------------"

    if [ -f "$PROJECT_DIR/specs/schemas/index.ts" ]; then
        if [ -f "$PROJECT_DIR/specs/tsconfig.json" ]; then
            if command -v tsc &> /dev/null; then
                if tsc --noEmit -p "$PROJECT_DIR/specs/tsconfig.json" 2>/dev/null; then
                    echo -e "   ${GREEN}✓${NC} Zod schemas compile successfully"
                    ((PASS++))
                else
                    echo -e "   ${RED}✗${NC} TypeScript compilation failed"
                    echo "     Run: tsc --noEmit -p specs/tsconfig.json"
                    ((FAIL++))
                fi
            elif [ -f "$PROJECT_DIR/node_modules/.bin/tsc" ]; then
                if "$PROJECT_DIR/node_modules/.bin/tsc" --noEmit -p "$PROJECT_DIR/specs/tsconfig.json" 2>/dev/null; then
                    echo -e "   ${GREEN}✓${NC} Zod schemas compile successfully"
                    ((PASS++))
                else
                    echo -e "   ${RED}✗${NC} TypeScript compilation failed"
                    ((FAIL++))
                fi
            else
                echo -e "   ${YELLOW}⚠${NC} tsc not installed (skipping)"
                echo "     Install with: npm install typescript"
                ((SKIP++))
            fi
        else
            echo -e "   ${RED}✗${NC} specs/tsconfig.json missing"
            ((FAIL++))
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot compile - index.ts missing"
    fi

    echo ""

    # Check for validate:specs script in package.json
    echo "5. Validation Script Check"
    echo "   -----------------------"

    if [ -f "$PROJECT_DIR/package.json" ]; then
        if grep -q '"validate:specs"' "$PROJECT_DIR/package.json" 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} package.json has validate:specs script"
            ((PASS++))
        else
            echo -e "   ${RED}✗${NC} package.json MISSING validate:specs script"
            echo ""
            echo -e "   ${YELLOW}Add to package.json scripts:${NC}"
            echo '     "validate:specs": "npm run validate:openapi && npm run validate:prisma && npm run validate:schemas",'
            echo '     "validate:openapi": "swagger-cli validate specs/openapi.yaml",'
            echo '     "validate:prisma": "prisma validate",'
            echo '     "validate:schemas": "tsc --noEmit -p specs/tsconfig.json"'
            ((FAIL++))
        fi

        # Check swagger-cli dependency
        if grep -q '"@apidevtools/swagger-cli"\|"swagger-cli"' "$PROJECT_DIR/package.json" 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} swagger-cli in devDependencies"
            ((PASS++))
        else
            echo -e "   ${RED}✗${NC} swagger-cli NOT in devDependencies"
            echo "     Run: npm install -D @apidevtools/swagger-cli"
            ((FAIL++))
        fi
    fi

    echo ""
}

# -----------------------------------------------------------------------------
# Python Stack Validation
# -----------------------------------------------------------------------------
validate_python() {
    echo "1. Required Files (Python)"
    echo "   -----------------------"

    check_file "specs/openapi.yaml" "OpenAPI specification"
    check_file "src/models/__init__.py" "SQLAlchemy models"
    check_file "specs/schemas/__init__.py" "Pydantic schemas"
    check_file_optional "specs/database-schema.json" "Universal database schema"

    echo ""

    validate_openapi

    # SQLAlchemy Model Validation
    echo "3. SQLAlchemy Model Validation"
    echo "   ---------------------------"

    if [ -f "$PROJECT_DIR/src/models/__init__.py" ]; then
        # Try to import models
        if command -v python3 &> /dev/null; then
            PYTHON_CMD="python3"
        elif command -v python &> /dev/null; then
            PYTHON_CMD="python"
        else
            echo -e "   ${YELLOW}⚠${NC} Python not found (skipping)"
            ((SKIP++))
            PYTHON_CMD=""
        fi

        if [ -n "$PYTHON_CMD" ]; then
            cd "$PROJECT_DIR"
            if PYTHONPATH="$PROJECT_DIR:$PYTHONPATH" $PYTHON_CMD -c "from src.models import *; print('OK')" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} SQLAlchemy models import successfully"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} SQLAlchemy model import failed"
                echo "     Run: python -c \"from src.models import *\""
                ((FAIL++))
            fi
            cd - > /dev/null
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot validate - models not found"
    fi

    echo ""

    # Pydantic Schema Validation
    echo "4. Pydantic Schema Validation"
    echo "   --------------------------"

    if [ -f "$PROJECT_DIR/specs/schemas/__init__.py" ]; then
        if [ -n "$PYTHON_CMD" ]; then
            cd "$PROJECT_DIR"
            if PYTHONPATH="$PROJECT_DIR:$PYTHONPATH" $PYTHON_CMD -c "from specs.schemas import *; print('OK')" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} Pydantic schemas import successfully"
                ((PASS++))
            else
                echo -e "   ${RED}✗${NC} Pydantic schema import failed"
                echo "     Run: python -c \"from specs.schemas import *\""
                ((FAIL++))
            fi
            cd - > /dev/null
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot validate - schemas not found"
    fi

    echo ""

    # Check for validate-specs target in Makefile
    echo "5. Validation Script Check"
    echo "   -----------------------"

    if [ -f "$PROJECT_DIR/Makefile" ]; then
        if grep -q "validate-specs\|validate_specs" "$PROJECT_DIR/Makefile" 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} Makefile has validate-specs target"
            ((PASS++))
        else
            echo -e "   ${RED}✗${NC} Makefile MISSING validate-specs target"
            echo ""
            echo -e "   ${YELLOW}Add to Makefile:${NC}"
            echo "     .PHONY: validate-specs"
            echo "     validate-specs:"
            echo "     	swagger-cli validate specs/openapi.yaml"
            echo "     	python -c \"from src.models import *; print('SQLAlchemy OK')\""
            echo "     	python -c \"from specs.schemas import *; print('Pydantic OK')\""
            ((FAIL++))
        fi
    elif [ -f "$PROJECT_DIR/pyproject.toml" ]; then
        # Check for script in pyproject.toml
        if grep -q '\[tool\.poetry\.scripts\]' "$PROJECT_DIR/pyproject.toml" 2>/dev/null && \
           grep -q "validate" "$PROJECT_DIR/pyproject.toml" 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} pyproject.toml has validation script"
            ((PASS++))
        else
            echo -e "   ${YELLOW}⚠${NC} No validation script found"
            echo "     Consider adding Makefile with validate-specs target"
            ((SKIP++))
        fi
    else
        echo -e "   ${YELLOW}⚠${NC} No Makefile or pyproject.toml found"
        ((SKIP++))
    fi

    echo ""
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------
case $STACK in
    nodejs)
        validate_nodejs
        ;;
    python)
        validate_python
        ;;
    *)
        echo -e "${YELLOW}Warning: Could not detect stack type${NC}"
        echo "Use --stack nodejs or --stack python to specify manually"
        echo ""
        echo "Attempting Node.js validation by default..."
        echo ""
        validate_nodejs
        ;;
esac

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=============================================="
echo "Summary"
echo "=============================================="
echo ""
echo -e "   Passed:  ${GREEN}$PASS${NC}"
echo -e "   Failed:  ${RED}$FAIL${NC}"
echo -e "   Skipped: ${YELLOW}$SKIP${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}G3 CANNOT be approved - fix failures first${NC}"
    echo ""
    exit 1
else
    if [ $SKIP -gt 0 ]; then
        echo -e "${YELLOW}G3 ready for review (some checks skipped)${NC}"
        echo "Install missing tools to run all validations."
    else
        echo -e "${GREEN}G3 ready for approval${NC}"
    fi
    echo ""
    exit 0
fi
