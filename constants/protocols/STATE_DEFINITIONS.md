# State Definitions

> **This file defines the complete state machine for all workflow gates.**
> **Each gate has explicit ALLOWED_ACTIONS, BLOCKED_ACTIONS, and REQUIRED_AGENTS.**

---

## State Configuration by Gate

### G0_PENDING - Pre-Startup

```yaml
CURRENT_GATE: G0_PENDING
PHASE: pre_startup

ALLOWED_ACTIONS:
  - explain_process
  - ask_startup_confirmation
  - answer_questions_about_process

BLOCKED_ACTIONS:
  - ask_intake_questions
  - create_prd
  - create_architecture
  - create_design
  - write_code
  - create_components
  - install_dependencies
  - run_tests
  - deploy

REQUIRED_AGENTS: []
DELIVERABLES_REQUIRED: []

TRANSITION_TO: G1_INTAKE
TRANSITION_CONDITION: User explicitly confirms startup (yes/start/proceed)
```

---

### G1_INTAKE - Intake Phase

```yaml
CURRENT_GATE: G1_INTAKE
PHASE: intake

ALLOWED_ACTIONS:
  - ask_intake_questions
  - clarify_requirements
  - determine_project_type
  - identify_required_agents
  - explain_process
  - confirm_project_path

BLOCKED_ACTIONS:
  - create_prd
  - create_architecture
  - create_design
  - write_code
  - create_components
  - install_dependencies
  - run_tests
  - deploy

REQUIRED_AGENTS:
  - Orchestrator

DELIVERABLES_REQUIRED: []

TRANSITION_TO: G2_PRD_PENDING
TRANSITION_CONDITION: All 5 intake questions answered
```

---

### G2_PRD_PENDING - PRD Creation

```yaml
CURRENT_GATE: G2_PRD_PENDING
PHASE: planning

ALLOWED_ACTIONS:
  - create_prd
  - edit_prd
  - ask_clarifying_questions
  - present_prd_for_approval
  - explain_prd_decisions

BLOCKED_ACTIONS:
  - create_architecture
  - create_design
  - write_code
  - create_components
  - install_dependencies
  - run_tests
  - deploy

REQUIRED_AGENTS:
  - Orchestrator
  - Product Manager

DELIVERABLES_REQUIRED:
  - docs/INTAKE.md (completed)

TRANSITION_TO: G2_APPROVED
TRANSITION_CONDITION: User explicitly approves PRD
```

---

### G2_APPROVED - PRD Approved

```yaml
CURRENT_GATE: G2_APPROVED
PHASE: planning_complete

ALLOWED_ACTIONS:
  - begin_architecture_phase
  - update_project_state

BLOCKED_ACTIONS:
  - create_design
  - write_code
  - create_components
  - install_dependencies
  - run_tests
  - deploy

REQUIRED_AGENTS:
  - Orchestrator
  - Product Manager

DELIVERABLES_REQUIRED:
  - docs/PRD.md (approved)

TRANSITION_TO: G3_ARCH_PENDING
TRANSITION_CONDITION: Automatic after PRD approval
```

---

### G3_ARCH_PENDING - Architecture Design

```yaml
CURRENT_GATE: G3_ARCH_PENDING
PHASE: architecture

ALLOWED_ACTIONS:
  - create_architecture
  - edit_architecture
  - explain_tech_choices
  - present_alternatives
  - create_system_diagrams
  - define_api_contracts
  - present_architecture_for_approval
  - create_database_schema

BLOCKED_ACTIONS:
  - create_design
  - write_application_code
  - create_components
  - install_production_dependencies
  - run_tests
  - deploy

REQUIRED_AGENTS:
  - Orchestrator
  - Architect
  - Data Engineer (if database involved)

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - ML Engineer
  - Prompt Engineer

DELIVERABLES_REQUIRED:
  - docs/PRD.md (approved)

TRANSITION_TO: G3_APPROVED
TRANSITION_CONDITION: User explicitly approves architecture
```

---

### G3_APPROVED - Architecture Approved

