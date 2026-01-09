# Product Creator State MCP Server

A Model Context Protocol (MCP) server for managing Multi-Agent Product Creator project state. This replaces the STATUS.md file-based state management with a proper SQLite database that agents can query through tool calls.

## Why Use This?

Instead of parsing potentially hallucinated Markdown files, agents now:

1. **Query state directly**: `get_current_phase()` returns the exact state
2. **Update state atomically**: `update_task_status(id, status)` ensures consistency
3. **Log decisions programmatically**: `log_decision(decision)` creates audit trails
4. **No file parsing required**: The Orchestrator always knows the exact state

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### Starting the Server

```bash
# Using default database location (./.state/project.db)
npm start

# Using custom database path
npm start -- --db-path /path/to/project.db

# Development mode (with TypeScript)
npm run dev
```

### Claude Code Integration

Add to your Claude Code configuration (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "product-creator-state": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js", "--db-path", "./.state/project.db"],
      "env": {}
    }
  }
}
```

### Migrating from STATUS.md

If you have an existing project with a STATUS.md file:

```bash
# Migrate existing STATUS.md to SQLite
npm run migrate -- /path/to/docs/STATUS.md --db-path ./.state/project.db
```

## Available Tools

### Core State Queries (Replaces Reading STATUS.md)

| Tool | Description |
|------|-------------|
| `get_current_phase` | Get current phase, gate, and agent |
| `get_full_state` | Get complete project state with all data |

### State Transitions

| Tool | Description |
|------|-------------|
| `transition_gate` | Move to a new gate (validates gate name) |
| `set_current_agent` | Set the active agent |
| `update_progress` | Update percent complete |

### Task Management (Replaces Editing STATUS.md Tasks)

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task |
| `update_task_status` | Update task status |
| `get_tasks` | List tasks, optionally by phase |

### Decision Logging (Replaces Editing DECISIONS.md)

| Tool | Description |
|------|-------------|
| `log_decision` | Record a decision with rationale |
| `get_decisions` | Get decision history |

### Blocker Management

| Tool | Description |
|------|-------------|
| `create_blocker` | Create a new blocker |
| `resolve_blocker` | Mark blocker as resolved |
| `get_active_blockers` | List unresolved blockers |
| `escalate_blocker` | Escalate to L1/L2/L3 |

### Agent Communication

| Tool | Description |
|------|-------------|
| `record_handoff` | Record agent handoff |
| `get_handoffs` | Get handoff history |
| `create_query` | Create inter-agent query |
| `answer_query` | Answer a pending query |
| `get_pending_queries` | List unanswered queries |
| `create_escalation` | Create an escalation |
| `resolve_escalation` | Resolve an escalation |
| `get_pending_escalations` | List pending escalations |

### Metrics & Progress

| Tool | Description |
|------|-------------|
| `update_metrics` | Update project metrics |
| `get_metrics` | Get current metrics |
| `start_phase` | Record phase start |
| `complete_phase` | Record phase completion |
| `get_phase_history` | Get phase history |

### Actions & Memory

| Tool | Description |
|------|-------------|
| `add_next_action` | Add a next action item |
| `update_action_status` | Update action status |
| `get_next_actions` | List pending actions |
| `add_memory` | Record a learning |
| `get_memories` | Get project learnings |
| `add_note` | Add a free-form note |
| `get_notes` | Get project notes |

### Context Engineering Tools (NEW)

#### Result Caching
| Tool | Description |
|------|-------------|
| `cache_tool_result` | Store tool execution result for future retrieval |
| `get_cached_result` | Retrieve cached tool result by input match |
| `get_tool_history` | Get execution history for a tool |
| `get_last_successful_result` | Get most recent successful execution |

#### Error History
| Tool | Description |
|------|-------------|
| `log_error_with_context` | Log error with full context for debugging |
| `get_error_history` | Get error history for a project |
| `get_similar_errors` | Find similar resolved errors |
| `mark_error_resolved` | Record error resolution |
| `get_error_context_for_retry` | Get error context for retry workers |

#### Enhanced Memory
| Tool | Description |
|------|-------------|
| `add_structured_memory` | Record memory with full metadata and semantic search |
| `search_memory` | Search memories using natural language or keywords |
| `link_memories` | Create relationship between memory and other entities |
| `get_related_memories` | Get memories related to a file, task, or decision |
| `consolidate_memories` | Identify universal patterns for SYSTEM_MEMORY sync |
| `delete_memory` | Delete a memory entry |

#### Session Context
| Tool | Description |
|------|-------------|
| `save_session_context` | Persist context across sessions |
| `load_session_context` | Retrieve saved context |
| `get_handoff_context` | Get all context for agent handoff |
| `delete_session_context` | Delete session context entries |
| `cleanup_expired_context` | Remove expired session context |

#### Learning Extraction
| Tool | Description |
|------|-------------|
| `extract_learnings` | Analyze project decisions and errors for patterns |
| `save_extracted_learning` | Persist an extracted learning to enhanced_memory |
| `sync_to_system_memory` | Sync universal patterns to SYSTEM_MEMORY.md |
| `import_from_system_memory` | Import relevant patterns at project start |
| `get_extraction_stats` | Get stats on extracted learnings |

## Example Usage

### Agent Checking Current State

```typescript
// Instead of reading STATUS.md
const state = await mcp.callTool('get_current_phase', {
  project_id: 'my-project'
});

