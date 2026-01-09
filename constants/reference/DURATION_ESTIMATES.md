# Duration Estimates Reference

> **Purpose:** Provide realistic time estimates for AI-assisted multi-agent development
> **Last Updated:** 2025-01-03

---

## Quick Reference: Project Duration

| Project Type | AI Execution Time | With Approvals | User Involvement |
|--------------|-------------------|----------------|------------------|
| **Simple MVP** | 4-8 hours | 1-2 days | ~30 min total |
| **Standard App** | 12-24 hours | 3-5 days | ~2 hours total |
| **Complex App** | 30-60 hours | 1-2 weeks | ~4 hours total |
| **AI/ML Project** | 40-80 hours | 2-3 weeks | ~6 hours total |

**Note:** "AI Execution Time" is pure agent work time. "With Approvals" includes waiting for human gate approvals during business hours.

---

## Phase Duration Breakdown

### Greenfield Project (Traditional)

| Phase | Gate | Agent(s) | AI Time | Notes |
|-------|------|----------|---------|-------|
| **Startup** | G0 | Orchestrator | 5-15 min | Initial setup, project creation |
| **Intake** | G1 | Orchestrator | 15-45 min | Questionnaire, depends on user response time |
| **Planning** | G2 | Product Manager | 1-3 hours | PRD creation, user stories |
| **Architecture** | G3 | Architect | 2-4 hours | Tech design, API specs, schema |
| **Design** | G4 | UX/UI Designer | 2-4 hours | Wireframes, design system |
| **Development** | G5 | Frontend + Backend | 8-24 hours | Parallel execution possible |
| **Testing** | G6 | QA Engineer | 2-4 hours | Test execution, bug fixes |
| **Security** | G7 | Security Engineer | 1-2 hours | Review, threat modeling |
| **Deployment** | G8 | DevOps | 1-3 hours | Infrastructure, CI/CD |
| **Production** | G9 | DevOps | 30-60 min | Final checks, go-live |

**Total Range:** 18-58 hours of AI execution time

### AI/ML Project (Additional Phases)

| Phase | Gate | Agent(s) | AI Time | Notes |
|-------|------|----------|---------|-------|
| **Data Setup** | G5 | Data Engineer | 3-6 hours | Pipelines, data models |
| **ML Integration** | G5 | ML Engineer | 4-8 hours | Model selection, architecture |
| **Prompt Development** | G5 | Prompt Engineer | 2-4 hours | Prompt library, optimization |
| **Model Evaluation** | G6 | Model Evaluator | 2-4 hours | Benchmarks, testing |
| **AI Deployment** | G8 | AIOps Engineer | 2-4 hours | Model serving, monitoring |

**Additional AI Time:** 13-26 hours

---

## Agent Duration Details

### Orchestrator
| Task | Duration | Frequency |
|------|----------|-----------|
| Project initialization | 5-10 min | Once |
| Intake questionnaire | 15-30 min | Once |
| Gate approval presentation | 2-5 min | Per gate |
| Agent transition | 1-2 min | Per transition |
| Conflict resolution | 5-15 min | As needed |
| Session recovery | 2-5 min | On resume |

### Product Manager
| Task | Duration | Frequency |
|------|----------|-----------|
| Initial PRD draft | 30-60 min | Once |
| User personas | 15-30 min | Once |
| User stories (per story) | 5-10 min | Per story |
| Success metrics | 15-20 min | Once |
| PRD refinement | 15-30 min | Per iteration |

**Total Phase:** 1-3 hours (depends on scope)

### Architect
| Task | Duration | Frequency |
|------|----------|-----------|
| Tech stack analysis | 20-40 min | Once |
| System design | 30-60 min | Once |
| Database schema | 20-40 min | Once |
| API specification | 30-60 min | Once |
| Architecture doc | 30-45 min | Once |
| ADR creation | 10-15 min | Per decision |

**Total Phase:** 2-4 hours