```yaml
CURRENT_GATE: G3_APPROVED
PHASE: architecture_complete

ALLOWED_ACTIONS:
  - begin_design_phase
  - begin_development_phase (if no design needed)
  - update_project_state

BLOCKED_ACTIONS:
  - run_tests
  - deploy

REQUIRED_AGENTS:
  - Orchestrator
  - Architect

DELIVERABLES_REQUIRED:
  - docs/ARCHITECTURE.md (approved)
  - docs/API.yaml (if API project)

TRANSITION_TO: G4_DESIGN_PENDING (if UI project) OR DEVELOPMENT
TRANSITION_CONDITION: Automatic after architecture approval
```

---

### G4_DESIGN_PENDING - Design Phase

> **⚠️ G4 is MANDATORY for all projects with a user interface.**
> Cannot be skipped for UI projects regardless of user request.

```yaml
CURRENT_GATE: G4_DESIGN_PENDING
PHASE: design

ALLOWED_ACTIONS:
  - generate_html_design_options      # Create 3 diverse HTML designs
  - create_comparison_page            # designs/comparison.html
  - present_options_for_selection     # User must choose direction
  - refine_selected_design            # Iterative refinement loop
  - create_design_system              # Design tokens, typography, colors
  - define_component_library          # Component specifications
  - create_user_flows                 # User journey documentation
  - explain_ux_decisions              # Justify design choices
  - request_user_feedback             # Explicit feedback requests

BLOCKED_ACTIONS:
  - write_application_code
  - create_backend_components
  - run_tests
  - deploy
  - skip_design_phase                 # CANNOT skip for UI projects
  - auto_approve_designs              # Must have user approval
  - proceed_without_user_selection    # User MUST select option

REQUIRED_AGENTS:
  - Orchestrator
  - UX/UI Designer

DELIVERABLES_REQUIRED:
  - docs/ARCHITECTURE.md (approved)

MANDATORY_OUTPUTS:
  - designs/options/option-1.html     # First design option
  - designs/options/option-2.html     # Second design option
  - designs/options/option-3.html     # Third design option
  - designs/comparison.html           # Side-by-side comparison
  - designs/refined/v1.html           # At least one refinement
  - designs/final/index.html          # Final approved design

TRANSITION_TO: G4_APPROVED
TRANSITION_CONDITION: |
  ALL of the following must be true:
  1. 3 HTML design options generated and viewable
  2. User has viewed options in browser
  3. User has selected a direction
  4. At least 1 refinement round completed
  5. User explicitly says "approved" or equivalent
```

---

### G4_APPROVED - Design Approved

```yaml
CURRENT_GATE: G4_APPROVED
PHASE: design_complete

ALLOWED_ACTIONS:
  - begin_development_phase
  - update_project_state
  - handoff_to_frontend_developer

BLOCKED_ACTIONS:
  - run_production_tests
  - deploy
  - modify_approved_designs           # Designs are now locked

REQUIRED_AGENTS:
  - Orchestrator
  - UX/UI Designer

DELIVERABLES_REQUIRED:
  - designs/final/index.html (approved)
  - designs/final/pages/* (all page designs)
  - designs/final/components/* (component demos)
  - docs/DESIGN_SYSTEM.md (complete)

TRANSITION_TO: DEVELOPMENT
TRANSITION_CONDITION: Automatic after design approval
```

---

### DEVELOPMENT - Development Phase (Overview)

> **⚠️ CRITICAL: Development is NOT a single gate.**
> **It consists of 5 MANDATORY sub-gates that require explicit user approval.**
> **See `/constants/DEVELOPMENT_CHECKPOINTS.md` for full enforcement rules.**
> **The agent MUST NOT skip sub-gates or proceed without explicit user approval.**

```yaml
CURRENT_GATE: DEVELOPMENT
PHASE: development

SUB_GATES:
  - G5.1_FOUNDATION   # Types, config, structure → CHECKPOINT REQUIRED
  - G5.2_DATA_LAYER   # Services, API, state → CHECKPOINT REQUIRED
  - G5.3_COMPONENTS   # Each component individually → CHECKPOINT PER COMPONENT
  - G5.4_INTEGRATION  # Wiring together → CHECKPOINT + LIVE DEMO REQUIRED
  - G5.5_POLISH       # Final refinements → CHECKPOINT REQUIRED

REQUIRED_AGENTS:
  - Orchestrator
  - Frontend Developer (if frontend)
  - Backend Developer (if backend)

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - ML Engineer
  - Prompt Engineer
  - Model Evaluator

DELIVERABLES_REQUIRED:
  - docs/ARCHITECTURE.md (approved)
  - docs/DESIGN.md (approved, if UI project)

ENFORCEMENT_RULES:
  ⛔ PROHIBITED:
    - Building multiple components without approval
    - Proceeding to next sub-gate without explicit user approval
    - Interpreting silence as approval
    - Skipping checkpoint presentations
    - Auto-proceeding after timeout

  ✅ REQUIRED:
    - Present checkpoint after each sub-gate
    - Wait for explicit approval words: "approve", "yes", "continue", "A"
    - Log all decisions in docs/DECISIONS.md
    - Update PROJECT_STATE.md with current sub-gate

TRANSITION_TO: G5_DEV_COMPLETE
TRANSITION_CONDITION: ALL sub-gates (G5.1 through G5.5) approved by user
```

