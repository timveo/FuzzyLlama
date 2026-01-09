#!/bin/bash
# =============================================================================
# Spec Immutability Enforcement Script
# =============================================================================
#
# PURPOSE: Prevents modification of locked spec files after G3 approval.
# This script is called by pre-commit hooks to enforce spec-first discipline.
#
# USAGE: ./scripts/enforce-spec-immutability.sh [project-dir]
#
# HOW LOCKING WORKS:
# After G3 approval, the orchestrator calls `lock_specs()` MCP tool which sets:
#   .truth/truth.json -> specs.locked = true (with locked_at and locked_by)
#
# This script:
# 1. Checks if .truth/truth.json has specs.locked = true
# 2. If locked, verifies no staged changes touch spec files
# 3. If spec files are modified, BLOCKS the commit
#
# Exit codes:
#   0 - No spec files modified OR specs not locked yet
#   1 - Spec files modified while locked (BLOCKED)
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
TRUTH_FILE="$PROJECT_DIR/.truth/truth.json"

echo "=============================================="
echo "Spec Immutability Check"
echo "=============================================="

# -----------------------------------------------------------------------------
# Check if specs are locked (uses TruthStore - single source of truth)
# -----------------------------------------------------------------------------
if [ ! -f "$TRUTH_FILE" ]; then
    echo -e "${YELLOW}No TruthStore found${NC} (project not initialized)"
    echo "Spec modifications allowed - no TruthStore active."
    exit 0
fi

# Parse specs.locked from truth.json using grep/sed (portable, no jq dependency)
# Look for "specs" object containing "locked": true
SPECS_LOCKED=$(grep -A 10 '"specs"' "$TRUTH_FILE" 2>/dev/null | grep -o '"locked"[[:space:]]*:[[:space:]]*true' | head -1 || true)

if [ -z "$SPECS_LOCKED" ]; then
    echo -e "${YELLOW}Specs not locked${NC} (G3 not yet approved)"
    echo "Spec modifications allowed during design phase."
    exit 0
fi

# Extract locked_by for audit trail
LOCKED_BY=$(grep -A 10 '"specs"' "$TRUTH_FILE" 2>/dev/null | grep -o '"locked_by"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:\s*"\([^"]*\)".*/\1/' || echo "G3")

echo -e "${BLUE}Specs are LOCKED${NC} (locked by: $LOCKED_BY)"
echo ""

# -----------------------------------------------------------------------------
# Define protected spec files (patterns)
# -----------------------------------------------------------------------------
PROTECTED_PATTERNS=(
    "specs/openapi.yaml"
    "specs/openapi.yml"
    "specs/database-schema.json"
    "specs/schemas/"
    "prisma/schema.prisma"
    "src/models/__init__.py"
    "src/models/*.py"
)

# -----------------------------------------------------------------------------
# Get staged files
# -----------------------------------------------------------------------------
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}No files staged${NC}"
    exit 0
fi

# -----------------------------------------------------------------------------
# Check for protected file modifications
# -----------------------------------------------------------------------------
VIOLATIONS=""

for file in $STAGED_FILES; do
    for pattern in "${PROTECTED_PATTERNS[@]}"; do
        # Handle glob patterns
        if [[ "$pattern" == *"*"* ]]; then
            # Convert glob to regex for matching
            regex_pattern=$(echo "$pattern" | sed 's/\*/[^\/]*/g')
            if [[ "$file" =~ $regex_pattern ]]; then
                VIOLATIONS="$VIOLATIONS$file\n"
                break
            fi
        elif [[ "$pattern" == *"/"* && "$pattern" != *"." ]]; then
            # Directory pattern (ends with /)
            if [[ "$file" == "$pattern"* ]]; then
                VIOLATIONS="$VIOLATIONS$file\n"
                break
            fi
        else
            # Exact file match
            if [ "$file" = "$pattern" ]; then
                VIOLATIONS="$VIOLATIONS$file\n"
                break
            fi
        fi
    done
done

# -----------------------------------------------------------------------------
# Report results
# -----------------------------------------------------------------------------
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}BLOCKED: Spec files modified while locked!${NC}"
    echo ""
    echo "The following locked spec files have changes:"
    echo -e "$VIOLATIONS"
    echo ""
    echo "=============================================="
    echo -e "${RED}SPEC-FIRST PROTOCOL VIOLATION${NC}"
    echo "=============================================="
    echo ""
    echo "Specs were locked after G3 approval. To modify specs:"
    echo ""
    echo "1. Submit a formal change request"
    echo "2. Get user approval for spec changes"
    echo "3. Unlock specs with: unlock_specs() MCP tool"
    echo "4. Make changes"
    echo "5. Re-validate all specs"
    echo "6. Re-lock specs"
    echo ""
    echo "To bypass (NOT RECOMMENDED - creates audit trail):"
    echo "  git commit --no-verify -m 'SPEC_OVERRIDE: <reason>'"
    echo ""
    exit 1
else
    echo -e "${GREEN}No locked spec files modified${NC}"
    echo ""
    echo "Staged files do not include locked specifications."
    exit 0
fi
