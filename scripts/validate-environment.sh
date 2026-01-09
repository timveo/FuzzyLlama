#!/bin/bash
# ==============================================================================
# Environment Validation Script
# Multi-Agent Product Creator Framework
#
# Validates that required third-party tools are installed and operational
# for QA, Security, and DevOps agents.
#
# Usage: ./scripts/validate-environment.sh [--install] [--agent <agent>]
#   --install    Attempt to install missing tools
#   --agent      Check only specific agent (qa|security|devops|all)
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Options
INSTALL_MISSING=false
AGENT_FILTER="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --install)
      INSTALL_MISSING=true
      shift
      ;;
    --agent)
      AGENT_FILTER="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_section() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
  echo "───────────────────────────────────────────────────────────────"
}

check_tool() {
  local name="$1"
  local command="$2"
  local required="$3"
  local install_cmd="$4"
  local agent="$5"

  if eval "$command" > /dev/null 2>&1; then
    local version=$(eval "$command" 2>/dev/null | head -1)
    echo -e "  ${GREEN}✓${NC} $name: $version"
    ((PASSED++))
    return 0
  else
    if [ "$required" = "required" ]; then
      echo -e "  ${RED}✗${NC} $name: NOT INSTALLED (required for $agent)"
      ((FAILED++))
      if [ "$INSTALL_MISSING" = true ] && [ -n "$install_cmd" ]; then
        echo -e "    ${YELLOW}→ Installing...${NC}"
        eval "$install_cmd" || echo -e "    ${RED}→ Installation failed${NC}"
      else
        echo -e "    ${YELLOW}→ Install with:${NC} $install_cmd"
      fi
      return 1
    else
      echo -e "  ${YELLOW}○${NC} $name: not installed (recommended for $agent)"
      ((WARNINGS++))
      if [ -n "$install_cmd" ]; then
        echo -e "    ${YELLOW}→ Install with:${NC} $install_cmd"
      fi
      return 0
    fi
  fi
}

check_npm_package() {
  local name="$1"
  local required="$2"
  local agent="$3"

  if npm list -g "$name" > /dev/null 2>&1; then
    local version=$(npm list -g "$name" 2>/dev/null | grep "$name" | head -1)
    echo -e "  ${GREEN}✓${NC} $name (global): installed"
    ((PASSED++))
    return 0
  elif npx --yes "$name" --version > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $name (npx): available"
    ((PASSED++))
    return 0
  else
    if [ "$required" = "required" ]; then
      echo -e "  ${RED}✗${NC} $name: NOT AVAILABLE (required for $agent)"
      echo -e "    ${YELLOW}→ Install with:${NC} npm install -g $name"
      ((FAILED++))
      return 1
    else
      echo -e "  ${YELLOW}○${NC} $name: not installed (recommended for $agent)"
      echo -e "    ${YELLOW}→ Install with:${NC} npm install -g $name"
      ((WARNINGS++))
      return 0
    fi
  fi
}

check_mcp_server() {
  local name="$1"
  local purpose="$2"

  # Check if configured in Claude settings
  local config_file="$HOME/.claude/mcp_servers.json"

  if [ -f "$config_file" ] && grep -q "$name" "$config_file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $name: configured"
    ((PASSED++))
  else
    echo -e "  ${YELLOW}○${NC} $name: not configured ($purpose)"
    ((WARNINGS++))
  fi
}

# ==============================================================================
# QA Engineer Tools
# ==============================================================================

check_qa_tools() {
  print_section "QA Engineer Tools"

  # Testing frameworks
  echo "  Testing:"
  check_tool "Vitest" "npx vitest --version" "required" "npm install -D vitest" "QA"
  check_tool "Playwright" "npx playwright --version" "required" "npm install -D @playwright/test && npx playwright install" "QA"

  # Accessibility
  echo ""
  echo "  Accessibility:"
  check_tool "axe-core" "npx axe --version" "recommended" "npm install -g @axe-core/cli" "QA"
  check_tool "pa11y" "npx pa11y --version" "recommended" "npm install -g pa11y" "QA"

  # Performance
  echo ""
  echo "  Performance:"
  check_tool "Lighthouse" "npx lighthouse --version" "required" "npm install -g lighthouse" "QA"
}

# ==============================================================================
# Security Engineer Tools
# ==============================================================================

