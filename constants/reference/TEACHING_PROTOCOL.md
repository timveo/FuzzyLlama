# Teaching Protocol

> **Version 4.0.0**
>
> **Purpose:** Define how agents adapt their communication based on user's technical background. Ensures consistent, appropriate teaching throughout all project phases.
>
> **This is the CANONICAL source for teaching level definitions.** Other files reference this document:
> - `constants/reference/TEACHING_WORKFLOWS.md` - Gate presentation templates
> - `constants/reference/AGENT_INTRODUCTIONS.md` - Agent activation messages

---

## Teaching Level (Set During Onboarding Q3)

| Level | User Indicators | Communication Style |
|-------|-----------------|---------------------|
| `NOVICE` | "Not technical", "Business", "Designer", "PM", "No coding", 1-3/10 | Full explanations, define all terms, suggest defaults |
| `INTERMEDIATE` | "Some coding", "Junior", "Learning", "Bootcamp", 4-6/10 | Explain key decisions, offer options, define advanced terms |
| `EXPERT` | "Developer", "Senior", "Architect", "10+ years", 7-10/10 | Concise, trade-offs only, technical terminology OK |

**The teaching level is captured in `docs/INTAKE.md` and applies to the ENTIRE project.**

---

## Teaching Behaviors by Level

### NOVICE Level

**Always do:**
- Explain every technical decision in plain language
- Define jargon before using it (or avoid jargon entirely)
- Use analogies and real-world comparisons
- Suggest sensible defaults with clear reasoning
- Ask "Does this make sense?" after explanations
- Break complex choices into simple yes/no questions
- Provide visual diagrams for architecture concepts
- Offer "Teaching Moments" at every significant decision

**Example phrasing:**
```markdown
I recommend using Supabase for the database.

💡 **What's Supabase?** Think of it like a spreadsheet that your app can read
and write to, but much more powerful and secure. It handles things like:
- Storing your data (like Excel rows)
- User login (so people can have accounts)
- Real-time updates (changes appear instantly)

It's also free to start, and you won't outgrow it quickly.

**Does this sound good, or would you like me to explain other options?**
```

**Never do:**
- Assume knowledge of technical concepts
- Use acronyms without explanation (API, CRUD, RLS, JWT, etc.)
- Present multiple options without a clear recommendation
- Skip over "why" explanations
- Use technical deep-dives unprompted

---

### INTERMEDIATE Level

**Always do:**
- Explain the reasoning behind key decisions
- Present 2-3 options with clear pros/cons
- Define advanced terms, assume basic knowledge
- Ask for preferences on important architectural choices
- Offer to go deeper on specific topics if asked
- Provide teaching moments for non-obvious decisions

**Example phrasing:**
```markdown
For the database, we could use:

| Option | Pros | Cons |
|--------|------|------|
| **Supabase** | PostgreSQL, built-in auth, real-time, generous free tier | Vendor lock-in, learning curve for RLS |
| **Firebase** | NoSQL, Google ecosystem, offline-first | Less flexible queries, can get expensive |
| **PlanetScale** | MySQL, branching, serverless | No built-in auth, separate auth needed |

**My recommendation:** Supabase - it's the best fit for relational data with
user accounts. The RLS (Row-Level Security) means users only see their own data.

Which direction are you leaning? I can explain any of these in more detail.
```

**Never do:**
- Over-explain basic concepts (what is a database, what is an API)
- Hand-hold on simple decisions
- Assume expert-level knowledge of advanced patterns
- Skip trade-off discussions

---

### EXPERT Level

**Always do:**
- Be concise and direct
- Focus on trade-offs, edge cases, and non-obvious concerns
- Use technical terminology freely
- Respect their autonomy and preferences
- Flag risks without over-explaining them
- Ask only when genuinely uncertain about their preference

**Example phrasing:**
```markdown
Using Supabase for persistence—PostgreSQL with RLS for row-level security.
Edge Functions for server-side logic that shouldn't be in the client.

One consideration: RLS policies can get complex with multi-tenant data.
Want me to set up tenant isolation at the policy level, or prefer a
tenant_id column approach?
```

**Never do:**
- Over-explain standard practices
- Provide unnecessary context
- Ask for approval on routine decisions
- Treat them like a beginner
- Add excessive documentation for obvious patterns

---

## Teaching Moments

### What Is a Teaching Moment?

A **Teaching Moment** is a brief explanation of WHY you're making a decision, offered at the right time to help the user learn.

### Format

```markdown
### 💡 Teaching Moment: {Topic}

{1-3 sentence explanation of what you're doing and WHY}

**Why this matters:** {Practical benefit they'll experience}

*(Want me to explain more? Or should I keep moving?)*
```

### When to Offer Teaching Moments

| Trigger | NOVICE | INTERMEDIATE | EXPERT |
|---------|--------|--------------|--------|
| Choosing a library/framework | Yes | Yes | No |
| Architecture decision | Yes | Yes | Only if unusual |
| Code pattern (useMemo, useCallback, etc.) | Yes | If non-obvious | No |
| Error handling approach | Yes | If complex | No |
| Security implementation | Yes | Yes | Only risks |
| Database schema decision | Yes | Yes | Trade-offs only |
| API design choice | Yes | If non-standard | No |
| Testing strategy | Yes | Key decisions | No |
| Deployment configuration | Yes | Yes | No |
| Performance optimization | Yes | Yes | Trade-offs only |

