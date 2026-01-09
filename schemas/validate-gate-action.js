#!/usr/bin/env node
/**
 * Gate Action Validator
 *
 * Technical enforcement of state machine rules.
 * Validates that a requested action is allowed at the current gate.
 *
 * Usage:
 *   node validate-gate-action.js <current_gate> <requested_action>
 *   node validate-gate-action.js G2_PRD_PENDING create_architecture
 *
 * Returns:
 *   Exit 0 + JSON with allowed: true if action is permitted
 *   Exit 1 + JSON with allowed: false, reason, and suggested_actions if blocked
 *
 * @version 1.0.0
 */

const STATE_MACHINE = {
  G0_PENDING: {
    phase: 'pre_startup',
    allowed_actions: [
      'explain_process',
      'ask_startup_confirmation',
      'answer_questions_about_process'
    ],
    blocked_actions: [
      'ask_intake_questions',
      'create_prd',
      'create_architecture',
      'create_design',
      'write_code',
      'create_components',
      'install_dependencies',
      'run_tests',
      'deploy'
    ],
    required_agents: [],
    transition_to: 'G1_INTAKE',
    transition_condition: 'User explicitly confirms startup (yes/start/proceed)'
  },

  G1_INTAKE: {
    phase: 'intake',
    allowed_actions: [
      'ask_intake_questions',
      'clarify_requirements',
      'determine_project_type',
      'identify_required_agents',
      'explain_process',
      'confirm_project_path'
    ],
    blocked_actions: [
      'create_prd',
      'create_architecture',
      'create_design',
      'write_code',
      'create_components',
      'install_dependencies',
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator'],
    transition_to: 'G2_PRD_PENDING',
    transition_condition: 'All 5 intake questions answered'
  },

  G2_PRD_PENDING: {
    phase: 'planning',
    allowed_actions: [
      'create_prd',
      'edit_prd',
      'ask_clarifying_questions',
      'present_prd_for_approval',
      'explain_prd_decisions'
    ],
    blocked_actions: [
      'create_architecture',
      'create_design',
      'write_code',
      'create_components',
      'install_dependencies',
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'Product Manager'],
    transition_to: 'G2_APPROVED',
    transition_condition: 'User explicitly approves PRD'
  },

  G2_APPROVED: {
    phase: 'planning_complete',
    allowed_actions: [
      'begin_architecture_phase',
      'update_project_state'
    ],
    blocked_actions: [
      'create_design',
      'write_code',
      'create_components',
      'install_dependencies',
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'Product Manager'],
    transition_to: 'G3_ARCH_PENDING',
    transition_condition: 'Automatic after PRD approval'
  },

  G3_ARCH_PENDING: {
    phase: 'architecture',
    allowed_actions: [
      'create_architecture',
      'edit_architecture',
      'explain_tech_choices',
      'present_alternatives',
      'create_system_diagrams',
      'define_api_contracts',
      'present_architecture_for_approval',
      'create_database_schema'
    ],
    blocked_actions: [
      'create_design',
      'write_application_code',
      'create_components',
      'install_production_dependencies',
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'Architect'],
    transition_to: 'G3_APPROVED',
    transition_condition: 'User explicitly approves architecture'
  },

  G3_APPROVED: {
    phase: 'architecture_complete',
    allowed_actions: [
      'begin_design_phase',
      'begin_development_phase',
      'update_project_state'
    ],
    blocked_actions: [
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'Architect'],
    transition_to: 'G4_DESIGN_PENDING',
    transition_condition: 'Automatic after architecture approval'
  },

  G4_DESIGN_PENDING: {
    phase: 'design',
    allowed_actions: [
      'create_wireframes',
      'create_design_system',
      'define_component_library',
      'create_user_flows',
      'present_designs_for_approval',
      'explain_ux_decisions',
      'create_style_guide'
    ],
    blocked_actions: [
      'write_application_code',
      'create_backend_components',
      'run_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'UX/UI Designer'],
    transition_to: 'G4_APPROVED',
    transition_condition: 'User explicitly approves designs'
  },

  G4_APPROVED: {
    phase: 'design_complete',
    allowed_actions: [
      'begin_development_phase',
      'update_project_state'
    ],
    blocked_actions: [
      'run_production_tests',
      'deploy'
    ],
    required_agents: ['Orchestrator', 'UX/UI Designer'],
    transition_to: 'G5.1_FOUNDATION',
    transition_condition: 'Automatic after design approval'
  },

  'G5.1_FOUNDATION': {
    phase: 'development_foundation',
    allowed_actions: [
      'create_package_json',
      'create_tsconfig',
      'create_build_config',
      'define_types_and_interfaces',
      'create_folder_structure',
      'setup_styling_framework',
      'install_dependencies'
    ],
    blocked_actions: [
      'create_components',
      'create_services',
      'write_business_logic',
      'fetch_external_data',
      'proceed_without_approval'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer', 'Backend Developer'],
    transition_to: 'G5.2_DATA_LAYER',
    transition_condition: 'User explicitly approves foundation'
  },

  'G5.2_DATA_LAYER': {
    phase: 'development_data',
    allowed_actions: [
      'create_api_services',
      'create_data_fetchers',
      'setup_state_management',
      'create_mock_data',
      'create_utility_functions',
      'explain_data_flow'
    ],
    blocked_actions: [
      'create_ui_components',
      'create_pages',
      'style_components',
      'proceed_without_approval'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer', 'Backend Developer'],
    transition_to: 'G5.3_COMPONENTS',
    transition_condition: 'User explicitly approves data layer'
  },

  'G5.3_COMPONENTS': {
    phase: 'development_components',
    allowed_actions: [
      'create_single_component',
      'create_component_hook',
      'style_component',
      'run_dev_server',
      'demonstrate_component'
    ],
    blocked_actions: [
      'create_multiple_components_at_once',
      'skip_to_next_component_without_approval',
      'proceed_to_integration_without_approval'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer'],
    transition_to: 'G5.4_INTEGRATION',
    transition_condition: 'All planned components approved OR user chooses to skip'
  },

  'G5.4_INTEGRATION': {
    phase: 'development_integration',
    allowed_actions: [
      'integrate_components',
      'create_app_layout',
      'setup_routing',
      'add_error_handling',
      'add_loading_states',
      'run_integration_demo'
    ],
    blocked_actions: [
      'add_new_components',
      'change_data_architecture',
      'proceed_without_demo'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer', 'Backend Developer'],
    transition_to: 'G5.5_POLISH',
    transition_condition: 'User explicitly approves after seeing demo'
  },

  'G5.5_POLISH': {
    phase: 'development_polish',
    allowed_actions: [
      'refine_styling',
      'add_responsive_design',
      'improve_accessibility',
      'optimize_performance',
      'handle_edge_cases',
      'final_demo'
    ],
    blocked_actions: [
      'add_new_features',
      'change_architecture',
      'add_new_components'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer'],
    transition_to: 'G5_DEV_COMPLETE',
    transition_condition: 'User explicitly approves or chooses "ship as-is"'
  },

  G5_DEV_COMPLETE: {
    phase: 'development_complete',
    allowed_actions: [
      'present_development_summary',
      'demonstrate_functionality',
      'begin_testing_phase',
      'update_project_state'
    ],
    blocked_actions: [
      'deploy_to_production',
      'add_new_features'
    ],
    required_agents: ['Orchestrator', 'Frontend Developer', 'Backend Developer'],
    transition_to: 'G6_TESTING',
    transition_condition: 'User confirms development is complete'
  },

  G6_TESTING: {
    phase: 'testing',
    allowed_actions: [
      'write_tests',
      'run_tests',
      'create_test_reports',
      'fix_bugs',
      'run_accessibility_tests',
      'run_performance_tests',
      'present_qa_results',
      'explain_test_coverage'
    ],
    blocked_actions: [
      'deploy_to_production',
      'add_new_features',
      'major_refactoring'
    ],
    required_agents: ['Orchestrator', 'QA Engineer'],
    transition_to: 'G6_APPROVED',
    transition_condition: 'All quality gates met, user approves QA results'
  },

  G6_APPROVED: {
    phase: 'testing_complete',
    allowed_actions: [
      'begin_security_review',
      'update_project_state'
    ],
    blocked_actions: [
      'deploy_to_production'
    ],
    required_agents: ['Orchestrator', 'QA Engineer'],
    transition_to: 'G7_SECURITY',
    transition_condition: 'Automatic after QA approval'
  },

  G7_SECURITY: {
    phase: 'security_review',
    allowed_actions: [
      'run_security_scans',
      'review_authentication',
      'review_authorization',
      'check_data_handling',
      'review_dependencies',
      'create_threat_model',
      'fix_security_issues',
      'present_security_report'
    ],
    blocked_actions: [
      'deploy_to_production',
      'add_new_features'
    ],
    required_agents: ['Orchestrator', 'Security & Privacy Engineer'],
    transition_to: 'G7_APPROVED',
    transition_condition: 'Security gates passed, user approves security report'
  },

  G7_APPROVED: {
    phase: 'security_complete',
    allowed_actions: [
      'begin_deployment_prep',
      'update_project_state'
    ],
    blocked_actions: [
      'add_new_features'
    ],
    required_agents: ['Orchestrator', 'Security & Privacy Engineer'],
    transition_to: 'G8_PRE_DEPLOY',
    transition_condition: 'Automatic after security approval'
  },

  G8_PRE_DEPLOY: {
    phase: 'pre_deployment',
    allowed_actions: [
      'create_deployment_config',
      'setup_ci_cd',
      'create_environment_configs',
      'present_deployment_plan',
      'run_final_verification',
      'create_rollback_plan'
    ],
    blocked_actions: [
      'deploy_to_production',
      'add_new_features'
    ],
    required_agents: ['Orchestrator', 'DevOps Engineer'],
    transition_to: 'G8_APPROVED',
    transition_condition: 'User gives explicit GO decision'
  },

  G8_APPROVED: {
    phase: 'deployment_approved',
    allowed_actions: [
      'deploy_to_production',
      'monitor_deployment',
      'verify_production'
    ],
    blocked_actions: [
      'add_new_features'
    ],
    required_agents: ['Orchestrator', 'DevOps Engineer'],
    transition_to: 'G9_PRODUCTION',
    transition_condition: 'Deployment successful, production verified'
  },

  G9_PRODUCTION: {
    phase: 'production',
    allowed_actions: [
      'monitor_production',
      'verify_functionality',
      'collect_metrics',
      'present_production_report',
      'document_learnings',
      'hand_off_to_maintenance'
    ],
    blocked_actions: [],
    required_agents: ['Orchestrator', 'DevOps Engineer'],
    transition_to: 'COMPLETE',
    transition_condition: 'User accepts production deployment'
  },

  COMPLETE: {
    phase: 'completed',
    allowed_actions: [
      'create_project_summary',
      'document_lessons_learned',
      'archive_project',
      'transition_to_maintenance'
    ],
    blocked_actions: [],
    required_agents: ['Orchestrator'],
    transition_to: null,
    transition_condition: null
  }
};

// Action aliases for fuzzy matching
const ACTION_ALIASES = {
  'write_code': ['create_code', 'generate_code', 'build_code', 'code'],
  'create_components': ['build_components', 'make_components', 'add_components'],
  'create_prd': ['write_prd', 'draft_prd', 'make_prd'],
  'create_architecture': ['write_architecture', 'design_architecture', 'architect'],
  'deploy': ['deploy_to_production', 'ship', 'release', 'publish'],
  'run_tests': ['test', 'execute_tests', 'run_test_suite'],
  'install_dependencies': ['npm_install', 'install_packages', 'add_dependencies']
};

/**
 * Normalize action name to canonical form
 */
function normalizeAction(action) {
  const normalized = action.toLowerCase().trim().replace(/\s+/g, '_');

  // Check aliases
  for (const [canonical, aliases] of Object.entries(ACTION_ALIASES)) {
    if (aliases.includes(normalized) || canonical === normalized) {
      return canonical;
    }
  }

  return normalized;
}

/**
 * Validate if an action is allowed at the current gate
 */
function validateGateAction(currentGate, requestedAction) {
  const gateConfig = STATE_MACHINE[currentGate];

  if (!gateConfig) {
    return {
      allowed: false,
      valid_gate: false,
      reason: `Unknown gate: ${currentGate}`,
      valid_gates: Object.keys(STATE_MACHINE),
      suggested_actions: []
    };
  }

  const normalizedAction = normalizeAction(requestedAction);

  // Check if explicitly allowed
  const isAllowed = gateConfig.allowed_actions.some(a =>
    normalizeAction(a) === normalizedAction
  );

  // Check if explicitly blocked
  const isBlocked = gateConfig.blocked_actions.some(a =>
    normalizeAction(a) === normalizedAction
  );

  if (isAllowed && !isBlocked) {
    return {
      allowed: true,
      gate: currentGate,
      phase: gateConfig.phase,
      action: requestedAction,
      normalized_action: normalizedAction,
      required_agents: gateConfig.required_agents,
      next_gate: gateConfig.transition_to,
      transition_condition: gateConfig.transition_condition
    };
  }

  // Action is blocked or not in allowed list
  let reason;
  let blockedBy = null;

  if (isBlocked) {
    reason = `Action "${requestedAction}" is explicitly BLOCKED at gate ${currentGate}`;
    blockedBy = 'BLOCKED_ACTIONS';
  } else {
    reason = `Action "${requestedAction}" is not in ALLOWED_ACTIONS for gate ${currentGate}`;
    blockedBy = 'NOT_IN_ALLOWED';
  }

  // Find which gate would allow this action
  const suggestedGates = [];
  for (const [gate, config] of Object.entries(STATE_MACHINE)) {
    if (config.allowed_actions.some(a => normalizeAction(a) === normalizedAction)) {
      suggestedGates.push({
        gate,
        phase: config.phase
      });
    }
  }

  return {
    allowed: false,
    valid_gate: true,
    gate: currentGate,
    phase: gateConfig.phase,
    action: requestedAction,
    normalized_action: normalizedAction,
    reason,
    blocked_by: blockedBy,
    allowed_actions: gateConfig.allowed_actions,
    blocked_actions: gateConfig.blocked_actions,
    suggested_gates: suggestedGates,
    current_gate_info: {
      required_agents: gateConfig.required_agents,
      transition_to: gateConfig.transition_to,
      transition_condition: gateConfig.transition_condition
    }
  };
}

/**
 * Get all information about a gate
 */
function getGateInfo(gate) {
  const gateConfig = STATE_MACHINE[gate];

  if (!gateConfig) {
    return {
      valid: false,
      reason: `Unknown gate: ${gate}`,
      valid_gates: Object.keys(STATE_MACHINE)
    };
  }

  return {
    valid: true,
    gate,
    ...gateConfig
  };
}

/**
 * List all gates in order
 */
function listGates() {
  return Object.entries(STATE_MACHINE).map(([gate, config]) => ({
    gate,
    phase: config.phase,
    transition_to: config.transition_to
  }));
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Gate Action Validator - Technical enforcement of state machine rules

Usage:
  node validate-gate-action.js <current_gate> <requested_action>
  node validate-gate-action.js --info <gate>
  node validate-gate-action.js --list

Examples:
  node validate-gate-action.js G2_PRD_PENDING create_architecture
  node validate-gate-action.js G5.3_COMPONENTS create_single_component
  node validate-gate-action.js --info G3_ARCH_PENDING
  node validate-gate-action.js --list

Exit codes:
  0 - Action is allowed (or info command succeeded)
  1 - Action is blocked or invalid gate
`);
    process.exit(0);
  }

  if (args[0] === '--list') {
    console.log(JSON.stringify(listGates(), null, 2));
    process.exit(0);
  }

  if (args[0] === '--info') {
    const gate = args[1];
    if (!gate) {
      console.error('Error: Gate name required with --info');
      process.exit(1);
    }
    const info = getGateInfo(gate);
    console.log(JSON.stringify(info, null, 2));
    process.exit(info.valid ? 0 : 1);
  }

  const currentGate = args[0];
  const requestedAction = args[1];

  if (!requestedAction) {
    console.error('Error: Both current_gate and requested_action are required');
    console.error('Usage: node validate-gate-action.js <current_gate> <requested_action>');
    process.exit(1);
  }

  const result = validateGateAction(currentGate, requestedAction);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.allowed ? 0 : 1);
}

// Export for use as module
module.exports = {
  validateGateAction,
  getGateInfo,
  listGates,
  STATE_MACHINE,
  normalizeAction
};
