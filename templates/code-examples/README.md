# Code Examples

Reference implementations for agents. These are templates showing patterns and conventions - adapt to project requirements.

## Contents

| File | Used By | Description |
|------|---------|-------------|
| `node-express-setup.md` | Backend Developer | Express/TypeScript project structure, config, error handling |
| `node-auth-service.md` | Backend Developer | JWT auth service with refresh tokens |
| `react-patterns.md` | Frontend Developer | Components, state management, data fetching, routing |
| `github-actions.md` | DevOps | CI/CD pipeline templates |
| `ai-service-tiers.md` | AIOps | AI infrastructure by scale tier (MVP → Enterprise) |
| `testing-patterns.md` | QA / All Developers | Vitest setup, Prisma mocking, API testing with Supertest |
| `readme-template.md` | All Agents | Standard README structure for generated projects |

## Usage

Agents reference these files instead of including full code inline. This keeps agent prompts focused on decision-making and behavior while providing detailed implementation guidance when needed.

### From Agent Prompts

```markdown
For implementation details, see `templates/code-examples/node-auth-service.md`
```

### Agent → Template Mapping

| Agent | References |
|-------|------------|
| Backend Developer | `node-express-setup.md`, `node-auth-service.md`, `testing-patterns.md` |
| Frontend Developer | `react-patterns.md`, `testing-patterns.md` |
| QA Engineer | `testing-patterns.md` |
| DevOps Engineer | `github-actions.md` |
| AIOps Engineer | `ai-service-tiers.md` |
| All Agents | `readme-template.md` (for README generation at G8) |

## Adding New Examples

When adding code examples:
1. Create a new `.md` file in this directory
2. Include working, production-ready code (not pseudocode)
3. Add comments explaining key decisions
4. Update this README with the new file
5. Update the relevant agent to reference the file
