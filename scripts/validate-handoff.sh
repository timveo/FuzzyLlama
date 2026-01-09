#!/bin/bash
# =============================================================================
# Handoff Validation Script
# =============================================================================
# Validates agent handoff JSON against the schema
#
# Usage:
#   ./scripts/validate-handoff.sh <handoff.json>
#   ./scripts/validate-handoff.sh --inline '<json-string>'
#
# Exit codes:
#   0 - Validation passed
#   1 - Validation failed
#   2 - Missing dependencies or invalid usage
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR_SCRIPT="$SCRIPT_DIR/lib/validate-handoff.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_usage() {
    echo "Usage: $0 <handoff.json>"
    echo "       $0 --inline '<json-string>'"
    echo ""
    echo "Options:"
    echo "  --inline    Validate JSON passed as a string argument"
    echo "  --format    Output format: text (default), json, markdown"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/handoff.json"
    echo "  $0 --inline '{\"handoff\":{\"agent\":\"Test\"}}'"
    echo "  $0 --format markdown /path/to/handoff.json"
}

check_dependencies() {
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is required but not installed.${NC}"
        exit 2
    fi

    # Check if validator script exists
    if [ ! -f "$VALIDATOR_SCRIPT" ]; then
        echo -e "${RED}Error: Validator script not found at $VALIDATOR_SCRIPT${NC}"
        exit 2
    fi
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

INPUT_MODE="file"
INPUT_DATA=""
FORMAT="text"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            print_usage
            exit 0
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --inline)
            INPUT_MODE="inline"
            INPUT_DATA="$2"
            shift 2
            ;;
        *)
            if [ -z "$INPUT_DATA" ] && [ "$INPUT_MODE" == "file" ]; then
                INPUT_DATA="$1"
            fi
            shift
            ;;
    esac
done

# Check dependencies
check_dependencies

# Handle input
if [ "$INPUT_MODE" == "file" ]; then
    if [ -z "$INPUT_DATA" ]; then
        echo -e "${RED}Error: No input file specified${NC}"
        print_usage
        exit 2
    fi
    if [ ! -f "$INPUT_DATA" ]; then
        echo -e "${RED}Error: File not found: $INPUT_DATA${NC}"
        exit 2
    fi

    # Run validator
    node "$VALIDATOR_SCRIPT" --format "$FORMAT" "$INPUT_DATA"
    exit $?
else
    # Inline JSON - write to temp file
    TEMP_FILE=$(mktemp)
    echo "$INPUT_DATA" > "$TEMP_FILE"

    # Run validator
    node "$VALIDATOR_SCRIPT" --format "$FORMAT" "$TEMP_FILE"
    EXIT_CODE=$?

    # Cleanup
    rm -f "$TEMP_FILE"
    exit $EXIT_CODE
fi
