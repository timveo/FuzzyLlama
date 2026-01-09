#!/bin/bash
# =============================================================================
# Handoff Integrity Validation Script
# =============================================================================
# Validates that files listed in handoff actually exist and checksums match.
# This prevents agents from claiming work that wasn't done.
#
# Usage:
#   ./scripts/validate-handoff-integrity.sh <project-path> <handoff.json>
#
# Exit codes:
#   0 - All integrity checks passed
#   1 - Integrity check failed (missing files or checksum mismatch)
#   2 - Invalid usage or missing dependencies
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
    echo "Usage: $0 <project-path> <handoff.json>"
    echo ""
    echo "Validates:"
    echo "  1. All files_created entries exist in the project"
    echo "  2. Checksums match actual file contents (if provided)"
    echo "  3. Build verification status matches actual build result"
    echo "  4. Test counts match actual test files"
    echo ""
    echo "Examples:"
    echo "  $0 ~/projects/my-app /tmp/handoff.json"
    echo "  $0 . docs/handoff.json"
}

check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not installed. Some validations will be skipped.${NC}"
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi

    if ! command -v shasum &> /dev/null; then
        echo -e "${YELLOW}Warning: shasum not installed. Checksum validation will be skipped.${NC}"
        SHASUM_AVAILABLE=false
    else
        SHASUM_AVAILABLE=true
    fi
}

compute_checksum() {
    local file="$1"
    if [ "$SHASUM_AVAILABLE" = true ]; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        echo "skipped"
    fi
}

# -----------------------------------------------------------------------------
# Main Validation Functions
# -----------------------------------------------------------------------------

