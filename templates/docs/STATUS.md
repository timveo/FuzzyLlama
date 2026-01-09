# Project Status Template

Copy this template to your project's `docs/STATUS.md` and fill in the values.

```json
{
  "project": {
    "name": "[Project Name]",
    "id": "[project-id]",
    "type": "traditional|ai_ml|hybrid",
    "repository": "https://github.com/org/repo"
  },
  "current_phase": "intake|planning|architecture|design|development|ml_development|testing|security_review|deployment|maintenance|blocked|completed",
  "current_agent": "[Agent Name]",
  "last_updated": "YYYY-MM-DDTHH:MM:SSZ",
  
  "phase_progress": {
    "started_at": "YYYY-MM-DDTHH:MM:SSZ",
    "estimated_completion": "YYYY-MM-DDTHH:MM:SSZ",
    "percent_complete": 0,
    "tasks": {
      "task_1": "not_started|in_progress|complete|blocked|skipped",
      "task_2": "not_started|in_progress|complete|blocked|skipped"
    }
  },
  
  "phase_history": [
    {
      "phase": "intake",
      "agent": "Orchestrator",
      "started_at": "YYYY-MM-DDTHH:MM:SSZ",
      "completed_at": "YYYY-MM-DDTHH:MM:SSZ",
      "status": "completed|skipped|failed",
      "notes": ""
    }
  ],
  
  "blockers": [
    {
      "id": "BLOCK-001",
      "description": "[Blocker description]",
      "severity": "critical|high|medium|low",
      "owner": "[Agent or person]",
      "created_at": "YYYY-MM-DDTHH:MM:SSZ",
      "resolved_at": null,
      "resolution": null,
      "blocked_agents": ["[Agent 1]", "[Agent 2]"],
      "escalated": false
    }
  ],
  
  "risks": [
    {
      "id": "RISK-001",
      "description": "[Risk description]",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "[Mitigation plan]",
      "owner": "[Owner]",
      "status": "identified|mitigating|mitigated|accepted|realized"
    }
  ],
  
  "deliverables": {
    "prd": {
      "status": "not_started|in_progress|in_review|complete|blocked",
      "path": "docs/PRD.md",
      "owner": "Product Manager",
      "due_date": "YYYY-MM-DD"
    },
    "architecture": {
      "status": "not_started|in_progress|in_review|complete|blocked",
      "path": "docs/ARCHITECTURE.md",
      "owner": "Architect",
      "due_date": "YYYY-MM-DD"
    }
  },
  
  "handoffs": [
    {
      "from_agent": "[Source Agent]",
      "to_agent": "[Target Agent]",
      "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
      "phase": "[phase]",
      "status": "complete|partial|blocked",
      "deliverables": ["item1", "item2"],
      "blockers": [],
      "notes": ""
    }
  ],
  
  "metrics": {
    "stories_total": 0,
    "stories_completed": 0,
    "bugs_open": 0,
    "bugs_resolved": 0,
    "test_coverage": "0%",
    "quality_gate_status": "passing|failing|pending"
  },

  "feature_loops": {
    "enabled": false,
    "strategy": "sequential|parallel",
    "max_iterations": 3,
    "active_loop": {
      "story_id": null,
      "story_title": null,
      "phase": "QUEUED|REFINING|BUILDING|TESTING|ACCEPTING|COMPLETE|BLOCKED",
      "agent": null,
      "iteration": 0,
      "started_at": null
    },
    "queue": [
      {
        "story_id": "US-001",
        "title": "[Story title]",
        "priority": 1,
        "dependencies": []
      }
    ],
    "completed": [
      {
        "story_id": "US-000",
        "title": "[Story title]",
        "iterations": 1,
        "duration_minutes": 120,
        "issues_found": 0,
        "completed_at": "YYYY-MM-DDTHH:MM:SSZ"
      }
    ],
    "loop_metrics": {
      "total_loops": 0,
      "completed_loops": 0,
      "avg_iterations": 0,
      "avg_duration_minutes": 0,
      "first_pass_acceptance_rate": 0
    }
  },

  "model_usage": {
    "session_tokens": 0,
    "tier_distribution": {
      "tier_1": 0,
      "tier_2": 0,
      "tier_3": 0
    },
    "history": [
      {
        "agent": "[Agent]",
        "tier": 1,
        "task": "[Task description]",
        "tokens_estimated": 0,
        "timestamp": "YYYY-MM-DDTHH:MM:SSZ"
      }
    ]
  },

  "teaching": {
    "level": "NOVICE|INTERMEDIATE|EXPERT",
    "target_per_phase": "[10-15|5-8|0-2]",
    "moments_delivered": 0,
    "moments_by_agent": {
      "Orchestrator": 0,
      "Product Manager": 0,
      "Architect": 0,
      "Frontend Developer": 0,
      "Backend Developer": 0
    },
    "topics_covered": [
      {
        "topic": "[Topic Name]",
        "agent": "[Agent]",
        "gate": "G[X]",
        "timestamp": "YYYY-MM-DDTHH:MM:SSZ"
      }
    ],
    "compliance": {
      "current_phase_count": 0,
      "status": "on_target|below_target|above_target"
    }
  },

  "next_actions": [
    {
      "action": "[Action description]",
      "owner": "[Owner]",
      "due_date": "YYYY-MM-DD",
      "priority": "critical|high|medium|low"
    }
  ],
  
  "notes": "[Free-form notes and context]"
}
```

