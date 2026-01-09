#!/bin/bash
# verify-proofs.sh
# Verify proof artifacts exist and have valid integrity before gate approval
#
# Usage:
#   ./scripts/verify-proofs.sh [project_path] [gate]
#
# Examples:
#   ./scripts/verify-proofs.sh /path/to/project G5
#   ./scripts/verify-proofs.sh . all
#   ./scripts/verify-proofs.sh  # defaults to current dir, all gates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_PATH="${1:-.}"
GATE="${2:-all}"

PROOF_DIR="$PROJECT_PATH/.truth/proofs"
TRUTH_FILE="$PROJECT_PATH/.truth/truth.json"

# Gate proof requirements (mirrors GATE_PROOF_REQUIREMENTS from proof-artifacts.ts)
declare -A GATE_REQUIREMENTS
GATE_REQUIREMENTS[G3]="spec_validation"
GATE_REQUIREMENTS[G5]="build_output lint_output test_output"
GATE_REQUIREMENTS[G6]="test_output coverage_report accessibility_scan lighthouse_report"
GATE_REQUIREMENTS[G7]="security_scan lint_output"
GATE_REQUIREMENTS[G8]="build_output deployment_log"
GATE_REQUIREMENTS[G9]="deployment_log smoke_test"

echo "=============================================="
echo "  Proof Artifact Verification"
echo "=============================================="
echo ""
echo "Project: $PROJECT_PATH"
echo "Gate: $GATE"
echo ""

# Check if proof directory exists
if [ ! -d "$PROOF_DIR" ]; then
    echo -e "${RED}ERROR: Proof directory not found: $PROOF_DIR${NC}"
    echo "Run proof-generating commands first (e.g., capture_command_output)"
    exit 1
fi

# Function to verify a single gate
verify_gate() {
    local gate=$1
    local requirements="${GATE_REQUIREMENTS[$gate]}"

    if [ -z "$requirements" ]; then
        echo -e "${YELLOW}Gate $gate has no required proofs${NC}"
        return 0
    fi

    echo "Gate $gate:"
    echo "  Required: $requirements"

    local gate_dir="$PROOF_DIR/$gate"
    local missing=()
    local found=()

    # Check each required proof type
    for proof_type in $requirements; do
        # Look for files matching the proof type
        if ls "$gate_dir"/*"$proof_type"* 1> /dev/null 2>&1; then
            found+=("$proof_type")
        elif ls "$gate_dir"/*"${proof_type//_/-}"* 1> /dev/null 2>&1; then
            found+=("$proof_type")
        else
            missing+=("$proof_type")
        fi
    done

    # Report findings
    if [ ${#found[@]} -gt 0 ]; then
        echo -e "  ${GREEN}Found:${NC} ${found[*]}"
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "  ${RED}Missing:${NC} ${missing[*]}"
        return 1
    fi

    echo -e "  ${GREEN}Status: All required proofs present${NC}"
    return 0
}

# Function to verify proof integrity using SHA256 hashes
verify_integrity() {
    local gate=$1
    local gate_dir="$PROOF_DIR/$gate"

    if [ ! -d "$gate_dir" ]; then
        return 0
    fi

    echo ""
    echo "Verifying integrity for $gate..."

    local all_valid=true

    for file in "$gate_dir"/*; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local current_hash=$(sha256sum "$file" | cut -d' ' -f1)

            # Check against stored hash in truth.json if available
            if [ -f "$TRUTH_FILE" ]; then
                local stored_hash=$(jq -r ".proof_artifacts[] | select(.file_path | contains(\"$filename\")) | .file_hash" "$TRUTH_FILE" 2>/dev/null || echo "")

                if [ -n "$stored_hash" ] && [ "$stored_hash" != "null" ]; then
                    if [ "$current_hash" == "$stored_hash" ]; then
                        echo -e "  ${GREEN}VALID${NC}: $filename"
                    else
                        echo -e "  ${RED}TAMPERED${NC}: $filename"
                        echo "    Stored:  $stored_hash"
                        echo "    Current: $current_hash"
                        all_valid=false
                    fi
                else
                    echo -e "  ${YELLOW}UNTRACKED${NC}: $filename (hash: ${current_hash:0:16}...)"
                fi
            else
                echo -e "  ${YELLOW}PRESENT${NC}: $filename (hash: ${current_hash:0:16}...)"
            fi
        fi
    done

    if [ "$all_valid" = false ]; then
        return 1
    fi
    return 0
}

# Main verification logic
overall_status=0

if [ "$GATE" = "all" ]; then
    GATES=("G3" "G5" "G6" "G7" "G8" "G9")
else
    GATES=("$GATE")
fi

for gate in "${GATES[@]}"; do
    echo ""
    echo "=============================================="

    if ! verify_gate "$gate"; then
        overall_status=1
    fi

    if ! verify_integrity "$gate"; then
        overall_status=1
    fi
done

echo ""
echo "=============================================="

if [ $overall_status -eq 0 ]; then
    echo -e "${GREEN}All proof verifications PASSED${NC}"
else
    echo -e "${RED}Some proof verifications FAILED${NC}"
    echo ""
    echo "To generate missing proofs, use:"
    echo "  - capture_command_output() MCP tool for command-based proofs"
    echo "  - submit_proof_artifact() MCP tool for file-based proofs"
    echo "  - validate_specs_for_g3() MCP tool for G3 spec validation"
fi

exit $overall_status
