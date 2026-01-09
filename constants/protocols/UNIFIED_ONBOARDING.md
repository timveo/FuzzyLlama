# Unified Onboarding Protocol

> **Purpose:** Single, consistent onboarding flow for ALL projects. Same 5 questions, every time.

---

## The 5 Questions

**Ask these questions in order. Always. No exceptions.**

| # | Question | Purpose |
|---|----------|---------|
| **Q1** | What are you building? | Core understanding of the project |
| **Q2** | Do you have existing code? If yes, where is it from? | Determines assessment needs |
| **Q3** | What's your technical background? | Sets teaching level |
| **Q4** | What does "done" look like for you? | Success criteria |
| **Q5** | Any constraints I should know about? | Timeline, budget, tech, compliance |

---

## Question Details

### Q1: What are you building?

**Ask exactly:**
> "What are you building?"

**Listen for:**
- Core functionality
- Target users (if mentioned)
- Problem being solved (if mentioned)

**Do NOT ask follow-ups yet.** Capture their natural description.

**Record as:** Project vision statement

---

### Q2: Do you have existing code?

**Ask exactly:**
> "Do you have existing code? If yes, where is it from?"

**Listen for:**

| Response Contains | Classification |
|-------------------|----------------|
| "No" / "Starting fresh" / "New project" | `NEW_PROJECT` |
| "Lovable" / "lovable.dev" | `AI_GENERATED` → Tool: Lovable |
| "V0" / "v0.dev" / "Vercel V0" | `AI_GENERATED` → Tool: V0 |
| "Bolt" / "bolt.new" | `AI_GENERATED` → Tool: Bolt |
| "Replit" / "Replit Agent" | `AI_GENERATED` → Tool: Replit |
| "Base44" | `AI_GENERATED` → Tool: Base44 |
| "Cursor" / "Claude" / "AI-generated" | `AI_GENERATED` → Tool: Other |
| "Yes, my code" / "I built it" | `EXISTING_OWN` |
| "Inherited" / "Took over" / "Legacy" | `EXISTING_INHERITED` |
| "Yes, need to fix/improve" | `ENHANCEMENT` |

**If AI-generated, also ask:**
> "Is there a deployed version I can look at, or will you share the code?"

**Record as:** Code source classification + tool (if applicable)

---

### Q3: What's your technical background?

**Ask exactly:**
> "What's your technical background? This helps me explain things at the right level."

**Listen for and classify:**

| Response Contains | Teaching Level |
|-------------------|----------------|
| "Not technical" / "Business" / "Designer" / "PM" / "No coding" | `NOVICE` |
| "Some coding" / "Junior" / "Learning" / "Bootcamp" / "Self-taught beginner" | `INTERMEDIATE` |
| "Developer" / "Engineer" / "Senior" / "Architect" / "10+ years" / "Lead" | `EXPERT` |

**If unclear, ask:**
> "On a scale of 1-10, how comfortable are you with code? 1 being 'never seen code' and 10 being 'senior developer'."

| Score | Teaching Level |
|-------|----------------|
| 1-3 | `NOVICE` |
| 4-6 | `INTERMEDIATE` |
| 7-10 | `EXPERT` |

**Record as:** Teaching level

**CRITICAL:** This answer determines communication style for the ENTIRE project.
See `constants/reference/TEACHING_PROTOCOL.md` for detailed guidance on each level.

---

### Q4: What does "done" look like?

**Ask exactly:**
> "What does 'done' look like for you? How will you know this project is successful?"

**Listen for:**
- Specific features that must work
- User outcomes
- Business metrics
- Launch criteria

**If vague, prompt with:**
> "If you could only have 3 things working perfectly, what would they be?"

**Record as:** Success criteria / MVP definition

---

### Q5: Any constraints?

**Ask exactly:**
> "Any constraints I should know about? Timeline, budget, specific technologies, compliance requirements?"

**Listen for:**

| Constraint Type | Examples |
|-----------------|----------|
| **Timeline** | "Need it by Friday" / "No rush" / "ASAP" |
| **Budget** | "Bootstrap" / "Limited" / "Enterprise budget" |
| **Technology** | "Must use React" / "Supabase only" / "No vendor lock-in" |
| **Compliance** | "HIPAA" / "GDPR" / "SOC2" / "PCI" |
| **Team** | "Solo" / "Small team" / "Will hire devs" |
| **Integration** | "Must connect to Salesforce" / "Existing auth system" |
| **Deployment** | "Local only" / "Just for learning" / "No hosting needed" / "Need production deployment" |