---

### G5.1_FOUNDATION - Project Foundation

```yaml
CURRENT_GATE: G5.1_FOUNDATION
PHASE: development_foundation

SCOPE:
  - package.json with dependencies
  - TypeScript configuration
  - Build tool configuration
  - Type definitions and interfaces
  - Project folder structure
  - Base styling setup

ALLOWED_ACTIONS:
  - create_package_json
  - create_tsconfig
  - create_build_config
  - define_types_and_interfaces
  - create_folder_structure
  - setup_styling_framework
  - install_dependencies

BLOCKED_ACTIONS:
  - create_components
  - create_services
  - write_business_logic
  - fetch_external_data
  - proceed_without_approval

CHECKPOINT_REQUIRED: YES
CHECKPOINT_PRESENTATION:
  - List all types/interfaces defined
  - Show folder structure
  - Explain key configuration decisions
  - Ask: "Does this foundation match your expectations?"
  - Present options: A) Approve B) Request changes C) Pause

TRANSITION_TO: G5.2_DATA_LAYER
TRANSITION_CONDITION: User explicitly approves
```

---

### G5.2_DATA_LAYER - Data & Services

```yaml
CURRENT_GATE: G5.2_DATA_LAYER
PHASE: development_data

SCOPE:
  - API service functions
  - Data fetching logic
  - State management setup
  - Mock data for development
  - Utility/helper functions

ALLOWED_ACTIONS:
  - create_api_services
  - create_data_fetchers
  - setup_state_management
  - create_mock_data
  - create_utility_functions
  - explain_data_flow

BLOCKED_ACTIONS:
  - create_ui_components
  - create_pages
  - style_components
  - proceed_without_approval

CHECKPOINT_REQUIRED: YES
CHECKPOINT_PRESENTATION:
  - List all services created
  - Explain data flow architecture
  - Show API integration approach
  - Demonstrate with mock data if possible
  - Ask: "Does this data architecture work for you?"

TRANSITION_TO: G5.3_COMPONENTS
TRANSITION_CONDITION: User explicitly approves
```

---

### G5.3_COMPONENTS - Component Development (Iterative)

```yaml
CURRENT_GATE: G5.3_COMPONENTS
PHASE: development_components

⚠️ CRITICAL: This gate is ITERATIVE
   Build ONE component at a time
   Get approval for EACH component
   Do NOT batch multiple components

SCOPE_PER_ITERATION:
  - One major component
  - Associated hooks and utilities
  - Component-specific styling
  - Basic functionality verification

ALLOWED_ACTIONS:
  - create_single_component
  - create_component_hook
  - style_component
  - run_dev_server
  - demonstrate_component

BLOCKED_ACTIONS:
  - create_multiple_components_at_once
  - skip_to_next_component_without_approval
  - proceed_to_integration_without_approval

CHECKPOINT_REQUIRED: YES (for EACH component)
CHECKPOINT_PRESENTATION:
  ---
  ## 🚦 COMPONENT CHECKPOINT: {ComponentName}

  **File:** src/components/{ComponentName}.tsx
  **Purpose:** {one-line description}

  ### What It Does
  {2-3 sentences explaining functionality}

  ### Key Decisions Made
  - {decision 1}
  - {decision 2}

  ### Want to See It?
  Run `npm run dev` to preview

  ### Your Options
  A) Approve this component, continue to next
  B) Request changes: [describe]
  C) Skip remaining components, go to integration
  D) Pause development

  DECISION: ___
  ---

TRANSITION_TO: G5.4_INTEGRATION
TRANSITION_CONDITION: All planned components approved OR user chooses to skip
```

