# Project Memory

This document captures institutional knowledge and learnings throughout the project. It helps agents avoid repeating mistakes and leverage successful patterns.

---

## How to Use This Document

1. **Add entries as you learn** — Don't wait until the end
2. **Be specific** — Include context and reasoning
3. **Reference in decisions** — Link to relevant memories
4. **Review before starting** — New agents should read this first
5. **Use tags** — Add searchable tags for cross-project queries

---

## Pattern Index (Queryable)

> **This section enables quick lookup across projects.**
> **Each entry has a unique ID and searchable tags.**

### Quick Search Commands

```bash
# Find all patterns related to authentication
grep -r "tags:.*#auth" docs/MEMORY.md

# Find all universal patterns
grep -r "scope: universal" docs/MEMORY.md

# Find patterns by ID
grep -A 10 "PATTERN-001" docs/MEMORY.md

# Find all failures
grep -B 2 -A 10 "type: failure" docs/MEMORY.md
```

---

## Indexed Entries

### PATTERN-001: [Pattern Name]

```yaml
id: PATTERN-001
type: success | failure | pattern | gotcha
scope: universal | stack-specific | domain-specific
tags: [#tag1, #tag2, #tag3]
agents: [Agent1, Agent2]
gate: G5.3
created: YYYY-MM-DD
```

**Problem:** [One-line problem statement]

**Context:** [When/where this applies]

**Solution/Learning:**
[Detailed explanation]

**Example:**
```code
[Code example if applicable]
```

**Outcome:** [What happened when applied]

**Reuse Guidance:**
- When to use: [conditions]
- When NOT to use: [conditions]

---

## Decisions That Worked

### PATTERN-002: Using Zustand Over Redux

```yaml
id: PATTERN-002
type: success
scope: stack-specific
tags: [#react, #state-management, #zustand, #redux]
agents: [Frontend Developer, Architect]
gate: G3
created: 2024-01-15
```

**Problem:** Need state management with minimal boilerplate

**Context:** Small team, moderate state complexity, wanted fast iteration

**Solution/Learning:**
Selected Zustand for state management instead of Redux. Key benefits:
- 40% less state management code
- No action/reducer boilerplate
- Built-in devtools support
- TypeScript-friendly

