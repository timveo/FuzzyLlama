#!/bin/bash
# Fast Track Eligibility Check
# Determines if changes are eligible for the Fast Track Protocol
#
# Usage: ./scripts/check-fast-track.sh [base-ref]
#   base-ref: Git reference to compare against (default: HEAD~1)
#
# Exit codes:
#   0 = FAST_TRACK_ELIGIBLE
#   1 = FULL_PROCESS_REQUIRED

set -e

BASE_REF="${1:-HEAD~1}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Checking Fast Track eligibility against: $BASE_REF"
echo ""

# Get changed files
CHANGED_FILES=$(git diff --name-only "$BASE_REF" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}No changes detected${NC}"
    exit 1
fi

echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  /'
echo ""

# Categorize changes
CODE_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)
TEST_FILES=$(echo "$CODE_FILES" | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' || true)
SOURCE_FILES=$(echo "$CODE_FILES" | grep -vE '\.(test|spec)\.(ts|tsx|js|jsx)$' || true)
CSS_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(css|scss|less|sass)$' || true)
DOC_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(md|txt|rst)$' || true)
CONFIG_FILES=$(echo "$CHANGED_FILES" | grep -E '(package\.json|tsconfig|vite\.config|\.env)' || true)
ASSET_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$' || true)

# Check for blockers
BLOCKERS=()

# 1. Check for package.json changes (new dependencies)
if echo "$CHANGED_FILES" | grep -q "package.json"; then
    # Check if dependencies changed
    if git diff "$BASE_REF" -- package.json | grep -qE '^\+.*"(dependencies|devDependencies)"'; then
        BLOCKERS+=("package.json dependencies modified")
    elif git diff "$BASE_REF" -- package.json | grep -qE '^\+.*"[^"]+":.*"[0-9^~]'; then
        BLOCKERS+=("package.json dependencies modified")
    fi
fi

# 2. Check for source code logic changes (not just strings)
if [ -n "$SOURCE_FILES" ]; then
    for file in $SOURCE_FILES; do
        if [ -f "$file" ]; then
            # Get the diff for this file
            DIFF=$(git diff "$BASE_REF" -- "$file" 2>/dev/null || true)

            # Check for actual code changes (not just comments/strings)
            # Remove lines that are only comments or string changes
            LOGIC_LINES=$(echo "$DIFF" | grep -E '^[+-]' | grep -v '^[+-]{3}' | \
                grep -vE '^\+\s*//' | \
                grep -vE '^\+\s*\*' | \
                grep -vE '^\+\s*#' | \
                grep -vE "^\+\s*['\"].*['\"],$" | \
                grep -vE '^\-\s*//' | \
                grep -vE '^\-\s*\*' || true)

            if [ -n "$LOGIC_LINES" ]; then
                # Check if changes are more than just text/label changes
                SIGNIFICANT=$(echo "$LOGIC_LINES" | grep -vE '(className|style|label|text|title|placeholder|aria-|alt=)' || true)
                if [ -n "$SIGNIFICANT" ]; then
                    BLOCKERS+=("Logic changes in $file")
                fi
            fi
        fi
    done
fi

# 3. Check for API/route changes
if [ -n "$SOURCE_FILES" ]; then
    for file in $SOURCE_FILES; do
        if git diff "$BASE_REF" -- "$file" 2>/dev/null | grep -qE '(fetch\(|axios\.|api/|/api|endpoint|route)'; then
            BLOCKERS+=("API/route changes in $file")
        fi
    done
fi

# 4. Check for database/query changes
if [ -n "$SOURCE_FILES" ]; then
    for file in $SOURCE_FILES; do
        if git diff "$BASE_REF" -- "$file" 2>/dev/null | grep -qiE '(query|mutation|prisma\.|select\s|insert\s|update\s|delete\s|from\s)'; then
            BLOCKERS+=("Database/query changes in $file")
        fi
    done
fi

# 5. Check for auth changes
if [ -n "$SOURCE_FILES" ]; then
    for file in $SOURCE_FILES; do
        if git diff "$BASE_REF" -- "$file" 2>/dev/null | grep -qiE '(auth|login|logout|password|token|session|jwt)'; then
            BLOCKERS+=("Authentication changes in $file")
        fi
    done
fi

# Report results
echo "=== Analysis ==="
echo "Source files: $(echo "$SOURCE_FILES" | grep -c . || echo 0)"
echo "CSS files: $(echo "$CSS_FILES" | grep -c . || echo 0)"
echo "Doc files: $(echo "$DOC_FILES" | grep -c . || echo 0)"
echo "Asset files: $(echo "$ASSET_FILES" | grep -c . || echo 0)"
echo "Config files: $(echo "$CONFIG_FILES" | grep -c . || echo 0)"
echo ""

if [ ${#BLOCKERS[@]} -gt 0 ]; then
    echo -e "${RED}=== FULL_PROCESS_REQUIRED ===${NC}"
    echo ""
    echo "Blockers found:"
    for blocker in "${BLOCKERS[@]}"; do
        echo -e "  ${RED}x${NC} $blocker"
    done
    echo ""
    echo "These changes require full gate validation."
    exit 1
fi

# Determine fast track reason
if [ -n "$CSS_FILES" ] && [ -z "$SOURCE_FILES" ]; then
    echo -e "${GREEN}=== FAST_TRACK_ELIGIBLE ===${NC}"
    echo "Reason: CSS-only changes"
    exit 0
fi

if [ -n "$DOC_FILES" ] && [ -z "$SOURCE_FILES" ] && [ -z "$CSS_FILES" ]; then
    echo -e "${GREEN}=== FAST_TRACK_ELIGIBLE ===${NC}"
    echo "Reason: Documentation-only changes"
    exit 0
fi

if [ -n "$ASSET_FILES" ] && [ -z "$SOURCE_FILES" ]; then
    echo -e "${GREEN}=== FAST_TRACK_ELIGIBLE ===${NC}"
    echo "Reason: Asset-only changes"
    exit 0
fi

# If we have source files but no blockers, they might be text-only changes
if [ -n "$SOURCE_FILES" ]; then
    echo -e "${GREEN}=== FAST_TRACK_ELIGIBLE ===${NC}"
    echo "Reason: Text/label-only code changes (no logic impact)"
    exit 0
fi

# Default: require full process for safety
echo -e "${YELLOW}=== FULL_PROCESS_REQUIRED ===${NC}"
echo "Reason: Unable to determine change type - defaulting to full process"
exit 1