---

### G5.4_INTEGRATION - Integration & Wiring

```yaml
CURRENT_GATE: G5.4_INTEGRATION
PHASE: development_integration

SCOPE:
  - Connecting components together
  - Main App component / page layout
  - Routing (if applicable)
  - Data flow between components
  - Error handling integration
  - Loading states

ALLOWED_ACTIONS:
  - integrate_components
  - create_app_layout
  - setup_routing
  - add_error_handling
  - add_loading_states
  - run_integration_demo

BLOCKED_ACTIONS:
  - add_new_components
  - change_data_architecture
  - proceed_without_demo

CHECKPOINT_REQUIRED: YES
LIVE_DEMO_REQUIRED: YES

CHECKPOINT_PRESENTATION:
  - Show how components connect
  - Demonstrate full user flow
  - Run dev server for interactive demo
  - Walk through main user flows with user
  - Ask: "Does the app flow work as expected?"

TRANSITION_TO: G5.5_POLISH
TRANSITION_CONDITION: User explicitly approves after seeing demo
```

---

### G5.5_POLISH - Final Polish

```yaml
CURRENT_GATE: G5.5_POLISH
PHASE: development_polish

SCOPE:
  - Visual refinements
  - Responsive design
  - Accessibility improvements
  - Performance optimization
  - Edge case handling

ALLOWED_ACTIONS:
  - refine_styling
  - add_responsive_design
  - improve_accessibility
  - optimize_performance
  - handle_edge_cases
  - final_demo

BLOCKED_ACTIONS:
  - add_new_features
  - change_architecture
  - add_new_components

CHECKPOINT_REQUIRED: YES
CHECKPOINT_PRESENTATION:
  - Show before/after if significant changes
  - List accessibility improvements
  - Final demo of complete application
  - Ask: "Is the application ready for testing?"

TRANSITION_TO: G5_DEV_COMPLETE
TRANSITION_CONDITION: User explicitly approves or chooses "ship as-is"
```

---

### G5_DEV_COMPLETE - Development Complete

```yaml
CURRENT_GATE: G5_DEV_COMPLETE
PHASE: development_complete

ALLOWED_ACTIONS:
  - present_development_summary
  - demonstrate_functionality
  - begin_testing_phase
  - update_project_state

BLOCKED_ACTIONS:
  - deploy_to_production
  - add_new_features

REQUIRED_AGENTS:
  - Orchestrator
  - Frontend Developer
  - Backend Developer

DELIVERABLES_REQUIRED:
  - All planned source code files
  - Build passing
  - All checkpoints acknowledged

TRANSITION_TO: G6_TESTING
TRANSITION_CONDITION: User confirms development is complete
```

---

### G6_TESTING - QA/Testing Phase

```yaml
CURRENT_GATE: G6_TESTING
PHASE: testing

ALLOWED_ACTIONS:
  - write_tests
  - run_tests
  - create_test_reports
  - fix_bugs
  - run_accessibility_tests
  - run_performance_tests
  - present_qa_results
  - explain_test_coverage

BLOCKED_ACTIONS:
  - deploy_to_production
  - add_new_features
  - major_refactoring

REQUIRED_AGENTS:
  - Orchestrator
  - QA Engineer

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - Model Evaluator

DELIVERABLES_REQUIRED:
  - All source code
  - Build passing

QUALITY_GATES:
  - Test coverage >= 80%
  - No critical bugs
  - Accessibility AA compliance (if UI)
  - Performance targets met

TRANSITION_TO: G6_APPROVED
TRANSITION_CONDITION: All quality gates met, user approves QA results
```

---

### G6_APPROVED - QA Approved

```yaml
CURRENT_GATE: G6_APPROVED
PHASE: testing_complete

ALLOWED_ACTIONS:
  - begin_security_review
  - update_project_state

BLOCKED_ACTIONS:
  - deploy_to_production

REQUIRED_AGENTS:
  - Orchestrator
  - QA Engineer

DELIVERABLES_REQUIRED:
  - Test reports
  - Bug fixes complete
  - Quality gates passed

TRANSITION_TO: G7_SECURITY
TRANSITION_CONDITION: Automatic after QA approval
```

---

### G7_SECURITY - Security Review Phase