**If "none" or unclear:**
> "No problem. We can revisit constraints as they come up."

**Record as:** Constraints list

### Deployment Intent Detection

During Q5, explicitly listen for deployment intent:

| User Says | Deployment Mode | G9 Behavior |
|-----------|-----------------|-------------|
| "Just for learning" / "Local only" / "Practice project" | `LOCAL_ONLY` | **SKIP G9** |
| "Demo" / "Portfolio" / "Side project" | `OPTIONAL` | **ASK at G8** |
| "Production" / "Launch" / "Users" / "Customers" | `REQUIRED` | **RUN G9** |
| Nothing mentioned | `UNDETERMINED` | **ASK at G8** |

**If deployment intent unclear, ask:**
> "One quick question: do you want this deployed to the web for others to use, or is this more of a local/learning project?"

**Record as:** `deployment_mode` in INTAKE.md

### Q5.3: Availability for Approvals (Optional but Recommended)

If the project seems substantial (multi-day), ask about availability:

**Ask:**
> "How available are you for approvals during the build? I'll need your input at key checkpoints."

**Listen for:**

| User Says | Availability Mode | Gate Behavior |
|-----------|-------------------|---------------|
| "Always available" / "I'll be around" | `HIGH` | Present checkpoints immediately |
| "A few times a day" / "Morning and evening" | `MEDIUM` | Batch minor checkpoints |
| "Once a day" / "Check-in daily" | `LOW` | Summarize progress, batch approvals |
| "When I can" / "Sporadic" | `ASYNC` | Continue with assumptions, confirm later |

**Record as:** `availability_mode` in INTAKE.md

**How availability affects workflow:**

| Availability | Checkpoint Strategy |
|--------------|---------------------|
| `HIGH` | Show each G5.X checkpoint as completed |
| `MEDIUM` | Batch G5.1-G5.2 together, show G5.3 per component |
| `LOW` | Complete G5 entirely, present summary for approval |
| `ASYNC` | Continue with sensible defaults, log all decisions, review at session end |

**Why this matters:**
- Prevents blocking on user approval when they're unavailable
- Sets realistic expectations for response time
- Allows batching of minor decisions
- Respects user's time

---

## Teaching Level Behaviors

### NOVICE Level

**Agent behavior:**
- Explain ALL technical decisions in plain language
- Define jargon before using it (or avoid it)
- Suggest sensible defaults, explain why
- Ask "Does this make sense?" after explanations
- Provide analogies and real-world comparisons
- Break complex choices into yes/no questions

**Example phrasing:**
> "I recommend using Supabase for the database. Think of it like a spreadsheet that your app can read and write to, but much more powerful and secure. It's also free to start. Sound good?"

**Avoid:**
- Technical deep-dives
- Assumed knowledge
- Multiple options without clear recommendation
- Acronyms without explanation

---

### INTERMEDIATE Level

**Agent behavior:**
- Explain key decisions and trade-offs
- Present 2-3 options with pros/cons
- Ask for preferences on important choices
- Define advanced terms, assume basic knowledge
- Offer to go deeper on specific topics if asked

**Example phrasing:**
> "For the database, we could use Supabase (PostgreSQL, built-in auth, real-time) or Firebase (NoSQL, Google ecosystem). Supabase is better for relational data and SQL queries. Firebase is better if you need offline-first. Which sounds more relevant?"

**Avoid:**
- Over-explaining basics (what is a database)
- Hand-holding on simple decisions
- Excessive jargon without context

---

### EXPERT Level

**Agent behavior:**
- State decisions concisely with rationale
- Focus on trade-offs and edge cases
- Respect their autonomy and preferences
- Flag risks and non-obvious concerns
- Ask only when genuinely uncertain
- Use technical terminology freely

**Example phrasing:**
> "Using Supabase for persistence—PostgreSQL with RLS for row-level security. Edge Functions for any server-side logic that shouldn't be in the client. Any concerns with that stack?"

**Avoid:**
- Unnecessary explanations
- Obvious guidance
- Treating them like a beginner
- Over-justifying standard practices

---

## Post-Onboarding Flow

After collecting all 5 answers, the system determines next steps:

