# Development Checkpoints

> **This file defines mandatory user interaction points during the DEVELOPMENT phase.**
> **These checkpoints ensure the user stays engaged and can guide the implementation.**

---

## Purpose

The DEVELOPMENT gate was previously a single monolithic phase where agents could build entire applications without user input. This led to:

- User disconnection from the build process
- No opportunity for course correction
- Finished products that didn't match user expectations
- No learning moments for educational projects

This document defines **mandatory sub-gates** within DEVELOPMENT that require explicit user approval.

---

## Development Sub-Gates

The DEVELOPMENT phase is now divided into these mandatory checkpoints:

```
DEVELOPMENT
    ├── G5.1_FOUNDATION      → Project setup, types, configuration
    ├── G5.2_DATA_LAYER      → Services, API integration, state management
    ├── G5.3_COMPONENTS      → Each major UI component (iterative)
    ├── G5.4_INTEGRATION     → Components working together
    └── G5.5_POLISH          → Final styling, UX refinements
```

---

## G5.1_FOUNDATION - Project Foundation

```yaml
CURRENT_GATE: G5.1_FOUNDATION
PHASE: development_foundation

SCOPE:
  - package.json with dependencies
  - TypeScript configuration
  - Build tool configuration (Vite, Webpack, etc.)
  - Type definitions and interfaces
  - Project folder structure
  - Base styling setup (Tailwind, CSS modules, etc.)

ALLOWED_ACTIONS:
  - create_package_json
  - create_tsconfig
  - create_build_config
  - define_types
  - create_folder_structure
  - setup_styling

BLOCKED_ACTIONS:
  - create_components
  - create_services
  - write_business_logic
  - fetch_external_data

CHECKPOINT_PRESENTATION:
  - List all types/interfaces defined
  - Show folder structure
  - Explain key configuration decisions
  - Ask: "Does this foundation match your expectations?"

USER_DECISION_REQUIRED:
  - A) Approve and continue to data layer
  - B) Request changes to types or structure
  - C) Pause and discuss

TRANSITION_TO: G5.2_DATA_LAYER
TRANSITION_CONDITION: User explicitly approves foundation
```

---

## G5.2_DATA_LAYER - Data & Services

```yaml
CURRENT_GATE: G5.2_DATA_LAYER
PHASE: development_data

SCOPE:
  - API service functions
  - Data fetching logic
  - State management setup (if applicable)
  - Mock data for development
  - Utility/helper functions

ALLOWED_ACTIONS:
  - create_api_services
  - create_data_fetchers
  - setup_state_management
  - create_mock_data
  - create_utilities
  - explain_data_flow

BLOCKED_ACTIONS:
  - create_ui_components
  - create_pages
  - style_components

CHECKPOINT_PRESENTATION:
  - List all services created
  - Explain data flow architecture
  - Show API integration approach
  - Demonstrate with mock data if possible
  - Ask: "Does this data architecture work for you?"

USER_DECISION_REQUIRED:
  - A) Approve and continue to components
  - B) Request changes to data approach
  - C) Add/modify services
  - D) Pause and discuss

TRANSITION_TO: G5.3_COMPONENTS
TRANSITION_CONDITION: User explicitly approves data layer
```

---

## G5.3_COMPONENTS - Component Development (Iterative)

```yaml
CURRENT_GATE: G5.3_COMPONENTS
PHASE: development_components

SCOPE:
  - One major component at a time
  - Associated hooks and utilities
  - Component-specific styling
  - Basic functionality verification

ITERATIVE_PROCESS:
  For EACH major component:
    1. Present what will be built
    2. Build the component
    3. Show the code and explain decisions
    4. Offer to run dev server for preview
    5. Get explicit approval before next component

ALLOWED_ACTIONS:
  - create_component
  - create_component_hook
  - style_component
  - run_dev_server
  - demonstrate_component

BLOCKED_ACTIONS:
  - skip_to_next_component_without_approval
  - build_multiple_components_at_once

COMPONENT_CHECKPOINT_TEMPLATE:
  ```markdown
  ---
  ## 🚦 COMPONENT CHECKPOINT: {ComponentName}

  **File:** src/components/{ComponentName}.tsx
  **Purpose:** {one-line description}

  ### What It Does
  {2-3 sentences explaining functionality}

  ### Key Decisions Made
  - {decision 1}
  - {decision 2}
  - {decision 3}

  ### Code Preview
  {Show key parts of the component - not full code unless small}

  ### Want to See It?
  Run `npm run dev` to preview at localhost:{port}

  ### Your Options
  A) Approve this component, continue to next
  B) Request changes: {describe what to change}
  C) Approve and skip to integration
  D) Pause development

  DECISION: ___
  ---
  ```

USER_DECISION_REQUIRED:
  - Explicit approval for EACH major component
  - User can skip remaining components after core ones done

TRANSITION_TO: G5.4_INTEGRATION
TRANSITION_CONDITION: All planned components approved OR user chooses to skip to integration
```

---

## G5.4_INTEGRATION - Integration & Wiring

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