```yaml
CURRENT_GATE: G7_SECURITY
PHASE: security_review

ALLOWED_ACTIONS:
  - run_security_scans
  - review_authentication
  - review_authorization
  - check_data_handling
  - review_dependencies
  - create_threat_model
  - fix_security_issues
  - present_security_report

BLOCKED_ACTIONS:
  - deploy_to_production
  - add_new_features

REQUIRED_AGENTS:
  - Orchestrator
  - Security & Privacy Engineer

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - ML Engineer (for model security)
  - Prompt Engineer (for prompt injection review)

DELIVERABLES_REQUIRED:
  - QA approved
  - All tests passing

SECURITY_GATES:
  - No critical vulnerabilities
  - No high vulnerabilities
  - OWASP Top 10 reviewed
  - Secrets properly managed

TRANSITION_TO: G7_APPROVED
TRANSITION_CONDITION: Security gates passed, user approves security report
```

---

### G7_APPROVED - Security Approved

```yaml
CURRENT_GATE: G7_APPROVED
PHASE: security_complete

ALLOWED_ACTIONS:
  - begin_deployment_prep
  - update_project_state

BLOCKED_ACTIONS:
  - add_new_features

REQUIRED_AGENTS:
  - Orchestrator
  - Security & Privacy Engineer

DELIVERABLES_REQUIRED:
  - docs/THREAT_MODEL.md
  - Security scan reports
  - All security issues resolved

TRANSITION_TO: G8_PRE_DEPLOY
TRANSITION_CONDITION: Automatic after security approval
```

---

### G8_PRE_DEPLOY - Pre-Deployment Go/No-Go

```yaml
CURRENT_GATE: G8_PRE_DEPLOY
PHASE: pre_deployment

ALLOWED_ACTIONS:
  - create_deployment_config
  - setup_ci_cd
  - create_environment_configs
  - present_deployment_plan
  - run_final_verification
  - create_rollback_plan

BLOCKED_ACTIONS:
  - deploy_to_production (until go decision)
  - add_new_features

REQUIRED_AGENTS:
  - Orchestrator
  - DevOps Engineer

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - AIOps Engineer

DELIVERABLES_REQUIRED:
  - Security approved
  - All tests passing
  - Deployment configuration ready

GO_NO_GO_CHECKLIST:
  - [ ] All gates G0-G7 approved
  - [ ] Build passing
  - [ ] Tests passing
  - [ ] Security approved
  - [ ] Deployment config ready
  - [ ] Rollback plan documented
  - [ ] User confirms GO

TRANSITION_TO: G8_APPROVED
TRANSITION_CONDITION: User gives explicit GO decision
```

---

### G8_APPROVED - Deployment Approved

```yaml
CURRENT_GATE: G8_APPROVED
PHASE: deployment_approved

ALLOWED_ACTIONS:
  - deploy_to_production
  - monitor_deployment
  - verify_production

BLOCKED_ACTIONS:
  - add_new_features

REQUIRED_AGENTS:
  - Orchestrator
  - DevOps Engineer

ADDITIONAL_AGENTS_IF_AI_PROJECT:
  - AIOps Engineer

DELIVERABLES_REQUIRED:
  - Go decision confirmed
  - Deployment artifacts ready

TRANSITION_TO: G9_PRODUCTION
TRANSITION_CONDITION: Deployment successful, production verified
```

---

### G9_PRODUCTION - Production Acceptance

```yaml
CURRENT_GATE: G9_PRODUCTION
PHASE: production

# G9 SKIP LOGIC
# Read deployment_mode from docs/INTAKE.md
# Skip G9 entirely if deployment_mode == LOCAL_ONLY
#
# Decision tree at G8:
#   deployment_mode == LOCAL_ONLY → SKIP G9 → Go to G10
#   deployment_mode == REQUIRED → RUN G9
#   deployment_mode == OPTIONAL/UNDETERMINED → ASK USER:
#     "Ready for deployment. Deploy now or keep as local project?"
#     - "Deploy" → RUN G9
#     - "Local" → SKIP G9 → Go to G10

SKIP_CONDITIONS:
  - deployment_mode: LOCAL_ONLY
  - user_declined_deployment_at_G8: true

ALLOWED_ACTIONS:
  - monitor_production
  - verify_functionality
  - collect_metrics
  - present_production_report
  - document_learnings
  - hand_off_to_maintenance

BLOCKED_ACTIONS:
  - none (project complete)

REQUIRED_AGENTS:
  - Orchestrator
  - DevOps Engineer

DELIVERABLES_REQUIRED:
  - Production deployment successful
  - Functionality verified

TRANSITION_TO: G10_COMPLETION
TRANSITION_CONDITION: User accepts production deployment OR gate skipped
```

