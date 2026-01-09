#!/usr/bin/env python3
"""
Multi-Agent Framework Enforcement Hook for Claude Code

This PreToolUse hook enforces ALL framework protocols:
1. ONBOARDING: Must complete startup + 5 questions before code generation
2. GATE PREREQUISITES: Must complete earlier gates before later gate work
3. AGENT SPAWNING: Must spawn agents via Task tool for gate work

ENFORCEMENT RULES:
- Code generation requires: Onboarding complete + G1 + G2 + G3 approved
- G2 work (PRD) requires Product Manager spawn + G1 approved
- G3 work (architecture) requires Architect spawn + G2 approved
- G4 work (design) requires UX/UI Designer spawn + G3 approved
- G5 work (code) requires Frontend AND Backend Developer spawns + G4 approved
- G6 work (testing) requires QA Engineer spawn
- G7 work (security) requires Security Engineer spawn
- G8/G9 work (deployment) requires DevOps Engineer spawn

BLOCKED ACTIONS:
- ANY code file writes without onboarding + G1-G3 approved
- Gate work without prerequisite gates approved
- Gate work without required agent spawned
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import Optional

# Gate-to-agent mapping
GATE_AGENTS = {
    'G2': ['Product Manager'],
    'G3': ['Architect'],
    'G4': ['UX/UI Designer'],
    'G5': ['Frontend Developer', 'Backend Developer'],  # Both required
    'G6': ['QA Engineer'],
    'G7': ['Security & Privacy Engineer'],
    'G8': ['DevOps Engineer'],
    'G9': ['DevOps Engineer'],
}

# Gate prerequisites - which gates must be approved before this gate's work
GATE_PREREQUISITES = {
    'G2': ['G1'],           # PRD requires scope approved
    'G3': ['G1', 'G2'],     # Architecture requires scope + PRD
    'G4': ['G1', 'G2', 'G3'],  # Design requires architecture approved
    'G5': ['G1', 'G2', 'G3', 'G4'],  # Development requires design approved
    'G6': [],               # Testing can happen anytime during dev
    'G7': [],               # Security can happen anytime
    'G8': ['G5', 'G6'],     # Deploy prep requires dev + testing
    'G9': ['G8'],           # Production requires staging approved
}

# Commands that indicate specific gate work
GATE_COMMAND_PATTERNS = {
    'G5': [
        # Build commands - require developers to be spawned
        r'npm\s+run\s+build',
        r'npm\s+run\s+dev',
        r'npm\s+run\s+start',
        r'npm\s+run\s+lint',
        r'npx\s+tsc',
        r'npx\s+eslint',
        r'npx\s+prettier',
        # Database/schema commands relate to architecture but done by developers
        r'npx\s+prisma\s+migrate',
        r'npx\s+prisma\s+db\s+push',
    ],
    'G6': [
        r'npm\s+test',
        r'npm\s+run\s+test',
        r'jest',
        r'vitest',
        r'playwright',
        r'cypress',
        r'pytest',  # Python testing
        r'go\s+test',  # Go testing
    ],
    'G7': [
        r'npm\s+audit',
        r'snyk',
        r'trivy',
        r'security',
        r'bandit',  # Python security
        r'safety\s+check',  # Python dependency security
    ],
    'G8': [
        r'vercel\s+deploy',
        r'npm\s+run\s+deploy',
        r'docker\s+build',
        r'docker-compose',
        r'kubectl',
        r'terraform',
        r'pulumi',
    ],
    'G9': [
        r'vercel\s+--prod',
        r'npm\s+run\s+deploy:prod',
        r'--production',  # More precise pattern
    ],
}

# File patterns that indicate specific gate work
GATE_FILE_PATTERNS = {
    'G2': [
        r'PRD\.md$',
        r'product.*requirements',
        r'docs/PRD',
    ],
    'G3': [
        r'ARCHITECTURE\.md$',
        r'architecture',
        r'system.*design',
        r'specs/',
    ],
    'G4': [
        r'DESIGN\.md$',
        r'design.*system',
        r'ui.*spec',
        r'ux.*spec',
    ],
    'G5': [
        r'\.tsx?$',
        r'\.jsx?$',
        r'\.py$',
        r'\.go$',
        r'\.rs$',
        r'src/',
        r'lib/',
        r'app/',
        r'pages/',
        r'components/',
    ],
}


def get_truth_store_path(cwd: str) -> Optional[Path]:
    """Find the truth.json file for the current project."""
    # Check if we're in a project that has a truth store
    truth_path = Path(cwd) / '.truth' / 'truth.json'
    if truth_path.exists():
        return truth_path

    # Check parent directories
    current = Path(cwd)
    for _ in range(5):  # Max 5 levels up
        parent = current.parent
        truth_path = parent / '.truth' / 'truth.json'
        if truth_path.exists():
            return truth_path
        current = parent

    return None


def load_truth_store(truth_path: Path) -> dict:
    """Load the truth store JSON."""
    try:
        with open(truth_path, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def get_agent_spawns_for_gate(truth: dict, gate: str) -> list:
    """Get all agent spawns for a specific gate."""
    spawns = truth.get('agent_spawns', [])
    return [s for s in spawns if s.get('gate') == gate]


def check_onboarding_complete(truth: dict) -> tuple[bool, str]:
    """Check if onboarding is complete (startup + all 5 questions)."""
    onboarding = truth.get('onboarding', {})

    if not onboarding.get('startup_message_displayed'):
        return False, "Startup message not displayed. Call display_startup_message first."

    if not onboarding.get('started'):
        return False, "Onboarding not started. Call start_onboarding first."

    if not onboarding.get('completed'):
        questions = onboarding.get('questions', [])
        answered = [q for q in questions if q.get('answer')]
        remaining = 5 - len(answered)
        return False, f"Onboarding incomplete. {remaining} questions remaining."

    return True, ""


def check_gate_approved(truth: dict, gate: str) -> bool:
    """Check if a specific gate is approved."""
    gates = truth.get('gates', {})
    gate_info = gates.get(gate, {})
    return gate_info.get('status') == 'approved'


def check_gate_prerequisites(truth: dict, gate: str) -> tuple[bool, list]:
    """Check if all prerequisite gates are approved."""
    prerequisites = GATE_PREREQUISITES.get(gate, [])
    missing = []

    for prereq in prerequisites:
        if not check_gate_approved(truth, prereq):
            missing.append(prereq)

    return len(missing) == 0, missing


def check_can_generate_code(truth: dict) -> tuple[bool, str]:
    """Check if code generation is allowed (onboarding + G1-G3)."""
    # Check onboarding first
    onboarding_ok, onboarding_reason = check_onboarding_complete(truth)
    if not onboarding_ok:
        return False, f"Code generation blocked: {onboarding_reason}"

    # Check prerequisite gates for code (G5 work)
    required_gates = ['G1', 'G2', 'G3']
    missing_gates = []

    for gate in required_gates:
        if not check_gate_approved(truth, gate):
            missing_gates.append(gate)

    if missing_gates:
        return False, f"Code generation blocked: Gates {', '.join(missing_gates)} not approved."

    return True, ""


def check_agents_spawned(truth: dict, gate: str, required_agents: list) -> tuple[bool, list]:
    """Check if all required agents have been spawned and completed for a gate."""
    spawns = get_agent_spawns_for_gate(truth, gate)

    missing = []
    for agent in required_agents:
        agent_spawns = [s for s in spawns if s.get('agent_name') == agent]
        completed = [s for s in agent_spawns if s.get('status') == 'completed']
        if not completed:
            missing.append(agent)

    return len(missing) == 0, missing


def detect_gate_from_command(command: str) -> Optional[str]:
    """Detect which gate a command is related to."""
    command_lower = command.lower()

    for gate, patterns in GATE_COMMAND_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, command_lower):
                return gate

    return None


def detect_gate_from_file(file_path: str) -> Optional[str]:
    """Detect which gate a file operation is related to."""
    for gate, patterns in GATE_FILE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, file_path, re.IGNORECASE):
                return gate

    return None


def validate_bash_command(tool_input: dict, truth: dict) -> tuple[bool, str]:
    """Validate a Bash command against spawn and prerequisite requirements."""
    command = tool_input.get('command', '')

    # Detect which gate this command relates to
    gate = detect_gate_from_command(command)

    if not gate:
        return True, ""  # Not a gate-related command

    # Check gate prerequisites first
    prereqs_ok, missing_prereqs = check_gate_prerequisites(truth, gate)
    if not prereqs_ok:
        return False, (
            f"BLOCKED: {gate} work detected (command: {command[:50]}...) but prerequisite gates not approved. "
            f"Missing: {', '.join(missing_prereqs)}. "
            f"Complete earlier gates first."
        )

    # Check agent spawn requirements
    required_agents = GATE_AGENTS.get(gate, [])
    if not required_agents:
        return True, ""

    all_spawned, missing = check_agents_spawned(truth, gate, required_agents)

    if not all_spawned:
        return False, (
            f"BLOCKED: {gate} work detected (command: {command[:50]}...) but required agent(s) not spawned. "
            f"Missing: {', '.join(missing)}. "
            f"Use Task tool to spawn the agent(s) first."
        )

    return True, ""


def validate_file_operation(tool_input: dict, truth: dict, tool_name: str) -> tuple[bool, str]:
    """Validate a Write/Edit operation against onboarding, prerequisites, and spawn requirements."""
    file_path = tool_input.get('file_path', '')

    # Detect which gate this file relates to
    gate = detect_gate_from_file(file_path)

    if not gate:
        return True, ""  # Not a gate-related file

    # For code files (G5), check full code generation prerequisites
    if gate == 'G5':
        can_code, code_reason = check_can_generate_code(truth)
        if not can_code:
            return False, (
                f"BLOCKED: Code generation attempted ({tool_name} to {file_path}). "
                f"{code_reason}"
            )

    # Check gate prerequisites
    prereqs_ok, missing_prereqs = check_gate_prerequisites(truth, gate)
    if not prereqs_ok:
        return False, (
            f"BLOCKED: {gate} work detected ({tool_name} to {file_path}) but prerequisite gates not approved. "
            f"Missing: {', '.join(missing_prereqs)}. "
            f"Complete earlier gates first."
        )

    # Check agent spawn requirements
    required_agents = GATE_AGENTS.get(gate, [])
    if not required_agents:
        return True, ""

    all_spawned, missing = check_agents_spawned(truth, gate, required_agents)

    if not all_spawned:
        return False, (
            f"BLOCKED: {gate} work detected ({tool_name} to {file_path}) but required agent(s) not spawned. "
            f"Missing: {', '.join(missing)}. "
            f"Use Task tool to spawn the agent(s) first. "
            f"The orchestrator cannot do this work directly."
        )

    return True, ""


def main():
    """Main hook entry point."""
    # Read input from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, allow the action (fail open)
        sys.exit(0)

    tool_name = input_data.get('tool_name', '')
    tool_input = input_data.get('tool_input', {})
    cwd = input_data.get('cwd', os.getcwd())

    # Find truth store
    truth_path = get_truth_store_path(cwd)

    if not truth_path:
        # No truth store found - this might not be a managed project
        # Allow the action but don't enforce
        sys.exit(0)

    truth = load_truth_store(truth_path)

    # Check if this is a managed project (has onboarding, gates, or agent_spawns)
    has_management = any([
        'onboarding' in truth,
        'gates' in truth,
        'agent_spawns' in truth
    ])

    if not has_management:
        # Project not yet initialized with management - allow (fail open for new projects)
        sys.exit(0)

    # Validate based on tool type
    is_valid = True
    reason = ""

    if tool_name == 'Bash':
        is_valid, reason = validate_bash_command(tool_input, truth)
    elif tool_name in ('Write', 'Edit'):
        is_valid, reason = validate_file_operation(tool_input, truth, tool_name)
    elif tool_name == 'NotebookEdit':
        # NotebookEdit uses notebook_path instead of file_path
        notebook_input = {'file_path': tool_input.get('notebook_path', '')}
        is_valid, reason = validate_file_operation(notebook_input, truth, tool_name)

    if not is_valid:
        # Output JSON to block the action
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason
            }
        }
        print(json.dumps(output))
        sys.exit(0)  # Exit 0 with deny response

    # Allow the action
    sys.exit(0)


if __name__ == '__main__':
    main()