CHECKPOINT_PRESENTATION:
  - Show how components connect
  - Demonstrate full user flow
  - Run dev server for interactive demo
  - Ask: "Does the app flow work as expected?"

DEMO_REQUIRED:
  - User MUST be offered a working demo
  - Command to run: `npm run dev`
  - Walk through main user flows

USER_DECISION_REQUIRED:
  - A) Approve integration, continue to polish
  - B) Request flow changes
  - C) Go back and modify components
  - D) Pause and discuss

TRANSITION_TO: G5.5_POLISH
TRANSITION_CONDITION: User explicitly approves integration
```

---

## G5.5_POLISH - Final Polish

```yaml
CURRENT_GATE: G5.5_POLISH
PHASE: development_polish

SCOPE:
  - Visual refinements
  - Responsive design
  - Accessibility improvements
  - Performance optimization
  - Edge case handling
  - Final styling touches

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

CHECKPOINT_PRESENTATION:
  - Show before/after if significant changes
  - List accessibility improvements
  - Final demo of complete application
  - Ask: "Is the application ready for testing?"

USER_DECISION_REQUIRED:
  - A) Approve, development complete
  - B) Request specific polish items
  - C) Go back to components or integration
  - D) Ship as-is (skip remaining polish)

TRANSITION_TO: G5_DEV_COMPLETE
TRANSITION_CONDITION: User explicitly approves or chooses to ship
```

---

## Enforcement Rules

### Before Writing ANY Code

The developer agent MUST:

1. **Check current sub-gate** in PROJECT_STATE.md
2. **Verify** the intended work matches the current sub-gate scope
3. **Block** work that belongs to a later sub-gate

### After Completing Sub-Gate Work

The developer agent MUST:

1. **Present** the checkpoint using the appropriate template
2. **Wait** for explicit user decision
3. **Record** the decision in docs/DECISIONS.md
4. **Update** PROJECT_STATE.md with new sub-gate
5. **Commit the code** (see Git Commit Protocol below)
6. **NOT proceed** until approval is given

---

## Git Commit Protocol

> **CRITICAL: Commit code at each checkpoint so user work is never lost.**
>
> **ENFORCED VIA TRUTH STORE:** Checkpoint commits are **AUTO-CREATED** at gate approval.
> No agent action required - the system handles it automatically.

### ⚠️ AUTO-COMMIT ENFORCEMENT (v1.5.0)

**Simple process - commits happen automatically:**

1. Gate approval triggers → System checks for existing gate commit
2. If no commit found → **Auto-creates** `feat: {gate} {description}` commit
3. Commit hash recorded in gate status for audit trail
4. Git history always reflects gate progression

**No agent action required.** The MCP server's `approve_gate` function handles this.

### When to Commit

| Event | Commit? | Message Format | Enforced? |
|-------|---------|----------------|-----------|
| G2 PRD approved | Yes | `feat: G2 PRD approval - {epic count} epics` | ✅ |
| G3 Architecture approved | Yes | `feat: G3 Architecture approval - {tech stack}` | ✅ |
| G4 Design approved | Yes | `feat: G4 Design approval - {description}` | Optional |
| G5.1 Foundation approved | Yes | `feat: G5.1 Foundation - project setup` | ✅ |
| G5.2 Data layer approved | Yes | `feat: G5.2 Data layer - services and hooks` | ✅ |
| G5.3 Component approved | Yes | `feat: G5.3 Component - {ComponentName}` | ✅ |
| G5.4 Integration approved | Yes | `feat: G5.4 Integration - end-to-end flow` | ✅ |
| G5.5 Polish approved | Yes | `feat: G5.5 Polish - refinements complete` | ✅ |
| G6 QA approved | Yes | `feat: G6 QA approval - {test count} tests passing` | ✅ |
| G7 Security approved | Yes | `feat: G7 Security approval - scan passed` | ✅ |
| G8 Pre-deployment approved | Yes | `feat: G8 Pre-deployment - ready for production` | ✅ |
| G9 Production approved | Yes | `feat: G9 Production - deployed and verified` | ✅ |
| G10 Project complete | Yes | `feat: G10 Project complete - all deliverables` | ✅ |
| Bug fix during development | Yes | `fix: {description}` | No |

### Commit Message Format

```
{type}: {short description} ({gate})

{optional longer description}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Automatic Commit Points

The system MUST commit at these points (no user action required):

1. **After each approved checkpoint** - Ensures work is saved
2. **Before any major refactor** - Creates restore point
3. **At end of session** - Never leave uncommitted work

### Commit Checklist

Before committing:
```
[ ] Code compiles (npm run build passes)
[ ] No sensitive data (.env files excluded)
[ ] Meaningful commit message
[ ] Checkpoint gate noted in message
```

### Recovery Protocol

If user loses work:
1. Check `git log` for last commit
2. Check `git stash list` for stashed changes
3. Offer to restore from last checkpoint

### Checkpoint Skip Prevention

