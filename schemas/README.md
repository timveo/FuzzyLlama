# JSON Schemas

This directory contains JSON schemas for validating project status and agent handoff documents.

## Schemas

### `status.schema.json`
Validates `STATUS.md` files that track project progress. This schema ensures:
- Required project identification fields
- Valid phase and agent values
- Proper blocker and risk documentation
- Consistent handoff history

### `handoff.schema.json`
Validates agent-to-agent handoff payloads. This schema ensures:
- Complete handoff metadata
- Valid agent names
- Proper deliverables documentation
- Blockers and dependencies are captured

## Validation

### Using Node.js

```bash
# Install dependencies
npm install ajv ajv-formats

# Validate a STATUS.md file
node validate-status.js /path/to/project/docs/STATUS.md

# Validate a handoff JSON
node validate-status.js --handoff '{"handoff": {...}}'
```

### Using Python

```bash
# Install dependencies
pip install jsonschema

# Validate a STATUS.md file
python validate_status.py /path/to/project/docs/STATUS.md

# Validate a handoff JSON
python validate_status.py --handoff '{"handoff": {...}}'
```

### Programmatic Usage (Node.js)

```javascript
const { validateFile, validateHandoff } = require('./validate-status');

// Validate a file
const isValid = validateFile('/path/to/STATUS.md');

// Validate handoff data
const handoffData = {
  handoff: {
    agent: 'Product Manager',
    timestamp: '2024-01-15T10:00:00Z',
    status: 'complete',
    phase: 'planning',
    project: 'my-project'
  },
  next_agent: 'Architect',
  next_action: 'Design system architecture'
};
const isHandoffValid = validateHandoff(handoffData);
```

### Programmatic Usage (Python)

```python
from validate_status import validate_file, validate_handoff
from pathlib import Path

# Validate a file
schema_dir = Path(__file__).parent
is_valid = validate_file(Path('/path/to/STATUS.md'), schema_dir)

# Validate handoff data
handoff_data = {
    'handoff': {
        'agent': 'Product Manager',
        'timestamp': '2024-01-15T10:00:00Z',
        'status': 'complete',
        'phase': 'planning',
        'project': 'my-project'
    },
    'next_agent': 'Architect',
    'next_action': 'Design system architecture'
}
is_valid = validate_handoff(handoff_data, schema_dir)
```

## CI/CD Integration

Add validation to your CI pipeline:

```yaml
# .github/workflows/validate.yml
name: Validate Status

on:
  push:
    paths:
      - 'docs/STATUS.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install ajv ajv-formats
        working-directory: ./schemas
      
      - name: Validate STATUS.md
        run: node schemas/validate-status.js docs/STATUS.md
```

## Schema Details

### Status Schema - Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `project.name` | string | Human-readable project name |
| `project.id` | string | URL-safe identifier |
| `current_phase` | enum | Active project phase |
| `current_agent` | enum | Responsible agent |
| `last_updated` | date-time | ISO 8601 timestamp |

### Status Schema - Phase Values

- `intake` - Initial project setup
- `planning` - Requirements gathering
- `architecture` - Technical design
- `design` - UI/UX design
- `development` - Traditional development
- `ml_development` - AI/ML development
- `testing` - QA and validation
- `security_review` - Security audit
- `deployment` - Production release
- `maintenance` - Post-launch support
- `blocked` - Work stopped
- `completed` - Project finished

### Status Schema - Agent Values

- `Orchestrator`
- `Product Manager`
- `Architect`
- `UX/UI Designer`
- `Frontend Developer`
- `Backend Developer`
- `Data Engineer`
- `ML Engineer`
- `Prompt Engineer`
- `Model Evaluator`
- `AIOps Engineer`
- `QA Engineer`
- `Security & Privacy Engineer`
- `DevOps Engineer`
- `Multiple` (for parallel work)
- `None` (maintenance mode)

### Handoff Schema - Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `handoff.agent` | enum | Source agent |
| `handoff.timestamp` | date-time | When handoff occurred |
| `handoff.status` | enum | Completion status |
| `handoff.phase` | enum | Phase being completed |
| `handoff.project` | string | Project identifier |
| `next_agent` | string | Target agent(s) |
| `next_action` | string | Primary action for next agent |

## Example Validation Output

```
$ node validate-status.js docs/STATUS.md

Validating: docs/STATUS.md

✅ STATUS.md is valid!

Summary:
  Project: Converge NPS
  Phase: development
  Agent: Multiple
  Last Updated: 2024-01-25T14:30:00Z

📋 Next Actions: 3
    - [high] Complete auth flow implementation (Frontend Developer)
    - [high] Finish survey API endpoints (Backend Developer)
    - [medium] Set up feature pipeline (Data Engineer)
```

```
$ node validate-status.js docs/STATUS.md

Validating: docs/STATUS.md

❌ Validation failed!

Errors:
  - /current_phase: must be equal to one of the allowed values ({"allowedValues":["intake","planning",...]})
  - /project/id: must match pattern "^[a-z0-9-]+$" ({"pattern":"^[a-z0-9-]+$"})
```

## Related Documentation

- [Workflow Examples](../docs/WORKFLOWS.md) - Complete agent handoff chains
- [Orchestrator Agent](../agents/orchestrator.md) - State management details
- [STATUS Template](../templates/docs/STATUS.md) - Template for new projects