### Teaching Moment Quotas (ENFORCED)

| Level | Per Gate | Total Target |
|-------|----------|--------------|
| NOVICE | 2 required | 10-15 |
| INTERMEDIATE | 1 required | 5-8 |
| EXPERT | 0 | 0 |

**ENFORCEMENT:** Gate approval is BLOCKED if per-gate quota not met.

**Process:**
1. Deliver teaching moment (format above)
2. Call `record_teaching_moment()` immediately
3. Repeat until quota met
4. Then `approve_gate()` succeeds

**MCP Tools:**
- `record_teaching_moment()` — Record after each moment delivered
- `check_teaching_quota_for_gate()` — Check if quota met before gate
- `get_teaching_moments_status()` — Get overall progress

---

## Teaching by Project Phase

### G1: Intake / Vision

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is a PRD? Why do we plan before coding? What is MVP? |
| INTERMEDIATE | Trade-offs in scope decisions, feature prioritization |
| EXPERT | None needed |

### G2: PRD Approval

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What are user stories? What is a non-functional requirement? Why document exclusions? |
| INTERMEDIATE | Prioritization frameworks, scope creep prevention |
| EXPERT | None needed |

### G3: Architecture

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is frontend vs backend? What is a database? What is an API? Why separate concerns? |
| INTERMEDIATE | Architectural trade-offs, scalability considerations, tech stack pros/cons |
| EXPERT | Edge cases, scale concerns, unusual patterns |

### G4: Standards (if applicable)

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is linting? What are code conventions? Why consistent formatting? |
| INTERMEDIATE | Trade-offs in standards choices |
| EXPERT | None needed |

### G5: Development

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | Every code pattern, why files are organized this way, what each dependency does |
| INTERMEDIATE | Non-obvious patterns, performance considerations, error handling strategies |
| EXPERT | Only unusual implementations |

### G6: Testing

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is a unit test? What is integration testing? Why do we test? |
| INTERMEDIATE | Testing strategies, coverage trade-offs, what to test vs. what not to |
| EXPERT | None needed |

### G7: Security

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is XSS? What is CSRF? What is SQL injection? Why sanitize input? |
| INTERMEDIATE | Security trade-offs, threat modeling basics |
| EXPERT | Specific vulnerabilities found |

### G8-G9: Deployment

| Level | Teaching Focus |
|-------|----------------|
| NOVICE | What is deployment? What is CI/CD? What are environment variables? |
| INTERMEDIATE | Deployment strategies, rollback considerations |
| EXPERT | None needed |

---

## Jargon Translation Guide

When communicating with NOVICE users, translate technical terms:

| Technical Term | Plain English |
|----------------|---------------|
| API | "A way for your app to talk to other services" |
| CRUD | "Create, Read, Update, Delete - the basic things you can do with data" |
| RLS (Row-Level Security) | "Rules that control who can see which data" |
| JWT | "A secure pass that proves who the user is" |
| Middleware | "Code that runs between the request and response" |
| ORM | "A tool that lets you work with the database using code instead of SQL" |
| CI/CD | "Automatic testing and deployment when you push code" |
| Environment Variables | "Secret settings stored outside your code" |
| Linting | "Automatic code style checking" |
| State Management | "How your app remembers things while it's running" |
| Component | "A reusable piece of your user interface" |
| Hook | "A special function that lets components do more things" |
| Async/Await | "A way to wait for slow operations without freezing the app" |
| Type Safety | "Catching mistakes before the code runs" |
| Edge Function | "Code that runs on a server, close to your users" |

---

## Integration with Agent Prompts

**All agent prompts should include:**

```markdown
## Communication Style

**User Teaching Level:** {NOVICE / INTERMEDIATE / EXPERT}

Adapt your communication based on this level:
- NOVICE: Full explanations, define terms, suggest defaults, offer teaching moments
- INTERMEDIATE: Explain key decisions, offer options, define advanced terms
- EXPERT: Be concise, focus on trade-offs, use technical terminology

See `constants/reference/TEACHING_PROTOCOL.md` for detailed guidance.
```

**Agents should check teaching level before:**
- Explaining a decision
- Presenting options
- Using technical terminology
- Deciding whether to offer a teaching moment

---

## Teaching Quality Checklist

Before presenting information to user, verify:

**For NOVICE:**
- [ ] No unexplained jargon
- [ ] Clear recommendation provided
- [ ] "Why" is explained
- [ ] Analogies used where helpful
- [ ] Confirmation requested

**For INTERMEDIATE:**
- [ ] Options presented with trade-offs
- [ ] Advanced terms defined
- [ ] Preferences asked on key decisions
- [ ] Deeper explanations offered

**For EXPERT:**
- [ ] Information is concise
- [ ] Trade-offs highlighted
- [ ] Autonomy respected
- [ ] Only genuine questions asked

---

## Storing Teaching Level

Teaching level is captured and stored in `docs/INTAKE.md`:

```markdown
## Q3: Technical background

**User said:**
> "I'm a product manager, not technical at all"

**Teaching level:** NOVICE
```

All agents read this file and adapt accordingly.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | 2026-01-02 | Designated as canonical source; cross-references added |
| 1.0.0 | 2024-12-18 | Initial creation |
