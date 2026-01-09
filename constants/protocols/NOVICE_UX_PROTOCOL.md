# Novice UX Protocol

> **Version:** 1.0.0
> **Purpose:** Ensure novice users have a delightful, non-intimidating experience
> **Applies To:** All agents when teaching_level = NOVICE or INTERMEDIATE

---

## 1. Agent Identity Header (MANDATORY)

**Every agent response MUST start with this header when interacting with users:**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ 🤖 [AGENT_NAME]                                             │
│ 📍 Phase: [PHASE_NAME] │ 🚦 Gate: [GATE] │ Progress: [XX%]  │
└─────────────────────────────────────────────────────────────┘
```

**Example:**
```markdown
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Architect                                                │
│ 📍 Phase: Architecture │ 🚦 Gate: G3 │ Progress: 25%        │
└─────────────────────────────────────────────────────────────┘

I've analyzed your requirements and designed the technical foundation...
```

**Why:** Users need to know WHO is talking, WHERE they are, and HOW FAR along they are.

---

## 2. Progress Bar (MANDATORY for active builds)

**Include a visual progress indicator in every response during active development:**

### Simple Progress Bar
```markdown
[████████░░░░░░░░░░░░] 40% - Building authentication
```

### Detailed Progress (for longer responses)
```markdown
## Project Progress

✅ Intake      ✅ Planning    ✅ Architecture    🔄 Development    ⬚ Testing    ⬚ Deploy
                                                    ↑ You are here

Current task: Building login component (3 of 7 stories)
```

### Phase-Based Progress
```markdown
┌─────────────────────────────────────────────────────────────┐
│ 🚀 MY-APP                                        [45%] ████░░░░░░│
│                                                             │
│ ✅ → ✅ → ✅ → 🔄 → ⬚ → ⬚                                    │
│ In  Plan Arch Dev  Test Deploy                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Handoff Announcements (MANDATORY)

**When transitioning between agents, ALWAYS announce explicitly:**

```markdown
---
## 🔄 Agent Transition

**Completing:** [Previous Agent Name]
- Delivered: [list of deliverables]
- Key decisions: [brief summary]

**Activating:** [Next Agent Name]
- Will work on: [what they'll do]
- You'll see: [what to expect]

*[Next Agent] is now reviewing the context...*
---
```

**Example:**
```markdown
---
## 🔄 Agent Transition

**Completing:** Product Manager
- Delivered: PRD.md with 5 user stories
- Key decisions: Prioritized login before social features

**Activating:** Architect
- Will work on: Technical design and tech stack selection
- You'll see: System diagram and technology recommendations

*The Architect is now reviewing your requirements...*
---
```

---

## 4. Scaled Gate System

**Gates scale based on project complexity:**

### Project Complexity Detection

| Signal | Complexity |
|--------|------------|
| "simple", "basic", "quick", "just a..." | SIMPLE |
| No complexity signals | STANDARD |
| "enterprise", "production", "complex", "ML/AI" | ENTERPRISE |

### Gate Requirements by Complexity

| Complexity | Required Gates | Optional Gates |
|------------|----------------|----------------|
| **SIMPLE** | G1, G3, G6 | G2, G4, G5.x, G7-G9 |
| **STANDARD** | G1-G6 | G7-G9 |
| **ENTERPRISE** | G1-G9 + E1-E3 | None |

### Simple Mode Gate Presentation

For SIMPLE projects, combine gates:

```markdown
## ✅ Quick Check

I've created:
- Requirements (what you asked for)
- Architecture (React + Node + PostgreSQL)
- Basic design (clean, functional UI)

**Everything look good to proceed with building?** (yes/no)
```

This replaces separate G2, G3, G4 approvals.

---

## 5. Teaching-Level-Aware Error Messages

### Error Escalation Format

**EXPERT Mode (default for system):**
```markdown
## SELF-HEALING ESCALATION
**Attempts:** 3 of 3 exhausted

| # | Error Type | Fix Tried | Result |
|---|-----------|-----------|--------|
| 1 | TS2307 | Added import | Failed |
...
```

**NOVICE Mode (use this instead):**
```markdown
## 🔧 I Need Your Help

I tried to fix something 3 times but couldn't solve it automatically.

**What happened:** A piece of code can't find a file it needs.

**Your options:**
1. 🔄 **Fresh start** - I'll clean everything up and try again (usually works!)
2. 🔍 **Show details** - See the technical info if you're curious
3. 💬 **Get help** - I'll create a summary you can share with someone technical

**Which would you like?** (1, 2, or 3)
```

**INTERMEDIATE Mode:**
```markdown
## 🔧 Build Issue - Need Your Input

I encountered a module resolution error (TS2307) and my automatic fixes didn't work.

**The problem:** TypeScript can't find a required module.

**What I tried:**
1. Added missing import - didn't help
2. Fixed the path - still failing
3. Updated config - no change

**Options:**
1. **Clean reinstall** - Delete node_modules, reinstall (recommended)
2. **Check dependencies** - Verify @types packages are installed
3. **Show full error** - See the complete technical output

**Which approach?**
```

### Blocker Presentation

**EXPERT Mode:**
```markdown
## BLOCKER-003
**Severity:** critical
**Description:** Database credentials missing from environment
**Blocked agents:** Backend Developer, Data Engineer
**Escalation level:** L2
```

