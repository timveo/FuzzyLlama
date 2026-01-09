# Example: Todo App

This is a **completed example** showing what the Multi-Agent System produces for a simple task management application.

## Project Summary

| Attribute | Value |
|-----------|-------|
| **Project Type** | Traditional Web App |
| **Complexity** | Simple |
| **Duration** | ~1 week |
| **Tech Stack** | React + Express + PostgreSQL |
| **Starter Used** | None (custom) |

## What's Included

```
todo-app/
├── docs/
│   ├── INTAKE.md          # Completed intake questionnaire
│   ├── PRD.md             # Product requirements document
│   ├── ARCHITECTURE.md    # System architecture
│   ├── TECH_STACK.md      # Technology decisions
│   ├── DECISIONS.md       # Architecture decision records
│   ├── STATUS.md          # Final project status
│   └── MEMORY.md          # Lessons learned
├── src/
│   ├── frontend/          # React application
│   └── backend/           # Express API
├── tests/                 # Test examples
└── README.md              # This file
```

## Workflow Phases Demonstrated

### Phase 1: Intake
- User described a simple todo app
- Orchestrator asked clarifying questions
- Project classified as "traditional web app"
- See: `docs/INTAKE.md`

### Phase 2: Planning (Product Manager)
- Created user personas
- Defined 8 user stories with acceptance criteria
- Established success metrics
- See: `docs/PRD.md`

### Phase 3: Architecture (Architect)
- Designed system components
- Selected tech stack with rationale
- Created database schema
- Defined API contracts
- See: `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`

### Phase 4: Development (Frontend + Backend)
- Implemented React components
- Built Express API
- Integrated frontend with backend
- See: `src/frontend/`, `src/backend/`

### Phase 5: Testing (QA)
- Unit tests for components
- API integration tests
- See: `tests/`

### Phase 6: Deployment (DevOps)
- Configured for Vercel + Railway
- CI/CD pipeline defined
- See: deployment configs in source

## Key Takeaways

1. **Documentation First**: Notice how PRD and Architecture are complete before any code is written
2. **Clear Decisions**: Every tech choice is documented with rationale in DECISIONS.md
3. **Incremental Approval**: Each phase was approved before proceeding
4. **Production Ready**: Code includes error handling, tests, and deployment config

## Using This Example

### To Learn
Read through the docs in order: INTAKE → PRD → ARCHITECTURE → look at code

### To Start Similar Project
```
"Create a new project similar to the todo-app example at ~/projects/my-tasks"
```

### To Understand Handoffs
Look at STATUS.md to see how progress was tracked between agents
