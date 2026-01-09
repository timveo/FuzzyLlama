# Agent Handoff Protocol

> **Version:** 1.1.0
> **Last Updated:** 2026-01-08

---

## Purpose

This protocol defines how the orchestrator spawns specialized agents and hands off work at each gate. The orchestrator coordinates but does not perform specialized work directly.

---

## Core Principle

**The orchestrator is a coordinator, not a worker.**

- The orchestrator manages the task queue and presents gates
- Specialized agents perform the actual work
- Each gate requires its mandatory agent to complete work before presentation

---

## Handoff Points

| Gate | From | To | Trigger | Handoff Artifact |
|------|------|-----|---------|------------------|
| G1→G2 | Orchestrator | Product Manager | G1 approved | INTAKE.md |
| G2→G3 | Product Manager | Architect | G2 approved | PRD.md |
| G3→G4 | Architect | UX/UI Designer | G3 approved (UI project) | ARCHITECTURE.md, specs/ |
| G3→G5 | Architect | Frontend/Backend Dev | G3 approved (API-only) | ARCHITECTURE.md, specs/ |
| G4→G5 | UX/UI Designer | Frontend/Backend Dev | G4 approved | designs/final/ |
| G5→G6 | Frontend/Backend Dev | QA Engineer | G5 approved | Built application |
| G6→G7 | QA Engineer | Security Engineer | G6 approved | Test results |
| G7→G8 | Security Engineer | DevOps Engineer | G7 approved | Security report |
| G8→G9 | DevOps Engineer | DevOps Engineer | G8 approved | Staging deployment |

---

## How to Spawn an Agent

The orchestrator uses the Task tool to spawn agents. Each spawn must include:

1. **Agent identity** - Which agent prompt to load
2. **Project context** - Path and current state
3. **Specific task** - What the agent must do
4. **Return instruction** - Agent returns results, does not present gate

### Spawn Template

```
Task({
  subagent_type: "general-purpose",
  description: "[Agent Name] - [Gate] [task]",
  prompt: `You are the [Agent Name] Agent.

Read your full instructions from: agents/[agent-file].md

Project path: [project_path]
Current gate: [gate]

Your task:
1. [Specific task 1]
2. [Specific task 2]
3. [Specific task 3]

Return your results to the orchestrator. Include:
- [Required output 1]
- [Required output 2]
- [Proof artifacts generated]

Do NOT present the gate yourself - return results only.`
})
```

---

## Gate-Specific Handoffs

### G2: PRD Review (Product Manager)

```
Task({
  subagent_type: "general-purpose",
  description: "Product Manager - G2 PRD review",
  prompt: `You are the Product Manager Agent.

Read your full instructions from: agents/product-manager.md

Project path: [project_path]

Your task:
1. Review and finalize PRD.md
2. Ensure all user stories are complete
3. Verify acceptance criteria are testable

Return:
- PRD completion status
- User story count by priority
- Any gaps or concerns

Do NOT present G2 yourself - return results only.`
})
```

### G3: Architecture Validation (Architect)

```
Task({
  subagent_type: "general-purpose",
  description: "Architect - G3 spec validation",
  prompt: `You are the Architect Agent.

Read your full instructions from: agents/architect.md

Project path: [project_path]

Your task:
1. Run: swagger-cli validate specs/openapi.yaml
2. Run: npx prisma validate
3. Run: tsc --noEmit -p specs/tsconfig.json
4. Verify spec consistency

Return:
- Validation command outputs
- Pass/fail status for each
- Any schema inconsistencies

Do NOT present G3 yourself - return results only.`
})
```

### G4: Design Options (UX/UI Designer)

```
Task({
  subagent_type: "general-purpose",
  description: "UX/UI Designer - G4 design options",
  prompt: `You are the UX/UI Designer Agent.

Read your full instructions from: agents/ux-ui-designer.md

Project path: [project_path]

