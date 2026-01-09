# Expert Mode Protocol

> **Purpose:** Optimize the multi-agent framework for experienced users
> **Applies When:** `teaching_level: EXPERT` in INTAKE.md

---

## Overview

Expert users need:
- **Speed** - Skip explanations, get to decisions
- **Control** - Override defaults, customize everything
- **Depth** - Access to all configuration options
- **Efficiency** - Parallel work, batch approvals
- **Transparency** - See what's happening under the hood
- **Context Import** - Leverage existing decisions and patterns

---

## 1. Communication Style

### All Agents MUST

```markdown
## Expert Mode Communication

DO:
- Lead with decisions and trade-offs
- Use technical terminology without explanation
- Provide configuration options upfront
- Show code/config snippets directly
- Offer batch operations when possible

DON'T:
- Explain basic concepts
- Add teaching moments
- Over-document obvious decisions
- Request approval for minor choices
- Hide complexity behind abstractions
```

### Example Transitions

| Novice | Expert |
|--------|--------|
| "I'm going to create a database schema. A schema is like a blueprint..." | "Schema design: pgvector with RLS for multi-tenancy. See ADR-003." |
| "Let me explain why we chose React..." | "Stack: Next.js 14 + TypeScript + TanStack Query. Alternatives considered in ADR-002." |
| "Would you like me to explain what an API is?" | "API spec attached. OpenAPI 3.1 format." |

---

## 2. Context Import

### At Intake (G0), Offer Import Options

```markdown
## Existing Context Import

Do you have existing architecture decisions to import?

### Option 1: ADR Documents
Provide path to existing ADR folder or paste key decisions:
- [ ] ADR folder path: _______________
- [ ] Paste inline (I'll extract decisions)

### Option 2: Tech Radar
Current technology choices:
- [ ] Languages: _______________
- [ ] Frameworks: _______________
- [ ] Infrastructure: _______________
- [ ] AI/ML stack: _______________

### Option 3: Constraints Known Upfront
- [ ] Compliance: SOC 2 / GDPR / HIPAA / PCI-DSS
- [ ] Data residency: US / EU / APAC / Multi-region
- [ ] Scale requirements: _______________
- [ ] Budget constraints: _______________

### Option 4: Patterns Library
Link to internal patterns/standards:
- [ ] API standards doc
- [ ] Security requirements
- [ ] Observability requirements
```

### How to Process Imported Context

```typescript
// Orchestrator should:
1. Parse imported ADRs and extract:
   - Technology decisions (stack, frameworks)
   - Architecture patterns (monolith, microservices, serverless)
   - Constraints (compliance, scale, budget)

2. Pre-populate ARCHITECTURE.md with imported decisions

3. Flag any conflicts with new requirements:
   "Imported: PostgreSQL (ADR-005). New requirement: Real-time sync.
   Potential conflict: PostgreSQL may need CDC extension."

4. Skip redundant questions:
   "Imported tech stack. Skipping G3 tech selection."
```

---

## 3. Batch Gate Approval

### For ENTERPRISE Projects

Instead of sequential gates, offer batch review:

```markdown
## Batch Gate Approval Available

The following gates are ready for review:

| Gate | Summary | Key Decisions |
|------|---------|---------------|
| G6 | Testing | 83% coverage, load tests passed |
| G7 | Security | SOC 2 ready, 2 medium findings |
| G8 | Infrastructure | K8s manifests, CI/CD complete |

### Options:
1. [ ] **Approve All** - Proceed to G9 deployment
2. [ ] **Review G7 Only** - Security needs attention
3. [ ] **Review Individually** - Standard gate flow
```

### When to Offer Batch Approval

- Project complexity is STANDARD or higher
- Gates are logically related (G6-G8 are pre-deployment)
- No blocking issues in any gate
- User has previously approved similar gates

---

## 4. Enterprise Patterns (Auto-Include for EXPERT)

### Distributed Tracing

Backend Developer MUST include OpenTelemetry setup:

```typescript
// Auto-included for expert/enterprise projects
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Circuit Breakers

ML Engineer MUST include resilience patterns for AI calls:

```typescript
import CircuitBreaker from 'opossum';

const aiBreaker = new CircuitBreaker(callAI, {
  timeout: 10000,           // 10s timeout
  errorThresholdPercentage: 50,  // Open after 50% failures
  resetTimeout: 30000,      // Try again after 30s
  volumeThreshold: 5,       // Minimum 5 requests before opening
});

