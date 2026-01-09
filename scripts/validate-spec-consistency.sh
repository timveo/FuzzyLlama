#!/bin/bash
#
# Spec Consistency Validator
#
# Validates that OpenAPI, Prisma, and Zod specs are consistent.
# Required for G3 approval.
#
# Usage: ./scripts/validate-spec-consistency.sh [project_path]
#

set -e

PROJECT_PATH="${1:-.}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

log_error() {
    echo -e "${RED}ERROR:${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
    ((WARNINGS++))
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_info() {
    echo "  $1"
}

# ============================================================
# File Existence Checks
# ============================================================

echo ""
echo "=========================================="
echo "Spec Consistency Validator"
echo "=========================================="
echo ""
echo "Project: $PROJECT_PATH"
echo ""

echo "1. Checking spec files exist..."
echo "-------------------------------------------"

OPENAPI_PATH="$PROJECT_PATH/specs/openapi.yaml"
PRISMA_PATH="$PROJECT_PATH/prisma/schema.prisma"
ZOD_PATH="$PROJECT_PATH/specs/schemas/index.ts"

if [ -f "$OPENAPI_PATH" ]; then
    log_success "OpenAPI spec exists: $OPENAPI_PATH"
else
    log_error "OpenAPI spec missing: $OPENAPI_PATH"
fi

if [ -f "$PRISMA_PATH" ]; then
    log_success "Prisma schema exists: $PRISMA_PATH"
else
    log_error "Prisma schema missing: $PRISMA_PATH"
fi

if [ -f "$ZOD_PATH" ]; then
    log_success "Zod schemas exist: $ZOD_PATH"
else
    log_warning "Zod schemas missing: $ZOD_PATH (optional)"
fi

# ============================================================
# Spec Validation
# ============================================================

echo ""
echo "2. Validating individual specs..."
echo "-------------------------------------------"

# Validate OpenAPI
if [ -f "$OPENAPI_PATH" ]; then
    if command -v swagger-cli &> /dev/null; then
        if swagger-cli validate "$OPENAPI_PATH" 2>/dev/null; then
            log_success "OpenAPI spec is valid"
        else
            log_error "OpenAPI spec validation failed"
        fi
    else
        log_warning "swagger-cli not installed, skipping OpenAPI validation"
    fi
fi

# Validate Prisma
if [ -f "$PRISMA_PATH" ]; then
    if command -v npx &> /dev/null; then
        cd "$PROJECT_PATH"
        if npx prisma validate 2>/dev/null; then
            log_success "Prisma schema is valid"
        else
            log_error "Prisma schema validation failed"
        fi
        cd - > /dev/null
    else
        log_warning "npx not available, skipping Prisma validation"
    fi
fi

# Validate Zod (TypeScript compilation)
if [ -f "$ZOD_PATH" ]; then
    if command -v npx &> /dev/null; then
        cd "$PROJECT_PATH"
        if npx tsc --noEmit "$ZOD_PATH" 2>/dev/null; then
            log_success "Zod schemas compile successfully"
        else
            log_error "Zod schemas have TypeScript errors"
        fi
        cd - > /dev/null
    else
        log_warning "npx not available, skipping Zod validation"
    fi
fi

# ============================================================
# Cross-Spec Consistency
# ============================================================

echo ""
echo "3. Checking cross-spec consistency..."
echo "-------------------------------------------"

# Extract enums from specs
extract_openapi_enums() {
    if [ -f "$OPENAPI_PATH" ]; then
        grep -E "^\s+enum:" -A 20 "$OPENAPI_PATH" 2>/dev/null | \
        grep -E "^\s+-\s+" | \
        sed 's/.*-\s*//' | \
        sort -u
    fi
}

extract_prisma_enums() {
    if [ -f "$PRISMA_PATH" ]; then
        grep -E "^enum\s+\w+\s*\{" -A 20 "$PRISMA_PATH" 2>/dev/null | \
        grep -E "^\s+\w+$" | \
        sed 's/^\s*//' | \
        sort -u
    fi
}

# Extract model names
extract_openapi_schemas() {
    if [ -f "$OPENAPI_PATH" ]; then
        grep -E "^\s{4}\w+:" "$OPENAPI_PATH" 2>/dev/null | \
        grep -v "type:\|properties:\|description:\|required:\|items:\|format:" | \
        sed 's/://g' | \
        sed 's/^\s*//' | \
        head -20 | \
        sort -u
    fi
}

extract_prisma_models() {
    if [ -f "$PRISMA_PATH" ]; then
        grep -E "^model\s+\w+" "$PRISMA_PATH" 2>/dev/null | \
        sed 's/model\s*//' | \
        sed 's/\s*{.*//' | \
        sort -u
    fi
}

# Compare enums
echo "Checking enum consistency..."

OPENAPI_ENUMS=$(extract_openapi_enums 2>/dev/null || echo "")
PRISMA_ENUMS=$(extract_prisma_enums 2>/dev/null || echo "")

if [ -n "$OPENAPI_ENUMS" ] && [ -n "$PRISMA_ENUMS" ]; then
    # Find enums in OpenAPI but not Prisma
    for enum in $OPENAPI_ENUMS; do
        if ! echo "$PRISMA_ENUMS" | grep -q "^$enum$"; then
            log_warning "Enum value '$enum' in OpenAPI but not in Prisma"
        fi
    done

    # Find enums in Prisma but not OpenAPI
    for enum in $PRISMA_ENUMS; do
        if ! echo "$OPENAPI_ENUMS" | grep -q "^$enum$"; then
            log_warning "Enum value '$enum' in Prisma but not in OpenAPI"
        fi
    done

    log_info "Checked $(echo "$OPENAPI_ENUMS" | wc -l | tr -d ' ') OpenAPI enums vs $(echo "$PRISMA_ENUMS" | wc -l | tr -d ' ') Prisma enums"
else
    log_info "No enums to compare or specs missing"
fi

# Compare models/schemas
echo ""
echo "Checking model/schema consistency..."

OPENAPI_SCHEMAS=$(extract_openapi_schemas 2>/dev/null || echo "")
PRISMA_MODELS=$(extract_prisma_models 2>/dev/null || echo "")

if [ -n "$OPENAPI_SCHEMAS" ] && [ -n "$PRISMA_MODELS" ]; then
    log_info "OpenAPI schemas: $(echo "$OPENAPI_SCHEMAS" | tr '\n' ', ' | sed 's/,$//')"
    log_info "Prisma models: $(echo "$PRISMA_MODELS" | tr '\n' ', ' | sed 's/,$//')"

    # Check for common patterns
    for model in $PRISMA_MODELS; do
        if ! echo "$OPENAPI_SCHEMAS" | grep -qi "^$model$"; then
            log_warning "Prisma model '$model' may not have corresponding OpenAPI schema"
        fi
    done
fi

# ============================================================
# Field Naming Convention Check
# ============================================================

echo ""
echo "4. Checking naming conventions..."
echo "-------------------------------------------"

# Check for snake_case vs camelCase inconsistencies
if [ -f "$OPENAPI_PATH" ]; then
    SNAKE_CASE_FIELDS=$(grep -oE '[a-z]+_[a-z]+' "$OPENAPI_PATH" 2>/dev/null | sort -u | head -5)
    CAMEL_CASE_FIELDS=$(grep -oE '[a-z]+[A-Z][a-z]+' "$OPENAPI_PATH" 2>/dev/null | sort -u | head -5)

    if [ -n "$SNAKE_CASE_FIELDS" ] && [ -n "$CAMEL_CASE_FIELDS" ]; then
        log_warning "Mixed naming conventions in OpenAPI spec"
        log_info "snake_case fields: $(echo $SNAKE_CASE_FIELDS | tr '\n' ', ')"
        log_info "camelCase fields: $(echo $CAMEL_CASE_FIELDS | tr '\n' ', ')"
    else
        log_success "Consistent naming convention in OpenAPI spec"
    fi
fi

if [ -f "$PRISMA_PATH" ]; then
    # Prisma should use camelCase for fields
    SNAKE_IN_PRISMA=$(grep -oE '\s[a-z]+_[a-z]+\s' "$PRISMA_PATH" 2>/dev/null | sort -u | wc -l)
    if [ "$SNAKE_IN_PRISMA" -gt 0 ]; then
        log_warning "Found $SNAKE_IN_PRISMA snake_case fields in Prisma (should be camelCase)"
    else
        log_success "Prisma uses consistent camelCase"
    fi
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}FAILED${NC}: $ERRORS errors, $WARNINGS warnings"
    echo ""
    echo "G3 approval blocked due to spec errors."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASSED WITH WARNINGS${NC}: $WARNINGS warnings"
    echo ""
    echo "G3 approval possible, but consider addressing warnings."
    exit 0
else
    echo -e "${GREEN}PASSED${NC}: All spec consistency checks passed!"
    echo ""
    echo "G3 approval ready."
    exit 0
fi