Your task:
1. Generate 3 diverse HTML design options
2. Create designs/comparison.html
3. Save to designs/options/option-1.html, option-2.html, option-3.html

Return:
- Paths to generated designs
- Description of each option's approach
- Ready for user review

Do NOT present G4 yourself - return results only.`
})
```

### G5: Build Verification (Frontend/Backend Dev)

```
Task({
  subagent_type: "general-purpose",
  description: "Dev - G5 build verification",
  prompt: `You are the Frontend/Backend Developer Agent.

Read your full instructions from: agents/frontend-dev.md and agents/backend-dev.md

Project path: [project_path]

Your task:
1. Run: npm run build
2. Run: npm run lint
3. Run: npm test

Return:
- Build output (success/failure)
- Lint results (errors/warnings count)
- Test results (pass/fail count)

Do NOT present G5 yourself - return results only.`
})
```

### G6: Test Suite (QA Engineer)

```
Task({
  subagent_type: "general-purpose",
  description: "QA Engineer - G6 test suite",
  prompt: `You are the QA Engineer Agent.

Read your full instructions from: agents/qa-engineer.md

Project path: [project_path]

Your task:
1. Run full test suite
2. Generate coverage report
3. Run accessibility audit (axe-core)
4. Document any failing tests

Return:
- Test results summary
- Coverage percentage
- Accessibility score
- List of failures (if any)

Do NOT present G6 yourself - return results only.`
})
```

### G7: Security Scan (Security Engineer)

```
Task({
  subagent_type: "general-purpose",
  description: "Security Engineer - G7 security scan",
  prompt: `You are the Security & Privacy Engineer Agent.

Read your full instructions from: agents/security-privacy-engineer.md

Project path: [project_path]

Your task:
1. Run: npm audit --audit-level=moderate
2. Check for hardcoded secrets
3. Review authentication implementation
4. Generate security report

Return:
- npm audit output
- Vulnerability counts by severity
- Secrets scan result (clean/issues)
- Security report path

Do NOT present G7 yourself - return results only.`
})
```

### G8: Deploy Checklist (DevOps Engineer)

```
Task({
  subagent_type: "general-purpose",
  description: "DevOps Engineer - G8 deploy checklist",
  prompt: `You are the DevOps Engineer Agent.

Read your full instructions from: agents/devops.md

Project path: [project_path]

Your task:
1. Verify environment variables documented
2. Create rollback plan
3. Deploy to staging
4. Run health check on staging

Return:
- Env vars checklist status
- Rollback plan path
- Staging URL
- Health check result

Do NOT present G8 yourself - return results only.`
})
```

### G9: Production Smoke Test (DevOps Engineer)

```
Task({
  subagent_type: "general-purpose",
  description: "DevOps Engineer - G9 smoke test",
  prompt: `You are the DevOps Engineer Agent.

Read your full instructions from: agents/devops.md

Project path: [project_path]
Production URL: [prod_url]

Your task:
1. Deploy to production
2. Run smoke test (Playwright/Cypress)
3. Verify health endpoint
4. Check error rates

Return:
- Production URL
- Smoke test results (pass/fail)
- Health check status
- Error rate (if monitoring available)

Do NOT present G9 yourself - return results only.`
})
```

---

## Agent Spawn Tracking (MANDATORY)

Every agent spawn MUST be tracked in the truth store. This enables gate validation.

### Before Spawning Agent

```typescript
// STEP 1: Record the spawn BEFORE calling Task()
record_agent_spawn({
  project_id: "[project_id]",
  agent: "security-engineer",
  gate: "G7",
  task_description: "Security scan and audit",
  justification: "G7 requires security review"
})

// STEP 2: Spawn agent via Task tool
Task({
  subagent_type: "general-purpose",
  description: "Security Engineer - G7 security scan",
  prompt: "..."
})

// STEP 3: After Task completes, record completion
complete_agent_spawn({
  project_id: "[project_id]",
  agent: "security-engineer",
  gate: "G7",
  success: true,
  output_summary: "npm audit passed, 0 vulnerabilities"
})
```