**Example:**
```typescript
// Zustand store - simple and direct
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

**Outcome:** Faster development, easier onboarding for new developers

**Reuse Guidance:**
- When to use: Projects with <50 state slices, small-medium teams
- When NOT to use: Very large apps needing Redux middleware ecosystem

---

## Decisions That Failed

### PATTERN-003: SQLite for MVP Database

```yaml
id: PATTERN-003
type: failure
scope: universal
tags: [#database, #sqlite, #postgres, #mvp, #scaling]
agents: [Architect, Backend Developer]
gate: G3
created: 2024-01-10
```

**Problem:** Wanted quick database setup for MVP

**Context:** Solo developer, wanted to avoid external dependencies

**What Went Wrong:**
Concurrent write issues when multiple users accessed the app simultaneously.
SQLite uses file-level locking which caused timeouts.

**Root Cause:** SQLite not designed for concurrent writes in web apps

**Better Alternative:**
- Use PostgreSQL from start (Railway, Supabase offer free tiers)
- Or use SQLite only for read-heavy single-user apps

**Cost:** 3 days migration + 1 day of production issues

**Reuse Guidance:**
- When to use SQLite: Desktop apps, mobile apps, read-heavy single-user tools
- When NOT to use: Any multi-user web app with concurrent writes

---

## Patterns Discovered

### PATTERN-004: API Error Response Format

```yaml
id: PATTERN-004
type: pattern
scope: universal
tags: [#api, #error-handling, #backend, #frontend, #consistency]
agents: [Backend Developer, Frontend Developer]
gate: G5.2
created: 2024-01-12
```

**Problem:** Inconsistent error responses made frontend error handling difficult

**Context:** API returning various error formats, frontend had complex parsing

**Solution/Learning:**
Standardized all API errors to this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly message",
    "details": { "field": "email", "issue": "Invalid format" },
    "request_id": "req_abc123"
  }
}
```

**Outcome:**
- Frontend error handling reduced by 60%
- Better error messages for users
- Easier debugging with request_id

**Reuse Guidance:**
- When to use: All REST APIs
- When NOT to use: GraphQL (has its own error format)

---

## Gotchas & Warnings

### PATTERN-005: Prisma DateTime Timezone

```yaml
id: PATTERN-005
type: gotcha
scope: stack-specific
tags: [#prisma, #postgresql, #datetime, #timezone, #bug]
agents: [Backend Developer]
gate: G5.2
created: 2024-01-14
```

**Problem:** Dates showing wrong in UI

**Context:** Storing and retrieving dates with Prisma + PostgreSQL

**Gotcha:**
Prisma returns JavaScript Date objects in UTC, but PostgreSQL `timestamp` type stores without timezone info. When the frontend displays, it may show wrong time.

**Impact:** Users see incorrect timestamps (off by hours)

**Workaround:**
1. Always use `timestamptz` (timestamp with timezone) in PostgreSQL
2. Store all times in UTC
3. Convert to user timezone ONLY in frontend display layer

```typescript
// In Prisma schema
createdAt DateTime @default(now()) @db.Timestamptz

// In frontend
const localTime = new Date(utcTime).toLocaleString('en-US', {
  timeZone: userTimezone
});
```

**Reuse Guidance:**
- Always applies when using Prisma + PostgreSQL with dates
- Consider moment-timezone or date-fns-tz for complex timezone handling

---

## Agent-Specific Learnings

### Product Manager

```yaml
tags: [#product-manager, #requirements]
```
- PATTERN-XXX: [Learning with reference]
- [Learning 2]

### Architect

```yaml
tags: [#architect, #design]
```
- PATTERN-XXX: [Learning with reference]
- [Learning 2]

### Frontend Developer

```yaml
tags: [#frontend, #react, #ui]
```
- PATTERN-002: Zustand over Redux for small-medium apps
- [Learning 2]

### Backend Developer

```yaml
tags: [#backend, #api, #database]
```
- PATTERN-003: Avoid SQLite for multi-user web apps
- PATTERN-004: Standardized API error format
- PATTERN-005: Prisma timezone gotcha

### ML Engineer

```yaml
tags: [#ml, #ai, #models]
```
- [Learning 1]
- [Learning 2]

---

## Third-Party Integration Notes

### [Service Name]

```yaml
id: INTEGRATION-001
tags: [#integration, #third-party, #service-name]
```

**Documentation:** [Link]
**API Key Location:** [Where it's stored - e.g., `.env.STRIPE_SECRET_KEY`]
**Rate Limits:** [e.g., 100 req/min]
**Gotchas:**
- [Gotcha 1]
- [Gotcha 2]
**Contact:** [Support contact if available]

---

## Performance Learnings

| ID | Issue | Cause | Solution | Impact | Tags |
|----|-------|-------|----------|--------|------|
| PERF-001 | [Issue] | [Cause] | [Solution] | [Impact] | #performance |

---

## Security Learnings

| ID | Vulnerability | How Discovered | Fix | Prevention | Tags |
|----|---------------|----------------|-----|------------|------|
| SEC-001 | [Vuln] | [Discovery] | [Fix] | [Prevention] | #security |

---

## Deployment Learnings

| ID | Issue | Environment | Solution | Prevention | Tags |
|----|-------|-------------|----------|------------|------|
| DEPLOY-001 | [Issue] | [Env] | [Solution] | [Prevention] | #deployment |

---

## Cross-Project Applicability Legend

All patterns are tagged with scope:

| Scope | Icon | Description | Example Tags |
|-------|------|-------------|--------------|
| `universal` | `U` | Applies to all projects | #error-handling, #security |
| `stack-specific` | `S` | Applies to same tech stack | #react, #prisma, #node |
| `domain-specific` | `D` | Applies to similar domains | #ecommerce, #saas, #fintech |

---

## Search Cheatsheet

```bash
# All universal patterns (copy to any project)
grep -B 2 "scope: universal" docs/MEMORY.md | grep "id:"

# All security-related entries
grep -B 5 -A 20 "#security" docs/MEMORY.md

# All failures (avoid repeating)
grep -B 5 -A 15 "type: failure" docs/MEMORY.md

# Entries from specific agent
grep -B 5 -A 15 "agents:.*Frontend Developer" docs/MEMORY.md

# Entries from specific gate
grep -B 5 -A 15 "gate: G5" docs/MEMORY.md
```

---

## Memory Sync Protocol

### At Project Completion

1. Review all PATTERN-XXX entries in this file
2. Identify entries with `scope: universal`
3. Copy universal entries to `SYSTEM_MEMORY.md` in agent system
4. Update entry IDs to global format (GLOBAL-PATTERN-XXX)

### When Starting New Project

1. Read `SYSTEM_MEMORY.md` from agent system
2. Filter by relevant tags (tech stack, domain)
3. Reference relevant patterns in ARCHITECTURE.md

---

## Memory Statistics

| Metric | Count |
|--------|-------|
| Total Patterns | [X] |
| Successes | [X] |
| Failures | [X] |
| Gotchas | [X] |
| Universal (copyable) | [X] |

---

**Last Updated:** YYYY-MM-DD
**Pattern ID Counter:** PATTERN-00X (increment for new entries)
