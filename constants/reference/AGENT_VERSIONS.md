# Agent Version Registry

> **This file tracks the version of each agent prompt in the system.**
> **Projects should record which versions were used for traceability.**

---

## Current Versions

| Agent | Version | Last Updated | Major Changes |
|-------|---------|--------------|---------------|
| Orchestrator | 2.1.0 | 2024-12-11 | Recovery protocol, metrics |
| Product Manager | 1.1.0 | 2024-12-11 | PRD ingestion |
| Architect | 1.2.0 | 2024-12-11 | TECH_STACK.md generation |
| UX/UI Designer | 1.0.0 | 2024-12-09 | Initial |
| Frontend Developer | 2.0.0 | 2024-12-11 | Mandatory checkpoints |
| Backend Developer | 2.0.0 | 2024-12-11 | Code execution protocol |
| Data Engineer | 1.0.0 | 2024-12-09 | Initial |
| ML Engineer | 1.0.0 | 2024-12-09 | Initial |
| Prompt Engineer | 1.0.0 | 2024-12-09 | Initial |
| Model Evaluator | 1.0.0 | 2024-12-09 | Initial |
| AIOps Engineer | 1.0.0 | 2024-12-09 | Initial |
| QA Engineer | 1.0.0 | 2024-12-09 | Initial |
| Security & Privacy Engineer | 1.0.0 | 2024-12-09 | Initial |
| DevOps Engineer | 1.0.0 | 2024-12-09 | Initial |

---

## Version Numbering Convention

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR (X.0.0)**: Breaking changes to agent behavior or output format
- **MINOR (0.X.0)**: New capabilities added, backwards compatible
- **PATCH (0.0.X)**: Bug fixes, clarifications, no behavior change

---

## Breaking Change Policy

Before releasing a **MAJOR** version change:

1. Document the breaking changes in the agent's changelog
2. Update dependent agents if needed
3. Update schemas if handoff format changes
4. Add migration notes for in-progress projects

---

## Recording Versions in Projects

Projects should record agent versions in `docs/PROJECT_STATE.md`:

```yaml
agent_versions_used:
  orchestrator: "2.1.0"
  product_manager: "1.1.0"
  architect: "1.2.0"
  frontend_developer: "2.0.0"
  backend_developer: "2.0.0"
  qa_engineer: "1.0.0"
```

This enables:
- Reproducing project behavior with same prompts
- Identifying which prompt version caused issues
- Rolling back to previous prompt versions if needed

---

## Version History

### Orchestrator

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2024-12-11 | Added recovery protocol reference, metrics tracking |
| 2.0.0 | 2024-12-10 | Development sub-gates (G5.1-G5.5), mandatory checkpoints |
| 1.2.0 | 2024-12-09 | Context compression protocol |
| 1.1.0 | 2024-12-08 | Assessment workflow for enhancements |
| 1.0.0 | 2024-12-01 | Initial version |

### Frontend Developer

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2024-12-11 | Mandatory checkpoint enforcement per component |
| 1.1.0 | 2024-12-09 | Tech stack compliance requirement |
| 1.0.0 | 2024-12-01 | Initial version with React/TypeScript |

### Backend Developer

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2024-12-11 | Mandatory code execution protocol |
| 1.1.0 | 2024-12-09 | Tech stack compliance requirement |
| 1.0.0 | 2024-12-01 | Initial version with Node.js/Express |

### Product Manager

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2024-12-11 | PRD ingestion for existing docs |
| 1.0.0 | 2024-12-01 | Initial version |

### Architect

| Version | Date | Changes |
|---------|------|---------|
| 1.2.0 | 2024-12-11 | TECH_STACK.md generation |
| 1.1.0 | 2024-12-08 | ADR format added |
| 1.0.0 | 2024-12-01 | Initial version |

---

## Compatibility Matrix

When using agents together, ensure compatible versions:

| Orchestrator | Frontend Dev | Backend Dev | Notes |
|--------------|--------------|-------------|-------|
| 2.1.x | 2.0.x | 2.0.x | Current recommended |
| 2.0.x | 2.0.x | 2.0.x | Compatible |
| 2.0.x | 1.x.x | 1.x.x | Works but no sub-gate checkpoints |
| 1.x.x | 1.x.x | 1.x.x | Legacy, no checkpoints |

---

**Last Updated:** 2024-12-11
