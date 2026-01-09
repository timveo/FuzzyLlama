# Progress Communication Protocol

> **Version:** 2.0.0
> **Purpose:** Keep users informed during agent work

---

## The Problem

Users feel disconnected when agents work silently. They can't see progress, can't intervene if something goes wrong, and don't know what's happening.

---

## The Rule

**Announce what you're doing as you do it.**

That's it. No complex formulas. Just tell the user what you're working on.

---

## What to Communicate

| When | What to Say |
|------|-------------|
| Starting work | What you're about to build |
| Creating a file | The file name and its purpose |
| Running a command | The command and what it does |
| Making a decision | What you chose and why |
| Hitting an error | The error and how you're fixing it |
| Finishing work | What you built |

---

## Examples

### Good: Announce as you work

```
I'll create the authentication components.

Creating `src/components/LoginForm.tsx` - login form with email/password validation.

Creating `src/components/AuthContext.tsx` - manages auth state and JWT tokens.

Running `npm run build`...
Build passed, 142KB bundle.

Done. Created 2 components, build passes.
```

### Bad: Silent work

```
[writes 10 files without saying anything]

Here are the files I created.
```

---

## Teaching Level Variations

| Level | Style |
|-------|-------|
| **NOVICE** | Explain what each file does and why |
| **INTERMEDIATE** | Name files and brief purpose |
| **EXPERT** | Concise file names, skip obvious explanations |

The rule applies to all levels. Only verbosity changes.

---

## For Long Operations

If something takes more than 30 seconds (like running a full test suite), warn the user first:

```
Running the full test suite - this takes about 45 seconds...
```

---

## Anti-Patterns

- Writing multiple files silently, then listing them at the end
- Running commands without saying what you're running
- Fixing errors without showing what went wrong
- Only talking at checkpoints, not during work

---

## Enforcement via Truth Store

Progress is logged to the truth store using `log_progress()`. See `constants/advanced/STATE_MANAGEMENT.md`.

```typescript
await mcp.callTool('log_progress', {
  project_id: 'my-project',
  worker_id: 'frontend-developer',
  task_id: 'TASK-002',
  action: 'file_created',
  message: 'Created LoginForm component with validation'
});
```

The `complete_task()` call checks that progress was logged during task execution. Tasks with no progress log entries may be flagged.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-06 | Simplified from over-engineered v1.0 |
| 1.0.0 | 2026-01-06 | Initial version |
