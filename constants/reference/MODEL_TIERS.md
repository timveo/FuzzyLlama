# Model Tier Routing

> **Version:** 4.0.0
> **Last Updated:** 2024-12-18
> **Purpose:** Optimize cost and speed by routing tasks to appropriate model tiers

---

## Overview

Not all tasks require the same level of model intelligence. By routing tasks to appropriate model tiers, we can:
- **Reduce costs** by using cheaper models for simple tasks
- **Improve speed** by using faster models for routine operations
- **Reserve power** for complex reasoning tasks that truly need it

---

## Tier Definitions

| Tier | Model Examples | Characteristics | Cost | Speed |
|------|----------------|-----------------|------|-------|
| **Tier 1: Fast** | Claude Haiku, GPT-4o-mini | Quick, efficient, pattern-based | $ | Very Fast |
| **Tier 2: Balanced** | Claude Sonnet, GPT-4o | Good reasoning, standard tasks | $$ | Medium |
| **Tier 3: Powerful** | Claude Opus, o1 | Deep reasoning, complex analysis | $$$ | Slower |

### Model Identifiers

| Tier | Claude | OpenAI | Notes |
|------|--------|--------|-------|
| Tier 1 | `claude-3-haiku-20240307` | `gpt-4o-mini` | Best for simple, structured tasks |
| Tier 2 | `claude-3-5-sonnet-20241022` | `gpt-4o` | Default for most development |
| Tier 3 | `claude-3-opus-20240229` | `o1-preview` | Complex reasoning, architecture |

---

## Task-to-Tier Mapping

### Tier 1 (Fast) Tasks

These are simple, repetitive, or highly structured tasks:

| Task | Agent | Rationale |
|------|-------|-----------|
| STATUS.md updates | Orchestrator | Template filling, no reasoning |
| DECISIONS.md logging | Any | Structured format, simple |
| File renaming/moving | Any | Mechanical operation |
| Generating test stubs | QA Engineer | Pattern-based generation |
| Writing docstrings | Any | Formulaic content |
| Updating imports | Frontend/Backend | Find-replace style |
| Creating boilerplate | Any | Template expansion |
| Formatting JSON | Any | Structural transformation |
| Simple git operations | Any | Command execution |
| Config file updates | DevOps | Key-value changes |

### Tier 2 (Balanced) Tasks

Standard development work requiring moderate reasoning:

| Task | Agent | Rationale |
|------|-------|-----------|
| Component implementation | Frontend Developer | Standard development |
| API endpoint creation | Backend Developer | Standard development |
| Writing unit tests | QA Engineer | Requires logic understanding |
| Bug fixing (simple) | Any Developer | Analysis + implementation |
| Code review | Any | Pattern recognition |
| PRD writing | Product Manager | Structured creativity |
| Design system creation | UX/UI Designer | Creative + technical |
| Database queries | Data Engineer | SQL/query optimization |
| CI/CD pipeline setup | DevOps Engineer | Configuration + logic |
| Test plan creation | QA Engineer | Systematic coverage |

### Tier 3 (Powerful) Tasks

Complex tasks requiring deep reasoning or expertise:

| Task | Agent | Rationale |
|------|-------|-----------|
| Architecture design | Architect | Complex trade-off analysis |
| Security review | Security Engineer | Threat modeling, edge cases |
| System integration planning | Orchestrator | Multi-agent coordination |
| Complex debugging | Any Developer | Deep reasoning required |
| Performance optimization | Any Developer | Non-obvious solutions |
| AI/ML model selection | ML Engineer | Research + evaluation |
| Prompt engineering | Prompt Engineer | Nuanced optimization |
| Database schema design | Architect/Data Engineer | Long-term implications |
| API contract design | Architect | System-wide impact |
| Risk assessment | Security Engineer | Comprehensive analysis |

---

## Agent Default Tiers

Each agent has a default tier based on their typical work:

| Agent | Default Tier | Override Conditions |
|-------|--------------|---------------------|
| **Orchestrator** | Tier 2 | Tier 1 for status updates; Tier 3 for conflict resolution |
| **Product Manager** | Tier 2 | Tier 3 for complex requirement analysis |
| **Architect** | Tier 3 | — (always needs deep reasoning) |
| **UX/UI Designer** | Tier 2 | Tier 1 for design system documentation |
| **Frontend Developer** | Tier 2 | Tier 1 for boilerplate; Tier 3 for complex state management |
| **Backend Developer** | Tier 2 | Tier 1 for boilerplate; Tier 3 for complex algorithms |
| **Data Engineer** | Tier 2 | Tier 3 for schema design |
| **ML Engineer** | Tier 3 | — (ML tasks need deep reasoning) |
| **Prompt Engineer** | Tier 3 | — (prompt optimization is nuanced) |
| **Model Evaluator** | Tier 2 | Tier 3 for complex analysis |
| **AIOps Engineer** | Tier 2 | Tier 3 for scaling decisions |
| **QA Engineer** | Tier 2 | Tier 1 for test generation |
| **Security Engineer** | Tier 3 | — (security needs thoroughness) |
| **DevOps Engineer** | Tier 2 | Tier 1 for config files |

---

## Routing Protocol

### Automatic Routing

The Orchestrator determines model tier based on:

#### 1. Task Complexity Score (1-10)

