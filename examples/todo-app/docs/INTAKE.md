# Project Intake: Todo App

> **Completed**: 2024-01-15
> **Project Classification**: Traditional Web Application
> **Recommended Workflow**: Greenfield

---

## Section 1: Project Basics

### 1.1 What do you want to build or improve?

```
[x] New application (greenfield)
[ ] Enhance/improve existing application
[ ] Evaluate existing codebase (assessment only)
[ ] Other: _____________
```

### 1.2 Project Name

```
Name: todo-app
```

### 1.3 One-Sentence Description

> What does this project do? Who is it for?

```
A simple task management app for individuals to track personal todos with categories and due dates.
```

### 1.4 Why are you building this?

> What problem does it solve? What's the business value?

```
I constantly forget tasks and lose track of what's important. I want a clean, fast
todo app that helps me stay organized without the bloat of existing solutions.
```

---

## Section 2: Project Type (New Projects)

### 2.1 Does this project involve AI/ML?

```
[x] No AI - Traditional web/mobile app
[ ] Yes - Using AI APIs (OpenAI, Anthropic, etc.)
[ ] Yes - Custom model training/fine-tuning
[ ] Unsure - Need guidance
```

### 2.2 What kind of application?

```
[x] Web application (browser-based)
[ ] Mobile app (iOS/Android)
[ ] API/Backend service only
[ ] Desktop application
[ ] CLI tool
[ ] Other: _____________
```

### 2.3 Does a starter template fit your needs?

| Template | Best For | Select |
|----------|----------|--------|
| **saas-app** | SaaS with auth, billing, dashboard | [ ] |
| **ai-chatbot** | Conversational AI with streaming | [ ] |
| **api-only** | Headless API service | [ ] |
| **landing-page** | Marketing/landing pages | [ ] |
| **None** | Custom requirements | [x] |

---

## Section 3: Existing Codebase (Enhancement Projects)

*Skipped - this is a new project*

---

## Section 4: Existing Artifacts

> What materials do you already have that we should use?

### 4.1 Documentation

```
[ ] PRD / Requirements document
[ ] Technical spec / Architecture doc
[ ] API documentation
[ ] User research / Personas
[ ] Wireframes / Mockups
[x] Other: Rough sketches on paper
```

### 4.2 Where are these artifacts?

| Artifact | Location (URL or path) |
|----------|------------------------|
| PRD | N/A |
| Designs | Paper sketches (will describe verbally) |
| Specs | N/A |
| Other | N/A |

### 4.3 Code from AI Tools

> Did you generate any code using AI tools?

```
[x] No existing AI-generated code
[ ] Lovable.dev
[ ] v0.dev (Vercel)
[ ] Bolt.new
[ ] Cursor / Copilot
[ ] Claude Artifacts
[ ] Other: _____________
```

---

## Section 5: User Intent & Constraints

### 5.1 What must stay exactly as-is?

```
[ ] Frontend design / UI appearance
[ ] Frontend code / implementation
[ ] Backend architecture
[ ] Database schema
[ ] API contracts / endpoints
[ ] Authentication approach
[ ] Tech stack choices
[ ] Third-party integrations
[ ] Other: _____________
```

*No constraints - this is a new project*

### 5.2 Describe your constraints in your own words

```
No hard constraints. I'm open to recommendations on tech stack.
Would prefer something modern and not over-engineered for this simple app.
```

### 5.3 What CAN be changed or improved?

```
[x] Frontend design / UI
[x] Frontend code / implementation
[x] Backend architecture
[x] Database schema
[x] API design
[x] Authentication
[x] Tech stack
[x] Testing approach
[x] DevOps / Infrastructure
[x] Everything except what's locked above
```

### 5.4 Decision Authority

```
[ ] Preserve existing design/code, even if suboptimal
[x] Optimize for quality, propose changes if beneficial
[ ] Balance - preserve where possible, flag issues for discussion
```

---

## Section 6: Requirements

### 6.1 Target Users

```
Primary users: Individual users managing personal tasks
Secondary users: N/A (single-user app initially)
```

### 6.2 Key Features (Priority Order)

| # | Feature | Must-Have? | Notes |
|---|---------|------------|-------|
| 1 | Add new tasks | [x] Yes [ ] No | Quick entry, just title initially |
| 2 | Mark tasks complete | [x] Yes [ ] No | One-click toggle |
| 3 | Delete tasks | [x] Yes [ ] No | With confirmation |
| 4 | Edit task details | [x] Yes [ ] No | Title, description, due date |
| 5 | Filter by status | [x] Yes [ ] No | All, Active, Completed |
| 6 | Categories/tags | [ ] Yes [x] No | Nice to have for v2 |
| 7 | Due date reminders | [ ] Yes [x] No | Future feature |

### 6.3 Integrations

```
[ ] Payment processing (Stripe, etc.)
[ ] Authentication (OAuth, SSO)
[ ] Email service
[ ] Analytics
[ ] CRM
[ ] AI/ML APIs
[x] Other: None needed for MVP
```

### 6.4 Data Requirements

```
[x] User accounts needed
[ ] Sensitive data (PII, financial, health)
[ ] Large data volumes (>1M records)
[ ] Real-time data sync
[ ] Offline support needed
```

---

## Section 7: Technical Constraints

### 7.1 Required Technologies

```
Must use: No specific requirements
Cannot use: PHP, jQuery (personal preference)
Reason: Want to use modern stack for learning
```

### 7.2 Compliance Requirements

```
[x] None
[ ] GDPR
[ ] HIPAA
[ ] SOC 2
[ ] PCI-DSS
[ ] Other: _____________
```

---

## Section 8: Success Criteria

### 8.1 How will you measure success?

| Metric | Target |
|--------|--------|
| Task creation time | < 3 seconds |
| Page load time | < 2 seconds |
| Personal usage | Use it daily for 1 week |

### 8.2 Definition of Done

```
The project is complete when I can:
- Add, edit, delete, and complete tasks
- Filter tasks by status
- Access it from my phone (responsive)
- It's deployed and accessible online
```

---

## Section 9: Additional Context

### 9.1 Relevant Documents

```
- Paper sketches showing basic UI layout
```

### 9.2 Anything else we should know?

```
This is a learning project as well. I want clean, well-documented code
that I can understand and extend later. Prefer simplicity over features.
```

---

## Intake Complete

**Orchestrator Classification:**

```json
{
  "intake_complete": true,
  "intake_date": "2024-01-15",
  "project_classification": "traditional",
  "recommended_workflow": "greenfield",
  "recommended_starter": null,
  "initial_agents": ["Product Manager", "Architect", "Frontend Developer", "Backend Developer", "QA Engineer", "DevOps Engineer"],
  "existing_artifacts": {
    "has_prd": false,
    "has_designs": false,
    "has_code": false,
    "code_source": null,
    "artifact_locations": {}
  },
  "user_constraints": {
    "locked_components": [],
    "change_authority": "optimize",
    "verbatim_constraints": "No hard constraints. Open to recommendations.",
    "flexible_areas": ["all"]
  },
  "clarifications_needed": []
}
```

**Next Step:** Activate Product Manager to create PRD