### UX/UI Designer
| Task | Duration | Frequency |
|------|----------|-----------|
| User flow design | 20-40 min | Once |
| Wireframes (per screen) | 10-20 min | Per screen |
| Design system tokens | 20-30 min | Once |
| Component specs | 15-30 min | Once |
| Accessibility review | 15-20 min | Once |

**Total Phase:** 2-4 hours (5-10 screens)

### Frontend Developer
| Task | Duration | Frequency |
|------|----------|-----------|
| Project scaffolding | 10-20 min | Once |
| Component creation (simple) | 10-20 min | Per component |
| Component creation (complex) | 30-60 min | Per component |
| Page implementation | 20-40 min | Per page |
| State management setup | 20-40 min | Once |
| API integration | 15-30 min | Per endpoint |
| Test writing | 10-20 min | Per component |
| Self-healing retry | 5-15 min | Per failure (max 3) |

**Total Phase:** 4-12 hours (MVP), 12-24 hours (complex)

### Backend Developer
| Task | Duration | Frequency |
|------|----------|-----------|
| Project scaffolding | 10-20 min | Once |
| Database setup | 15-30 min | Once |
| Auth implementation | 30-60 min | Once |
| CRUD endpoint | 15-30 min | Per entity |
| Complex business logic | 30-60 min | Per feature |
| Test writing | 10-20 min | Per endpoint |
| Self-healing retry | 5-15 min | Per failure (max 3) |

**Total Phase:** 4-10 hours (MVP), 10-24 hours (complex)

### Data Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Data model design | 30-60 min | Once |
| Pipeline setup | 30-60 min | Per pipeline |
| Quality checks | 20-40 min | Once |
| Feature store setup | 30-45 min | Once |

**Total Phase:** 3-6 hours

### ML Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Model selection analysis | 30-60 min | Once |
| RAG architecture setup | 60-120 min | Once |
| Multi-model routing | 30-60 min | Once |
| AI service integration | 30-60 min | Per service |
| Cost optimization | 20-40 min | Once |

**Total Phase:** 4-8 hours

### Prompt Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Prompt template creation | 15-30 min | Per prompt |
| Prompt optimization | 20-40 min | Per prompt |
| Chain implementation | 30-60 min | Per chain |
| Prompt testing | 15-30 min | Per prompt |
| Documentation | 20-30 min | Once |

**Total Phase:** 2-4 hours

### Model Evaluator
| Task | Duration | Frequency |
|------|----------|-----------|
| Benchmark setup | 30-60 min | Once |
| Test case creation | 20-40 min | Per category |
| Evaluation execution | 30-60 min | Per model |
| Bias/hallucination testing | 30-45 min | Once |
| A/B test setup | 20-40 min | Once |

**Total Phase:** 2-4 hours

### QA Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Test plan creation | 20-40 min | Once |
| E2E test writing | 15-30 min | Per flow |
| API test writing | 10-20 min | Per endpoint |
| Performance testing | 30-60 min | Once |
| Bug triage | 5-10 min | Per bug |
| Regression testing | 30-60 min | Once |

**Total Phase:** 2-4 hours

### Security & Privacy Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Threat modeling | 30-60 min | Once |
| Auth review | 20-40 min | Once |
| Data protection review | 20-30 min | Once |
| Dependency scan | 10-20 min | Once |
| Penetration test prep | 20-40 min | Once |
| Security sign-off | 10-15 min | Once |

**Total Phase:** 1-2 hours

### DevOps Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Infrastructure setup | 30-60 min | Once |
| CI/CD pipeline | 30-60 min | Once |
| Environment config | 20-40 min | Per environment |
| Monitoring setup | 20-40 min | Once |
| Runbook creation | 20-30 min | Once |
| Deployment execution | 10-20 min | Per deployment |

**Total Phase:** 1-3 hours