```
⛔ CHECKPOINT ENFORCEMENT

The developer agent is PROHIBITED from:
- Continuing to the next sub-gate without explicit user approval
- Batching multiple sub-gates together
- Interpreting silence as approval
- Auto-proceeding after a timeout

The ONLY valid transitions are:
- User types an approval option (A, B, C, etc.)
- User says "approve", "continue", "looks good", "yes"
- User explicitly asks to skip ahead
```

---

## ⚠️ MANDATORY BUILD VERIFICATION

> **CRITICAL: Each checkpoint MUST include build verification before user approval.**

### Verification Commands Per Checkpoint

```bash
# G5.1_FOUNDATION - Verify project compiles
cd [project]
npm install
npm run build 2>&1 | tee build-output.txt
echo "Build exit code: $?"

# G5.2_DATA_LAYER - Verify services work
cd [project]
npm run build
npm run test -- --passWithNoTests 2>&1 | head -20

# G5.3_COMPONENTS - Verify component builds (after each component)
cd [project]
npm run build
npm run dev &
sleep 5
curl -s http://localhost:5173 > /dev/null && echo "✅ Dev server running" || echo "❌ Dev server failed"
kill %1

# G5.4_INTEGRATION - Full integration check
cd [project]
npm run build
npm run test
npm run dev &
echo "Manual verification required: Open http://localhost:5173"

# G5.5_POLISH - Final verification
cd [project]
npm run build
npm run test
npm run lint 2>/dev/null || echo "No lint configured"
```

### Checkpoint Presentation Template (UPDATED)

```markdown
---
## 🚦 CHECKPOINT: {Gate} - {Name}

### Files Created
| File | Purpose |
|------|---------|
| `{path}` | {description} |

### Build Verification
```
$ npm run build
{actual build output - MUST SHOW}
```
✅ Build passed / ❌ Build failed (must fix before proceeding)

### Test Status (if applicable)
```
$ npm run test
{actual test output}
```

### Key Decisions Made
- {decision 1}
- {decision 2}

### Preview Available
Run `npm run dev` → http://localhost:5173

### Your Options
- A) Approve and continue
- B) Request changes
- C) Pause

DECISION: ___
---
```

### Verification Failure Protocol

If build or tests fail at any checkpoint:

1. **DO NOT present checkpoint for approval**
2. **Fix the issue first**
3. **Re-run verification**
4. **Only present when verification passes**

```
⛔ NEVER DO THIS:
"Build failed but here's the checkpoint for approval anyway..."

✅ ALWAYS DO THIS:
"Build failed. Fixing the issue... [fix] ...Re-running build... Build passed! Here's the checkpoint:"
```

---

## Decision Logging

All checkpoint decisions MUST be logged in `docs/DECISIONS.md`:

```markdown
## Development Checkpoint Decisions

### G5.1_FOUNDATION
- **Date:** YYYY-MM-DD
- **Decision:** Approved
- **Comments:** User approved types and project structure
- **Changes Requested:** None

### G5.2_DATA_LAYER
- **Date:** YYYY-MM-DD
- **Decision:** Approved with changes
- **Comments:** User requested adding caching to API service
- **Changes Made:** Added localStorage caching to yahooFinance.ts

### G5.3_COMPONENTS - HoldingsTable
- **Date:** YYYY-MM-DD
- **Decision:** Approved
- **Comments:** User liked the sortable columns

### G5.3_COMPONENTS - BetaGauge
- **Date:** YYYY-MM-DD
- **Decision:** Changes requested
- **Comments:** User wanted different colors for risk levels
- **Changes Made:** Updated from red/yellow/green to blue/orange/purple
```

---

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT PHASE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   G5.1      │    │   G5.2      │    │   G5.3      │             │
│  │ FOUNDATION  │───►│ DATA_LAYER  │───►│ COMPONENTS  │◄────┐       │
│  │             │    │             │    │  (iterate)  │     │       │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │       │
│        │                   │                  │            │       │
│        ▼                   ▼                  ▼            │       │
│   [CHECKPOINT]        [CHECKPOINT]      [CHECKPOINT]       │       │
│   User approves       User approves     per component      │       │
│                                              │             │       │
│                                              ▼             │       │
│                                    ┌─────────────────┐     │       │
│                                    │ More components │─────┘       │
│                                    │    to build?    │             │
│                                    └────────┬────────┘             │
│                                             │ No                   │
│                                             ▼                      │
│                                    ┌─────────────┐                 │
│                                    │    G5.4     │                 │
│                                    │ INTEGRATION │                 │
│                                    └──────┬──────┘                 │
│                                           │                        │
│                                           ▼                        │
│                                      [CHECKPOINT]                  │
│                                      + LIVE DEMO                   │
│                                           │                        │
│                                           ▼                        │
│                                    ┌─────────────┐                 │
│                                    │    G5.5     │                 │
│                                    │   POLISH    │                 │
│                                    └──────┬──────┘                 │
│                                           │                        │
│                                           ▼                        │
│                                      [CHECKPOINT]                  │
│                                      Final approval                │
│                                           │                        │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │
                                            ▼
                                    G5_DEV_COMPLETE
```

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-10
**Purpose:** Mandatory user interaction during development phase
