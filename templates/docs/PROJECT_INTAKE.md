# Project Intake

> ⚠️ **DEPRECATED:** This detailed intake form is now supplementary material.
>
> **Use the unified 5-question onboarding instead:** `constants/protocols/UNIFIED_ONBOARDING.md`
>
> This document can be used for:
> - Detailed planning after initial onboarding
> - Comprehensive documentation for complex projects
> - Reference for what questions COULD be asked if needed

---

## The 5 Core Questions (Use These First)

| # | Question |
|---|----------|
| Q1 | What are you building? |
| Q2 | Do you have existing code? If yes, where is it from? |
| Q3 | What's your technical background? |
| Q4 | What does "done" look like for you? |
| Q5 | Any constraints I should know about? |

**After these 5 questions, use sections below only if more detail is needed.**

---

## Section 1: Project Basics (Supplementary)

### 1.1 What do you want to build or improve?

```
[ ] New application (greenfield)
[ ] Enhance/improve existing application
[ ] Evaluate existing codebase (assessment only)
[ ] Other: _____________
```

### 1.2 Project Name

```
Name: _______________________
```

### 1.3 One-Sentence Description

> What does this project do? Who is it for?

```
_____________________________________________________________
```

### 1.4 Why are you building this?

> What problem does it solve? What's the business value?

```
_____________________________________________________________
```

---

## Section 2: Project Type (New Projects)

*Skip to Section 3 if enhancing existing code*

### 2.1 Does this project involve AI/ML?

```
[ ] No AI - Traditional web/mobile app
[ ] Yes - Using AI APIs (OpenAI, Anthropic, etc.)
[ ] Yes - Custom model training/fine-tuning
[ ] Unsure - Need guidance
```

### 2.2 What kind of application?

```
[ ] Web application (browser-based)
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
| **None** | Custom requirements | [ ] |

---

## Section 3: Existing Codebase (Enhancement Projects)

*Skip to Section 4 if building new*

### 3.1 Repository Information

```
Repository URL: _______________________
Primary Language: _____________________
Framework(s): _________________________
```

### 3.2 What do you want to achieve?

```
[ ] Fix bugs/issues
[ ] Add new features
[ ] Improve performance
[ ] Improve security
[ ] Refactor/clean up code
[ ] Modernize tech stack
[ ] Full assessment (don't know yet)
[ ] Other: _____________
```

### 3.3 Known Pain Points

> What's broken, slow, or frustrating?

```
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

### 3.4 Do you have access to?

```
[ ] Source code repository
[ ] Production environment
[ ] Staging environment
[ ] CI/CD pipeline
[ ] Monitoring/logs
[ ] Documentation
```

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
[ ] Other: _____________
```

### 4.2 Where are these artifacts?

| Artifact | Location (URL or path) |
|----------|------------------------|
| PRD | |
| Designs | |
| Specs | |
| Other | |

### 4.3 Code from AI Tools

> Did you generate any code using AI tools?

```
[ ] No existing AI-generated code
[ ] Lovable.dev
[ ] v0.dev (Vercel)
[ ] Bolt.new
[ ] Cursor / Copilot
[ ] Claude Artifacts
[ ] Other: _____________
```

---

## Section 5: User Intent & Constraints

> **Critical:** Tell us what MUST be preserved and what CAN'T change.

### 5.1 What must stay exactly as-is?

> Check all that apply. These will NOT be modified without explicit approval.

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

### 5.2 Describe your constraints in your own words

> Be specific. Examples:
> - "Keep the frontend exactly as designed in Lovable"
> - "Don't change the database schema, we have production data"
> - "Must use Supabase, non-negotiable"
> - "The landing page design is final, approved by stakeholders"

```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 5.3 What CAN be changed or improved?

> Where do agents have freedom to make recommendations?

```
[ ] Frontend design / UI
[ ] Frontend code / implementation
[ ] Backend architecture
[ ] Database schema
[ ] API design
[ ] Authentication
[ ] Tech stack
[ ] Testing approach
[ ] DevOps / Infrastructure
[ ] Everything except what's locked above
```

### 5.4 Decision Authority

> When agents encounter trade-offs, what's the priority?

```
[ ] Preserve existing design/code, even if suboptimal
[ ] Optimize for quality, propose changes if beneficial
[ ] Balance - preserve where possible, flag issues for discussion
```

---

## Section 6: Requirements

### 6.1 Target Users

> Who will use this?

```
Primary users: _______________________
Secondary users: _____________________
```

### 6.2 Key Features (Priority Order)

| # | Feature | Must-Have? | Notes |
|---|---------|------------|-------|
| 1 | | [ ] Yes [ ] No | |
| 2 | | [ ] Yes [ ] No | |
| 3 | | [ ] Yes [ ] No | |
| 4 | | [ ] Yes [ ] No | |
| 5 | | [ ] Yes [ ] No | |

### 6.3 Integrations

> What external systems need to connect?

```
[ ] Payment processing (Stripe, etc.)
[ ] Authentication (OAuth, SSO)
[ ] Email service
[ ] Analytics
[ ] CRM
[ ] AI/ML APIs
[ ] Other: _____________
```

### 6.4 Data Requirements

```
[ ] User accounts needed
[ ] Sensitive data (PII, financial, health)
[ ] Large data volumes (>1M records)
[ ] Real-time data sync
[ ] Offline support needed
```

---

## Section 7: Technical Constraints

### 7.1 Required Technologies

> Any required or prohibited technologies?

```
Must use: _______________________
Cannot use: _____________________
Reason: _________________________
```

### 7.2 Compliance Requirements

```
[ ] None
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
| | |
| | |

### 8.2 Definition of Done

> When is this project "complete"?

```
_____________________________________________________________
```

---

## Section 9: Additional Context

### 9.1 Relevant Documents

> Link any existing specs, designs, research, etc.

```
- 
- 
```

### 9.2 Anything else we should know?

```
_____________________________________________________________
```

---

## Intake Complete

**Next Steps:**

1. Orchestrator reviews intake
2. Project classified (traditional / ai_ml / hybrid / enhancement)
3. **User constraints locked** (Section 5 becomes immutable without approval)
4. **APPROVAL GATE G1:** You review and approve project scope
5. Appropriate workflow begins

---

## For Orchestrator Use

```json
{
  "intake_complete": true,
  "intake_date": "YYYY-MM-DD",
  "project_classification": "",
  "recommended_workflow": "",
  "recommended_starter": "",
  "initial_agents": [],
  "existing_artifacts": {
    "has_prd": false,
    "has_designs": false,
    "has_code": false,
    "code_source": "",
    "artifact_locations": {}
  },
  "user_constraints": {
    "locked_components": [],
    "change_authority": "",
    "verbatim_constraints": "",
    "flexible_areas": []
  },
  "clarifications_needed": []
}
```