| Score | Tier | Examples |
|-------|------|----------|
| 1-3 | Tier 1 | Status updates, boilerplate, formatting |
| 4-7 | Tier 2 | Standard development, testing, reviews |
| 8-10 | Tier 3 | Architecture, security, complex debugging |

#### 2. Task Type Classification

```
Is this task:
├── Documentation/Status update? → Tier 1
├── Standard code implementation? → Tier 2
├── Architecture/Security/ML? → Tier 3
└── Unknown? → Default to Tier 2
```

#### 3. Retry Context

| Situation | Tier Adjustment |
|-----------|-----------------|
| First attempt | Use default tier |
| Retry 2 (after failure) | Upgrade one tier |
| Retry 3 (final attempt) | Use Tier 3 |

### Manual Override

Users can specify tier in activation:

```markdown
## 🟢 ACTIVATING AGENT

**Agent:** Frontend Developer
**Model Tier:** Tier 1 (Fast)
**Override Reason:** Simple import path updates across files
**Project:** my-app
**Phase:** development
```

---

## Activation Format with Tier

When activating an agent, include the model tier:

```markdown
---
## 🟢 ACTIVATING AGENT

**Agent:** [Agent Name]
**Model Tier:** [1/2/3] — [Fast/Balanced/Powerful]
**Tier Rationale:** [Why this tier was selected]
**Project:** [project-id]
**Project Path:** [/path/to/project]
**Phase:** [current-phase]
**Timestamp:** YYYY-MM-DDTHH:MM:SSZ

### Context
[2-3 sentences about current state and why this agent is needed]

### Task Complexity
- **Score:** [1-10]
- **Factors:** [What makes this simple/complex]

### Expected Outputs
- `[file-path]` — [Description]

### Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
---
```

---

## Handoff Schema Extension

The handoff JSON should include model tier information:

```json
{
  "handoff": {
    "agent": "Frontend Developer",
    "model_tier": 2,
    "model_id": "claude-3-5-sonnet-20241022",
    "timestamp": "2024-12-18T14:30:00Z",
    "status": "complete",
    "phase": "development",
    "project": "my-app"
  },
  "task_complexity": {
    "score": 5,
    "factors": ["Standard component implementation", "Uses existing patterns"]
  }
}
```

---

## Cost Tracking

Track model usage in STATUS.md for cost awareness:

```markdown
## Model Usage (This Session)

| Date | Agent | Tier | Task | Est. Tokens |
|------|-------|------|------|-------------|
| 2024-12-18 | Orchestrator | 1 | Status update | 500 |
| 2024-12-18 | Frontend Dev | 2 | Dashboard component | 8,000 |
| 2024-12-18 | Architect | 3 | System design review | 15,000 |

**Session Total:** ~23,500 tokens
**Tier Distribution:** T1: 2%, T2: 34%, T3: 64%
```

---

## Decision Examples

### Example 1: Simple Task → Tier 1

```
Task: "Update the copyright year in the footer"

Analysis:
- Single file change
- No logic involved
- Pattern: find and replace

Decision: Tier 1 (Fast)
Rationale: Mechanical update, no reasoning needed
```

### Example 2: Standard Development → Tier 2

```
Task: "Implement user profile page with edit functionality"

Analysis:
- Multiple components needed
- State management involved
- API integration required
- Standard patterns apply

Decision: Tier 2 (Balanced)
Rationale: Standard development work with moderate complexity
```

### Example 3: Complex Task → Tier 3

```
Task: "Design authentication system supporting OAuth, SAML, and MFA"

Analysis:
- Security-critical
- Multiple integration points
- Long-term architecture implications
- Edge cases and attack vectors

Decision: Tier 3 (Powerful)
Rationale: Security architecture requires deep analysis and thoroughness
```

---

## Implementation Notes

### For Claude Code / Agentic Systems

When spawning sub-agents or making API calls, specify the model:

```javascript
// Tier 1 task
const response = await anthropic.messages.create({
  model: "claude-3-haiku-20240307",
  messages: [{ role: "user", content: "Update STATUS.md..." }]
});

// Tier 2 task (default)
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{ role: "user", content: "Implement the login component..." }]
});

// Tier 3 task
const response = await anthropic.messages.create({
  model: "claude-3-opus-20240229",
  messages: [{ role: "user", content: "Design the system architecture..." }]
});
```

### For Multi-Agent Orchestration

The Orchestrator should:

1. **Assess task complexity** before activation
2. **Select appropriate tier** based on mapping
3. **Document tier in activation** message
4. **Track usage** for cost analysis
5. **Upgrade tier on retry** if needed

---

## Optimization Guidelines

### When to Downgrade Tier

- Task is taking too long with complex model
- Simple follow-up to previous complex task
- User requests faster response
- Budget constraints

### When to Upgrade Tier

- Task fails on lower tier
- Unexpected complexity discovered
- Quality issues in output
- Security/architecture implications found

---

## Metrics to Track

| Metric | Target | Alert |
|--------|--------|-------|
| Tier 1 usage | 20-30% of tasks | <10% (underutilized) |
| Tier 3 usage | 10-20% of tasks | >40% (overused) |
| Retry rate by tier | <10% | >20% |
| Tier upgrade rate | <15% | >30% |

---

## Future Enhancements

### Dynamic Routing (Phase 3+)

Implement smart routing that:

1. Starts with Tier 1 for initial assessment
2. Detects complexity from initial response
3. Auto-upgrades if task requires more reasoning
4. Logs upgrade patterns for learning
5. Adjusts defaults based on historical performance