---

## Field Descriptions

### Project
- **name**: Human-readable project name
- **id**: URL-safe identifier (lowercase, hyphens only)
- **type**: Classification - `traditional` (web app), `ai_ml` (ML project), or `hybrid`
- **repository**: Git repository URL

### Current State
- **current_phase**: Active project phase
- **current_agent**: Agent responsible for current progress
- **last_updated**: ISO 8601 timestamp of last update

### Phase Progress
Track progress within the current phase:
- **tasks**: Key-value pairs of task names and their status

### Phase History
Array of completed phases with timestamps and notes.

### Blockers
Issues preventing progress:
- **id**: Format `BLOCK-XXX`
- **severity**: `critical` (stops all work) to `low` (minor inconvenience)
- **escalated**: Whether this has been escalated to Orchestrator

### Risks
Identified project risks:
- **id**: Format `RISK-XXX`
- **probability/impact**: Standard risk matrix values
- **status**: Current state of risk management

### Deliverables
Status of key project outputs:
- **status**: Current state
- **path**: File path relative to project root
- **owner**: Responsible agent
- **due_date**: Expected completion

### Handoffs
History of agent-to-agent transitions:
- **from_agent/to_agent**: Source and destination
- **status**: Quality of handoff
- **deliverables**: What was handed off
- **blockers**: Issues passed along

### Metrics
Quantitative project health indicators.

### Feature Loops
Configuration and tracking for Feature Loop mode (see `constants/reference/FEATURE_LOOP_PROTOCOL.md`):
- **enabled**: Whether Feature Loop mode is active
- **strategy**: `sequential` (one at a time) or `parallel` (multiple teams)
- **max_iterations**: Maximum iterations per loop before escalation (default: 3)
- **active_loop**: Current loop being worked on
  - **phase**: QUEUED → REFINING → BUILDING → TESTING → ACCEPTING → COMPLETE
- **queue**: Stories waiting to be processed
- **completed**: History of completed loops with metrics
- **loop_metrics**: Aggregate statistics for loop performance

### Model Usage
Tracks model tier usage for cost awareness (see `constants/reference/MODEL_TIERS.md`):
- **session_tokens**: Estimated total tokens for session
- **tier_distribution**: Percentage usage per tier
- **history**: Log of agent activations with tier used

### Teaching
Tracks teaching moment delivery per TEACHING_PROTOCOL.md:
- **level**: User's teaching preference from Q3 intake
- **target_per_phase**: Expected moments (NOVICE: 10-15, INTERMEDIATE: 5-8, EXPERT: 0-2)
- **moments_delivered**: Total teaching moments in project
- **moments_by_agent**: Count per agent for accountability
- **topics_covered**: Specific topics taught with metadata
- **compliance**: Whether current phase is meeting target

### Next Actions
Immediate priorities with owners and deadlines.

---

## Example: Active Development Project