---

### G10_COMPLETION - Project Completion Report (MANDATORY)

```yaml
CURRENT_GATE: G10_COMPLETION
PHASE: completion

ALLOWED_ACTIONS:
  - collect_project_metrics
  - generate_completion_report
  - summarize_features_delivered
  - calculate_timeline_variance
  - compile_quality_metrics
  - document_lessons_learned
  - present_final_report

BLOCKED_ACTIONS:
  - add_new_features
  - modify_production

REQUIRED_AGENTS:
  - Orchestrator

DELIVERABLES_REQUIRED:
  - Production accepted (G9)

DELIVERABLES_PRODUCED:
  - docs/COMPLETION_REPORT.md (MANDATORY)

TRANSITION_TO: COMPLETE
TRANSITION_CONDITION: Completion report generated and user acknowledges
```

---

### COMPLETE - Project Complete

```yaml
CURRENT_GATE: COMPLETE
PHASE: completed

ALLOWED_ACTIONS:
  - archive_project
  - transition_to_maintenance
  - reference_completion_report

BLOCKED_ACTIONS:
  - none

REQUIRED_AGENTS:
  - Orchestrator

DELIVERABLES_REQUIRED:
  - All gates approved (G0-G9)
  - Completion report generated (G10)
  - Production stable

FINAL_DELIVERABLES:
  - docs/COMPLETION_REPORT.md (MANDATORY)
  - docs/PROJECT_STATE.md (all gates ✅)
  - Complete documentation
```

---

## Enhancement Gates (E-Gates)

> **For ENHANCEMENT and EXISTING project types only.**
> These gates replace G2-G4 when enhancing or maintaining existing codebases.

### E1_ASSESSMENT - Existing Code Assessment

```yaml
CURRENT_GATE: E1_ASSESSMENT
PHASE: assessment
PROJECT_TYPES: [EXISTING_OWN, EXISTING_INHERITED, ENHANCEMENT]

ALLOWED_ACTIONS:
  - analyze_existing_codebase
  - generate_health_score
  - identify_tech_debt
  - assess_architecture_patterns
  - review_dependency_health
  - create_assessment_report
  - create_gap_analysis

BLOCKED_ACTIONS:
  - write_code
  - install_dependencies
  - modify_files
  - deploy
  - create_new_prd

REQUIRED_AGENTS:
  - Orchestrator
  - Architect

DELIVERABLES_REQUIRED:
  - G1 Intake completed
  - INTAKE.md exists

DELIVERABLES_PRODUCED:
  - docs/ASSESSMENT.md (health score, patterns, issues)
  - docs/GAP_ANALYSIS.md (what's missing vs best practices)
  - docs/TECH_DEBT.md (prioritized tech debt items)

TRANSITION_TO: E2_RECOMMENDATION
TRANSITION_CONDITION: Assessment complete and presented to user
```

---

### E2_RECOMMENDATION - Enhancement Recommendation

```yaml
CURRENT_GATE: E2_RECOMMENDATION
PHASE: planning
PROJECT_TYPES: [EXISTING_OWN, EXISTING_INHERITED, ENHANCEMENT]

ALLOWED_ACTIONS:
  - present_assessment_summary
  - recommend_approach (Maintain/Enhance/Refactor/Rewrite)
  - create_enhancement_plan
  - estimate_effort
  - prioritize_changes
  - explain_tradeoffs

BLOCKED_ACTIONS:
  - write_code
  - install_dependencies
  - modify_existing_files

REQUIRED_AGENTS:
  - Orchestrator
  - Architect
  - Product Manager (if scope changes)

DELIVERABLES_REQUIRED:
  - E1 Assessment complete
  - ASSESSMENT.md exists
  - GAP_ANALYSIS.md exists

DELIVERABLES_PRODUCED:
  - docs/ENHANCEMENT_PLAN.md
  - Updated PRD (if new features)

DECISION_OPTIONS:
  - accept_recommendation: Proceed with suggested approach
  - different_approach: Choose alternative
  - more_analysis: Need deeper assessment
  - no_action: Accept current state

TRANSITION_TO: E3_APPROVAL (if changes planned) OR COMPLETE (if no_action)
TRANSITION_CONDITION: User approves recommendation
```

