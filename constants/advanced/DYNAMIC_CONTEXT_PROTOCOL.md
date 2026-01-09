# Dynamic Context Loading Protocol

> **Version:** 4.0.0
> **Last Updated:** 2025-01-02
> **Purpose:** Reduce context waste by loading only relevant documentation chunks

---

## Overview

Instead of loading full PRD.md (~500 lines) and ARCHITECTURE.md (~300 lines) into every agent prompt, agents use MCP tools to query only the specific context they need for their current task.

**Result:** ~90% context reduction (from ~30KB to ~3KB per task)

---

## When Chunking Happens

Context chunking is triggered by the **Architect agent** after G3 (Architecture Approval):

```
G2 (PRD) → G3 (Architecture) → Architect runs chunk_docs() → G4+ (Development)
```

### Chunking Creates

```
[project]/docs/rag/
├── index.json           # Main lookup index
├── spec-index.json      # Spec-to-story mappings
└── chunks/
    ├── US-001.json      # User story chunk
    ├── US-002.json      # User story chunk
    └── ...
```

### What Gets Chunked

| Source | Output |
|--------|--------|
| `docs/PRD.md` | Individual user story chunks with acceptance criteria |
| `specs/openapi.yaml` | API endpoint metadata, linked to stories |
| `prisma/schema.prisma` | DB model metadata, linked to stories |
| `specs/schemas/*.ts` | Zod schema references, linked to endpoints |

---

## MCP Tools for Agents

### 1. `get_context_for_story` - Primary Tool

Get complete context for implementing a specific user story.

**Use when:** Implementing a feature, testing a story, reviewing requirements

```typescript
const context = await get_context_for_story({
  project_path: "/path/to/project",
  story_id: "US-001",
  include_related_stories: true
});

// Returns:
{
  story: {
    id: "US-001",
    title: "User can register with email",
    content: "As a user, I want to...",
    acceptance_criteria: ["Email must be valid", "Password 8+ chars", ...],
    epic: "Authentication",
    keywords: ["auth", "register", "email"]
  },
  api_specs: [{
    endpoint: "/auth/register",
    method: "POST",
    operationId: "register",
    openapi_snippet: "..." // Actual YAML from openapi.yaml
  }],
  db_models: [{
    model_name: "User",
    prisma_snippet: "model User { ... }",
    fields: ["id", "email", "password", ...]
  }],
  zod_schemas: [{
    schema_name: "RegisterRequestSchema",
    file: "auth.schema.ts",
    schema_snippet: "export const RegisterRequestSchema = z.object({...})"
  }],
  related_stories: [...]
}
```

### 2. `get_relevant_specs` - Spec Lookup

Get specific API or database specs by identifier.

**Use when:** Need to check a specific endpoint contract or DB model

```typescript
// Get API specs
const apiSpecs = await get_relevant_specs({
  project_path: "/path/to/project",
  spec_type: "api",
  identifiers: ["/auth/register", "/auth/login"]
});

// Get DB models
const dbModels = await get_relevant_specs({
  project_path: "/path/to/project",
  spec_type: "database",
  identifiers: ["User", "RefreshToken"]
});
```

### 3. `search_context` - Keyword Search

Search across all chunks using keywords.

**Use when:** Don't know the story ID, exploring related context

```typescript
const results = await search_context({
  project_path: "/path/to/project",
  keywords: ["password", "reset", "email"],
  scope: "all",  // "stories", "specs", or "all"
  limit: 5
});

// Returns:
{
  matches: [
    { id: "US-004", type: "user_story", title: "Password reset", relevance_score: 3, matched_keywords: [...] },
    ...
  ],
  total_matches: 8
}
```

### 4. `list_stories_by_epic` - Epic Browser

List all stories in an epic.

**Use when:** Starting work on a feature area, planning testing scope

```typescript
const stories = await list_stories_by_epic({
  project_path: "/path/to/project",
  epic: "Authentication"
});

// Returns:
{
  epic: "Authentication",
  stories: [
    { id: "US-001", title: "User registration", priority: "P0", acceptance_criteria_count: 4 },
    { id: "US-002", title: "User login", priority: "P0", acceptance_criteria_count: 3 },
    ...
  ]
}
```

### 5. `get_context_summary` - Project Overview

Get high-level summary of available context.

**Use when:** Agent activation, understanding project scope

```typescript
const summary = await get_context_summary({
  project_path: "/path/to/project"
});

// Returns:
{
  project_id: "my-saas-app",
  total_stories: 15,
  epics: ["Authentication", "Dashboard", "Settings"],
  api_endpoint_count: 20,
  db_model_count: 8,
  last_chunked: "2025-01-02T10:00:00Z",
  index_version: "1.0"
}
```

### 6. `chunk_docs` - Build Index (Architect Only)

Create/rebuild the RAG index.

**Use when:** After G3 approval, after significant PRD changes

```typescript
const result = await chunk_docs({
  project_path: "/path/to/project",
  force_rebuild: false
});

// Returns:
{
  success: true,
  chunks_created: 15,
  epics_indexed: ["Authentication", "Dashboard", "Settings"],
  api_endpoints_mapped: 20,
  db_models_mapped: 8
}
```

---

## Agent Responsibilities

### Architect (Post-G3)

1. Run `chunk_docs()` after architecture approval
2. Include chunking results in G3 handoff
3. Re-run chunking if PRD significantly changes

### Frontend Developer

1. Start work with `get_context_summary()` to understand scope
2. Use `get_context_for_story()` for each feature
3. DO NOT read full PRD.md or ARCHITECTURE.md

### Backend Developer

1. Start work with `get_context_summary()` to understand scope
2. Use `get_context_for_story()` for exact API contracts and DB schemas
3. DO NOT read full PRD.md or ARCHITECTURE.md

### QA Engineer

1. Use `list_stories_by_epic()` to plan test coverage
2. Use `get_context_for_story()` for acceptance criteria
3. DO NOT read full PRD.md to find requirements

---

## Fallback Behavior

If the RAG index doesn't exist, tools return an error:

```
Error: RAG index not found. Run chunk_docs tool first to create the index.
```

**Recovery:**
1. Notify Orchestrator/Architect
2. Architect runs `chunk_docs({ project_path, force_rebuild: true })`
3. Retry original tool call

---

## Re-chunking Triggers

The Architect should re-run `chunk_docs()` when:

- PRD has significant changes (new stories, modified acceptance criteria)
- New API endpoints added to OpenAPI spec
- Database schema changes
- Developers report missing or stale context
- Manual request from user

Use `force_rebuild: true` to rebuild from scratch.

---

## Benefits

| Metric | Before RAG | After RAG |
|--------|------------|-----------|
| Context per task | ~30KB | ~3KB |
| Token usage | High | Low |
| Agent accuracy | Variable | Higher |
| Relevant context | Mixed | Exact |

---

## Technical Notes

- Chunks are stored as JSON files in `docs/rag/chunks/`
- Index is version-controlled with the project
- Keyword matching uses simple string overlap (no embeddings)
- Relationships built during chunking based on keyword overlap
- Agent assignment inferred from story content

---

## Related Files

- **MCP Tools:** `mcp-server/src/tools/context-tools.ts`
- **Chunker:** `mcp-server/src/context/chunker.ts`
- **Parser:** `mcp-server/src/context/parser.ts`
- **Types:** `mcp-server/src/types/context.ts`