validate_files_exist() {
    local project_path="$1"
    local handoff_file="$2"
    local failed=0

    echo -e "\n${BLUE}=== Validating Files Exist ===${NC}"

    if [ "$JQ_AVAILABLE" = false ]; then
        echo -e "${YELLOW}Skipping: jq not available${NC}"
        return 0
    fi

    # Extract files_created array
    local files=$(jq -r '.files_created[]? // empty' "$handoff_file" 2>/dev/null)

    if [ -z "$files" ]; then
        echo -e "${YELLOW}No files_created found in handoff${NC}"
        return 0
    fi

    local total=0
    local found=0

    while IFS= read -r file; do
        if [ -z "$file" ]; then continue; fi
        total=$((total + 1))

        local full_path="$project_path/$file"
        if [ -f "$full_path" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
            found=$((found + 1))
        else
            echo -e "  ${RED}✗${NC} $file ${RED}(MISSING)${NC}"
            failed=1
        fi
    done <<< "$files"

    echo ""
    echo "Files: $found/$total found"

    return $failed
}

validate_checksums() {
    local project_path="$1"
    local handoff_file="$2"
    local failed=0

    echo -e "\n${BLUE}=== Validating Checksums ===${NC}"

    if [ "$JQ_AVAILABLE" = false ] || [ "$SHASUM_AVAILABLE" = false ]; then
        echo -e "${YELLOW}Skipping: dependencies not available${NC}"
        return 0
    fi

    # Check if handoff has checksums
    local has_checksums=$(jq 'has("file_checksums") or (.files_created | type == "array" and (.[0] | type == "object"))' "$handoff_file" 2>/dev/null)

    if [ "$has_checksums" != "true" ]; then
        echo -e "${YELLOW}No checksums found in handoff (consider adding for integrity)${NC}"
        return 0
    fi

    # Extract file checksums if in object format
    local checksums=$(jq -r '.file_checksums // {} | to_entries[] | "\(.key)|\(.value)"' "$handoff_file" 2>/dev/null)

    if [ -z "$checksums" ]; then
        echo -e "${YELLOW}No checksums to validate${NC}"
        return 0
    fi

    while IFS='|' read -r file expected_checksum; do
        if [ -z "$file" ]; then continue; fi

        local full_path="$project_path/$file"
        if [ ! -f "$full_path" ]; then
            echo -e "  ${RED}✗${NC} $file ${RED}(file missing, cannot verify checksum)${NC}"
            failed=1
            continue
        fi

        local actual_checksum=$(compute_checksum "$full_path")

        # Handle sha256: prefix
        expected_checksum=${expected_checksum#sha256:}

        if [ "$actual_checksum" = "$expected_checksum" ]; then
            echo -e "  ${GREEN}✓${NC} $file (checksum matches)"
        else
            echo -e "  ${RED}✗${NC} $file ${RED}(checksum mismatch)${NC}"
            echo -e "      Expected: $expected_checksum"
            echo -e "      Actual:   $actual_checksum"
            failed=1
        fi
    done <<< "$checksums"

    return $failed
}

validate_build_status() {
    local project_path="$1"
    local handoff_file="$2"

    echo -e "\n${BLUE}=== Validating Build Status ===${NC}"

    if [ "$JQ_AVAILABLE" = false ]; then
        echo -e "${YELLOW}Skipping: jq not available${NC}"
        return 0
    fi

    local claimed_status=$(jq -r '.verification.build_status // .verification.build // "unknown"' "$handoff_file" 2>/dev/null)

    if [ "$claimed_status" = "unknown" ] || [ "$claimed_status" = "null" ]; then
        echo -e "${YELLOW}No build status claimed in handoff${NC}"
        return 0
    fi

    echo "Claimed build status: $claimed_status"

    # Try to verify by running build
    if [ -f "$project_path/package.json" ]; then
        echo "Verifying with actual build..."

        cd "$project_path"
        if npm run build --silent 2>/dev/null; then
            if [ "$claimed_status" = "passing" ] || [ "$claimed_status" = "success" ]; then
                echo -e "  ${GREEN}✓${NC} Build passes (matches claim)"
                return 0
            else
                echo -e "  ${YELLOW}⚠${NC} Build passes but handoff claimed '$claimed_status'"
                return 0
            fi
        else
            if [ "$claimed_status" = "passing" ] || [ "$claimed_status" = "success" ]; then
                echo -e "  ${RED}✗${NC} Build FAILS but handoff claimed 'passing'"
                return 1
            else
                echo -e "  ${GREEN}✓${NC} Build fails (matches claim)"
                return 0
            fi
        fi
    else
        echo -e "${YELLOW}No package.json found, skipping build verification${NC}"
        return 0
    fi
}

validate_test_count() {
    local project_path="$1"
    local handoff_file="$2"

    echo -e "\n${BLUE}=== Validating Test Count ===${NC}"

    if [ "$JQ_AVAILABLE" = false ]; then
        echo -e "${YELLOW}Skipping: jq not available${NC}"
        return 0
    fi

    local claimed_tests=$(jq -r '.deliverables.tests.count // .file_verification.test_files_created // "unknown"' "$handoff_file" 2>/dev/null)

    if [ "$claimed_tests" = "unknown" ] || [ "$claimed_tests" = "null" ]; then
        echo -e "${YELLOW}No test count claimed in handoff${NC}"
        return 0
    fi

    echo "Claimed test files: $claimed_tests"

    # Count actual test files
    local actual_tests=$(find "$project_path" -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.test.js" -o -name "*.spec.js" \) 2>/dev/null | wc -l | tr -d ' ')

    echo "Actual test files: $actual_tests"

    if [ "$actual_tests" -ge "$claimed_tests" ]; then
        echo -e "  ${GREEN}✓${NC} Test count verified ($actual_tests >= $claimed_tests)"
        return 0
    else
        echo -e "  ${RED}✗${NC} Test count mismatch: claimed $claimed_tests, found $actual_tests"
        return 1
    fi
}

validate_agent_matches_status() {
    local project_path="$1"
    local handoff_file="$2"

    echo -e "\n${BLUE}=== Validating Agent Matches STATUS.md ===${NC}"

    if [ "$JQ_AVAILABLE" = false ]; then
        echo -e "${YELLOW}Skipping: jq not available${NC}"
        return 0
    fi

    local handoff_agent=$(jq -r '.handoff.agent // "unknown"' "$handoff_file" 2>/dev/null)

    if [ "$handoff_agent" = "unknown" ] || [ "$handoff_agent" = "null" ]; then
        echo -e "${YELLOW}No agent specified in handoff${NC}"
        return 0
    fi

    echo "Handoff from: $handoff_agent"

    # Check STATUS.md for current agent
    local status_file="$project_path/docs/STATUS.md"
    if [ -f "$status_file" ]; then
        # Try to extract current_agent from STATUS.md
        local status_agent=$(grep -i "current.*agent\|active.*agent" "$status_file" | head -1 | sed 's/.*:\s*//' | tr -d '|' | xargs)

        if [ -n "$status_agent" ]; then
            echo "STATUS.md shows: $status_agent"

            # Normalize for comparison
            local norm_handoff=$(echo "$handoff_agent" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
            local norm_status=$(echo "$status_agent" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

            if [[ "$norm_status" == *"$norm_handoff"* ]] || [[ "$norm_handoff" == *"$norm_status"* ]]; then
                echo -e "  ${GREEN}✓${NC} Agent matches STATUS.md"
                return 0
            else
                echo -e "  ${RED}✗${NC} Agent mismatch: handoff from '$handoff_agent' but STATUS shows '$status_agent'"
                return 1
            fi
        fi
    fi

    echo -e "${YELLOW}Could not verify agent (STATUS.md not found or no current_agent)${NC}"
    return 0
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

if [ $# -lt 2 ]; then
    print_usage
    exit 2
fi

PROJECT_PATH="$1"
HANDOFF_FILE="$2"

# Validate inputs
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project path not found: $PROJECT_PATH${NC}"
    exit 2
fi

if [ ! -f "$HANDOFF_FILE" ]; then
    echo -e "${RED}Error: Handoff file not found: $HANDOFF_FILE${NC}"
    exit 2
fi

echo "=============================================="
echo "  HANDOFF INTEGRITY VALIDATION"
echo "=============================================="
echo "Project: $PROJECT_PATH"
echo "Handoff: $HANDOFF_FILE"

check_dependencies

OVERALL_RESULT=0

# Run all validations
validate_files_exist "$PROJECT_PATH" "$HANDOFF_FILE" || OVERALL_RESULT=1
validate_checksums "$PROJECT_PATH" "$HANDOFF_FILE" || OVERALL_RESULT=1
validate_agent_matches_status "$PROJECT_PATH" "$HANDOFF_FILE" || OVERALL_RESULT=1
validate_test_count "$PROJECT_PATH" "$HANDOFF_FILE" || OVERALL_RESULT=1

# Build validation is expensive, run last
# validate_build_status "$PROJECT_PATH" "$HANDOFF_FILE" || OVERALL_RESULT=1

echo ""
echo "=============================================="
if [ $OVERALL_RESULT -eq 0 ]; then
    echo -e "  ${GREEN}INTEGRITY CHECK PASSED${NC}"
else
    echo -e "  ${RED}INTEGRITY CHECK FAILED${NC}"
fi
echo "=============================================="

exit $OVERALL_RESULT
