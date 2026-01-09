#!/bin/bash
# =============================================================================
# Master Validation Script
# =============================================================================
#
# PURPOSE: Single entry point for all validation tasks in the agent system.
# This consolidates multiple validation scripts into one unified interface.
#
# USAGE:
#   ./scripts/validate-all.sh [command] [options]
#
# COMMANDS:
#   project <path> [gate]   - Validate a project at a specific gate
#   handoff <file>          - Validate a handoff JSON file
#   specs <path>            - Validate spec files (OpenAPI, Prisma, Zod)
#   tools <path>            - Validate standard tooling compliance
#   security <path>         - Run comprehensive security scan
#   all <path>              - Run all validations
#   help                    - Show this help message
#
# EXAMPLES:
#   ./scripts/validate-all.sh project /path/to/project g5.1
#   ./scripts/validate-all.sh handoff /path/to/handoff.json
#   ./scripts/validate-all.sh all /path/to/project
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  project <path> [gate]   Validate a project at a specific gate"
    echo "                          Gates: startup, g1-g9, full, complete"
    echo "  handoff <file>          Validate a handoff JSON file"
    echo "  specs <path>            Validate spec files (OpenAPI, Prisma, Zod)"
    echo "  tools <path>            Validate standard tooling compliance"
    echo "  security <path>         Run comprehensive security scan"
    echo "  coverage <path>         Check test coverage"
    echo "  all <path>              Run all validations"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 project ./my-app g5.1"
    echo "  $0 handoff ./docs/handoff.json"
    echo "  $0 all ./my-app"
    echo ""
    echo "For detailed gate validation options, see:"
    echo "  ./scripts/validate-project.sh --help"
}

# Check if validate-project.sh exists
check_project_validator() {
    if [ ! -f "$SCRIPT_DIR/validate-project.sh" ]; then
        echo -e "${RED}Error: validate-project.sh not found${NC}"
        exit 1
    fi
}

# Check if validate-specs.sh exists
check_specs_validator() {
    if [ ! -f "$SCRIPT_DIR/validate-specs.sh" ]; then
        echo -e "${RED}Error: validate-specs.sh not found${NC}"
        exit 1
    fi
}

# Check if validate-handoff.sh exists
check_handoff_validator() {
    if [ ! -f "$SCRIPT_DIR/validate-handoff.sh" ]; then
        echo -e "${RED}Error: validate-handoff.sh not found${NC}"
        exit 1
    fi
}

# Main command handling
COMMAND="${1:-help}"

case $COMMAND in
    project)
        check_project_validator
        PROJECT_PATH="${2:-.}"
        GATE="${3:-full}"
        print_header "Project Validation: $PROJECT_PATH (Gate: $GATE)"
        "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" "$GATE"
        ;;

    handoff)
        check_handoff_validator
        HANDOFF_FILE="${2}"
        if [ -z "$HANDOFF_FILE" ]; then
            echo -e "${RED}Error: Handoff file required${NC}"
            echo "Usage: $0 handoff <file>"
            exit 1
        fi
        print_header "Handoff Validation: $HANDOFF_FILE"
        "$SCRIPT_DIR/validate-handoff.sh" "$HANDOFF_FILE"
        ;;

    specs)
        check_specs_validator
        PROJECT_PATH="${2:-.}"
        print_header "Spec Validation: $PROJECT_PATH"
        "$SCRIPT_DIR/validate-specs.sh" "$PROJECT_PATH"
        ;;

    tools)
        check_project_validator
        PROJECT_PATH="${2:-.}"
        print_header "Tool Enforcement: $PROJECT_PATH"
        "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" tools
        ;;

    security)
        check_project_validator
        PROJECT_PATH="${2:-.}"
        print_header "Security Scan: $PROJECT_PATH"
        "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" security-full
        ;;

    coverage)
        check_project_validator
        PROJECT_PATH="${2:-.}"
        print_header "Test Coverage: $PROJECT_PATH"
        "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" coverage
        ;;

    all)
        PROJECT_PATH="${2:-.}"
        print_header "Full Validation Suite: $PROJECT_PATH"

        TOTAL_ERRORS=0

        # 1. Project structure
        echo -e "${YELLOW}>>> Running project validation...${NC}"
        check_project_validator
        if ! "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" full; then
            ((TOTAL_ERRORS++))
        fi

        # 2. Specs (if they exist)
        if [ -d "$PROJECT_PATH/specs" ] || [ -f "$PROJECT_PATH/prisma/schema.prisma" ]; then
            echo ""
            echo -e "${YELLOW}>>> Running spec validation...${NC}"
            check_specs_validator
            if ! "$SCRIPT_DIR/validate-specs.sh" "$PROJECT_PATH"; then
                ((TOTAL_ERRORS++))
            fi
        fi

        # 3. Tools
        echo ""
        echo -e "${YELLOW}>>> Running tool enforcement...${NC}"
        if ! "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" tools 2>/dev/null; then
            ((TOTAL_ERRORS++))
        fi

        # 4. Security
        echo ""
        echo -e "${YELLOW}>>> Running security scan...${NC}"
        if ! "$SCRIPT_DIR/validate-project.sh" "$PROJECT_PATH" security-full 2>/dev/null; then
            ((TOTAL_ERRORS++))
        fi

        # Summary
        echo ""
        print_header "Validation Summary"
        if [ $TOTAL_ERRORS -eq 0 ]; then
            echo -e "${GREEN}All validations passed!${NC}"
            exit 0
        else
            echo -e "${RED}$TOTAL_ERRORS validation(s) failed${NC}"
            exit 1
        fi
        ;;

    help|--help|-h)
        print_usage
        exit 0
        ;;

    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
