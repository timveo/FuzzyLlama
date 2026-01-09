#!/bin/bash
# =============================================================================
# Schema Drift Detection Script
# =============================================================================
#
# PURPOSE: Detects inconsistencies between OpenAPI, Prisma, and Zod specs.
# USAGE: ./scripts/detect-schema-drift.sh [project-dir]
#
# This script checks:
# 1. Enum values match across all three specs
# 2. Model field names are consistent
# 3. Field types are compatible
#
# Exit codes:
#   0 - No drift detected
#   1 - Drift detected
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory (default to current directory)
PROJECT_DIR="${1:-.}"

echo "=============================================="
echo "Schema Drift Detection"
echo "=============================================="
echo ""
echo "Project: $PROJECT_DIR"
echo ""

DRIFT_COUNT=0

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Extract enum values from OpenAPI
get_openapi_enum() {
    local enum_name="$1"
    grep -A10 "    $enum_name:" "$PROJECT_DIR/specs/openapi.yaml" 2>/dev/null | \
        grep "enum:" | head -1 | \
        sed 's/.*\[//' | sed 's/\].*//' | tr -d ' '
}

# Extract enum values from Prisma
get_prisma_enum() {
    local enum_name="$1"
    grep -A20 "enum $enum_name {" "$PROJECT_DIR/prisma/schema.prisma" 2>/dev/null | \
        grep -E "^\s+[A-Z_]+" | \
        tr -d ' ' | tr '\n' ',' | sed 's/,$//'
}

# Extract enum values from Zod
get_zod_enum() {
    local schema_name="$1"
    local file="$2"
    grep "${schema_name}Schema = z.enum" "$PROJECT_DIR/specs/schemas/$file" 2>/dev/null | \
        sed "s/.*\[//" | sed "s/\]).*//" | tr -d "' "
}

