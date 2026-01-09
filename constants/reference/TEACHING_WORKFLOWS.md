# Teaching Workflows by Experience Level

> **Version 4.0.0**
>
> **Purpose:** Gate presentation templates and workflow communication by teaching level.
>
> **NOTE:** For core teaching level definitions and behaviors, see `constants/reference/TEACHING_PROTOCOL.md` (canonical source).
> This file contains workflow-specific templates for gate presentations.

---

## Teaching Level Reference

> See `constants/reference/TEACHING_PROTOCOL.md` for full teaching level definitions.

| Level | Summary |
|-------|---------|
| **NOVICE** | Full explanations, define all terms, suggest defaults |
| **INTERMEDIATE** | Explain key decisions, offer options |
| **EXPERT** | Concise, trade-offs only |

---

## Communication Principles by Level

### NOVICE Users

**Goal:** Build understanding and confidence

- **Explain WHY** before WHAT
- **Use analogies** to familiar concepts
- **Define jargon** inline (don't assume knowledge)
- **Offer defaults** with explanation
- **Check understanding** periodically
- **Celebrate progress** at milestones
- **Never condescend** - respect their domain expertise

**Frequency of Teaching Moments:** 10-15 per project

### INTERMEDIATE Users

**Goal:** Fill knowledge gaps while respecting competence

- **Explain key decisions** and trade-offs
- **Offer options** with pros/cons
- **Define advanced terms** only
- **Assume basic** programming knowledge
- **Focus on architecture** and patterns
- **Skip basic explanations** unless asked

**Frequency of Teaching Moments:** 5-8 per project

### EXPERT Users

**Goal:** Efficient collaboration with minimal friction

- **Be concise** - bullet points preferred
- **Focus on trade-offs** and edge cases
- **Use technical terminology** freely
- **Assume full** technical competence
- **Skip explanations** unless asked
- **Respect their time** - get to the point

**Frequency of Teaching Moments:** 0-2 per project (only when asked)

---

## Gate Presentations by Level

### G1: Scope Approval

#### NOVICE
```markdown
## Let's Make Sure I Understand Your Vision

Before we start building, I want to confirm I heard you correctly. Think of this like agreeing on a blueprint before construction begins.

### What You're Building
{Project name} - {Plain English description}

### Who It's For
{Target users in everyday terms}

### What It Will Do
1. **{Feature 1}** - {What it means for the user}
2. **{Feature 2}** - {What it means for the user}
3. **{Feature 3}** - {What it means for the user}

### What It WON'T Do (for now)
- {Exclusion 1} - We're keeping it simple to start
- {Exclusion 2} - Can add this later if needed

### Why This Matters
Getting agreement now prevents us from building the wrong thing. It's much easier to change words than code!

---

**Does this match what you're imagining?**

- ✅ **"Yes, that's it!"** - Great, let's move to planning
- 🔄 **"Almost, but..."** - Tell me what I missed
- ❓ **"I have questions"** - Ask away!
```

#### INTERMEDIATE
```markdown
## G1: Scope Confirmation

### Project Summary
**{Project Name}** - {Technical description}

### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| {Feature 1} | {Description} | P0 |
| {Feature 2} | {Description} | P1 |
| {Feature 3} | {Description} | P1 |

### Out of Scope
- {Exclusion with brief rationale}

### Classification
- **Type:** {traditional/ai_ml/hybrid/enhancement}
- **Complexity:** {low/medium/high}

---

**Approve scope?**
```

#### EXPERT
```markdown
## G1: Scope

**{Project Name}** - {One-line description}

| Feature | Priority |
|---------|----------|
| {Feature 1} | P0 |
| {Feature 2} | P1 |

**Out:** {Comma-separated exclusions}

**Type:** {classification} | **Complexity:** {level}

**Approve?**
```

---

### G2: PRD Approval

#### NOVICE
```markdown
## Your Project Blueprint is Ready!

I've written a detailed plan called a "Product Requirements Document" (PRD). Think of it as a recipe that describes exactly what we're going to build.

### What's in the PRD?

**User Stories** - These describe what you (or your users) will be able to do:
- "As a user, I can {action} so that {benefit}"
- "As a user, I can {action} so that {benefit}"

**Acceptance Criteria** - How we'll know each feature is "done":
- When you click X, Y happens
- The page shows Z information

### Quick Summary

| Section | What It Covers |
|---------|---------------|
| Features | All {X} things your app will do |
| User Stories | {Y} descriptions of user actions |
| Success Metrics | How we measure if it's working |

### What Happens Next

If you approve this, I'll design the technical architecture (how the pieces fit together). Any changes to requirements after that become harder, so now's the time to speak up!

---

📄 **Full document:** [docs/PRD.md](docs/PRD.md)

**Review the PRD and let me know:**

- ✅ **"Approved"** - Lock it in, move to architecture
- 🔄 **"Change..."** - Tell me what needs adjustment
- ❓ **"Explain..."** - I'll clarify any section
```

#### INTERMEDIATE
```markdown
## G2: PRD Review

### Summary
- **User Stories:** {X} total ({Y} P0, {Z} P1)
- **Acceptance Criteria:** Defined for all stories
- **Success Metrics:** {List key metrics}

### Feature Breakdown
| Feature | Stories | Complexity |
|---------|---------|------------|
| {Feature 1} | {N} | {Low/Med/High} |
| {Feature 2} | {N} | {Low/Med/High} |

### Scope Boundaries
**In:** {List}
**Out:** {List with rationale}

### Dependencies
- {External API/service dependencies}

---

📄 [docs/PRD.md](docs/PRD.md)

**Approve PRD to lock requirements?**
```

#### EXPERT
```markdown
## G2: PRD

**Stories:** {X} ({Y} P0) | **Scope:** {Features in/out}

📄 [docs/PRD.md](docs/PRD.md)

**Approve?** (Locks requirements for G3)
```

---

### G3: Architecture Approval

#### NOVICE
```markdown
## How Your App Will Work (Technical Design)

Now for the "how" - I've designed the technical architecture. Let me explain what that means in plain terms.

### The Big Picture

Think of your app like a restaurant:
- **Frontend** = The dining room (what customers see)
- **Backend** = The kitchen (where work happens)
- **Database** = The pantry (where ingredients are stored)

```
┌─────────────────────────────────────────────────────────────┐
│                        YOUR APP                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   FRONTEND  │────▶│   BACKEND   │────▶│  DATABASE   │   │
│  │  (What you  │     │ (Processing │     │  (Storage)  │   │
│  │    see)     │     │   logic)    │     │             │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices (and Why)

| Part | Technology | Why I Chose It |
|------|-----------|----------------|
| **Frontend** | {React/Vue/etc} | {Plain English reason - e.g., "Most popular, lots of tutorials if you want to learn"} |
| **Backend** | {Node/Python/etc} | {Plain English reason - e.g., "Same language as frontend, simpler to understand"} |
| **Database** | {PostgreSQL/etc} | {Plain English reason - e.g., "Reliable, free, widely used"} |

### What This Means for You

- Your app will be **fast** because {reason}
- Your data will be **safe** because {reason}
- It can **grow** later because {reason}

### Teaching Moment: What are "specs"?

After you approve this, I create three "specification" files:
1. **API Spec** - A contract for how frontend talks to backend
2. **Database Schema** - The structure of your data storage
3. **Type Definitions** - Rules that catch errors before they happen

These specs are like blueprints that all the builders (code) must follow exactly.

---

📄 **Full documents:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | [docs/TECH_STACK.md](docs/TECH_STACK.md)

**Does this technical approach work for you?**

- ✅ **"Approved"** - I'll create the detailed specs
- ❓ **"Why {X}?"** - I'll explain any choice in more detail
- 🔄 **"What about {Y}?"** - I'll evaluate that alternative
```

#### INTERMEDIATE
```markdown
## G3: Architecture Review

### Tech Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | {Framework} | {Trade-off analysis} |
| Backend | {Framework} | {Trade-off analysis} |
| Database | {DB} | {Trade-off analysis} |
| Auth | {Strategy} | {Trade-off analysis} |

### Architecture Pattern
{Pattern name} - {Brief description of why this pattern}

### Specs to Generate
- `specs/openapi.yaml` - API contract
- `prisma/schema.prisma` - Data model
- `specs/schemas/index.ts` - Zod types

### Key Decisions
| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| {Decision 1} | {Choice} | {Alt 1}, {Alt 2} |

---

📄 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**Approve to lock specs? (No changes after G3)**
```

#### EXPERT
```markdown
## G3: Architecture

**Stack:** {Frontend} | {Backend} | {DB} | {Auth}
**Pattern:** {Architecture pattern}

**Specs:** OpenAPI + Prisma + Zod (locked post-approval)

📄 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**Approve?**
```

---

### G7.5: Pre-Deployment Status (NEW - MANDATORY)

#### NOVICE
```markdown
## Here's What We've Built! 🎉

Before we put your app on the internet, let me show you everything that's been created. This helps you feel confident about what's going live.

### Features Completed

| Feature | Status | Tested? | What It Does |
|---------|--------|---------|--------------|
| {Feature 1} | ✅ Done | ✅ Yes | {Plain English} |
| {Feature 2} | ✅ Done | ✅ Yes | {Plain English} |
| {Feature 3} | ✅ Done | ✅ Yes | {Plain English} |

**You asked for {X} features, and we delivered {X}!**

### Quality Checks (All the Testing We Did)

| Check | Result | What This Means |
|-------|--------|-----------------|
| **Build** | ✅ Passed | Your app compiles without errors |
| **Linting** | ✅ Passed | Code follows best practices |
| **Tests** | ✅ Passed | All features work as expected |
| **Security** | ✅ Passed | No known vulnerabilities |
| **Accessibility** | ✅ 95/100 | Works for people with disabilities |

### What Was Created

| Category | Count | Examples |
|----------|-------|----------|
| Pages/Screens | {X} | Home, Dashboard, Settings... |
| Components | {Y} | Buttons, Forms, Cards... |
| API Endpoints | {Z} | Login, Save Data, Get Items... |
| Test Files | {N} | Automated tests that verify everything works |

### Before We Deploy: Things You'll Need

To put your app on the internet, you'll need to:

1. **Log into Vercel** (our hosting service)
   - Run: `npx vercel login`
   - Follow the prompts to create/connect your account

2. **Set up environment variables** (secret settings)
   - I'll guide you through this during deployment

### Your Decisions Made Along the Way

| Decision | What We Chose | Why |
|----------|--------------|-----|
| {Decision 1} | {Choice} | {Reason in plain English} |
| {Decision 2} | {Choice} | {Reason in plain English} |

---

## Ready to Go Live?

Everything above is built, tested, and ready. Deployment will make your app accessible to anyone with the URL.

**What would you like to do?**

- ✅ **"Ready to deploy!"** - Let's put it live
- ❓ **"Show me {feature}"** - I can demo anything
- 🔍 **"Tell me more about..."** - I'll explain any part
- ⏸️ **"Not yet"** - Tell me your concerns
```

#### INTERMEDIATE
```markdown
## Pre-Deployment Status

### Delivery Summary
- **Features:** {X}/{Y} delivered
- **Test Coverage:** {Z}%
- **Build:** Passing
- **Security:** 0 vulnerabilities

### Quality Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Build | Pass | Pass | ✅ |
| Lint | Pass | Pass | ✅ |
| TypeScript | 0 errors | 0 | ✅ |
| Tests | {X} passing | All | ✅ |
| Lighthouse A11y | {Y} | 90+ | ✅ |

### Gates Completed
G1 ✅ → G2 ✅ → G3 ✅ → G4 ✅ → G5 ✅ → G6 ✅ → G7 ✅

### Deployment Prerequisites
- [ ] Vercel CLI authenticated (`npx vercel login`)
- [ ] Environment variables configured
- [ ] Production secrets ready

---

**Ready for G8 (Go/No-Go)?**
```

#### EXPERT
```markdown
## Pre-Deploy Status

**Features:** {X}/{Y} | **Coverage:** {Z}% | **Build:** ✅ | **Security:** ✅

**Gates:** G1-G7 ✅

**Prerequisites:**
- Vercel auth: `npx vercel login`
- Env vars configured

**Proceed to G8?**
```

---

## Progress Updates by Level

### During Development

#### NOVICE
```markdown
### 📊 Progress Update

**What's Happening:** Building the {Component Name}

**Completed So Far:**
- ✅ {Component 1} - {What it does in plain terms}
- ✅ {Component 2} - {What it does in plain terms}
- ✅ {Component 3} - {What it does in plain terms}

**Currently Building:**
- 🔨 {Current component} - {What it will do}

**Coming Up Next:**
- {Next component}
- {Following component}

**Teaching Moment:** {Brief explanation of something interesting about current work}

---

Everything is on track! Want to see a preview?
```

#### INTERMEDIATE
```markdown
### Progress: {Phase} ({X}% complete)

**Completed:** {List}
**In Progress:** {Current}
**Remaining:** {Count} items

**Build Status:** ✅ Passing
```

#### EXPERT
```markdown
### Progress: {X}/{Y} complete

{Current task} | Build: ✅
```

---

## Teaching Moments Format

### When to Insert Teaching Moments

| Trigger | NOVICE | INTERMEDIATE | EXPERT |
|---------|--------|--------------|--------|
| New technology chosen | Always | If advanced | Never |
| Architecture decision | Always | If trade-offs complex | On request |
| Security implementation | Always | Always | On request |
| Performance optimization | Always | If significant | Never |
| Testing strategy | Always | If unusual | Never |

### Teaching Moment Template

#### NOVICE
```markdown
### 💡 Learning Moment: {Topic}

**What's happening:** {Plain English explanation}

**Why this matters:** {Real-world benefit}

**Analogy:** {Comparison to familiar concept}

**Want to know more?** Just ask!
```

#### INTERMEDIATE
```markdown
### 💡 Note: {Topic}

{Technical explanation with trade-offs}

**Key consideration:** {Important detail}
```

#### EXPERT
*(Only include if specifically relevant or unusual)*
```markdown
**Note:** {One-line technical note}
```

---

## Error Communication by Level

### When Something Goes Wrong

#### NOVICE
```markdown
### ⚠️ We Hit a Bump

**What happened:** {Plain English description}

**Don't worry!** This is normal in software development. Here's what's going on:

{Explanation of the issue in everyday terms}

**What I'm doing to fix it:**
1. {Step 1}
2. {Step 2}

**What you might need to do:** {If any action needed, or "Nothing - I've got this!"}

---

I'll update you when it's resolved.
```

#### INTERMEDIATE
```markdown
### ⚠️ Issue: {Brief description}

**Error:** `{Error message}`
**Cause:** {Technical cause}
**Resolution:** {What we're doing}

**ETA:** {Estimate}
```

#### EXPERT
```markdown
### ⚠️ {Error type}: {Brief}

`{Error message}`

Resolving via {approach}.
```

---

## Version

**Version:** 4.0.0
**Created:** 2026-01-02
**Purpose:** Ensure appropriate communication depth for each user experience level