### AIOps Engineer
| Task | Duration | Frequency |
|------|----------|-----------|
| Model serving setup | 30-60 min | Once |
| AI monitoring | 30-45 min | Once |
| Cost tracking setup | 20-30 min | Once |
| Drift detection | 20-40 min | Once |
| Auto-scaling config | 20-30 min | Once |

**Total Phase:** 2-4 hours

---

## Project Type Templates

### Simple MVP (Todo App, Portfolio Site)
```
┌────────────────────────────────────────────────────────────────┐
│ SIMPLE MVP TIMELINE                                             │
├─────────────────┬──────────────┬──────────────────────────────┤
│ Phase           │ Duration     │ Cumulative                   │
├─────────────────┼──────────────┼──────────────────────────────┤
│ Startup/Intake  │ 20-30 min    │ 30 min                       │
│ Planning        │ 45-90 min    │ 2 hours                      │
│ Architecture    │ 60-90 min    │ 3.5 hours                    │
│ Development     │ 2-4 hours    │ 7.5 hours                    │
│ Testing         │ 30-60 min    │ 8.5 hours                    │
│ Deployment      │ 30-60 min    │ 9.5 hours                    │
├─────────────────┼──────────────┼──────────────────────────────┤
│ TOTAL           │ 5-8 hours    │ ~1 day with approvals        │
└─────────────────┴──────────────┴──────────────────────────────┘
```

### Standard SaaS App (Auth, Dashboard, Billing)
```
┌────────────────────────────────────────────────────────────────┐
│ STANDARD SAAS TIMELINE                                          │
├─────────────────┬──────────────┬──────────────────────────────┤
│ Phase           │ Duration     │ Cumulative                   │
├─────────────────┼──────────────┼──────────────────────────────┤
│ Startup/Intake  │ 30-45 min    │ 45 min                       │
│ Planning        │ 2-3 hours    │ 3.5 hours                    │
│ Architecture    │ 2-4 hours    │ 7.5 hours                    │
│ Design          │ 2-3 hours    │ 10.5 hours                   │
│ Development     │ 8-16 hours   │ 26.5 hours                   │
│ Testing         │ 2-3 hours    │ 29.5 hours                   │
│ Security        │ 1-2 hours    │ 31.5 hours                   │
│ Deployment      │ 1-2 hours    │ 33.5 hours                   │
├─────────────────┼──────────────┼──────────────────────────────┤
│ TOTAL           │ 18-33 hours  │ 3-5 days with approvals      │
└─────────────────┴──────────────┴──────────────────────────────┘
```

### AI Chatbot with RAG
```
┌────────────────────────────────────────────────────────────────┐
│ AI CHATBOT TIMELINE                                             │
├─────────────────┬──────────────┬──────────────────────────────┤
│ Phase           │ Duration     │ Cumulative                   │
├─────────────────┼──────────────┼──────────────────────────────┤
│ Startup/Intake  │ 30-60 min    │ 1 hour                       │
│ Planning        │ 2-4 hours    │ 5 hours                      │
│ Architecture    │ 3-5 hours    │ 10 hours                     │
│ Design          │ 2-3 hours    │ 13 hours                     │
│ Data Setup      │ 3-6 hours    │ 19 hours                     │
│ ML Integration  │ 4-8 hours    │ 27 hours                     │
│ Prompts         │ 2-4 hours    │ 31 hours                     │
│ Development     │ 8-16 hours   │ 47 hours                     │
│ Model Eval      │ 2-4 hours    │ 51 hours                     │
│ Testing         │ 2-4 hours    │ 55 hours                     │
│ Security        │ 1-2 hours    │ 57 hours                     │
│ AI Deployment   │ 2-4 hours    │ 61 hours                     │
│ Deployment      │ 1-2 hours    │ 63 hours                     │
├─────────────────┼──────────────┼──────────────────────────────┤
│ TOTAL           │ 32-72 hours  │ 2-3 weeks with approvals     │
└─────────────────┴──────────────┴──────────────────────────────┘
```