**NOVICE Mode:**
```markdown
## ⏸️ Quick Pause Needed

**What happened:** I need some information to continue.

**The issue:** I need database connection details to set up your backend.

**This is normal!** Most projects need this at some point.

**Your options:**
1. 📝 **I'll provide them** - Tell me the database URL or credentials
2. 🆕 **Create new database** - I'll help you set up a free one
3. ⏭️ **Skip for now** - Continue without database (limited features)

**What would you like to do?**
```

---

## 6. Session Resume Enhancement

**When user says "continue" or resumes a session:**

```markdown
## 👋 Welcome Back to [PROJECT_NAME]!

**Last session:** [time ago]
**You were:** [specific activity]
**We completed:** [list of completed items]

### Where We Left Off
[2-3 sentences describing exact state]

### Ready to Continue?
- **Yes** → Pick up right where we stopped
- **Status first** → Show me a full summary
- **Different task** → I want to work on something else

**What would you like to do?**
```

**Example:**
```markdown
## 👋 Welcome Back to task-buddy!

**Last session:** 3 hours ago
**You were:** Reviewing the login form design
**We completed:** User authentication, database setup, 3 of 5 UI components

### Where We Left Off
The login form was ready for your approval. You had asked about
adding a "remember me" checkbox, and I was about to show you
the updated design.

### Ready to Continue?
- **Yes** → I'll show you the updated login form
- **Status first** → Full project status summary
- **Different task** → Work on something else

**What would you like to do?**
```

---

## 7. Completion Celebration

**When project reaches G9/G10 (completion):**

```markdown
## 🎉 [PROJECT_NAME] is Complete!

Congratulations! Your application is ready.

### What You Built
| Feature | Status |
|---------|--------|
| [Feature 1] | ✅ Working |
| [Feature 2] | ✅ Working |
| [Feature 3] | ✅ Working |

### Project Stats
- ⏱️ **Time:** [X] hours across [Y] sessions
- 📁 **Files:** [N] files, [M] lines of code
- 🧪 **Tests:** [X]% coverage
- 💰 **AI Cost:** ~$[X.XX]

### Your Project Lives At
```
[project_path]
```

### What's Next?

| Want To... | Say This |
|------------|----------|
| Add features | "Add [feature] to [project]" |
| Fix something | "I found a bug in [area]" |
| Deploy | "Deploy [project] to production" |
| Start new | "Create a new project..." |

---

**Great work! Your app is ready to use. 🚀**
```

---

## 8. Decision Recap at Milestones

**At major milestones (end of phases), summarize decisions:**

```markdown
## 📋 Milestone: [Phase Name] Complete

### Decisions Made

| Who | What | Why |
|-----|------|-----|
| Product Manager | 5 user stories | Based on your priority list |
| Architect | React + Node | Best fit for your scale |
| UX Designer | Mobile-first | 70% of users on phones |

### Key Files Created
- `docs/PRD.md` - Your requirements
- `docs/ARCHITECTURE.md` - Technical design
- `src/` - Application code

### Coming Up Next
[Brief description of next phase]

**Ready to continue?** (yes / review [topic] / change [decision])
```

---

## 9. "Simple Mode" Agent Consolidation

**For SIMPLE complexity projects, consolidate visible agents:**

### Standard Mode (default)
User sees: Orchestrator, PM, Architect, UX, Frontend, Backend, QA, Security, DevOps

### Simple Mode
User sees: **Coordinator**, **Builder**, **Reviewer**

**Mapping:**
| Simple Mode | Actually Running |
|-------------|------------------|
| Coordinator | Orchestrator + PM |
| Builder | Architect + Frontend + Backend |
| Reviewer | QA + Security |

**Announce as:**
```markdown
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Builder                                                  │
│ 📍 Phase: Development │ 🚦 Gate: G5 │ Progress: 60%         │
└─────────────────────────────────────────────────────────────┘
```

Even though Architect, Frontend, and Backend agents are working internally.

---

## 10. Parallel Assessment Presentation

**For enhancement projects, present parallel work positively:**

```markdown
## 🔍 Expert Analysis In Progress

Your codebase is being reviewed by our specialist team:

| Expert | Looking At | Status |
|--------|-----------|--------|
| Architecture | Code structure | ✅ Done (7/10) |
| Security | Vulnerabilities | 🔄 Scanning... |
| Quality | Test coverage | 🔄 Analyzing... |
| Infrastructure | Deployment setup | ⏳ Waiting... |

**Early findings:** Your architecture looks solid!

*Full report ready in ~2 minutes...*
```

**After completion:**
```markdown
## 📊 Analysis Complete!

### Overall Score: 7.2/10 (Good)

**Recommendation:** ENHANCE - Your code has a solid foundation with targeted improvements needed.

### Summary
| Area | Score | Verdict |
|------|-------|---------|
| Architecture | 8/10 | Clean structure ✅ |
| Security | 6/10 | Needs hardening ⚠️ |
| Quality | 7/10 | Good coverage ✅ |
| Infrastructure | 7/10 | Standard setup ✅ |

### Top 3 Recommendations
1. Add input validation to API endpoints
2. Increase test coverage from 65% to 80%
3. Set up proper error monitoring

**Ready to see the full enhancement plan?** (yes/no)
```

---

## Implementation Checklist

All agents MUST implement:

- [ ] Agent Identity Header on every response
- [ ] Progress bar during active builds
- [ ] Handoff announcements between agents
- [ ] Teaching-level-aware error messages
- [ ] Session resume with context
- [ ] Completion celebration at project end
- [ ] Decision recaps at milestones

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-03 | Initial protocol based on UX audit |