// Returns:
// {
//   phase: 'development_components',
//   gate: 'G5.3_COMPONENTS',
//   agent: 'Frontend Developer',
//   percent_complete: 45
// }
```

### Updating Task Status

```typescript
// Instead of editing STATUS.md
await mcp.callTool('update_task_status', {
  task_id: 'TASK-005',
  status: 'complete',
  owner: 'Frontend Developer'
});
```

### Logging a Decision

```typescript
// Instead of manually editing DECISIONS.md
await mcp.callTool('log_decision', {
  project_id: 'my-project',
  gate: 'G3_ARCH_PENDING',
  agent: 'Architect',
  decision_type: 'technology',
  description: 'Selected PostgreSQL for the database',
  rationale: 'Strong ACID compliance, good JSON support for flexible schemas',
  alternatives_considered: 'MongoDB (rejected: less suitable for relational data)',
  outcome: 'All data models will use PostgreSQL'
});
```

### Recording a Handoff

```typescript
await mcp.callTool('record_handoff', {
  project_id: 'my-project',
  from_agent: 'Architect',
  to_agent: 'Frontend Developer',
  phase: 'architecture_complete',
  status: 'complete',
  deliverables: ['ARCHITECTURE.md', 'API.yaml', 'database-schema.sql'],
  notes: 'All design decisions documented'
});
```

### Using Context Engineering Tools

#### Retrying a Failed Task (with Error Context)

```typescript
// retry_task now returns previous error context to help fix issues
const result = await mcp.callTool('retry_task', {
  project_path: '/path/to/project',
  task_id: 'TASK-005'
});

// Returns:
// {
//   success: true,
//   task: { ... },
//   error_context: [
//     {
//       error_id: 1,
//       error_type: 'build',
//       error_message: 'TypeScript compilation failed: Cannot find module',
//       file_path: 'src/api.ts',
//       line_number: 42
//     }
//   ],
//   similar_resolutions: [
//     {
//       error_message: 'Module not found error',
//       resolution: 'Added missing import statement',
//       resolution_agent: 'Builder'
//     }
//   ]
// }
```

#### Searching Enhanced Memory

```typescript
// Search for security-related patterns with semantic similarity
const memories = await mcp.callTool('search_memory', {
  project_id: 'my-project',
  query: 'input validation security',
  memory_type: 'pattern',
  tags: ['security']
});

// Returns:
// {
//   memories: [
//     {
//       id: 1,
//       title: 'Always validate user input at API boundaries',
//       content: 'Input validation should happen at the earliest possible point...',
//       memory_type: 'pattern',
//       scope: 'universal',
//       similarity_score: 0.87
//     }
//   ],
//   count: 1
// }
```

#### Extracting Learnings from Project

```typescript
// Extract patterns from decisions and resolved errors
const learnings = await mcp.callTool('extract_learnings', {
  project_id: 'my-project',
  min_confidence: 0.7
});

// Returns candidates for SYSTEM_MEMORY sync
// {
//   learnings: [
//     {
//       title: 'Always sanitize HTML output to prevent XSS',
//       content: 'Security requirement...',
//       scope: 'universal',
//       confidence: 0.85,
//       source: { type: 'decision', id: 5 }
//     }
//   ],
//   stats: {
//     by_scope: { universal: 1, stack_specific: 2, project_specific: 1 }
//   }
// }
```

## Database Schema

The SQLite database includes tables for:

### Core Tables
- `projects` - Project metadata
- `project_state` - Current phase, gate, agent
- `tasks` - Tasks within phases
- `blockers` - Issues blocking progress
- `risks` - Identified risks
- `deliverables` - Project deliverables
- `handoffs` - Agent handoff history
- `queries` - Inter-agent queries
- `escalations` - Escalated issues
- `decisions` - Decision log
- `metrics` - Project metrics
- `phase_history` - Completed phases
- `next_actions` - Action items
- `memory` - Project learnings
- `notes` - Free-form notes

### Context Engineering Tables (NEW)
- `tool_results` - Cached tool execution results with input hash lookup
- `error_history` - Error log with resolution tracking for cross-agent learning
- `enhanced_memory` - Structured memories with semantic search (embeddings)
- `memory_links` - Relationships between memories and other entities
- `session_context` - Per-session key-value context with TTL

## Valid Gates

The server validates gate names against the full state machine:

- G0_PENDING through G10_COMPLETION
- G5.1 through G5.5 development sub-gates
- E1_ASSESSMENT through E3_APPROVAL enhancement gates
- COMPLETE

## Valid Agents

- Orchestrator
- Product Manager
- Architect
- UX/UI Designer
- Frontend Developer
- Backend Developer
- Data Engineer
- ML Engineer
- Prompt Engineer
- Model Evaluator
- AIOps Engineer
- QA Engineer
- Security & Privacy Engineer
- DevOps Engineer
- Multiple
- None

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT
