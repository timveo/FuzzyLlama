# Example Projects

This directory contains example projects showing what the Multi-Agent System produces at each phase.

## Available Examples

### [todo-app](todo-app/)

A simple task management application demonstrating the complete workflow.

**What's Included:**
- Complete documentation (PRD, Architecture, Decisions)
- Sample frontend code (React + TypeScript)
- Sample backend code (Express + Prisma)
- Test examples
- Deployment configuration

**Use this to understand:**
- What each document looks like when complete
- How agents hand off work to each other
- What quality "good enough" looks like
- The structure of a finished project

### [proof-artifact-demo](proof-artifact-demo/)

Demonstrates the proof artifact enforcement system that makes gates **actually blocking**.

**What's Included:**
- Sample `.truth/` directory with proof artifacts
- Example proof files for G3, G5, G6, G7 gates
- Sample `truth.json` showing state structure
- Step-by-step workflow documentation

**Use this to understand:**
- How proof artifacts are generated and stored
- Gate requirements and blocking enforcement
- SHA256 integrity verification
- Audit trail for forced overrides
- CI/CD integration patterns

---

## How to Use These Examples

### 1. Learn the Document Structure
Browse the `docs/` folder to see what PRD.md, ARCHITECTURE.md, and other documents look like when properly completed.

### 2. Reference During Your Project
When working on your own project, compare your documents against these examples to ensure you're on track.

### 3. Copy and Adapt
Feel free to copy sections from these examples as starting points for your own projects.

---

## Example Projects vs. Starters

| Examples | Starters |
|----------|----------|
| Show completed work | Provide starting scaffolding |
| For learning/reference | For accelerating new projects |
| Include all artifacts | Include minimal boilerplate |
| Located in `examples/` | Located in `templates/starters/` |

---

## Contributing Examples

To add a new example:

1. Create a new directory under `examples/`
2. Include complete documentation in `docs/`
3. Include representative code samples (not full implementation)
4. Add an entry to this README
5. Update the example's own README with context