aiBreaker.fallback(() => ({
  error: 'AI service temporarily unavailable',
  fallbackUsed: true
}));

aiBreaker.on('open', () => alertOps('AI circuit breaker opened'));
```

### Model Versioning

Data Engineer / ML Engineer MUST track model versions:

```sql
-- Auto-included schema for expert projects
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL CHECK (model_type IN ('embedding', 'generation', 'reranker', 'fine-tuned')),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  provider TEXT NOT NULL,
  config JSONB,
  metrics JSONB,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  UNIQUE(model_type, version)
);

CREATE TABLE document_chunk_versions (
  chunk_id UUID REFERENCES document_chunks(id),
  model_version_id UUID REFERENCES model_versions(id),
  embedding vector(3072),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chunk_id, model_version_id)
);
```

### Chaos Engineering Hooks

QA Engineer MUST include failure injection points:

```typescript
// Chaos testing middleware (disabled in production by default)
export const chaosMiddleware = (req, res, next) => {
  if (process.env.CHAOS_ENABLED !== 'true') return next();

  const chaos = {
    latency: () => new Promise(r => setTimeout(r, Math.random() * 5000)),
    error: () => { throw new Error('Chaos: Simulated failure'); },
    timeout: () => new Promise(() => {}), // Never resolves
  };

  const chaosType = req.headers['x-chaos-type'];
  if (chaosType && chaos[chaosType]) {
    return chaos[chaosType]().then(next).catch(next);
  }

  next();
};
```

---

## 5. Story Complexity Estimation

### Product Manager MUST Include

For EXPERT users, all stories need complexity assessment:

```markdown
## User Stories with Complexity

| ID | Story | Complexity | Estimate | Risk Factors |
|----|-------|------------|----------|--------------|
| US-001 | User auth | Low | 1-2 days | Standard pattern |
| US-002 | RAG pipeline | Medium | 3-5 days | Multiple integrations |
| US-003 | Fine-tuning | **Very High** | **2-3 weeks** | Training infra, evaluation |
| US-004 | Multi-region | High | 1-2 weeks | Data residency, replication |

### Complexity Legend
- **Low**: Standard patterns, well-understood
- **Medium**: Some integration complexity
- **High**: Significant architecture decisions
- **Very High**: Novel implementation, high uncertainty
```

### Flag High-Complexity Stories

```markdown
## ⚠️ High-Risk Stories Identified

The following stories have Very High complexity and may need:
- Dedicated architecture review
- Prototype/spike before committing
- External expertise

| Story | Risk | Recommendation |
|-------|------|----------------|
| US-003: Fine-tuning | Infra complexity | Spike: 2-3 days to validate approach |
| US-004: Multi-region | Compliance impact | Early Security review |
```

---

## 6. Prompt Testing Framework

### Prompt Engineer MUST Include for AI Projects

```typescript
// prompt-tests/doc-qa.test.ts
import { evaluatePrompt } from './evaluator';
import { docQAPrompt } from '../prompts/doc-qa';

