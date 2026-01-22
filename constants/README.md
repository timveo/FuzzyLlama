# Constants Directory

> **Version 4.0.0**
>
> System protocols, definitions, and reference documentation for the Multi-Agent Product Creator.

---

## FuzzyLlama Implementation Note

These files are **reference documentation** from the Multi-Agent-Product-Creator framework. FuzzyLlama implements these concepts differently:

| Framework Reference | FuzzyLlama Implementation |
|---------------------|---------------------------|
| `mcp-server/` with SQLite | `backend/src/mcp/` with PostgreSQL via Prisma |
| `.truth/truth.json` files | PostgreSQL database (single source of truth) |
| Standalone MCP server | MCP tools integrated into NestJS backend |

When implementing features, translate the protocol concepts into FuzzyLlama's PostgreSQL-backed architecture.

---

## Directory Structure

```
constants/
├── core/           Fundamental definitions (start here)
├── protocols/      Main operational protocols
├── advanced/       Complex orchestration features
└── reference/      Supporting documentation
```

---

## Quick Reference

### Where to Start

| If you need... | Look in... |
|----------------|------------|
| Agent list and capabilities | `core/AGENT_INDEX.md` |
| Project phases and states | `core/CONSTANTS.md` |
| Startup and onboarding flow | `protocols/MANDATORY_STARTUP.md` |
| Gate definitions | `protocols/APPROVAL_GATES.md` |
| How agents communicate | `protocols/PROTOCOLS.md` |

---

## Core (`core/`)

Fundamental definitions that other files reference.

| File | Purpose |
|------|---------|
| `CONSTANTS.md` | Enums, phases, severities, ID formats |
| `AGENT_INDEX.md` | Agent registry, capabilities, cost estimates |
| `AGENT_DEPENDENCIES.md` | Agent dependency graph |

---

## Protocols (`protocols/`)

Main operational protocols that govern agent behavior.

| File | Purpose |
|------|---------|
| `MANDATORY_STARTUP.md` | Required startup sequence |
| `UNIFIED_ONBOARDING.md` | 5-question intake flow |
| `PROTOCOLS.md` | Master protocol reference |
| `APPROVAL_GATES.md` | Gate definitions (G1-G10) |
| `STATE_DEFINITIONS.md` | State machine definitions |
| `SPEC_FIRST_PROTOCOL.md` | Spec-driven development |
| `SPEC_CONSUMPTION_MANDATE.md` | Implementation agent requirements |
| `EXECUTION_PROTOCOL.md` | Code writing enforcement |
| `VERIFICATION_PROTOCOL.md` | Testing and validation |
| `SELF_HEALING_PROTOCOL.md` | Error recovery |

---

## Advanced (`advanced/`)

Complex orchestration features for parallel work and routing.

| File | Purpose |
|------|---------|
| `PARALLEL_WORK_PROTOCOL.md` | Parallelization strategy |
| `TASK_QUEUE_PROTOCOL.md` | Task queue management |
| `WORKER_SWARM.md` | Worker patterns |
| `AGENT_ROUTER_PROTOCOL.md` | Agent routing logic |
| `CONFLICT_RESOLUTION.md` | Conflict handling |
| `STATE_MANAGEMENT.md` | MCP state tools |
| `CONTINUOUS_VALIDATION.md` | Validation pipeline |
| `DYNAMIC_CONTEXT_PROTOCOL.md` | Context loading |
| `RECOVERY_PROTOCOL.md` | Recovery strategies |

---

## Reference (`reference/`)

Supporting documentation and specialized protocols.

| File | Purpose |
|------|---------|
| `TEACHING_PROTOCOL.md` | Teaching level definitions (CANONICAL) |
| `TEACHING_WORKFLOWS.md` | Gate presentation templates |
| `AGENT_INTRODUCTIONS.md` | Agent activation messages |
| `AGENT_COST_TRACKING.md` | Cost tracking implementation |
| `COST_ESTIMATION.md` | Cost estimation guide |
| `MODEL_TIERS.md` | Model selection guide |
| `STANDARD_TOOLING.md` | Standard tool requirements |
| `TOOL_ENFORCEMENT.md` | Tool enforcement rules |
| `EXTERNAL_TOOLS.md` | External tool integrations |
| `WORKFLOW_VALIDATION.md` | Workflow validation |
| `FRAMEWORK_AUDIT.md` | Framework audit guide |
| `FAST_TRACK_PROTOCOL.md` | Fast-track for experienced users |
| `FEATURE_LOOP_PROTOCOL.md` | Feature development loop |
| `DEVELOPMENT_CHECKPOINTS.md` | Development checkpoints |
| `HUMAN_INPUT_TRACKING.md` | Human input tracking |
| `LOVABLE_TRANSITION.md` | Lovable.dev migration |
| `MAINTENANCE_PROTOCOL.md` | Maintenance procedures |
| `PROJECT_COMPLETION_REPORT.md` | Completion report template |
| `RETROSPECTIVE_PROTOCOL.md` | Retrospective guide |
| `AGENT_VERSIONS.md` | Agent version history |

---

## Cross-Reference Updates

When referencing files from this directory, use the new paths:

```markdown
# Old (deprecated)
constants/protocols/PROTOCOLS.md

# New
constants/protocols/PROTOCOLS.md
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | 2026-01-02 | Reorganized into subdirectories |
| 1.0.0 | 2024-12-18 | Initial flat structure |