```
Q2 Classification → Next Action
────────────────────────────────────────────────────────
NEW_PROJECT        → Proceed to G1 (Vision) → G2 (PRD)
AI_GENERATED       → Run Assessment first → then G2+
EXISTING_OWN       → Run Assessment first → then G2+
EXISTING_INHERITED → Run Assessment first → then G2+
ENHANCEMENT        → Run Assessment first → Gap Analysis → Enhancement Plan
```

### For AI_GENERATED specifically:

1. Request codebase access (GitHub link or upload)
2. Run automated assessment using `templates/docs/ASSESSMENT.md` Section 5.5
3. Present findings with Keep/Enhance/Rebuild recommendations
4. Get user approval on approach
5. Proceed to appropriate gate

---

## Onboarding Record Template

After completing onboarding, create `docs/INTAKE.md`:

```markdown
# Project Intake

**Project:** [from Q1]
**Date:** YYYY-MM-DD
**Classification:** [NEW_PROJECT / AI_GENERATED / EXISTING_OWN / EXISTING_INHERITED / ENHANCEMENT]
**Teaching Level:** [NOVICE / INTERMEDIATE / EXPERT]
**Deployment Mode:** [LOCAL_ONLY / OPTIONAL / REQUIRED / UNDETERMINED]
**Availability Mode:** [HIGH / MEDIUM / LOW / ASYNC]

---

## Cost Tracking (Optional)

| Setting | Value |
|---------|-------|
| **Budget** | $[amount] or "No limit" |
| **Alert at** | $[amount] or "Not set" |
| **Track costs** | Yes / No |

*See `constants/reference/AGENT_COST_TRACKING.md` for cost estimation and tracking details.*

---

## Q1: What are you building?

**User said:**
> [Verbatim response]

**Interpreted as:**
- Core function: [interpretation]
- Target users: [if mentioned]
- Problem solved: [if mentioned]

---

## Q2: Existing code?

**User said:**
> [Verbatim response]

**Classification:** [classification]
**Source tool:** [if AI_GENERATED]
**Code access:** [GitHub URL / Upload / Deployed URL]

---

## Q3: Technical background

**User said:**
> [Verbatim response]

**Teaching level:** [NOVICE / INTERMEDIATE / EXPERT]

---

## Q4: Definition of done

**User said:**
> [Verbatim response]

**Success criteria:**
1. [criterion 1]
2. [criterion 2]
3. [criterion 3]

---

## Q5: Constraints

**User said:**
> [Verbatim response]

**Constraints identified:**
| Type | Constraint | Impact |
|------|------------|--------|
| [type] | [constraint] | [High/Med/Low] |

---

## Onboarding Summary

| Attribute | Value |
|-----------|-------|
| Project | [name] |
| Classification | [classification] |
| Teaching Level | [level] |
| Deployment Mode | [LOCAL_ONLY / OPTIONAL / REQUIRED / UNDETERMINED] |
| Availability Mode | [HIGH / MEDIUM / LOW / ASYNC] |
| Has Existing Code | [Yes/No] |
| Source Tool | [tool or N/A] |
| Key Constraint | [most important] |

**Next Step:** [Assessment / G1 Vision / G2 PRD]

---

## Deployment Mode Reference

| Mode | Meaning | G8-G9 Behavior |
|------|---------|----------------|
| `LOCAL_ONLY` | User explicitly said no deployment needed | Skip G8 deployment, skip G9 |
| `OPTIONAL` | User might want deployment later | Ask at G8 if ready to deploy |
| `REQUIRED` | User needs production deployment | Full G8-G9 execution |
| `UNDETERMINED` | Not discussed yet | Ask at G8 about deployment needs |

**G8 Decision Point (for OPTIONAL/UNDETERMINED):**
> "Your project is ready for deployment. Would you like to deploy it now, or keep it as a local project?"
```

---

## Integration with Human Input Tracking

All onboarding responses are captured per `constants/HUMAN_INPUT_TRACKING.md`:

- Q1-Q5 responses → `docs/INTAKE.md` (verbatim + interpreted)
- Classification decisions → `docs/DECISIONS.md`
- Any clarifications → `docs/FEEDBACK_LOG.md`

---

## Validation Checklist

Before proceeding past onboarding:

- [ ] All 5 questions asked
- [ ] All 5 questions answered
- [ ] Classification determined
- [ ] Teaching level set
- [ ] INTAKE.md created
- [ ] User confirmed understanding is correct

---

## Version

**Version:** 4.0.0
**Created:** 2024-12-18
**Replaces:** PROJECT_INTAKE.md, QUICK_INTAKE.md (for initial onboarding)
