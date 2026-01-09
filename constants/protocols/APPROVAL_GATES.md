# Human Approval Gates

> **Version 2.0** - Hub-and-Spoke Architecture
>
> **Purpose:** Define when the system pauses for human input, what to present, and how to capture decisions. Gates block task queue execution until approved.

## Related Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| **Task Queue** | [TASK_QUEUE_PROTOCOL.md](./TASK_QUEUE_PROTOCOL.md) | Task gate_dependency field |
| **State Management** | [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | MCP tools: `approve_gate()`, `check_gate()` |
| **Continuous Validation** | [CONTINUOUS_VALIDATION.md](./CONTINUOUS_VALIDATION.md) | Gate validation requirements |
| **Parallel Work** | [PARALLEL_WORK_PROTOCOL.md](./PARALLEL_WORK_PROTOCOL.md) | Spec locking after G3 |

---

## Principles

1. **No surprises** — Humans approve before major direction changes
2. **Clear options** — Always present choices, not just "approve/reject"
3. **Sufficient context** — Provide enough info to decide, not everything
4. **Tracked decisions** — All approvals logged in DECISIONS.md
5. **Task blocking** — Gates block queued tasks until approved
6. **Document initialization** — Post-launch tracking documents created at gate transitions

---

## Post-Launch Tracking Documents

Documents are **CREATED** after a gate is approved and **REQUIRED** at the next gate:

| Created After | Documents | Required At | Purpose |
|---------------|-----------|-------------|---------|
| **G1** | FEEDBACK_LOG.md, COST_LOG.md, PROJECT_CONTEXT.md | **G2** | Core tracking from project start |
| **G2** | CHANGE_REQUESTS.md | **G3** | Track scope changes after PRD approval |
| **G9** | POST_LAUNCH.md | **G10** | Maintenance guide for launched application |

**Timing Model:**
```
G1 approved → init_gate_documents(gate='G1') → Creates docs → G2 approval enforces docs exist
```

This ensures documents are ready BEFORE the next phase begins, not blocking the current gate.

### MCP Document Tools

```typescript
// Initialize all documents for a gate
await mcp.callTool('init_gate_documents', {
  project_path: '/path/to/project',
  gate: 'G1',
  project_name: 'My Project',
  budget: '$50' // Optional, for COST_LOG
});

// Initialize a specific document
await mcp.callTool('init_document', {
  project_path: '/path/to/project',
  document: 'FEEDBACK_LOG'
});

// Validate documents exist before gate approval
await mcp.callTool('validate_documents', {
  project_path: '/path/to/project',
  gate: 'G3' // Checks all docs that should exist by G3
});

// Get status of all tracking documents
await mcp.callTool('get_document_status', {
  project_path: '/path/to/project'
});
```

**Gate Readiness Check:** `get_gate_readiness` automatically validates required documents exist.

---

## Hub-and-Spoke Integration

In the Hub-and-Spoke architecture, gates integrate with the task queue:

```
┌─────────────────────────────────────────────────────────────────┐
│                    GATE-TO-TASK BLOCKING                         │
│                                                                   │
│  Tasks with gate_dependency wait in queue until gate approved    │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   TASK-001   │    │   TASK-002   │    │   TASK-003   │       │
│  │ gate_dep: G3 │    │ gate_dep: G3 │    │ gate_dep: G4 │       │
│  │   BLOCKED    │    │   BLOCKED    │    │   BLOCKED    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘       │
│         │                   │                                    │
│         └─────────┬─────────┘                                    │
│                   │                                              │
│                   ▼                                              │
│         ┌──────────────────┐                                     │
│         │   G3 APPROVED    │                                     │
│         └────────┬─────────┘                                     │
│                  │                                               │
│         ┌────────┴────────┐                                      │
│         ▼                 ▼                                      │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   TASK-001   │  │   TASK-002   │                             │
│  │   QUEUED     │  │   QUEUED     │   (Now available)           │
│  └──────────────┘  └──────────────┘                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Gate-to-Task Mapping

| Gate | Blocks Task Types | Worker Categories Blocked |
|------|------------------|--------------------------|
| **G1** | All tasks | All (project scope approval) |
| **G2** | Spec generation | Planning workers |
| **G3** | All generation tasks | Generation workers |
| **G4** | UI generation tasks | ui-generator |
| **G5** | Validation tasks | Validation workers |
| **G6** | Security review tasks | security-scanner |
| **G7** | Deployment tasks | Generation (deploy) |
| **G8** | Production deployment | All deploy tasks |

### MCP Gate Tools

```typescript
// Check if gate is blocking tasks
await mcp.callTool('check_gate', {
  project_id: 'my-project',
  gate: 'G3'
});
// Returns: { status: 'pending', blocked_tasks: ['TASK-001', 'TASK-002'] }

// Approve gate (unblocks waiting tasks)
await mcp.callTool('approve_gate', {
  project_id: 'my-project',
  gate: 'G3',
  approved_by: 'user',
  conditions: ['Security review must pass before G7']
});
// Result: All tasks with gate_dependency: 'G3' move from 'blocked' to 'queued'

// Get tasks blocked by gate
await mcp.callTool('get_blocked_tasks', {
  project_id: 'my-project',
  gate: 'G3'
});
// Returns: { tasks: ['TASK-001', 'TASK-002'], count: 2 }
```

### Enqueueing Gate-Blocked Tasks

```typescript
// Task created with gate dependency
await mcp.callTool('enqueue_task', {
  project_id: 'my-project',
  type: 'generation',
  priority: 'high',
  worker_category: 'generation',
  description: 'Implement auth API',
  gate_dependency: 'G3',  // Blocked until G3 approved
  spec_refs: ['openapi.paths./api/auth.post']
});
// Task status: 'blocked' (until G3 approved)
```

---

## Autonomous vs. Gated Operations

The Hub-and-Spoke architecture enables autonomous operations within approved boundaries:

### Autonomous (No Gate Required)

| Operation | Why Autonomous | Constraints |
|-----------|---------------|-------------|
| **Linting** | Deterministic, no human judgment | Must use project config |
| **Type checking** | Compiler-verified | Must pass before task completion |
| **Unit testing** | Spec-defined expectations | Coverage thresholds from specs |
| **Security scanning** | Automated vulnerability detection | Report to validation worker |
| **Code generation** | From approved specs | Specs locked after G3 |
| **Self-healing retries** | Error correction | Max 3 attempts, then escalate |
| **Task routing** | Algorithm-based | Based on worker capabilities |
| **Validation pipeline** | Continuous | Triggered on file changes |

### Gated (Human Approval Required)

| Operation | Why Gated | Gate |
|-----------|----------|------|
| **Scope definition** | Business decision | G1 |
| **Requirements approval** | Product direction | G2 |
| **Architecture approval** | Tech stack choice | G3 |
| **Design approval** | UX decisions | G4 |
| **Feature acceptance** | Meets requirements? | G5 |
| **Quality sign-off** | Risk tolerance | G6 |
| **Security acceptance** | Risk acceptance | G7 |
| **Production deploy** | Business timing | G8 |

---

## Approval Gate Summary

### Greenfield Projects

| Gate | After Phase | Decision | Mandatory Agent | Proof Required |
|------|-------------|----------|-----------------|----------------|
| **G1** | Intake | Approve scope and approach | Orchestrator | - |
| **G2** | Planning | Approve PRD and requirements | Product Manager | `prd_review` |
| **G3** | Architecture | Approve tech stack, system design | Architect | `spec_validation` |
| **G4** | Design | Approve UX/UI designs | **UX/UI Designer** | 3 HTML options, user selection |
| **G5** | Development | Accept completed features | Frontend/Backend Dev | `build_output`, `lint_output` |
| **G6** | Testing | Sign off on quality | **QA Engineer** | `test_output`, `coverage_report` |
| **G7** | Security | Accept security posture | **Security & Privacy Engineer** | `security_scan` |
| **G8** | Pre-Deploy | Go/no-go for production | **DevOps Engineer** | `accessibility_audit`, `performance_audit` |
| **G9** | Post-Deploy | Confirm production ready | **DevOps Engineer** | `deployment_verification` |

> **⛔ CRITICAL:** Gates G4, G6, G7, G8, and G9 require their mandatory agent to be activated and complete their work BEFORE the gate can be presented. The orchestrator CANNOT present these gates without the agent's proof artifacts.

### Proof Artifact Enforcement

Gates G2, G3, G4, and G5-G9 require **proof artifacts** before approval. Without proofs, gates will block:

```
Error: GATE BLOCKED: G2 requires proof artifacts that are missing: prd_review
Error: GATE BLOCKED: G3 requires proof artifacts that are missing: spec_validation
```

**Proof artifacts are stored in:**
```
.truth/
├── truth.json          # State with SHA256 hashes
└── proofs/
    ├── G2/             # prd-review.json (user sign-off confirmation)
    ├── G3/             # spec-validation.json
    ├── G4/             # design-options.json, user-selection.json, design-system.json
    ├── G5/             # build-output.json, lint-output.json, test-output.json
    ├── G6/             # test-output.json, coverage-report.json
    ├── G7/             # security-scan.json
    └── G8/             # lighthouse-report.json, accessibility-scan.json, pre-deployment-report.json
```

**MCP tools for proof management:**

| Tool | Purpose |
|------|---------|
| `submit_proof_artifact` | Submit proof with file path and SHA256 hash |
| `get_gate_proof_status` | Check what proofs exist/are missing for a gate |
| `verify_proof_artifact` | Verify file hash matches recorded hash |
| `validate_specs_for_g3` | Run spec validation and auto-submit proof |

**Force approval without proofs** (creates audit trail):
```typescript
await mcp.callTool('approve_gate', {
  project_path: '/path/to/project',
  gate: 'G3',
  approved_by: 'user',
  force_without_proofs: true,
  force_reason: 'Specs validated manually, tool not available'
});
```

### Enhancement Projects

| Gate | After Phase | Decision |
|------|-------------|----------|
| **E1** | Intake | Confirm enhancement scope |
| **E2** | Assessment | Approve recommendation |
| **E3** | Enhancement Plan | Approve phases |
| **G5-G9** | Same as greenfield | Same decisions |

---

## Approval Request Format

When presenting a gate to the human:

```markdown
---
## 🚦 APPROVAL REQUIRED: [Gate Name]

**Project:** [project-name]
**Gate:** G1 / G2 / G3 / etc.
**Phase Completed:** [phase]
**Date:** YYYY-MM-DD

---

### Summary

[2-3 sentence summary of what was done and what needs approval]

---

### Key Deliverables

| Deliverable | Status | Link |
|-------------|--------|------|
| [Document/artifact] | ✅ Complete | `path/to/file` |

---

### Decision Required

**Question:** [Specific question requiring decision]

**Options:**

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A** | [Description] | ⭐ Recommended |
| **B** | [Description] | |
| **C** | [Description] | |

---

### Key Information

- [Bullet 1]
- [Bullet 2]

---

### Risks & Concerns

| Risk | Severity | Mitigation |
|------|----------|------------|
| | | |

---

### Your Response

Please respond with:

```
DECISION: [A / B / C / Other]
COMMENTS: [Any feedback or modifications]
APPROVED BY: [Name]
```
---
```

---

## ⛔ Approval Validation Rules

**Gates are HARD STOPS. The system CANNOT proceed without explicit user approval.**

> **Complete Rules:** See `constants/protocols/APPROVAL_VALIDATION_RULES.md` for full validation logic, regex patterns, and clarification templates.

### Quick Reference

| Response | Valid? | Action |
|----------|--------|--------|
| "Approved" / "Yes" / "LGTM" | ✅ YES | Proceed |
| "A" / "B" / "C" (option select) | ✅ YES | Proceed with selection |
| "ok" / "sure" / "fine" | ⚠️ AMBIGUOUS | Clarify first |
| "no" / "wait" / "change this" | ❌ REJECTED | Ask for specifics |

### MCP Tool Usage

Always use `validate_approval_response()` to validate user responses:

```typescript
validate_approval_response({
  project_id: "[project_id]",
  gate: "G3",
  user_response: "[user's exact text]"
})
```

### Logging Requirements

Every gate approval MUST be logged via `log_decision()` with:
- The exact text the user typed
- Timestamp
- Gate number
- Mandatory agent that completed work
- Proof artifacts verified

---

## Gate Details

### G1: Project Scope Approval

**When:** After intake questionnaire completed
**Presenter:** Orchestrator

**ACTIONS AFTER G1 APPROVAL:**
Initialize post-launch tracking documents (required before G2):
```typescript
await mcp.callTool('init_gate_documents', {
  project_path: '/path/to/project',
  gate: 'G1',
  project_name: 'My Project',
  budget: '$50' // Optional
});
```
This creates:
- `docs/FEEDBACK_LOG.md` - Tracks all user feedback
- `docs/COST_LOG.md` - Tracks token usage and costs
- `docs/PROJECT_CONTEXT.md` - Onboarding context for team

**Present:**
- Project classification (traditional / ai_ml / hybrid / enhancement)
- Recommended workflow and starter template
- Key assumptions
- Identified risks

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Approve** | Proceed with planning phase |
| **Modify** | Adjust scope, re-classify |
| **Reject** | Do not proceed |

---

### G2: PRD Approval

**When:** After Product Manager completes PRD
**Presenter:** Product Manager

**PREREQUISITE:** G1 tracking docs must exist (FEEDBACK_LOG.md, COST_LOG.md, PROJECT_CONTEXT.md)

**ACTIONS AFTER G2 APPROVAL:**
Initialize change tracking document (required before G3):
```typescript
await mcp.callTool('init_gate_documents', {
  project_path: '/path/to/project',
  gate: 'G2'
});
```
This creates:
- `docs/CHANGE_REQUESTS.md` - Tracks scope changes after PRD approval

**Present:**
- PRD.md (full document link)
- User stories summary (count, priority breakdown)
- Success metrics
- Scope boundaries (in/out)

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Approve** | PRD locked, proceed to architecture |
| **Revise** | Specific changes needed (list them) |
| **Major Rework** | Fundamental issues, back to planning |

---

### G3: Architecture Approval (Spec-First)

**When:** After Architect completes system design AND specifications
**Presenter:** Architect

**Present:**
- **MANDATORY SPECS (all must exist and validate):**
  - `specs/openapi.yaml` - API contract
  - `specs/database-schema.json` - Universal database contract
  - Stack-specific implementation (see below)
- ARCHITECTURE.md (high-level overview)
- TECH_STACK.md
- Key ADRs (Architecture Decision Records)
- System diagram
- Security approach summary
- **External requirements** registered in truth store (if any)

#### G3 External Requirements Registration

**When architecture identifies external services, register them:**
```typescript
// Architect registers external services during G3
await mcp.callTool('register_external_requirements', {
  project_path: '/path/to/project',
  requirements: [
    { service: 'Stripe', purpose: 'payments', env_var: 'STRIPE_SECRET_KEY' },
    { service: 'Auth0', purpose: 'authentication', env_var: 'AUTH0_CLIENT_SECRET' }
  ]
});
```

This enables the Pre-G6 check to notify user about needed credentials before QA.

#### G3 Spec Validation Checklist (MANDATORY)

Before G3 can be approved, ALL spec validations must pass.

**Check TECH_STACK.md to determine stack, then run appropriate validation:**

##### Node.js Stack Validation
```bash
# REQUIRED - All must pass
swagger-cli validate specs/openapi.yaml    # OpenAPI valid
prisma validate                             # Prisma schema valid
tsc --noEmit -p specs/tsconfig.json        # Zod schemas compile

# REQUIRED - All must exist
[ -f "specs/openapi.yaml" ]
[ -f "specs/database-schema.json" ]
[ -f "prisma/schema.prisma" ]
[ -f "specs/schemas/index.ts" ]
```

##### Python Stack Validation
```bash
# REQUIRED - All must pass
swagger-cli validate specs/openapi.yaml                    # OpenAPI valid
python -c "from src.models import *; print('OK')"          # SQLAlchemy models valid
python -c "from specs.schemas import *; print('OK')"       # Pydantic schemas valid

# REQUIRED - All must exist
[ -f "specs/openapi.yaml" ]
[ -f "specs/database-schema.json" ]
[ -f "src/models/__init__.py" ]
[ -f "specs/schemas/__init__.py" ]
```

**G3 Spec Criteria:**

| Check | Node.js | Python | Blocking? |
|-------|---------|--------|-----------|
| OpenAPI spec exists | `specs/openapi.yaml` | `specs/openapi.yaml` | **YES** |
| OpenAPI validates | `swagger-cli validate` | `swagger-cli validate` | **YES** |
| DB schema exists | `specs/database-schema.json` | `specs/database-schema.json` | **YES** |
| DB implementation exists | `prisma/schema.prisma` | `src/models/__init__.py` | **YES** |
| DB implementation validates | `prisma validate` | `python -c "from src.models import *"` | **YES** |
| Validation schemas exist | `specs/schemas/index.ts` | `specs/schemas/__init__.py` | **YES** |
| Validation compiles | `tsc --noEmit` | `python -c "from specs.schemas import *"` | **YES** |
| Specs are consistent | All three match | All three match | **YES** |
| ARCHITECTURE.md exists | High-level overview | High-level overview | **YES** |
| TECH_STACK.md exists | Technology selections | Technology selections | **YES** |

**Consistency Verification:**

The Architect must verify that all specs are consistent:
- Enum values match (e.g., `UserRole` in OpenAPI = DB = Validation schemas)
- Field types match (e.g., `email: string` in all specs)
- Field names match (camelCase in API, snake_case in Python DB is OK with aliases)

**G3 CANNOT be approved if:**
- Any spec file is missing
- Any spec validation fails
- Specs are inconsistent with each other

**Spec Locking (MANDATORY):**

After user approves G3, the **Orchestrator must call `lock_specs()`** to freeze specifications:
```typescript
// Orchestrator calls IMMEDIATELY after G3 approval
lock_specs({ project_path: "[project_path]" })
```

This prevents spec modifications during development. Any spec changes after G3 require:
1. Formal change request
2. User approval
3. Re-validation of all specs

**Integration Test Plan Initialization (MANDATORY - NEW in v1.7.0):**

After G3 approval, the **Architect must call `initialize_integration_test_plan()`** to identify integration points:
```typescript
// Architect calls after G3 approval to establish test plan
await mcp.callTool('initialize_integration_test_plan', {
  project_path: '/path/to/project',
  scenarios: [
    {
      description: 'API + Database CRUD operations',
      components: ['REST API', 'Prisma', 'PostgreSQL'],
      owner: 'backend',
      priority: 'critical'
    },
    {
      description: 'Authentication flow (login, session, logout)',
      components: ['AuthAPI', 'SessionStore', 'UserDB'],
      owner: 'backend',
      priority: 'critical'
    },
    {
      description: 'External API integration',
      components: ['ExternalService', 'APIClient', 'ErrorHandler'],
      owner: 'backend',
      priority: 'high'
    }
  ],
  initialized_by: 'Architect'
});
```

This ensures integration tests are planned during architecture, not as an afterthought at QA.
UX/UI Designer adds UI scenarios at G4. Developers write tests during G5. QA validates at G6.

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Approve** | All specs valid and consistent, proceed to development (triggers spec lock) |
| **Revise** | Spec issues identified, fix and re-validate |
| **Alternative Review** | Evaluate different approach |

---

### G4: Design Approval

**When:** After UX/UI Designer completes designs
**Presenter:** UX/UI Designer

> **⚠️ IMPORTANT: G4 is MANDATORY for all greenfield projects with a user interface.**
> The design phase ensures early user feedback and prevents costly rework during development.
> See "G4 Mandatory Rules" below for enforcement.

**Present:**
- **3 HTML design options** (`designs/options/`) - viewable in browser
- **Comparison page** (`designs/comparison.html`)
- **Selected & refined design** (`designs/final/`)
- User flow diagrams
- Design system/component library (`docs/DESIGN_SYSTEM.md`)
- Accessibility approach
- **Data Schema Mapping** (`docs/DATA_SCHEMA_MAPPING.md`) - MANDATORY

#### Data Schema Mapping Requirement (NEW in v1.2.0)

> **Critical Learning:** Never build UI without verifying data exists.
> Source: ETF Statistics project - built portfolio allocation chart without share quantity data.

**Before G4 can be approved, the Product Manager MUST certify:**
- [ ] Every UI element in the designs has been mapped to a data source
- [ ] All required fields exist in `docs/ARCHITECTURE.md` database schema
- [ ] No UI element depends on data that doesn't exist or cannot be input
- [ ] Empty states are defined for each data-dependent UI element

**Required Artifact:** `docs/DATA_SCHEMA_MAPPING.md`

| UI Element | Data Source | Fields Required | Schema Location | Verified? |
|------------|-------------|-----------------|-----------------|-----------|
| [Element 1] | [table/API] | [field1, field2] | ARCHITECTURE.md:L## | Yes/No |

**G4 CANNOT be approved if:**
- Any UI element lacks a mapped data source
- Any required field is missing from the architecture schema
- Any visualization lacks input mechanism for its underlying data
- Integration test plan has no UI scenarios (see below)

#### Integration Test Plan Review (NEW in v1.7.0)

> **Critical Learning:** Integration tests need ownership from design phase.
> Source: CNDI project - no integration tests at QA stage, discovered issues late.

**At G4, the UX/UI Designer MUST:**
1. Review the integration test plan (initialized by Architect at G3)
2. Add UI→API integration scenarios for each major user flow
3. Identify which tests are critical vs. high priority

**MCP Tool:**
```typescript
// UX/UI Designer adds UI integration scenarios at G4
await mcp.callTool('add_integration_test_scenario', {
  project_path: '/path/to/project',
  description: 'Login form submits to auth API and redirects on success',
  components: ['LoginForm', 'AuthAPI', 'SessionStore'],
  owner: 'frontend',
  priority: 'critical',
  related_stories: ['US-001'],
  added_by: 'UX/UI Designer'
});
```

**G4 Integration Test Checklist:**
- [ ] Each user flow has at least one integration test scenario
- [ ] Critical auth/data flows marked as `priority: critical`
- [ ] Test ownership assigned (frontend for UI→API, backend for API→DB)

#### G4 Required Proofs (MANDATORY)

**G4 CANNOT be approved without these proof artifacts:**

| Proof | File | Description | Blocking? |
|-------|------|-------------|-----------|
| `design_option_1` | `designs/options/option-1.html` | First HTML design option | **YES** |
| `design_option_2` | `designs/options/option-2.html` | Second HTML design option | **YES** |
| `design_option_3` | `designs/options/option-3.html` | Third HTML design option | **YES** |
| `design_comparison` | `designs/comparison.html` | Side-by-side comparison page | **YES** |
| `user_selection` | `.truth/proofs/G4/user-selection.json` | User's choice recorded | **YES** |
| `design_system` | `docs/DESIGN_SYSTEM.md` | Component library documentation | **YES** |
| `data_schema_mapping` | `docs/DATA_SCHEMA_MAPPING.md` | UI→Data field mapping | **YES** |

**MCP Tool for G4 Proof Validation:**
```typescript
// UX/UI Designer calls before presenting G4
const proofStatus = await mcp.callTool('get_gate_proof_status', {
  project_path: '/path/to/project',
  gate: 'G4'
});

// Must return all 7 proofs present before gate can be presented
if (!proofStatus.all_present) {
  // BLOCK - Cannot present G4
  console.log('Missing proofs:', proofStatus.missing);
}
```

**Anti-Pattern: "Crappy .md docs"**

The following do NOT satisfy G4 proof requirements:
- ❌ Markdown wireframes (must be HTML)
- ❌ Text descriptions of designs (must be viewable in browser)
- ❌ Single design option (must have 3 options)
- ❌ Figma links only (must have local HTML files)

The user must be able to:
1. Open `designs/comparison.html` in a browser
2. Click through each of the 3 options
3. See working HTML/CSS (not just mockups)

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Approve** | Designs locked, proceed to implementation |
| **Revise** | Specific screens/flows need changes (return to refinement) |
| **User Testing** | Need validation before approval |

#### G4 Mandatory Rules (NEW in v4.0)

**G4 is REQUIRED when:**
- Project has ANY user interface (web, mobile, desktop)
- Project is greenfield (new development)
- Project involves significant UI changes (enhancement projects)

**G4 CANNOT be skipped by:**
- User request alone (for UI projects)
- Time pressure
- "Simple" UI claims
- Using component libraries (shadcn, etc. still need design decisions)

**The design phase MUST include:**
1. ✅ Generation of 3 diverse HTML design options
2. ✅ User viewing and comparing options in browser
3. ✅ User selection of preferred direction
4. ✅ At least 1 refinement round based on feedback
5. ✅ Explicit user approval of final design

#### G4 Skip Criteria (Restricted)

G4 can ONLY be skipped under these **narrow** conditions:

| Condition | Skip Allowed | Verification |
|-----------|--------------|--------------|
| **API-only project** | YES | No routes serve HTML/UI |
| **CLI tool** | YES | Terminal-only interface |
| **Backend service** | YES | No user-facing UI at all |
| **Library/SDK** | YES | No visual components |

**Skip Decision Tree:**

```
Does the project have ANY user interface?
├─ NO (API/CLI/Backend only) → Skip G4, proceed to G5
└─ YES (any UI at all)
    └─ G4 is MANDATORY
        └─ Must complete:
            1. Generate 3 HTML design options
            2. User reviews in browser
            3. User selects direction
            4. Refinement rounds
            5. Final approval
```

**When Skipping G4 (non-UI projects only):**

1. Log decision in DECISIONS.md:
```markdown
## DEC-XXX: Skip Design Phase (G4)

**Date:** YYYY-MM-DD
**Decision By:** Orchestrator
**Reason:** [API-only project | CLI tool | Backend service | Library/SDK]
**Verification:** [Confirm no UI routes/components exist]
**Note:** G4 skip is ONLY valid for non-UI projects
```

2. Update PROJECT_STATE.md to show G4 as "SKIPPED (Non-UI Project)"
3. Proceed directly to G5.1 (Foundation)

#### G4 Process Flow (for UI Projects)

```
G3 Approved (Architecture)
         │
         ▼
┌─────────────────────────────────────────────────┐
│              G4: DESIGN PHASE                   │
│                                                 │
│  Step 1: Generate 3 HTML Design Options         │
│          └─ designs/options/option-[1-3].html   │
│          └─ designs/comparison.html             │
│                     │                           │
│                     ▼                           │
│  Step 2: User Reviews Options in Browser        │
│          └─ User opens comparison.html          │
│          └─ User clicks through each option     │
│                     │                           │
│                     ▼                           │
│  Step 3: User Selects Direction                 │
│          └─ "I like option 2"                   │
│          └─ "Combine X from 1 with Y from 3"    │
│                     │                           │
│                     ▼                           │
│  Step 4: Iterative Refinement                   │
│          └─ designs/refined/v1.html             │
│          └─ User provides feedback              │
│          └─ Repeat until satisfied              │
│                     │                           │
│                     ▼                           │
│  Step 5: Final Approval                         │
│          └─ designs/final/                      │
│          └─ User says "approved"                │
│                     │                           │
└─────────────────────│───────────────────────────┘
                      ▼
              G4 APPROVED → G5 Development

---

### G5: Feature Acceptance (Spec-First)

**When:** After development complete (before testing)
**Presenter:** Frontend/Backend Developers

**Present:**
- Implemented features (demo or screenshots)
- User stories completed (checklist)
- **Spec Compliance Report**
- Known limitations
- Technical debt incurred

#### G5 Spec Compliance Checklist (MANDATORY)

Development must implement specs exactly. **Check TECH_STACK.md to determine stack.**

##### Node.js Backend Compliance
```bash
# 1. All OpenAPI endpoints implemented
grep -c "operationId" specs/openapi.yaml  # Count endpoints
find backend/src/routes -name "*.ts" | xargs grep -c "router\." | awk -F: '{sum+=$2} END {print sum}'

# 2. Prisma schema used without modification
diff prisma/schema.prisma <original-from-architect>  # Should be empty

# 3. Zod schemas imported (not custom validation)
grep -r "from.*specs/schemas" backend/src/ | wc -l  # Should be > 0
grep -r "z\.object\|z\.string" backend/src/ | grep -v "specs/schemas" | wc -l  # Should be 0

# 4. Types from specs
grep -r "from.*specs/schemas" frontend/src/ | wc -l  # Should be > 0
```

##### Python Backend Compliance
```bash
# 1. All OpenAPI endpoints implemented
grep -c "operationId" specs/openapi.yaml  # Count endpoints
grep -r "@app\.\|@router\." src/api/ | wc -l  # Count routes

# 2. SQLAlchemy models match database-schema.json
python -c "from src.models import *; print('OK')"  # Must pass

# 3. Pydantic schemas imported (not custom validation)
grep -r "from specs.schemas" src/api/ | wc -l  # Should be > 0
grep -r "class.*BaseModel" src/api/ | wc -l  # Should be 0 (no custom schemas in api/)

# 4. Response models use Pydantic from specs
grep -r "response_model=" src/api/ | wc -l  # Should match endpoint count
```

**G5 Spec Criteria:**

| Check | Node.js | Python | Blocking? |
|-------|---------|--------|-----------|
| All OpenAPI endpoints implemented | Count matches spec | Count matches spec | **YES** |
| DB schema unchanged | Prisma unmodified | SQLAlchemy matches spec | **YES** |
| Backend uses validation schemas | Zod from specs/ | Pydantic from specs/ | **YES** |
| Frontend uses validation schemas | zodResolver | (N/A or Pydantic types) | **YES** |
| Types from specs | No duplicate interfaces | No custom schemas in api/ | Recommended |
| Request validation | All endpoints validate | All endpoints validate | **YES** |
| Response formatting | Matches spec | response_model= used | **YES** |

**Spec Compliance Report Format:**

```markdown
## Spec Compliance Report

### Backend (Node.js)
- OpenAPI endpoints: 15/15 implemented
- Prisma schema: Unchanged
- Zod schema imports: 23 usages
- Custom validation code: 0 instances

### Backend (Python)
- OpenAPI endpoints: 15/15 implemented
- SQLAlchemy models: Match database-schema.json
- Pydantic schema imports: 23 usages
- Custom validation code: 0 instances
- Response models: 15/15 use response_model=

### Frontend
- Forms with zodResolver: 5/5 (or Pydantic-generated types)
- Types from specs: 18 imports
- Custom interfaces: 0

### Integration
- Request/response mismatches: 0
- Type errors between FE/BE: 0
```

**G5 CANNOT be approved if:**
- Any OpenAPI endpoint not implemented
- DB schema was modified outside spec
- Custom validation exists (instead of spec schemas)
- Request/response types don't match specs

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Accept** | All specs implemented correctly, proceed to testing |
| **Partial Accept** | Minor spec deviations documented, proceed with plan |
| **Reject** | Spec compliance issues, back to development |

#### G5 AI/ML Required Proofs (MANDATORY for `ai_ml` or `hybrid` projects)

> **CRITICAL:** If `project_type` == `ai_ml` OR `hybrid`, the following AI agents MUST be spawned and their proofs collected BEFORE G5 can be approved.

**G5 AI Proof Artifacts:**

| Proof | File | Agent | Description | Blocking? |
|-------|------|-------|-------------|-----------|
| `ai_architecture` | `docs/AI_ARCHITECTURE.md` | ML Engineer | Model selection, integration design | **YES** |
| `ai_services` | `src/services/ai/` folder exists | ML Engineer | AI service implementation | **YES** |
| `prompt_library` | `prompts/registry.ts` | Prompt Engineer | Prompt templates and registry | **YES** |
| `prompt_docs` | `docs/PROMPT_LIBRARY.md` | Prompt Engineer | Prompt documentation | **YES** |
| `prompt_tests` | `prompts/*.test.ts` | Prompt Engineer | Prompt test coverage | **YES** |
| `model_config` | `config/ai-models.yml` | ML Engineer | Model configuration | **YES** |
| `cost_estimate` | `docs/AI_COST_ESTIMATE.md` | ML Engineer | Token/API cost projections | Recommended |

**AI Agent Spawn Verification:**
```typescript
// Orchestrator checks before presenting G5 for ai_ml/hybrid
const projectType = await mcp.callTool('get_project_type', { project_path });

if (projectType === 'ai_ml' || projectType === 'hybrid') {
  const aiAgentStatus = await mcp.callTool('validate_agent_spawn_for_gate', {
    project_path,
    gate: 'G5',
    required_agents: ['ml-engineer', 'prompt-engineer']
  });

  if (!aiAgentStatus.valid) {
    // BLOCK - AI agents not spawned
    console.log('Missing AI agents:', aiAgentStatus.missing_agents);
    // DO NOT present G5
  }
}
```

**AI Proof Validation:**
```bash
# Verify AI deliverables exist
test -f docs/AI_ARCHITECTURE.md || echo "MISSING: AI_ARCHITECTURE.md"
test -d src/services/ai/ || echo "MISSING: src/services/ai/"
test -f prompts/registry.ts || echo "MISSING: prompts/registry.ts"
test -f docs/PROMPT_LIBRARY.md || echo "MISSING: PROMPT_LIBRARY.md"
find prompts -name "*.test.ts" | wc -l  # Should be > 0
```

**G5 CANNOT be approved for AI projects if:**
- ML Engineer was not spawned
- Prompt Engineer was not spawned
- AI_ARCHITECTURE.md is missing
- Prompt library has no tests
- No AI service code exists in `src/services/ai/`

**Anti-Pattern: "Did not optimize AI functions using experts"**

The following do NOT satisfy G5 AI requirements:
- ❌ Orchestrator or general-purpose agent writing AI code
- ❌ Backend Developer handling all AI integration
- ❌ No prompt testing or documentation
- ❌ Hardcoded prompts instead of registry
- ❌ No cost estimation for AI API calls

---

### Pre-G6: External Requirements Check

**When:** After G5 approved, before spawning QA Engineer
**Enforced by:** TruthStore - `get_gate_readiness('G6')` checks `external_requirements`

**MCP Tool:**
```typescript
// Orchestrator calls before G6
const readiness = await mcp.callTool('get_gate_readiness', {
  project_path: '/path/to/project',
  gate: 'G6'
});

// If external_requirements exist and user hasn't acknowledged:
if (readiness.external_requirements?.length > 0 && !readiness.external_requirements_acknowledged) {
  // Present notice to user, record acknowledgment
  await mcp.callTool('acknowledge_external_requirements', {
    project_path: '/path/to/project',
    gate: 'G6',
    user_choice: 'proceed_without' | 'credentials_ready' | 'pause'
  });
}
```

**User sees (only if external services detected):**
```markdown
## Before QA Testing

Your project uses external services that need credentials for full testing:
- [Auto-populated from truth store: Stripe, Auth0, etc.]

Do you have test credentials ready? (QA can proceed without them, but integration tests will be skipped)
```

**Skip this notice if:** `external_requirements` is empty in truth store.

---

### G6: Quality Sign-off

**When:** After QA testing complete
**Presenter:** QA Engineer

**Present:**
- Test results summary
- Bug report (open issues by severity)
- Test coverage metrics
- Performance test results
- Accessibility audit results

**MANDATORY Accessibility Checks (Must Pass):**

```bash
# These checks MUST pass before G6 can be approved

# 1. Run automated accessibility audit
npx axe-cli http://localhost:5173 --exit
# OR if using Playwright:
npm run test:a11y

# 2. Run Lighthouse accessibility audit
npx lighthouse http://localhost:5173 --only-categories=accessibility --output=json
# Score must be >= 90
```

**G6 Accessibility Criteria:**

| Check | Threshold | Blocking? |
|-------|-----------|-----------|
| **Critical a11y violations** | 0 allowed | **YES** |
| **Serious a11y violations** | 0 allowed | **YES** |
| **Moderate a11y violations** | Document & plan | No |
| **Minor a11y violations** | Document only | No |
| **Color contrast (WCAG AA)** | 4.5:1 minimum | **YES** |
| **Keyboard navigation** | All interactive elements | **YES** |
| **Lighthouse a11y score** | >= 90 | **YES** |

**Accessibility Checklist:**

- [ ] axe-core scan: 0 critical, 0 serious violations
- [ ] Lighthouse accessibility score >= 90
- [ ] Tab navigation reaches all interactive elements
- [ ] Focus indicators visible on all interactive elements
- [ ] Images have alt text (or aria-hidden if decorative)
- [ ] Form inputs have associated labels
- [ ] Error messages accessible to screen readers

**Exception Process:**
If accessibility fix requires significant refactoring:
1. Document in `docs/A11Y_EXCEPTIONS.md`
2. Include: Issue, impact, remediation plan, timeline
3. User must approve: "I accept accessibility exception for [issue]"

**MANDATORY Integration Test Validation (NEW in v1.7.0):**

> **Critical Learning:** Integration tests need explicit proof at QA gate.
> Source: CNDI project - no integration tests at QA stage, integration issues discovered late.

**G6 MUST validate integration tests using MCP tool:**
```typescript
// QA Engineer calls before G6 approval
const result = await mcp.callTool('validate_integration_tests', {
  project_path: '/path/to/project'
});

// Result format:
// {
//   compliant: boolean,
//   checks: [{ scenario_id, description, owner, priority, status, test_file }],
//   blocking_issues: ["2 CRITICAL tests not passing: INT-001, INT-003"],
//   summary: { total, planned, written, passing, failing, skipped }
// }
```

**G6 Integration Test Criteria:**

| Check | Threshold | Blocking? |
|-------|-----------|-----------|
| **Critical tests passing** | 100% | **YES** |
| **High tests passing** | 100% | **YES** |
| **Medium tests passing** | Document if skipped | No |
| **Failing tests** | 0 allowed | **YES** |
| **Planned tests (critical/high)** | 0 allowed (must be written) | **YES** |
| **Skipped tests without reason** | 0 allowed | **YES** |

**Integration Test Checklist:**
- [ ] All critical integration tests passing
- [ ] All high priority integration tests passing
- [ ] No tests in "failing" state
- [ ] Skipped tests have documented reasons
- [ ] Test files exist for all "written" or higher status tests

**G6 CANNOT be approved if:**
- Any critical integration test is not passing
- Any high priority integration test is not passing
- Any test is in "failing" state
- Tests are skipped without documented reason

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Sign Off** | Quality acceptable, all a11y checks pass, integration tests pass |
| **Conditional** | Proceed with documented a11y remediation plan |
| **Fail** | Must fix critical/serious issues before proceeding |

#### G6 AI/ML Required Proofs (MANDATORY for `ai_ml` or `hybrid` projects)

> **CRITICAL:** If `project_type` == `ai_ml` OR `hybrid`, the Model Evaluator agent MUST be spawned and AI-specific quality tests performed BEFORE G6 can be approved.

**G6 AI Proof Artifacts:**

| Proof | File | Agent | Description | Blocking? |
|-------|------|-------|-------------|-----------|
| `eval_report` | `docs/EVAL_REPORT.md` | Model Evaluator | Model quality assessment | **YES** |
| `eval_datasets` | `datasets/` folder exists | Model Evaluator | Test datasets | **YES** |
| `accuracy_benchmarks` | `eval-results/accuracy.json` | Model Evaluator | Accuracy metrics | **YES** |
| `latency_benchmarks` | `eval-results/latency.json` | Model Evaluator | Response time metrics | **YES** |
| `cost_benchmarks` | `eval-results/cost.json` | Model Evaluator | Token/cost metrics | Recommended |
| `hallucination_tests` | `eval-results/hallucination.json` | Model Evaluator | Hallucination rate | **YES** |

**AI Quality Thresholds:**

| Metric | Minimum | Blocking? |
|--------|---------|-----------|
| **Accuracy** (task-specific) | 85% | **YES** |
| **Latency P95** | < 3000ms | **YES** |
| **Hallucination rate** | < 5% | **YES** |
| **Test coverage** (prompts) | 80% | **YES** |
| **Cost per request** | Documented | Recommended |

**Model Evaluator Spawn Verification:**
```typescript
// Orchestrator checks before presenting G6 for ai_ml/hybrid
const projectType = await mcp.callTool('get_project_type', { project_path });

if (projectType === 'ai_ml' || projectType === 'hybrid') {
  const evalStatus = await mcp.callTool('validate_agent_spawn_for_gate', {
    project_path,
    gate: 'G6',
    required_agents: ['model-evaluator']
  });

  if (!evalStatus.valid) {
    // BLOCK - Model Evaluator not spawned
    console.log('Missing agent: model-evaluator');
    // DO NOT present G6
  }
}
```

**AI Proof Validation:**
```bash
# Verify Model Evaluator deliverables exist
test -f docs/EVAL_REPORT.md || echo "MISSING: EVAL_REPORT.md"
test -d datasets/ || echo "MISSING: datasets/ folder"
test -f eval-results/accuracy.json || echo "MISSING: accuracy.json"
test -f eval-results/latency.json || echo "MISSING: latency.json"
test -f eval-results/hallucination.json || echo "MISSING: hallucination.json"
```

**G6 CANNOT be approved for AI projects if:**
- Model Evaluator was not spawned
- EVAL_REPORT.md is missing
- Accuracy below 85%
- Hallucination rate above 5%
- P95 latency above 3000ms
- No test datasets exist

**Anti-Pattern: "Skipping AI evaluation"**

The following do NOT satisfy G6 AI requirements:
- ❌ QA Engineer doing AI evaluation (wrong agent)
- ❌ No benchmarking before production
- ❌ "It works on my examples" without systematic testing
- ❌ No hallucination testing
- ❌ Manual spot-checking instead of automated evaluation

---

### G7: Security Acceptance

**When:** After security review complete
**Presenter:** Security & Privacy Engineer

**Present:**
- Security scan results
- Vulnerability summary (by severity)
- Threat model summary
- Compliance status
- Remediation plan for any open issues

**MANDATORY Security Checks (Must Pass):**

```bash
# These commands MUST pass before G7 can be approved

# 1. npm audit with strict level - NO EXCEPTIONS
npm audit --audit-level=moderate
# Exit code MUST be 0. Any moderate+ vulnerability blocks G7.

# 2. Verify package-lock.json is committed (no floating dependencies)
git ls-files package-lock.json | grep -q package-lock.json
# Must return true. Floating dependencies = security risk.

# 3. Check for hardcoded secrets
grep -r "PRIVATE_KEY\|SECRET\|PASSWORD\|API_KEY" --include="*.ts" --include="*.tsx" --include="*.js" src/
# Must return empty. Any matches require review.
```

**G7 Blocking Criteria:**
| Check | Threshold | Blocking? |
|-------|-----------|-----------|
| `npm audit` critical | 0 allowed | **YES** |
| `npm audit` high | 0 allowed | **YES** |
| `npm audit` moderate | 0 allowed | **YES** |
| `npm audit` low | Document only | No |
| Hardcoded secrets | 0 allowed | **YES** |
| package-lock.json missing | Must exist | **YES** |

**Exception Process:**
If a vulnerability cannot be fixed (no patch available):
1. Document in `docs/SECURITY_EXCEPTIONS.md`
2. Include: CVE ID, affected package, risk assessment, mitigation plan
3. User must explicitly approve exception with: "I accept the security risk for [CVE-ID]"
4. Re-evaluate at next release

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Accept** | Security posture acceptable, all checks pass |
| **Accept with Plan** | Proceed with documented exceptions and remediation timeline |
| **Reject** | Must fix before deployment |

---

### G8: Go/No-Go (Pre-Deployment)

**When:** Before production deployment
**Presenter:** Orchestrator

#### Pre-Deployment Report (MANDATORY)

> **G8 CANNOT be presented without a complete PRE_DEPLOYMENT_REPORT.md**

**Generated:** By Orchestrator immediately after G7 approval, before activating DevOps for G8
**Output:** `docs/PRE_DEPLOYMENT_REPORT.md`
**Template:** `templates/docs/PRE_DEPLOYMENT_REPORT.md`

**Report Must Include:**
1. **Development Summary** - Features completed vs deferred
2. **Quality Gate Results** - G5, G6, G7 pass/fail summary
3. **Deployment Recommendations** - Environment config, infrastructure, costs
4. **Risk Assessment** - Deployment risks with mitigations
5. **Rollback Plan** - Step-by-step rollback procedure
6. **Go/No-Go Recommendation** - System recommendation based on all gates

**Present:**
- **PRE_DEPLOYMENT_REPORT.md** (full document - REQUIRED)
- Deployment readiness checklist
- Rollback plan
- Monitoring setup
- Known risks
- Cost estimates (infrastructure)

**G8 Checklist (All Required):**

| Check | Requirement | Blocking? |
|-------|-------------|-----------|
| PRE_DEPLOYMENT_REPORT.md exists | Full report generated | **YES** |
| All quality gates passed | G5, G6, G7 approved | **YES** |
| Environment variables documented | All required vars listed | **YES** |
| Rollback plan documented | Step-by-step procedure | **YES** |
| DEPLOYMENT_GUIDE.md exists | Deployment procedures | **YES** |
| OPERATIONS.md exists (if Docker Compose) | Operational runbook | **YES** |
| Infrastructure costs estimated | Monthly cost projection | No |
| Monitoring configured | Health checks, alerts | Recommended |

**Docker Compose Deployment Requirements:**

When `docker-compose.yml` is present in the project:
- `OPERATIONS.md` is **MANDATORY** and must include:
  - Service start/stop/restart commands
  - Log access procedures
  - Health check commands for each service
  - Database backup/restore procedures
  - Troubleshooting guide for common issues
  - Environment variable documentation
  - Monitoring and alerting setup

**G8 CANNOT be approved if Docker Compose exists but OPERATIONS.md is missing.**

#### G8 Required Proofs (MANDATORY)

**G8 CANNOT be approved without these proof artifacts:**

| Proof | File/Command | Description | Blocking? |
|-------|--------------|-------------|-----------|
| `pre_deployment_report` | `docs/PRE_DEPLOYMENT_REPORT.md` | Full deployment readiness report | **YES** |
| `lighthouse_performance` | `.truth/proofs/G8/lighthouse-performance.json` | Lighthouse performance audit (score >= 80) | **YES** |
| `lighthouse_accessibility` | `.truth/proofs/G8/lighthouse-accessibility.json` | Lighthouse a11y audit (score >= 90) | **YES** |
| `lighthouse_best_practices` | `.truth/proofs/G8/lighthouse-best-practices.json` | Lighthouse best practices (score >= 80) | **YES** |
| `build_output` | `.truth/proofs/G8/build-output.json` | Production build succeeded | **YES** |
| `deployment_guide` | `deployment/DEPLOYMENT_GUIDE.md` | Deployment procedures | **YES** |
| `env_example` | `.env.example` or `deployment/.env.example` | Environment variable template | **YES** |

**Lighthouse Audit Commands (MANDATORY):**
```bash
# Run Lighthouse audit against staging URL
npx lighthouse https://staging.example.com \
  --output=json \
  --output-path=.truth/proofs/G8/lighthouse-report.json \
  --chrome-flags="--headless"

# Extract scores (must meet thresholds)
cat .truth/proofs/G8/lighthouse-report.json | jq '.categories.performance.score * 100'  # >= 80
cat .truth/proofs/G8/lighthouse-report.json | jq '.categories.accessibility.score * 100' # >= 90
cat .truth/proofs/G8/lighthouse-report.json | jq '.categories["best-practices"].score * 100' # >= 80
```

**G8 Score Thresholds:**

| Category | Minimum Score | Blocking? |
|----------|---------------|-----------|
| Performance | 80 | **YES** |
| Accessibility | 90 | **YES** |
| Best Practices | 80 | **YES** |
| SEO | 70 | Recommended |

**MCP Tool for G8 Proof Validation:**
```typescript
// DevOps Engineer calls before presenting G8
const proofStatus = await mcp.callTool('get_gate_proof_status', {
  project_path: '/path/to/project',
  gate: 'G8'
});

// Must return all proofs present AND scores above thresholds
if (!proofStatus.all_present || !proofStatus.scores_passing) {
  // BLOCK - Cannot present G8
  console.log('Missing proofs:', proofStatus.missing);
  console.log('Failing scores:', proofStatus.failing_scores);
}
```

**Anti-Pattern: "Did not do lighthouse"**

The following do NOT satisfy G8 proof requirements:
- ❌ Skipping Lighthouse because "it takes too long"
- ❌ Running Lighthouse locally instead of staging URL
- ❌ Accepting scores below thresholds without documented exception
- ❌ Manual visual inspection instead of automated audit

**Exception Process:**
If a Lighthouse score cannot meet threshold:
1. Document in `docs/PERFORMANCE_EXCEPTIONS.md`
2. Include: Metric, current score, target score, remediation plan
3. User must approve: "I accept performance exception for [metric]"

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Go** | Deploy to production (all gates passed, risks acceptable) |
| **Delay** | Not ready, specific blockers identified |
| **Staged** | Deploy to subset first (canary/blue-green) |
| **Conditional Go** | Proceed with documented conditions |

#### G8 AI/ML Required Proofs (MANDATORY for `ai_ml` or `hybrid` projects)

> **CRITICAL:** If `project_type` == `ai_ml` OR `hybrid`, the AIOps Engineer agent MUST be spawned alongside DevOps Engineer for AI-specific deployment concerns.

**G8 AI Proof Artifacts:**

| Proof | File | Agent | Description | Blocking? |
|-------|------|-------|-------------|-----------|
| `ai_ops_runbook` | `docs/AI_OPERATIONS.md` | AIOps Engineer | AI system operations guide | **YES** |
| `model_serving_config` | `deployment/model-serving.yml` | AIOps Engineer | Model serving configuration | **YES** |
| `ai_monitoring_config` | `config/ai-monitoring.yml` | AIOps Engineer | AI-specific alerts and dashboards | **YES** |
| `cost_alerts` | Configured in monitoring | AIOps Engineer | Token spend alerts | **YES** |
| `rate_limiting` | `config/rate-limits.yml` | AIOps Engineer | API rate limiting config | **YES** |
| `fallback_config` | `config/fallbacks.yml` | AIOps Engineer | Circuit breakers and fallbacks | **YES** |
| `cache_config` | `config/ai-cache.yml` | AIOps Engineer | Response caching strategy | Recommended |

**AI Operations Thresholds:**

| Metric | Threshold | Blocking? |
|--------|-----------|-----------|
| **Model latency P95** | < 2000ms | **YES** |
| **Error rate** | < 1% | **YES** |
| **Cost per 1K requests** | Documented | **YES** |
| **Cache hit rate** | > 50% (if caching) | Recommended |
| **Rate limit configured** | Yes | **YES** |
| **Fallback tested** | Yes | **YES** |

**AIOps Engineer Spawn Verification:**
```typescript
// Orchestrator checks before presenting G8 for ai_ml/hybrid
const projectType = await mcp.callTool('get_project_type', { project_path });

if (projectType === 'ai_ml' || projectType === 'hybrid') {
  const aiOpsStatus = await mcp.callTool('validate_agent_spawn_for_gate', {
    project_path,
    gate: 'G8',
    required_agents: ['devops-engineer', 'aiops-engineer']
  });

  if (!aiOpsStatus.valid) {
    // BLOCK - AIOps Engineer not spawned
    console.log('Missing agent: aiops-engineer');
    // DO NOT present G8
  }
}
```

**AI Proof Validation:**
```bash
# Verify AIOps deliverables exist
test -f docs/AI_OPERATIONS.md || echo "MISSING: AI_OPERATIONS.md"
test -f deployment/model-serving.yml || echo "MISSING: model-serving.yml"
test -f config/ai-monitoring.yml || echo "MISSING: ai-monitoring.yml"
test -f config/rate-limits.yml || echo "MISSING: rate-limits.yml"
test -f config/fallbacks.yml || echo "MISSING: fallbacks.yml"
```

**G8 CANNOT be approved for AI projects if:**
- AIOps Engineer was not spawned
- AI_OPERATIONS.md is missing
- No rate limiting configured
- No fallback/circuit breaker configured
- No cost alerts configured
- Model serving not documented

**Anti-Pattern: "DevOps handles everything"**

The following do NOT satisfy G8 AI requirements:
- ❌ DevOps Engineer handling AI deployment alone
- ❌ No AI-specific monitoring or alerting
- ❌ No cost tracking for AI API calls
- ❌ No rate limiting (can lead to cost explosion)
- ❌ No fallback strategy (AI APIs go down)

---

### G9: Production Acceptance

**When:** After deployment, stability period complete
**Presenter:** DevOps Engineer / QA Engineer

**ACTIONS AFTER G9 APPROVAL:**
Initialize post-launch maintenance document (required before G10):
```typescript
await mcp.callTool('init_gate_documents', {
  project_path: '/path/to/project',
  gate: 'G9'
});
```
This creates:
- `docs/POST_LAUNCH.md` - Maintenance and evolution guide for launched app

**Present:**
- Production metrics (error rate, performance)
- **Synthetic Smoke Test Results** (MANDATORY)
- User feedback summary
- Open issues
- Operational status

#### Synthetic Smoke Test Requirement (NEW in v1.2.0)

> **G9 CANNOT be approved without a passing synthetic smoke test.**

**What is required:**
A Playwright (or Cypress) script that:
1. Opens the production URL
2. Performs the critical user journey (login, core feature, logout)
3. Returns exit code 0 on success

**Required Script Location:** `tests/e2e/smoke.spec.ts`

**Example Smoke Test:**

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Production Smoke Test', () => {
  const PROD_URL = process.env.PROD_URL || 'https://your-app.com';

  test('critical user journey', async ({ page }) => {
    // 1. Load homepage
    await page.goto(PROD_URL);
    await expect(page).toHaveTitle(/Your App/);

    // 2. Login (if applicable)
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email"]', process.env.TEST_EMAIL!);
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD!);
    await page.click('[data-testid="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // 3. Perform core action
    await page.click('[data-testid="primary-feature"]');
    await expect(page.locator('[data-testid="success-indicator"]')).toBeVisible();

    // 4. Logout
    await page.click('[data-testid="logout"]');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/health`);
    expect(response.status()).toBe(200);
  });
});
```

**Running the Smoke Test:**

```bash
# Run against production
PROD_URL=https://your-app.com npx playwright test tests/e2e/smoke.spec.ts

# Exit code must be 0 for G9 approval
echo $?  # Must output: 0
```

**G9 Approval Checklist:**

| Check | Required | Blocking? |
|-------|----------|-----------|
| Smoke test script exists | `tests/e2e/smoke.spec.ts` | **YES** |
| Smoke test passes on production URL | Exit code 0 | **YES** |
| Error rate < 1% (last 24h) | Monitoring dashboard | **YES** |
| P95 latency < 2s | Monitoring dashboard | **YES** |
| No critical/high severity bugs open | Issue tracker | **YES** |
| Health endpoint returns 200 | `/health` | **YES** |

**G9 Presentation Must Include:**

```markdown
## G9 Production Acceptance

### Smoke Test Results
- **Script:** tests/e2e/smoke.spec.ts
- **Production URL:** https://your-app.com
- **Last Run:** YYYY-MM-DD HH:MM
- **Exit Code:** 0 (PASS) / 1 (FAIL)
- **Duration:** X.Xs

### Critical Metrics (Last 24h)
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Error Rate | X.X% | < 1% | PASS/FAIL |
| P95 Latency | XXXms | < 2000ms | PASS/FAIL |
| Uptime | XX.X% | > 99.5% | PASS/FAIL |

### Open Issues
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | X |
| Low | X |
```

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Accept** | Smoke test passes, metrics healthy, proceed to G10 |
| **Extend** | Smoke test passes but need more monitoring time |
| **Fail** | Smoke test fails OR critical metrics breached - fix required |

---

### G10: Project Completion Report (MANDATORY)

**When:** After production accepted (G9)
**Presenter:** Orchestrator
**Output:** `docs/COMPLETION_REPORT.md`

**Present:**
- Executive summary (project name, duration, classification)
- Features delivered vs. planned
- Technical stack overview
- Timeline metrics (planned vs. actual)
- Quality metrics (coverage, lint, security)
- Code metrics (LOC, files, components, tests)
- Security summary
- Testing summary (pass/fail counts)
- Deployment information (URL, environment)
- User acceptance confirmation
- Agent cost metrics (if tracked)
- Lessons learned

**Report Format:**
```markdown
## Project Complete!

**Project:** [Name]
**Duration:** [X days/weeks]
**Features Delivered:** [X of Y]

### Key Metrics
| Metric | Value |
|--------|-------|
| Test Coverage | [X%] |
| Lighthouse Score | [X] |
| Security Issues | [0 critical] |
| Agent Cost | $[X.XX] |

**Full report:** docs/COMPLETION_REPORT.md
```

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Acknowledge** | Report reviewed, project officially complete |
| **Corrections** | Minor corrections to report needed |
| **Additional Info** | Request more detail in specific section |

**Post-Completion:** Project state = `COMPLETE`

---

### E2: Assessment Recommendation Approval

**When:** After assessment phase complete (enhancement projects)
**Presenter:** Orchestrator

**Present:**
- ASSESSMENT.md summary
- Overall health score (1-10)
- Scores by category
- Critical issues found
- GAP_ANALYSIS.md summary
- TECH_DEBT.md highlights
- Recommendation (Maintain/Enhance/Refactor/Rewrite)
- ENHANCEMENT_PLAN.md overview

**Decision Options:**
| Option | Description |
|--------|-------------|
| **Accept Recommendation** | Proceed with suggested approach |
| **Different Approach** | Choose alternative |
| **More Analysis** | Need deeper assessment in specific area |
| **No Action** | Accept current state, no changes |

---

## Capturing Decisions

All approvals logged in `docs/DECISIONS.md`:

```markdown
## DECISION-XXX: [Gate Name] Approval

**Date:** YYYY-MM-DD
**Gate:** G1 / G2 / etc.
**Decision:** Approved / Approved with Conditions / Rejected
**Approved By:** [Name]

### Context
[What was being decided]

### Decision
[What was decided]

### Conditions (if any)
- [Condition 1]
- [Condition 2]

### Rationale
[Why this decision was made]
```

---

## Quick Reference: When to Stop and Ask

| Situation | Action |
|-----------|--------|
| Phase complete | Present approval gate |
| Major decision needed | Present options with recommendation |
| Scope change requested | Stop, present impact, get approval |
| Blocker encountered | Present problem with options |
| Assumption invalidated | Stop, reassess, present options |
| Conflict between agents | Present both views, ask for direction |

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Approval Validation | `constants/protocols/APPROVAL_VALIDATION_RULES.md` | Response validation rules and regex |
| Agent Handoff | `constants/protocols/AGENT_HANDOFF_PROTOCOL.md` | Agent spawning protocol |
| Mandatory Startup | `constants/protocols/MANDATORY_STARTUP.md` | Initial onboarding sequence |
| Orchestrator | `agents/orchestrator.md` | Main orchestrator instructions |
| State Management | `constants/advanced/STATE_MANAGEMENT.md` | TruthStore single source of truth |

---

## Version

**Version:** 2.1.0
**Last Updated:** 2026-01-06

### Changelog
- **2.1.0** (2026-01-06): Added Python stack support (SQLAlchemy/Pydantic) for G3 and G5 spec validation
- **2.0.0** (2026-01-02): Hub-and-Spoke integration - Gate-to-Task blocking, MCP gate tools, Autonomous vs Gated operations
- **1.3.0** (2025-01-02): Added Spec-First requirements for G3 and G5 (OpenAPI, Prisma, Zod validation)
- **1.2.0** (2025-12-19): Added Data Schema Mapping requirement for G4, Synthetic Smoke Test requirement for G9
- **1.1.0** (2024-01-15): Initial gate definitions