---

## Factors Affecting Duration

### Increases Duration

| Factor | Impact | Mitigation |
|--------|--------|------------|
| Complex requirements | +50-100% | More detailed PRD |
| Custom integrations | +2-8 hours each | Use standard APIs |
| Extensive testing | +25-50% | Focus on critical paths |
| Multiple environments | +1-2 hours each | Start with staging only |
| Security compliance | +2-4 hours | Early security review |
| Data migration | +4-8 hours | Plan early |

### Decreases Duration

| Factor | Impact | How to Enable |
|--------|--------|---------------|
| Starter template | -20-40% | Use matching template |
| Clear requirements | -15-25% | Detailed intake |
| Parallel development | -20-30% | Independent components |
| Self-healing enabled | -10-20% | Automatic error fixing |
| Expert teaching level | -10-15% | Less explanation needed |

---

## Waiting Time Estimates

### Gate Approvals (User Response Time)

| Gate | Typical Wait | Range |
|------|--------------|-------|
| G1 (Intake) | 5-15 min | Immediate-1 hour |
| G2 (PRD) | 15-30 min | 15 min-4 hours |
| G3 (Architecture) | 15-45 min | 15 min-2 hours |
| G4 (Design) | 15-30 min | 15 min-2 hours |
| G5 (Development) | 10-20 min | 10 min-1 hour |
| G6-G7 (QA/Security) | 10-15 min | 5 min-1 hour |
| G8-G9 (Deploy) | 5-15 min | 5 min-30 min |

**Best Practice:** Complete approvals in same session to minimize wait time.

### External Dependencies

| Dependency | Typical Wait | Notes |
|------------|--------------|-------|
| API key acquisition | 5-30 min | Pre-request if possible |
| Domain DNS propagation | 15 min-24 hours | Use staging first |
| SSL certificate | 5-30 min | Auto via providers |
| Third-party integration | 10-60 min | Document requirements |

---

## Scaling Estimates

### Multiple Features
```
Base MVP:           8 hours
+1 major feature:   +4-6 hours
+2 major features:  +7-10 hours
+3 major features:  +9-13 hours
```

### Team Parallelization
```
1 agent at a time:    100% duration
2 agents parallel:    65-75% duration
3 agents parallel:    50-60% duration
(Frontend + Backend + Data can work in parallel after G3)
```

---

## Progress Indicators for Users

### Quick Progress Reference

| Stage | % Complete | User Message |
|-------|------------|--------------|
| Project created | 5% | "Project initialized" |
| Intake complete | 10% | "Requirements captured" |
| PRD approved | 20% | "Plan finalized" |
| Architecture approved | 35% | "Technical design complete" |
| Design approved | 45% | "UI/UX defined" |
| Development 50% | 60% | "Core features built" |
| Development complete | 75% | "All features implemented" |
| Testing complete | 85% | "Quality verified" |
| Security approved | 90% | "Security cleared" |
| Deployed to staging | 95% | "Ready for final review" |
| Production live | 100% | "Project complete!" |

---

## Common Questions

**Q: Why does AI development take longer than expected?**
A: AI agents write production-quality code with tests, documentation, and proper error handling. Quick prototypes would be faster but require significant rework.

**Q: Can I speed up the process?**
A: Yes - use starter templates, provide clear requirements, approve gates quickly, and choose SIMPLE complexity for MVPs.

**Q: How accurate are these estimates?**
A: Within 30% for similar project types. Complex custom projects may vary more.

**Q: What if an agent takes longer than estimated?**
A: Self-healing retries, complex business logic, or edge cases can add time. The Orchestrator will notify you of delays.

---

**See Also:**
- `constants/core/AGENT_INDEX.md` - Agent capabilities
- `constants/protocols/APPROVAL_GATES.md` - Gate definitions
- `templates/docs/STATUS.md` - Progress tracking
