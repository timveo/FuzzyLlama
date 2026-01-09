# Agent Cost Tracking Framework

> **Purpose:** Monitor and assess the cost of using Claude agents during project development. Tracks token usage, session costs, and provides transparency into agent framework expenses.

---

## Why Track Agent Costs?

1. **Transparency** - Users should know what they're spending
2. **Budgeting** - Plan projects with realistic cost expectations
3. **Optimization** - Identify expensive operations to optimize
4. **ROI Analysis** - Compare agent costs vs. manual development time

---

## Claude Code Pricing Reference (December 2024)

### Current Model Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Context Window |
|-------|----------------------|------------------------|----------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | 200K |
| Claude 3.5 Haiku | $1.00 | $5.00 | 200K |
| Claude 3 Opus | $15.00 | $75.00 | 200K |

**Note:** Pricing may change. Check [anthropic.com/pricing](https://anthropic.com/pricing) for current rates.

### Token Estimation Rules of Thumb

| Content Type | Approximate Tokens |
|--------------|-------------------|
| 1 word (English) | ~1.3 tokens |
| 1 line of code | ~10-15 tokens |
| 1 TypeScript file (100 lines) | ~1,000-1,500 tokens |
| 1 markdown doc (500 words) | ~700 tokens |
| Full PRD.md | ~2,000-4,000 tokens |
| Full ARCHITECTURE.md | ~3,000-6,000 tokens |

---

## Session Cost Tracking

### Per-Session Metrics Template

Create `docs/COST_LOG.md` in your project to track costs:

```markdown
# Cost Log

## Session Summary

| Date | Duration | Input Tokens | Output Tokens | Est. Cost | Phase |
|------|----------|--------------|---------------|-----------|-------|
| YYYY-MM-DD | Xh Xm | X,XXX | X,XXX | $X.XX | G1-Intake |
| YYYY-MM-DD | Xh Xm | X,XXX | X,XXX | $X.XX | G2-PRD |
| ... | ... | ... | ... | ... | ... |
| **TOTAL** | | **X,XXX** | **X,XXX** | **$X.XX** | |

## Cost by Phase

| Phase | Sessions | Total Input | Total Output | Total Cost |
|-------|----------|-------------|--------------|------------|
| G1: Intake | X | X,XXX | X,XXX | $X.XX |
| G2: PRD | X | X,XXX | X,XXX | $X.XX |
| G3: Architecture | X | X,XXX | X,XXX | $X.XX |
| G4: Design | X | X,XXX | X,XXX | $X.XX |
| G5: Development | X | X,XXX | X,XXX | $X.XX |
| G6: Testing | X | X,XXX | X,XXX | $X.XX |
| G7: Security | X | X,XXX | X,XXX | $X.XX |
| G8: Pre-Deploy | X | X,XXX | X,XXX | $X.XX |
| G9: Production | X | X,XXX | X,XXX | $X.XX |
| **TOTAL** | | | | **$X.XX** |
```

---

## Cost Estimation by Phase

### Typical Token Usage by Phase

Based on observed patterns, here are expected token ranges per phase:

| Phase | Input Tokens | Output Tokens | Typical Cost (Sonnet) |
|-------|--------------|---------------|----------------------|
| **G0: Startup** | 500-1,000 | 500-1,000 | $0.01-0.02 |
| **G1: Intake** | 2,000-5,000 | 3,000-8,000 | $0.05-0.15 |
| **G2: PRD** | 5,000-15,000 | 10,000-30,000 | $0.20-0.60 |
| **G3: Architecture** | 10,000-30,000 | 15,000-50,000 | $0.30-1.00 |
| **G4: Design** | 5,000-15,000 | 10,000-25,000 | $0.20-0.50 |
| **G5: Development** | 50,000-200,000 | 100,000-500,000 | $2.00-10.00 |
| **G6: Testing** | 10,000-30,000 | 20,000-60,000 | $0.40-1.20 |
| **G7: Security** | 5,000-15,000 | 10,000-30,000 | $0.20-0.60 |
| **G8: Pre-Deploy** | 3,000-10,000 | 5,000-20,000 | $0.10-0.40 |
| **G9: Production** | 2,000-5,000 | 3,000-10,000 | $0.05-0.20 |

### Project Total Estimates

| Project Size | Total Tokens (Input+Output) | Estimated Cost |
|--------------|----------------------------|----------------|
| **Simple MVP** (5 features) | 100K-300K | $3-10 |
| **Standard App** (10-15 features) | 300K-700K | $10-25 |
| **Complex App** (20+ features) | 700K-1.5M | $25-60 |
| **Enterprise** (50+ features) | 1.5M-5M | $60-200 |

---

## Cost-to-Complete Projections (NEW in v1.1.0)

> **Purpose:** Provide forward-looking cost estimates based on PRD complexity before development begins.

### When to Generate Projections

The Product Manager Agent should generate a cost projection:
1. **After G2 (PRD Approval)** - Before architecture begins
2. **After G3 (Architecture Approval)** - Refined estimate before development
3. **At user request** - Any time during planning

### Projection Formula

```
Estimated Cost = Base Cost + (Feature Count × Feature Complexity Factor) + Risk Buffer

Where:
- Base Cost = $5 (minimum project overhead)
- Feature Complexity Factor = Simple ($0.50) / Medium ($1.50) / Complex ($3.00)
- Risk Buffer = 20% of subtotal (for iterations and revisions)
```

### PRD Complexity Analysis

The Product Manager should analyze the PRD and produce:

```markdown
## Cost-to-Complete Projection

**Project:** [Name]
**PRD Version:** 1.0
**Projection Date:** YYYY-MM-DD
**Projected By:** Product Manager Agent

---

### Feature Breakdown

| Feature | Complexity | Est. Cost | Notes |
|---------|------------|-----------|-------|
| User Authentication | Complex | $3.00 | JWT + OAuth |
| Dashboard | Medium | $1.50 | 3 widgets |
| Profile Page | Simple | $0.50 | CRUD only |
| Search | Medium | $1.50 | With filters |
| Export | Simple | $0.50 | CSV only |
| **Subtotal** | | **$7.00** | |

### Phase Cost Breakdown

| Phase | % of Total | Est. Cost |
|-------|------------|-----------|
| G1-G2 (Planning) | 10% | $0.70 |
| G3 (Architecture) | 15% | $1.05 |
| G4 (Design) | 10% | $0.70 |
| G5 (Development) | 45% | $3.15 |
| G6-G7 (Testing/Security) | 15% | $1.05 |
| G8-G9 (Deploy) | 5% | $0.35 |

### Risk Factors

| Risk | Impact | Probability | Cost Impact |
|------|--------|-------------|-------------|
| Unclear requirements | +30% | Medium | +$2.10 |
| Third-party API issues | +20% | Low | +$1.40 |
| User revision rounds | +25% | High | +$1.75 |

### Final Projection

| Scenario | Estimated Cost | Confidence |
|----------|----------------|------------|
| **Best Case** | $7.00 | 20% |
| **Expected** | $10.50 | 60% |
| **Worst Case** | $15.00 | 20% |

---

### User Confirmation Required

⚠️ **Before proceeding to G3 (Architecture), please confirm:**

> "This PRD is estimated to cost approximately **$10-15** in agent tokens to build.
>
> Do you want to proceed? (yes/no)"

If budget constrained, consider:
- Reducing feature count
- Simplifying complex features
- Phasing features across releases
```

### Complexity Scoring Guide

| Complexity | Criteria | Examples |
|------------|----------|----------|
| **Simple** ($0.50) | CRUD, static pages, basic forms | Profile page, Settings, About |
| **Medium** ($1.50) | State management, API integration, moderate UI | Dashboard, List views, Search |
| **Complex** ($3.00) | Auth, real-time, complex logic, external APIs | Authentication, Chat, Analytics |
| **Very Complex** ($5.00) | ML/AI, payments, multi-tenant | AI features, Stripe, Admin portals |

### Integration Points

#### In PRD.md Template

Add this section after Success Metrics:

```markdown
## Cost Projection

| Metric | Value |
|--------|-------|
| **Total Features** | X |
| **Simple Features** | X × $0.50 = $X |
| **Medium Features** | X × $1.50 = $X |
| **Complex Features** | X × $3.00 = $X |
| **Subtotal** | $X |
| **Risk Buffer (20%)** | $X |
| **Projected Total** | $X |

**Confidence Level:** High / Medium / Low
**User Acknowledged:** Yes / No
```

#### In Orchestrator Handoff

When presenting G2 approval:

```markdown
## 🚦 APPROVAL REQUIRED: G2 (PRD)

[... standard G2 content ...]

### Cost Projection Summary

| Projection | Amount |
|------------|--------|
| Expected Cost | ~$X |
| Cost Range | $X - $X |

⚠️ **Do you accept this projected cost and wish to proceed?**
```

### Tracking Actual vs. Projected

At project end (G10), compare:

```markdown
## Cost Accuracy Report

| Metric | Projected | Actual | Variance |
|--------|-----------|--------|----------|
| Total Cost | $10.50 | $12.30 | +17% |
| G1-G2 | $0.70 | $0.85 | +21% |
| G3 | $1.05 | $0.90 | -14% |
| G4 | $0.70 | $0.65 | -7% |
| G5 | $3.15 | $5.20 | +65% |
| G6-G7 | $1.05 | $1.40 | +33% |
| G8-G9 | $0.35 | $0.30 | -14% |

### Variance Analysis
- G5 over budget due to: [reason]
- Recommendation: Adjust complexity factor for [feature type]

### Learning for Future Projects
- [Insight 1]
- [Insight 2]
```

---

## Cost Optimization Strategies

### 1. Efficient Prompting

**Do:**
- Be specific and concise in requests
- Provide clear context upfront
- Use references to existing docs instead of repeating content

**Don't:**
- Ask vague questions requiring clarification rounds
- Paste large code blocks unnecessarily
- Request explanations you already understand

### 2. Batch Related Tasks

**Expensive (multiple rounds):**
```
User: Create a Button component
User: Now add a variant prop
User: Now add a size prop
User: Now add disabled state
```

**Efficient (single round):**
```
User: Create a Button component with:
- variant prop (primary, secondary, ghost)
- size prop (sm, md, lg)
- disabled state
- loading state
```

### 3. Use Checkpoints Wisely

Each checkpoint requires context loading. Minimize unnecessary checkpoints for trivial changes.

### 4. Teaching Level Impact

| Teaching Level | Explanation Overhead | Est. Cost Multiplier |
|----------------|---------------------|---------------------|
| NOVICE | High | 1.3-1.5x |
| INTERMEDIATE | Medium | 1.1-1.2x |
| EXPERT | Minimal | 1.0x |

**Note:** This is a natural trade-off - more explanation = more learning, but also more tokens.

### 5. Context Window Management

Large context windows cost more. The agent framework uses compression to manage this:
- STATUS.md compression at 100+ lines
- Archive historical data to reduce active context
- Reference docs instead of including full content

---

## Real-Time Cost Awareness

### In-Session Cost Indicators

Agents should periodically report estimated costs:

```markdown
---
**Session Cost Update**
- Current session: ~$X.XX (estimated)
- Project total: ~$X.XX
- Phase: G5 Development
---
```

### Cost Alerts

| Alert Level | Trigger | Action |
|-------------|---------|--------|
| **Info** | Session > $1.00 | Display current cost |
| **Warning** | Session > $5.00 | Suggest checkpoint/break |
| **Critical** | Session > $10.00 | Recommend session end |

---

## Cost Tracking Integration

### At Session Start

```markdown
## Session Start: [Date] [Time]

**Project:** [Name]
**Phase:** [Current Gate]
**Previous total cost:** $X.XX
**Budget remaining:** $X.XX (if set)
```

### At Each Gate Completion

```markdown
## Gate [X] Complete

**Gate cost:** $X.XX
**Cumulative cost:** $X.XX
**Tokens used:** Input: X,XXX | Output: X,XXX
```

### At Session End

```markdown
## Session End: [Date] [Time]

**Session duration:** X hours X minutes
**Session cost:** $X.XX
**New project total:** $X.XX

**Cost breakdown:**
- Context loading: $X.XX
- Code generation: $X.XX
- Explanations: $X.XX
- Iterations/revisions: $X.XX
```

---

## Budget Management

### Setting a Project Budget

In `docs/INTAKE.md`, capture budget constraints:

```markdown
## Q5: Constraints

**Agent usage budget:** $XX (optional)
**Alert at:** $XX (50% of budget)
**Hard stop at:** $XX (90% of budget)
```

### Budget Enforcement

When budget thresholds are reached:

**At 50% (Alert):**
```markdown
**Budget Alert:** You've used ~50% of your agent budget ($XX of $XX).

Current progress: Gate X of 9
Estimated remaining cost: $XX-XX

Options:
A) Continue with current budget
B) Increase budget to $XX
C) Optimize by [suggestions]
```

**At 90% (Warning):**
```markdown
**Budget Warning:** Approaching budget limit ($XX of $XX used).

To complete the project, we estimate needing $XX more.

Options:
A) Extend budget by $XX
B) Ship at current state (Gate X)
C) Reduce scope to fit budget
```

---

## ROI Calculation

### Agent Cost vs. Developer Time

| Developer Rate | Time Saved | Agent Cost | Net Savings |
|----------------|------------|------------|-------------|
| $50/hr | 10 hours | $15 | $485 |
| $75/hr | 10 hours | $15 | $735 |
| $100/hr | 10 hours | $15 | $985 |
| $150/hr | 10 hours | $15 | $1,485 |

**Formula:**
```
Net Savings = (Developer Hourly Rate × Hours Saved) - Agent Cost
ROI = (Net Savings / Agent Cost) × 100%
```

### Example ROI Analysis

```json
{
  "project": "Todo App MVP",
  "agent_cost": 12.50,
  "estimated_manual_time": "40 hours",
  "developer_rate": 75,
  "manual_cost": 3000,
  "time_saved": "~35 hours",
  "net_savings": 2987.50,
  "roi_percentage": "23900%"
}
```

---

## Cost Reporting Template

### Weekly Cost Report

```markdown
# Agent Cost Report: Week of [Date]

## Summary

| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Total sessions | X | X | +/-X |
| Total tokens | X,XXX | X,XXX | +/-X% |
| Total cost | $X.XX | $X.XX | +/-X% |
| Avg cost/session | $X.XX | $X.XX | +/-X% |

## By Project

| Project | Sessions | Cost | Phase Reached |
|---------|----------|------|---------------|
| [Name] | X | $X.XX | G5 |
| [Name] | X | $X.XX | G3 |

## Top Cost Drivers

1. [Activity] - $X.XX (X% of total)
2. [Activity] - $X.XX (X% of total)
3. [Activity] - $X.XX (X% of total)

## Optimization Opportunities

- [Suggestion 1]
- [Suggestion 2]
```

---

## Integration with INTAKE.md

Add this section to `docs/INTAKE.md` template:

```markdown
## Cost Tracking

| Metric | Value |
|--------|-------|
| **Budget (optional)** | $[amount] or "No limit" |
| **Alert threshold** | $[amount] or "50% of budget" |
| **Cost tracking** | Enabled / Disabled |
| **Report frequency** | Per gate / Per session / End of project |
```

---

## Best Practices

### For Users

1. **Set expectations** - Know that agent usage has a cost
2. **Be specific** - Clear requests = fewer iterations = lower cost
3. **Review checkpoints** - Catch issues early before expensive rework
4. **Use appropriate teaching level** - EXPERT saves tokens if you don't need explanations

### For Agents

1. **Be efficient** - Don't pad responses unnecessarily
2. **Reference docs** - Point to existing content instead of repeating
3. **Batch operations** - Combine related tasks when possible
4. **Report costs** - Keep users informed of estimated spending

---

## Version

**Version:** 1.1.0
**Created:** 2024-12-18
**Updated:** 2025-12-19
**Purpose:** Transparent cost tracking for agent framework usage

### Changelog
- **1.1.0** (2025-12-19): Added Cost-to-Complete Projections section with PRD-based estimation
- **1.0.0** (2024-12-18): Initial version with cost tracking framework