### Before Presenting Gate

```typescript
// VALIDATE all required agents were spawned
validate_agent_spawn_for_gate({
  project_id: "[project_id]",
  gate: "G7"
})
// Returns: { valid: true/false, missing_agents: [], spawned_agents: [] }

// IF validation fails, DO NOT present gate
// Spawn missing agents first
```

### Required Agents Per Gate

**Core Agents (ALL project types):**

| Gate | Required Agent(s) |
|------|-------------------|
| G2 | product-manager |
| G3 | architect |
| G4 | ux-ui-designer |
| G5 | frontend-developer, backend-developer |
| G6 | qa-engineer |
| G7 | security-engineer |
| G8 | devops-engineer |
| G9 | devops-engineer |

**AI Agents (ONLY for `ai_ml` or `hybrid` project_type):**

| Gate | Additional Required Agent(s) | Responsibility |
|------|------------------------------|----------------|
| G5 | ml-engineer, prompt-engineer | Model integration, prompt library |
| G5-G6 | model-evaluator | Benchmarking, quality testing |
| G8-G9 | aiops-engineer | AI deployment, cost monitoring |

**AI Agent Activation Check:**
```
CHECK project_type in INTAKE.md or STATUS.md:

IF project_type == "ai_ml" OR project_type == "hybrid":
    G5 requires: frontend-developer, backend-developer, ml-engineer, prompt-engineer
    G6 requires: qa-engineer, model-evaluator
    G8 requires: devops-engineer, aiops-engineer

IF project_type == "traditional" OR project_type == "api_only":
    Use core agents only (no AI agents)
```

---

## Handoff Verification

Before presenting any gate, the orchestrator must verify:

1. **Agent spawn recorded** - `record_agent_spawn()` was called
2. **Agent completed** - Task returned results
3. **Spawn completed** - `complete_agent_spawn()` was called
4. **Gate validation passes** - `validate_agent_spawn_for_gate()` returns valid
5. **Proof artifacts exist** - Required outputs generated
6. **Results are acceptable** - No blocking failures

```
IF agent_spawn_not_recorded:
    ERROR: Must call record_agent_spawn() before Task()

IF agent_not_spawned:
    ERROR: Cannot present gate without spawning mandatory agent

IF agent_returned_failure:
    DO NOT present gate
    Address failure first
    Re-run agent if needed

IF validate_agent_spawn_for_gate returns invalid:
    ERROR: Missing required agent spawns
    Spawn missing agents first

IF proof_artifacts_missing:
    ERROR: Cannot present gate without proof artifacts
    Re-run agent to generate artifacts
```

---

## Orchestrator Restrictions

The orchestrator must NOT:

- Run npm audit (Security Engineer's job)
- Run test suites (QA Engineer's job)
- Generate designs (UX/UI Designer's job)
- Deploy applications (DevOps Engineer's job)
- Write application code (Developer's job)

The orchestrator CAN:

- Read files to understand state
- Present gates with agent results
- Coordinate between agents
- Manage the task queue
- Log decisions

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Orchestrator | `agents/orchestrator.md` | Hub coordination |
| Worker Swarm | `constants/advanced/WORKER_SWARM.md` | Agent-to-worker mapping |
| Approval Gates | `constants/protocols/APPROVAL_GATES.md` | Gate definitions |
| Approval Validation | `constants/protocols/APPROVAL_VALIDATION_RULES.md` | Response validation rules |
| Agent Prompts | `agents/*.md` | Individual agent instructions |

---

## Version History

- **1.1.0** (2026-01-08): Added AI agent requirements for ai_ml/hybrid projects (G5, G6, G8)
- **1.0.0** (2026-01-05): Initial protocol - mandatory agent spawning via Task tool