---

### E3_APPROVAL - Enhancement Plan Approval

```yaml
CURRENT_GATE: E3_APPROVAL
PHASE: approval
PROJECT_TYPES: [EXISTING_OWN, EXISTING_INHERITED, ENHANCEMENT]

ALLOWED_ACTIONS:
  - present_enhancement_plan
  - explain_implementation_steps
  - discuss_risks
  - adjust_plan_based_on_feedback
  - finalize_scope

BLOCKED_ACTIONS:
  - write_code
  - start_implementation

REQUIRED_AGENTS:
  - Orchestrator
  - Architect

DELIVERABLES_REQUIRED:
  - E2 Recommendation approved
  - ENHANCEMENT_PLAN.md exists

DELIVERABLES_PRODUCED:
  - Approved ENHANCEMENT_PLAN.md (with user sign-off)
  - Updated DECISIONS.md (E3 approval logged)

TRANSITION_TO: G5_DEVELOPMENT (if enhance) OR G3_ARCHITECTURE (if major refactor)
TRANSITION_CONDITION: User explicitly approves enhancement plan
```

---

## E-Gate to G-Gate Transitions

| E-Gate Outcome | Next Gate | Rationale |
|----------------|-----------|-----------|
| No action needed | COMPLETE | Project acceptable as-is |
| Minor enhancements | G5_DEVELOPMENT | Small changes, skip architecture/design |
| Major refactor | G3_ARCHITECTURE | Need new architecture decisions |
| Full rewrite | G2_PRD | Treat as new project |
| Security fixes only | G7_SECURITY | Jump to security review |

---

## Agent Activation by Project Type

### Traditional Web/Mobile Project

| Phase | Required Agents |
|-------|-----------------|
| Intake | Orchestrator |
| Planning | Orchestrator, Product Manager |
| Architecture | Orchestrator, Architect, Data Engineer |
| Design | Orchestrator, UX/UI Designer |
| Development | Orchestrator, Frontend Dev, Backend Dev |
| Testing | Orchestrator, QA Engineer |
| Security | Orchestrator, Security & Privacy Engineer |
| Deployment | Orchestrator, DevOps Engineer |

### AI/ML Project

| Phase | Required Agents |
|-------|-----------------|
| Intake | Orchestrator |
| Planning | Orchestrator, Product Manager |
| Architecture | Orchestrator, Architect, Data Engineer, **ML Engineer**, **Prompt Engineer** |
| Design | Orchestrator, UX/UI Designer |
| Development | Orchestrator, Frontend Dev, Backend Dev, **ML Engineer**, **Prompt Engineer** |
| Testing | Orchestrator, QA Engineer, **Model Evaluator** |
| Security | Orchestrator, Security & Privacy Engineer, **ML Engineer** |
| Deployment | Orchestrator, DevOps Engineer, **AIOps Engineer** |

### Hybrid Project

Uses ALL agents from both Traditional and AI/ML at each phase.

---

## State Validation Rules

Before ANY action, the orchestrator MUST:

1. **Read** `docs/PROJECT_STATE.md` to get `CURRENT_GATE`
2. **Look up** the gate in this file
3. **Check** if the intended action is in `ALLOWED_ACTIONS`
4. **Block** if action is in `BLOCKED_ACTIONS`
5. **Verify** all `DELIVERABLES_REQUIRED` exist
6. **Activate** agents from `REQUIRED_AGENTS`

### Violation Response

If an action is attempted that is not allowed:

```markdown
---
## ⛔ ACTION BLOCKED

**Attempted Action:** {action}
**Current Gate:** {gate}
**Why Blocked:** This action is not allowed at this stage.

**What's Required:**
- Current gate: {gate}
- Required deliverables: {list}
- Required approvals: {list}

**Next Steps:**
{instructions to get to the right state}
---
```

---

## Version

**Version:** 1.1.0
**Created:** 2024-12-09
**Updated:** 2024-12-18
**Purpose:** Complete state machine for full workflow enforcement
**Changes:** Added E-gates (E1, E2, E3) for enhancement/existing project workflows