check_security_tools() {
  print_section "Security & Privacy Engineer Tools"

  # Dependency scanning
  echo "  Dependency Scanning:"
  check_tool "npm audit" "npm audit --version" "required" "" "Security"
  check_tool "Snyk" "snyk --version" "recommended" "npm install -g snyk" "Security"

  # Code scanning
  echo ""
  echo "  Code Scanning:"
  check_tool "ESLint" "npx eslint --version" "required" "npm install -D eslint" "Security"

  # Web security
  echo ""
  echo "  Web Security Scanning:"
  check_tool "OWASP ZAP" "zap-cli --version || zaproxy -version" "recommended" "brew install --cask zap" "Security"

  # Container scanning
  echo ""
  echo "  Container Scanning:"
  check_tool "Trivy" "trivy --version" "recommended" "brew install trivy" "Security"
}

# ==============================================================================
# DevOps Engineer Tools
# ==============================================================================

check_devops_tools() {
  print_section "DevOps Engineer Tools"

  # Deployment platforms
  echo "  Deployment CLIs:"
  check_tool "Vercel CLI" "vercel --version" "required" "npm install -g vercel" "DevOps"
  check_tool "Railway CLI" "railway --version" "required" "npm install -g @railway/cli" "DevOps"

  # Container tools
  echo ""
  echo "  Container Tools:"
  check_tool "Docker" "docker --version" "recommended" "brew install --cask docker" "DevOps"

  # Version control
  echo ""
  echo "  Version Control:"
  check_tool "Git" "git --version" "required" "" "DevOps"
  check_tool "GitHub CLI" "gh --version" "required" "brew install gh" "DevOps"
}

# ==============================================================================
# MCP Servers
# ==============================================================================

check_mcp_servers() {
  print_section "MCP Servers (Model Context Protocol)"

  local config_file="$HOME/.claude/mcp_servers.json"

  if [ ! -f "$config_file" ]; then
    echo -e "  ${YELLOW}⚠${NC}  No MCP configuration found at $config_file"
    echo ""
    echo "  To configure MCP servers, create $config_file with:"
    echo ""
    cat << 'EOF'
  {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-filesystem", "--root", "."]
      },
      "git": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-git"]
      },
      "github": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-github"],
        "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
      },
      "puppeteer": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-puppeteer"]
      }
    }
  }
EOF
    echo ""
    ((WARNINGS++))
  else
    echo "  Configuration found: $config_file"
    echo ""
    check_mcp_server "@anthropic/mcp-server-filesystem" "File operations"
    check_mcp_server "@anthropic/mcp-server-git" "Git operations"
    check_mcp_server "@anthropic/mcp-server-github" "GitHub API"
    check_mcp_server "@anthropic/mcp-server-postgres" "Database queries"
    check_mcp_server "@anthropic/mcp-server-puppeteer" "Browser automation"
    check_mcp_server "@anthropic/mcp-server-fetch" "HTTP requests"
  fi
}

# ==============================================================================
# Core Dependencies
# ==============================================================================

check_core_dependencies() {
  print_section "Core Dependencies"

  check_tool "Node.js" "node --version" "required" "" "All"
  check_tool "npm" "npm --version" "required" "" "All"
  check_tool "Git" "git --version" "required" "" "All"
}

# ==============================================================================
# Summary
# ==============================================================================

print_summary() {
  print_header "VALIDATION SUMMARY"

  echo ""
  echo -e "  ${GREEN}Passed:${NC}   $PASSED"
  echo -e "  ${RED}Failed:${NC}   $FAILED"
  echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
  echo ""

  if [ $FAILED -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  VALIDATION FAILED - Required tools are missing${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Run with --install to attempt automatic installation:"
    echo "  ./scripts/validate-environment.sh --install"
    echo ""
    exit 1
  elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  VALIDATION PASSED WITH WARNINGS${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Some recommended tools are not installed."
    echo "  The framework will work, but some features may be limited."
    echo ""
    exit 0
  else
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  VALIDATION PASSED - All tools operational${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
  fi
}

# ==============================================================================
# Main
# ==============================================================================

print_header "Multi-Agent Framework Environment Validation"
echo ""
echo "  Checking third-party tools required by QA, Security, and DevOps agents..."

check_core_dependencies

case $AGENT_FILTER in
  qa)
    check_qa_tools
    ;;
  security)
    check_security_tools
    ;;
  devops)
    check_devops_tools
    ;;
  all|*)
    check_qa_tools
    check_security_tools
    check_devops_tools
    check_mcp_servers
    ;;
esac

print_summary
