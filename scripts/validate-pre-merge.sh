#!/bin/bash
# =============================================================================
# Pre-Merge Conflict Detection Script
# =============================================================================
# Detects merge conflicts BEFORE accepting parallel agent handoffs.
# Creates a test-merge branch, attempts merge, runs verification, then cleans up.
#
# Usage:
#   ./scripts/validate-pre-merge.sh <project-path> <source-branch> [target-branch]
#
# Examples:
#   ./scripts/validate-pre-merge.sh ~/projects/my-app feature/frontend main
#   ./scripts/validate-pre-merge.sh . feature/backend  # defaults target to main
#
# Exit codes:
#   0 - Merge would succeed and build passes
#   1 - Merge conflicts detected
#   2 - Build fails after merge
#   3 - Invalid usage or missing dependencies
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_usage() {
    echo "Usage: $0 <project-path> <source-branch> [target-branch]"
    echo ""
    echo "Arguments:"
    echo "  project-path   Path to the git repository"
    echo "  source-branch  Branch to merge FROM (agent's work branch)"
    echo "  target-branch  Branch to merge INTO (default: main)"
    echo ""
    echo "Examples:"
    echo "  $0 ~/projects/my-app feature/frontend main"
    echo "  $0 . feature/backend-api"
}

cleanup() {
    local project_path="$1"
    local original_branch="$2"
    local test_branch="$3"

    cd "$project_path"

    # Return to original branch
    git checkout "$original_branch" 2>/dev/null || true

    # Delete test merge branch
    git branch -D "$test_branch" 2>/dev/null || true

    # Clean up any merge state
    git merge --abort 2>/dev/null || true
}

# -----------------------------------------------------------------------------
# Main Validation Functions
# -----------------------------------------------------------------------------

validate_branches_exist() {
    local project_path="$1"
    local source_branch="$2"
    local target_branch="$3"

    cd "$project_path"

    # Fetch latest to ensure we have all branches
    git fetch --all --quiet 2>/dev/null || true

    if ! git rev-parse --verify "$source_branch" &>/dev/null; then
        # Try with origin prefix
        if ! git rev-parse --verify "origin/$source_branch" &>/dev/null; then
            echo -e "${RED}Error: Source branch '$source_branch' not found${NC}"
            return 1
        fi
    fi

    if ! git rev-parse --verify "$target_branch" &>/dev/null; then
        if ! git rev-parse --verify "origin/$target_branch" &>/dev/null; then
            echo -e "${RED}Error: Target branch '$target_branch' not found${NC}"
            return 1
        fi
    fi

    return 0
}

attempt_test_merge() {
    local project_path="$1"
    local source_branch="$2"
    local target_branch="$3"
    local test_branch="$4"

    cd "$project_path"

    echo -e "\n${BLUE}=== Creating Test Merge Branch ===${NC}"
    echo "Creating $test_branch from $target_branch..."

    # Create test branch from target
    git checkout -b "$test_branch" "$target_branch" 2>/dev/null || \
    git checkout -b "$test_branch" "origin/$target_branch"

    echo -e "\n${BLUE}=== Attempting Merge ===${NC}"
    echo "Merging $source_branch into $test_branch..."

    # Attempt the merge
    if git merge "$source_branch" --no-edit 2>&1; then
        echo -e "${GREEN}✓ Merge completed without conflicts${NC}"
        return 0
    else
        echo -e "${RED}✗ Merge conflicts detected${NC}"

        # Show conflict details
        echo -e "\n${YELLOW}Conflicting files:${NC}"
        git diff --name-only --diff-filter=U 2>/dev/null || true

        return 1
    fi
}

verify_build_after_merge() {
    local project_path="$1"

    cd "$project_path"

    echo -e "\n${BLUE}=== Verifying Build After Merge ===${NC}"

    # Check for package.json
    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}No package.json found, skipping build verification${NC}"
        return 0
    fi

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install --silent 2>/dev/null || {
            echo -e "${RED}✗ npm install failed${NC}"
            return 1
        }
    fi

    # Run build
    echo "Running build..."
    if npm run build --silent 2>&1; then
        echo -e "${GREEN}✓ Build passes after merge${NC}"
    else
        echo -e "${RED}✗ Build FAILS after merge${NC}"
        return 1
    fi

    # Run tests
    echo "Running tests..."
    if npm test --silent 2>&1; then
        echo -e "${GREEN}✓ Tests pass after merge${NC}"
    else
        echo -e "${RED}✗ Tests FAIL after merge${NC}"
        return 1
    fi

    # Run lint
    echo "Running lint..."
    if npm run lint --silent 2>&1; then
        echo -e "${GREEN}✓ Lint passes after merge${NC}"
    else
        echo -e "${YELLOW}⚠ Lint has warnings/errors (non-blocking)${NC}"
    fi

    return 0
}