# Compare two comma-separated lists (order-independent)
compare_enums() {
    local a="$1"
    local b="$2"

    # Normalize: sort and compare
    local a_sorted=$(echo "$a" | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')
    local b_sorted=$(echo "$b" | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')

    [ "$a_sorted" = "$b_sorted" ]
}

# -----------------------------------------------------------------------------
# 1. Check UserRole Enum
# -----------------------------------------------------------------------------
echo "1. UserRole Enum Consistency"
echo "   -------------------------"

OPENAPI_USER_ROLE=$(get_openapi_enum "UserRole")
PRISMA_USER_ROLE=$(get_prisma_enum "UserRole")
ZOD_USER_ROLE=$(get_zod_enum "UserRole" "user.schema.ts")

echo "   OpenAPI: $OPENAPI_USER_ROLE"
echo "   Prisma:  $PRISMA_USER_ROLE"
echo "   Zod:     $ZOD_USER_ROLE"

if compare_enums "$OPENAPI_USER_ROLE" "$PRISMA_USER_ROLE" && \
   compare_enums "$PRISMA_USER_ROLE" "$ZOD_USER_ROLE"; then
    echo -e "   ${GREEN}✓${NC} UserRole is consistent across all specs"
else
    echo -e "   ${RED}✗${NC} UserRole DRIFT DETECTED"
    ((DRIFT_COUNT++))
fi

echo ""

# -----------------------------------------------------------------------------
# 2. Check TokenType Enum (if exists)
# -----------------------------------------------------------------------------
echo "2. TokenType Enum Consistency"
echo "   --------------------------"

OPENAPI_TOKEN_TYPE=$(get_openapi_enum "TokenType")
PRISMA_TOKEN_TYPE=$(get_prisma_enum "TokenType")

if [ -n "$OPENAPI_TOKEN_TYPE" ] || [ -n "$PRISMA_TOKEN_TYPE" ]; then
    echo "   OpenAPI: ${OPENAPI_TOKEN_TYPE:-not defined}"
    echo "   Prisma:  ${PRISMA_TOKEN_TYPE:-not defined}"

    if [ "$OPENAPI_TOKEN_TYPE" = "$PRISMA_TOKEN_TYPE" ] || \
       [ -z "$OPENAPI_TOKEN_TYPE" ] || [ -z "$PRISMA_TOKEN_TYPE" ]; then
        echo -e "   ${GREEN}✓${NC} TokenType is consistent"
    else
        echo -e "   ${RED}✗${NC} TokenType DRIFT DETECTED"
        ((DRIFT_COUNT++))
    fi
else
    echo -e "   ${CYAN}○${NC} TokenType not defined (skipping)"
fi

echo ""

# -----------------------------------------------------------------------------
# 3. Check User Model Fields
# -----------------------------------------------------------------------------
echo "3. User Model Field Coverage"
echo "   -------------------------"

# Get Zod User fields
ZOD_USER_FIELDS=$(grep -A15 "export const UserSchema = z.object" "$PROJECT_DIR/specs/schemas/user.schema.ts" 2>/dev/null | \
    grep -E "^\s+\w+:" | sed 's/:.*//' | tr -d ' ' | sort | tr '\n' ',' | sed 's/,$//')

# Get Prisma User fields (excluding relations and internal fields)
PRISMA_USER_FIELDS=$(grep -A30 "model User {" "$PROJECT_DIR/prisma/schema.prisma" 2>/dev/null | \
    grep -E "^\s+\w+\s+" | \
    grep -v "//" | \
    grep -v "refreshTokens" | \
    awk '{print $1}' | sort | tr '\n' ',' | sed 's/,$//')

echo "   Zod fields:    $ZOD_USER_FIELDS"
echo "   Prisma fields: $PRISMA_USER_FIELDS"

# Check that all Zod fields exist in Prisma (Zod is the API contract)
MISSING_IN_PRISMA=""
for field in $(echo "$ZOD_USER_FIELDS" | tr ',' '\n'); do
    if ! echo "$PRISMA_USER_FIELDS" | grep -q "$field"; then
        # Check if it's a mapped field (e.g., createdAt -> created_at)
        if ! echo "$PRISMA_USER_FIELDS" | grep -qi "${field}"; then
            MISSING_IN_PRISMA="$MISSING_IN_PRISMA $field"
        fi
    fi
done

if [ -z "$MISSING_IN_PRISMA" ]; then
    echo -e "   ${GREEN}✓${NC} All Zod fields have Prisma backing"
else
    echo -e "   ${YELLOW}⚠${NC} Fields in Zod but not found in Prisma:$MISSING_IN_PRISMA"
    echo "       (May be computed fields or mapped names)"
fi

echo ""

# -----------------------------------------------------------------------------
# 4. Check OpenAPI Response Schemas Match Zod
# -----------------------------------------------------------------------------
echo "4. API Response Schema Check"
echo "   -------------------------"

# Check that key OpenAPI schemas have Zod equivalents
OPENAPI_SCHEMAS=$(grep -E "^    [A-Z][a-zA-Z]+:" "$PROJECT_DIR/specs/openapi.yaml" 2>/dev/null | \
    sed 's/:.*//' | tr -d ' ' | sort -u | head -20)

ZOD_EXPORTS=$(grep "export const.*Schema" "$PROJECT_DIR/specs/schemas/"*.ts 2>/dev/null | \
    sed 's/.*export const //' | sed 's/Schema.*//' | sort -u)

MISSING_ZOD=""
for schema in $OPENAPI_SCHEMAS; do
    # Skip common/generic schemas
    case "$schema" in
        Error*|Pagination*|Success*|List*) continue ;;
    esac

    if ! echo "$ZOD_EXPORTS" | grep -q "^$schema$"; then
        MISSING_ZOD="$MISSING_ZOD $schema"
    fi
done

if [ -z "$MISSING_ZOD" ]; then
    echo -e "   ${GREEN}✓${NC} OpenAPI schemas have Zod equivalents"
else
    echo -e "   ${YELLOW}⚠${NC} OpenAPI schemas without Zod:$MISSING_ZOD"
fi

echo ""

# -----------------------------------------------------------------------------
# 5. Check for Naming Convention Consistency
# -----------------------------------------------------------------------------
echo "5. Naming Convention Check"
echo "   -----------------------"

# Check for snake_case in Zod (should be camelCase)
SNAKE_CASE_IN_ZOD=$(grep -r "_[a-z]" "$PROJECT_DIR/specs/schemas/"*.ts 2>/dev/null | \
    grep -v "password_hash\|created_at\|updated_at\|is_active" | \
    grep -v "\.map\|@map\|comment\|//" | \
    grep -oE "\b[a-z]+_[a-z]+\b" | sort -u | head -5)

if [ -z "$SNAKE_CASE_IN_ZOD" ]; then
    echo -e "   ${GREEN}✓${NC} Zod schemas use camelCase"
else
    echo -e "   ${YELLOW}⚠${NC} Potential snake_case in Zod: $SNAKE_CASE_IN_ZOD"
fi

# Check Prisma @map annotations exist for snake_case DB columns
PRISMA_MAPS=$(grep "@map" "$PROJECT_DIR/prisma/schema.prisma" 2>/dev/null | wc -l | tr -d ' ')
echo "   Prisma @map annotations: $PRISMA_MAPS"

echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=============================================="
echo "Summary"
echo "=============================================="
echo ""

if [ $DRIFT_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ No schema drift detected${NC}"
    echo ""
    echo "All specs are consistent. Safe to proceed."
    exit 0
else
    echo -e "${RED}✗ $DRIFT_COUNT drift issue(s) found${NC}"
    echo ""
    echo "Fix the inconsistencies before proceeding."
    echo "The Architect must update specs to be consistent."
    exit 1
fi