```json
{
  "project": {
    "name": "Converge NPS",
    "id": "converge-nps",
    "type": "hybrid",
    "repository": "https://github.com/company/converge-nps"
  },
  "current_phase": "development",
  "current_agent": "Multiple",
  "last_updated": "2024-01-25T14:30:00Z",
  
  "phase_progress": {
    "started_at": "2024-01-20T09:00:00Z",
    "estimated_completion": "2024-02-02T17:00:00Z",
    "percent_complete": 45,
    "tasks": {
      "frontend_components": "in_progress",
      "frontend_pages": "not_started",
      "backend_auth": "complete",
      "backend_api": "in_progress",
      "database_schema": "complete",
      "data_pipeline": "in_progress",
      "ml_training": "not_started"
    }
  },
  
  "phase_history": [
    {
      "phase": "intake",
      "agent": "Orchestrator",
      "started_at": "2024-01-10T09:00:00Z",
      "completed_at": "2024-01-11T12:00:00Z",
      "status": "completed",
      "notes": "Project classified as hybrid (traditional + ML)"
    },
    {
      "phase": "planning",
      "agent": "Product Manager",
      "started_at": "2024-01-11T13:00:00Z",
      "completed_at": "2024-01-15T17:00:00Z",
      "status": "completed",
      "notes": "PRD approved by stakeholders"
    },
    {
      "phase": "architecture",
      "agent": "Architect",
      "started_at": "2024-01-16T09:00:00Z",
      "completed_at": "2024-01-19T17:00:00Z",
      "status": "completed",
      "notes": "Decided on microservices for ML, monolith for app"
    }
  ],
  
  "blockers": [],
  
  "risks": [
    {
      "id": "RISK-001",
      "description": "ML model accuracy may not reach 90% target",
      "probability": "medium",
      "impact": "high",
      "mitigation": "Prepared fallback to rule-based scoring",
      "owner": "ML Engineer",
      "status": "identified"
    }
  ],
  
  "deliverables": {
    "prd": {
      "status": "complete",
      "path": "docs/PRD.md",
      "owner": "Product Manager",
      "due_date": "2024-01-15"
    },
    "architecture": {
      "status": "complete",
      "path": "docs/ARCHITECTURE.md",
      "owner": "Architect",
      "due_date": "2024-01-19"
    },
    "frontend": {
      "status": "in_progress",
      "path": "frontend/",
      "owner": "Frontend Developer",
      "due_date": "2024-02-02"
    },
    "backend": {
      "status": "in_progress",
      "path": "backend/",
      "owner": "Backend Developer",
      "due_date": "2024-02-02"
    }
  },
  
  "handoffs": [
    {
      "from_agent": "Orchestrator",
      "to_agent": "Product Manager",
      "timestamp": "2024-01-11T12:00:00Z",
      "phase": "intake",
      "status": "complete",
      "deliverables": ["project_structure", "initial_brief"],
      "blockers": [],
      "notes": ""
    },
    {
      "from_agent": "Product Manager",
      "to_agent": "Architect",
      "timestamp": "2024-01-15T17:00:00Z",
      "phase": "planning",
      "status": "complete",
      "deliverables": ["PRD", "user_stories", "success_metrics"],
      "blockers": [],
      "notes": "Stakeholder approved hybrid approach"
    },
    {
      "from_agent": "Architect",
      "to_agent": "Multiple",
      "timestamp": "2024-01-19T17:00:00Z",
      "phase": "architecture",
      "status": "complete",
      "deliverables": ["architecture_doc", "api_spec", "database_schema"],
      "blockers": [],
      "notes": "Parallel development authorized"
    }
  ],
  
  "metrics": {
    "stories_total": 25,
    "stories_completed": 5,
    "bugs_open": 2,
    "bugs_resolved": 1,
    "test_coverage": "35%",
    "quality_gate_status": "pending"
  },
  
  "next_actions": [
    {
      "action": "Complete auth flow implementation",
      "owner": "Frontend Developer",
      "due_date": "2024-01-26",
      "priority": "high"
    },
    {
      "action": "Finish survey API endpoints",
      "owner": "Backend Developer",
      "due_date": "2024-01-28",
      "priority": "high"
    },
    {
      "action": "Set up feature pipeline",
      "owner": "Data Engineer",
      "due_date": "2024-01-27",
      "priority": "medium"
    }
  ],
  
  "notes": "Development proceeding on schedule. Frontend slightly behind due to design iteration. Backend ahead of schedule."
}
```
