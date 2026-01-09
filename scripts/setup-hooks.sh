#!/bin/bash
# Setup script for Git hooks in Multi-Agent Framework projects
#
# Usage: ./scripts/setup-hooks.sh
#
# This script installs pre-commit hooks that enforce:
# - npm audit (security)
# - Linting
# - Tests
# - Project validation
# - Secret detection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_SOURCE="$PROJECT_ROOT/templates/infrastructure/hooks"
GIT_HOOKS_DIR=".git/hooks"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Setting up Git hooks for the Multi-Agent Framework..."

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "Error: Not in a Git repository root. Run this from your project root."
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Install pre-commit hook
if [ -f "$HOOKS_SOURCE/pre-commit" ]; then
    cp "$HOOKS_SOURCE/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
    chmod +x "$GIT_HOOKS_DIR/pre-commit"
    echo -e "${GREEN}Installed: pre-commit hook${NC}"
else
    echo -e "${YELLOW}Warning: pre-commit template not found at $HOOKS_SOURCE/pre-commit${NC}"
fi

# Install pre-push hook (if exists)
if [ -f "$HOOKS_SOURCE/pre-push" ]; then
    cp "$HOOKS_SOURCE/pre-push" "$GIT_HOOKS_DIR/pre-push"
    chmod +x "$GIT_HOOKS_DIR/pre-push"
    echo -e "${GREEN}Installed: pre-push hook${NC}"
fi

echo ""
echo -e "${GREEN}Git hooks setup complete!${NC}"
echo ""
echo "Hooks will automatically run:"
echo "  - npm audit (security check)"
echo "  - npm run lint"
echo "  - npm test"
echo "  - ./scripts/validate-project.sh"
echo "  - Secret detection in staged files"
echo ""
echo "To bypass hooks in emergencies: git commit --no-verify"