describe('Document QA Prompt', () => {
  const testCases = loadTestCases('./test-cases/doc-qa.json');

  describe('Citation Requirements', () => {
    it('should cite sources for factual claims', async () => {
      const result = await evaluatePrompt(docQAPrompt, testCases.factual);
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citationAccuracy).toBeGreaterThan(0.9);
    });

    it('should not hallucinate sources', async () => {
      const result = await evaluatePrompt(docQAPrompt, testCases.factual);
      for (const citation of result.citations) {
        expect(testCases.factual.sources).toContain(citation.source);
      }
    });
  });

  describe('Refusal Behavior', () => {
    it('should refuse when no relevant context', async () => {
      const result = await evaluatePrompt(docQAPrompt, testCases.noContext);
      expect(result.text).toMatch(/don't have information|cannot find|no relevant/i);
    });

    it('should not make up answers', async () => {
      const result = await evaluatePrompt(docQAPrompt, testCases.noContext);
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Regression Tests', () => {
    it('should match baseline accuracy', async () => {
      const results = await evaluateBatch(docQAPrompt, testCases.regression);
      expect(results.accuracy).toBeGreaterThanOrEqual(BASELINE_ACCURACY * 0.95);
    });
  });
});
```

### Prompt Regression CI

```yaml
# .github/workflows/prompt-tests.yml
name: Prompt Tests
on:
  push:
    paths:
      - 'src/prompts/**'
      - 'prompt-tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:prompts
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: prompt-eval-results
          path: prompt-tests/results/
```

---

## 7. Compliance Pre-Check

### At Intake, Detect Compliance Requirements

```markdown
## Compliance Detection

Based on your requirements, the following compliance frameworks apply:

| Framework | Trigger | Impact |
|-----------|---------|--------|
| **GDPR** | EU customers, EU data | Data residency, DSAR APIs, DPA |
| **SOC 2** | Enterprise B2B | Audit logging, access control, incident response |
| **HIPAA** | Health data | BAA, encryption, audit trails |
| **PCI-DSS** | Payment processing | Network segmentation, encryption |

### Early Actions Required

1. **Data Residency** (GDPR): Multi-region deployment needed
   - Architecture impact: High
   - DevOps impact: High
   - **Action:** Architect must address at G3

2. **Audit Logging** (SOC 2): All AI interactions logged
   - Architecture impact: Medium
   - Backend impact: Medium
   - **Action:** Include in initial schema

3. **DPA with AI Providers** (GDPR): Verify data handling
   - **Action:** Security Engineer to verify at G7
```

---

## 8. Expert Shortcuts

### Skip Confirmation for Known Patterns

```markdown
## Auto-Approved Patterns (Expert Mode)

The following don't require explicit approval:

| Pattern | Condition | Applied |
|---------|-----------|---------|
| JWT auth | Industry standard | ✅ |
| PostgreSQL | Specified in requirements | ✅ |
| React/Next.js | Specified in requirements | ✅ |
| OpenTelemetry | Enterprise project | ✅ |
| Rate limiting | Best practice | ✅ |

### Requires Explicit Approval

| Decision | Options | Impact |
|----------|---------|--------|
| Vector DB | pgvector vs Pinecone vs Weaviate | Cost, scale, features |
| AI provider | Claude vs GPT vs mixed | Cost, capability, latency |
| Deployment | K8s vs serverless | Ops complexity, cost |
```

---

## 9. Verbose Mode (Optional)

### For Debugging/Learning

Expert users can enable verbose mode to see internal operations:

```markdown
## Verbose Mode

Enable verbose mode to see:
- MCP tool calls and responses
- Agent reasoning chains
- Decision tree traversals
- Spec lookups

### Enable
Set in INTAKE.md:
```yaml
verbose_mode: true
```

### Output Format
```
[TOOL] create_task: { project_id: "...", title: "..." }
[TOOL] ← { task_id: "task_123", status: "pending" }
[REASON] Task complexity: High → Assigning to Backend Developer
[SPEC] Reading ARCHITECTURE.md for API contracts...
```
```

---

## 10. Performance Optimizations

### Parallel Agent Execution

For expert projects, maximize parallelism:

```markdown
## Parallel Execution Available

The following agents can work in parallel:

### After G3 (Architecture Approved)
- Frontend Developer ─┬─ Backend Developer ─┬─ Data Engineer
                      └───────────┴─────────────┘
                              │
                              ▼
                         ML Engineer

### Time Savings
- Sequential: ~24 hours
- Parallel: ~12 hours (50% reduction)

### Enable Parallel Mode?
[ ] Yes, maximize parallelism
[ ] No, sequential for easier review
```

---

## Summary: Expert Mode Checklist

### Orchestrator Must

- [ ] Detect EXPERT level and switch communication style
- [ ] Offer context import (ADRs, tech radar, constraints)
- [ ] Offer batch gate approval
- [ ] Enable parallel agent execution
- [ ] Pre-check compliance requirements
- [ ] Skip confirmations for standard patterns

### All Agents Must

- [ ] Use concise, technical communication
- [ ] Include enterprise patterns (tracing, circuit breakers)
- [ ] Provide complexity estimates for stories
- [ ] Include advanced configuration options
- [ ] Document trade-offs without over-explaining

### AI/ML Agents Must

- [ ] Include model versioning
- [ ] Implement circuit breakers for AI calls
- [ ] Provide prompt testing framework
- [ ] Document fallback chains

### QA Must

- [ ] Include chaos engineering hooks
- [ ] Provide load test framework
- [ ] Document failure injection points

---

**See Also:**
- `constants/protocols/NOVICE_UX_PROTOCOL.md` - Novice optimizations
- `constants/reference/TEACHING_WORKFLOWS.md` - Communication by level
- `templates/docs/ADR_IMPORT.md` - ADR import template