check_for_parallel_conflicts() {
    local project_path="$1"
    local source_branch="$2"

    cd "$project_path"

    echo -e "\n${BLUE}=== Checking for Parallel Branch Conflicts ===${NC}"

    # Find all feature branches that might conflict
    local feature_branches=$(git branch -r | grep -E "feature/|feat/" | grep -v "$source_branch" | head -5)

    if [ -z "$feature_branches" ]; then
        echo "No other feature branches found"
        return 0
    fi

    echo "Other feature branches that might conflict:"
    local conflicts_found=0

    while IFS= read -r branch; do
        branch=$(echo "$branch" | xargs)  # trim whitespace
        if [ -z "$branch" ]; then continue; fi

        # Check for overlapping file changes
        local source_files=$(git diff --name-only "$source_branch"...HEAD 2>/dev/null || true)
        local branch_files=$(git diff --name-only "$branch"...HEAD 2>/dev/null || true)

        # Find common files
        local common=$(comm -12 <(echo "$source_files" | sort) <(echo "$branch_files" | sort) 2>/dev/null | head -5)

        if [ -n "$common" ]; then
            echo -e "  ${YELLOW}⚠${NC} $branch modifies same files:"
            echo "$common" | sed 's/^/      /'
            conflicts_found=1
        else
            echo -e "  ${GREEN}✓${NC} $branch - no overlap"
        fi
    done <<< "$feature_branches"

    if [ $conflicts_found -eq 1 ]; then
        echo -e "\n${YELLOW}Warning: Potential merge conflicts with parallel branches${NC}"
        echo "Consider coordinating with other agents before merging."
    fi

    return 0
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

if [ $# -lt 2 ]; then
    print_usage
    exit 3
fi

PROJECT_PATH="$1"
SOURCE_BRANCH="$2"
TARGET_BRANCH="${3:-main}"
TEST_BRANCH="test-merge-$(date +%s)"

# Validate inputs
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project path not found: $PROJECT_PATH${NC}"
    exit 3
fi

if [ ! -d "$PROJECT_PATH/.git" ]; then
    echo -e "${RED}Error: Not a git repository: $PROJECT_PATH${NC}"
    exit 3
fi

cd "$PROJECT_PATH"
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "=============================================="
echo "  PRE-MERGE CONFLICT DETECTION"
echo "=============================================="
echo "Project: $PROJECT_PATH"
echo "Source:  $SOURCE_BRANCH"
echo "Target:  $TARGET_BRANCH"
echo "Test:    $TEST_BRANCH"

# Set up cleanup trap
trap "cleanup '$PROJECT_PATH' '$ORIGINAL_BRANCH' '$TEST_BRANCH'" EXIT

OVERALL_RESULT=0

# Validate branches exist
if ! validate_branches_exist "$PROJECT_PATH" "$SOURCE_BRANCH" "$TARGET_BRANCH"; then
    exit 3
fi

# Check for parallel conflicts first
check_for_parallel_conflicts "$PROJECT_PATH" "$SOURCE_BRANCH"

# Attempt test merge
if ! attempt_test_merge "$PROJECT_PATH" "$SOURCE_BRANCH" "$TARGET_BRANCH" "$TEST_BRANCH"; then
    OVERALL_RESULT=1
else
    # Only verify build if merge succeeded
    if ! verify_build_after_merge "$PROJECT_PATH"; then
        OVERALL_RESULT=2
    fi
fi

echo ""
echo "=============================================="
if [ $OVERALL_RESULT -eq 0 ]; then
    echo -e "  ${GREEN}PRE-MERGE CHECK PASSED${NC}"
    echo "  Safe to accept handoff and merge."
elif [ $OVERALL_RESULT -eq 1 ]; then
    echo -e "  ${RED}MERGE CONFLICTS DETECTED${NC}"
    echo "  Resolve conflicts before accepting handoff."
else
    echo -e "  ${RED}BUILD FAILS AFTER MERGE${NC}"
    echo "  Code changes break the build when combined."
fi
echo "=============================================="

exit $OVERALL_RESULT
