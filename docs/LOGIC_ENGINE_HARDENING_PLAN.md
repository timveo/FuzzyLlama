# Logic Engine Hardening Plan

> **Version:** 1.2.0
> **Created:** 2026-01-08
> **Updated:** 2026-01-08
> **Status:** FULLY IMPLEMENTED (10/10 items complete)

---

## Purpose

After completing CNDI-proto-2, we identified 10 remaining risk areas in the Logic Engine. This plan addresses each with specific fixes, prioritized by impact and effort.

---

## Risk Summary

| # | Risk | Impact | Effort | Priority |
|---|------|--------|--------|----------|
| 1 | Agent prompt reading not enforced | High | Medium | P0 |
| 2 | Parallel agent coordination gaps | Medium | High | P1 |
| 3 | Proof artifacts documented but not validated | High | Medium | P0 |
| 4 | Self-healing log could be fabricated | Medium | Low | P2 |
| 5 | AI agent prompts may be incomplete | High | Low | P0 |
| 6 | Teaching level could be ignored | Low | Low | P3 |
| 7 | Recovery protocol untested | Medium | Medium | P1 |
| 8 | MCP server tool gaps | High | Medium | P0 |
| 9 | G4 skip logic could be gamed | Medium | Low | P2 |
| 10 | Cost/token tracking not enforced | Low | Medium | P3 |

---

## Phase 1: Critical Fixes (P0)

### 1.1 Audit AI Agent Prompts

**Problem:** 5 AI agent files exist but may lack required structure (handoff JSON, self_healing_log, MCP tools reference).

**Files to audit:**
- `agents/ml-engineer.md`
- `agents/prompt-engineer.md`
- `agents/model-evaluator.md`
- `agents/aiops-engineer.md`
- `agents/data-engineer.md`

**Required sections (must match core agents):**
- [ ] `<role>` with clear ownership boundaries
- [ ] `<context>` with quick reference table
- [ ] `<mcp_tools>` with relevant tools listed
- [ ] `<self_healing>` with reporting requirement
- [ ] `<handoff>` with JSON format including `self_healing_log`
- [ ] `<checkpoints>` for sub-gate approval points

**Deliverable:** Updated AI agent prompts with consistent structure.

**Effort:** 2-3 hours

---

### 1.2 Implement Proof Artifact Validation

**Problem:** APPROVAL_GATES.md lists required proofs, but no tool verifies files exist.

**Solution:** Enhance `get_gate_proof_status()` MCP tool to check file existence.

**Location:** `mcp-server/src/tools/gate-tools.ts`

**Required checks by gate:**

| Gate | Files to Verify |
|------|-----------------|
| G4 | `designs/options/option-1.html`, `option-2.html`, `option-3.html`, `designs/comparison.html` |
| G5 (AI) | `docs/AI_ARCHITECTURE.md`, `src/services/ai/` exists, `prompts/registry.ts` |
| G6 (AI) | `docs/EVAL_REPORT.md`, `datasets/` exists, `eval-results/*.json` |
| G8 | `docs/PRE_DEPLOYMENT_REPORT.md`, `.truth/proofs/G8/lighthouse-*.json` |
| G8 (AI) | `docs/AI_OPERATIONS.md`, `config/rate-limits.yml`, `config/fallbacks.yml` |

**Implementation:**

```typescript
// In get_gate_proof_status handler
const G4_REQUIRED_PROOFS = [
  'designs/options/option-1.html',
  'designs/options/option-2.html',
  'designs/options/option-3.html',
  'designs/comparison.html',
  'docs/DESIGN_SYSTEM.md',
  'docs/DATA_SCHEMA_MAPPING.md'
];

function validateG4Proofs(projectPath: string): ProofStatus {
  const missing: string[] = [];
  for (const file of G4_REQUIRED_PROOFS) {
    if (!fs.existsSync(path.join(projectPath, file))) {
      missing.push(file);
    }
  }
  return {
    gate: 'G4',
    valid: missing.length === 0,
    missing,
    present: G4_REQUIRED_PROOFS.filter(f => !missing.includes(f))
  };
}
```

**Deliverable:** Updated MCP tool that blocks gates without required files.

**Effort:** 4-6 hours

---

### 1.3 Add Handoff JSON Schema Validation

**Problem:** Agents could return malformed handoffs missing required fields.

**Solution:** Create Zod schemas for each agent's handoff and validate on receipt.

**Location:** `mcp-server/src/schemas/handoff-schemas.ts`

**Example schema:**

```typescript
const BackendDevHandoff = z.object({
  handoff: z.object({
    agent: z.literal('Backend Developer'),
    status: z.enum(['complete', 'blocked', 'escalation']),
    phase: z.string()
  }),
  deliverables: z.object({
    endpoints: z.object({ total: z.number(), auth: z.number() }),
    database: z.object({ tables: z.number(), migrations: z.number() }),
    test_coverage: z.string()
  }),
  verification: z.object({
    all_passed: z.boolean(),
    build: z.number(),
    test: z.number(),
    lint: z.number()
  }),
  self_healing_log: z.object({
    attempts: z.array(z.object({
      attempt: z.number(),
      status: z.enum(['success', 'failed']),
      error: z.string().optional(),
      fix: z.string().optional()
    })),
    final_status: z.enum(['success', 'failed', 'escalation'])
  }),
  next_agent: z.string()
});
```

**Deliverable:** Schema validation in `record_tracked_handoff()` tool.

**Effort:** 3-4 hours

---

### 1.4 Audit MCP Tool Implementations

**Problem:** Docs reference tools that may not be fully implemented.

**Tools to verify:**

| Tool | File | Status |
|------|------|--------|
| `validate_agent_spawn_for_gate` | `agent-spawn-tools.ts` | Check AI agent conditional logic |
| `get_gate_proof_status` | `gate-tools.ts` | Check file existence validation |
| `check_can_generate_code` | `validation-tools.ts` | Verify it's actually blocking |
| `get_gate_readiness` | `gate-tools.ts` | Check all prerequisites |
| `lock_specs` | `spec-tools.ts` | Verify spec immutability after G3 |

**Deliverable:** Gap analysis report + implementation fixes.

**Effort:** 4-6 hours

---

## Phase 2: Important Fixes (P1)

### 2.1 Add Parallel Agent Conflict Detection

**Problem:** Frontend and Backend could modify same files causing build failures.

**Solution:** Add `spec_refs` validation before parallel spawn.

**Implementation:**

```typescript
// In orchestrator before parallel spawn
function checkParallelConflicts(tasks: Task[]): ConflictResult {
  const fileRefs = new Map<string, string[]>();

  for (const task of tasks) {
    for (const ref of task.spec_refs || []) {
      if (!fileRefs.has(ref)) fileRefs.set(ref, []);
      fileRefs.get(ref)!.push(task.agent);
    }
  }

  const conflicts = [...fileRefs.entries()]
    .filter(([_, agents]) => agents.length > 1);

  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts.map(([file, agents]) => ({ file, agents }))
  };
}
```

**Mitigation strategies:**
1. **Spec refs ownership:** Frontend owns `src/components/`, Backend owns `src/api/`
2. **Shared types:** Both import from `specs/schemas/` (read-only after G3)
3. **Conflict resolution:** If detected, run sequentially instead of parallel

**Deliverable:** Conflict detection in orchestrator + sequential fallback.

**Effort:** 6-8 hours

---

### 2.2 Document Recovery Protocol

**Problem:** Mid-session crashes could lose state.

**Solution:** Explicit recovery documentation + state persistence checks.

**Location:** `constants/advanced/RECOVERY_PROTOCOL.md`

**Required content:**
1. How to detect incomplete session
2. How to restore from `.truth/truth.json`
3. How to identify current sub-gate (G5.1-G5.5)
4. How to resume agent spawns
5. How to handle partial code generation

**Test scenarios:**
- [ ] Crash after G3 approval, before G4 spawn
- [ ] Crash mid-G5 (between Frontend and Backend completion)
- [ ] Crash after G8 staging deploy, before G9 production

**Deliverable:** Updated RECOVERY_PROTOCOL.md with tested procedures.

**Effort:** 4-6 hours

---

## Phase 3: Nice-to-Have Fixes (P2)

### 3.1 Self-Healing Log Verification

**Problem:** Agents could fabricate the self_healing_log.

**Solution:** Correlate with actual command outputs captured via `capture_command_output()`.

**Implementation:**
- Store command outputs in `.truth/proofs/G5/commands/`
- Cross-reference self_healing_log.attempts with actual command timestamps
- Flag discrepancies (claimed 3 attempts but only 1 command output)

**Deliverable:** Warning in handoff validation if log doesn't match captured outputs.

**Effort:** 4-6 hours

---

### 3.2 G4 Skip Re-validation

**Problem:** User could say "API-only" then add UI at G5.

**Solution:** Check for UI files at G5 and require G4 if found.

**Implementation:**

```typescript
// At G5 presentation
function shouldRequireG4(projectPath: string): boolean {
  const uiIndicators = [
    'src/components/',
    'src/pages/',
    'app/',
    '*.tsx',
    'index.html'
  ];

  for (const pattern of uiIndicators) {
    if (glob.sync(path.join(projectPath, pattern)).length > 0) {
      return true;
    }
  }
  return false;
}

// If shouldRequireG4() returns true but G4 was skipped:
// Block G5 and require G4 completion first
```

**Deliverable:** UI detection check at G5 with G4 enforcement.

**Effort:** 2-3 hours

---

## Phase 4: Future Improvements (P3)

### 4.1 Teaching Level Enforcement

**Problem:** Agents may ignore user's teaching level.

**Solution:** Add `check_communication_compliance()` validation.

**Effort:** 3-4 hours

---

### 4.2 Cost/Token Tracking

**Problem:** No visibility into API costs per agent.

**Solution:** Integrate token counting into agent spawns.

**Effort:** 6-8 hours

---

## Implementation Schedule

| Phase | Items | Est. Hours | Suggested Order |
|-------|-------|------------|-----------------|
| **Phase 1** | 1.1, 1.2, 1.3, 1.4 | 13-19 hours | Do first - critical |
| **Phase 2** | 2.1, 2.2 | 10-14 hours | Do second - prevents data loss |
| **Phase 3** | 3.1, 3.2 | 6-9 hours | Do third - improves reliability |
| **Phase 4** | 4.1, 4.2 | 9-12 hours | Do last - nice-to-have |

**Total estimated effort:** 38-54 hours

---

## Success Criteria

After implementing this plan:

1. [x] All 5 AI agent prompts have consistent structure ✅ Added `<self_healing>` and `self_healing_log` to all AI agents
2. [x] `get_gate_proof_status()` verifies file existence for G4, G5, G6, G8 ✅ Implemented in proof-artifacts.ts
3. [x] `record_tracked_handoff()` validates JSON schema ✅ Implemented with self_healing_log validation
4. [x] All referenced MCP tools are fully implemented ✅ Audited and updated with AI agent support
5. [x] Parallel agents have conflict detection ✅ Added `check_parallel_spawn_conflicts` tool
6. [x] Recovery protocol is documented and tested ✅ Added Section 10 to RECOVERY_PROTOCOL.md
7. [x] G4 skip is re-validated at G5 ✅ Added UI detection check in gates.ts
8. [x] Self-healing logs can be cross-referenced with command outputs ✅ Added `verifySelfHealingAgainstCommandOutputs()` in enforcement-tracking-tools.ts
9. [x] Teaching level enforcement via `check_communication_compliance()` ✅ Added in service-compliance-tools.ts
10. [x] Cost/token tracking integrated into agent spawns ✅ Added `token_usage` param to `complete_agent_spawn()`

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Orchestrator | `agents/orchestrator.md` | Main coordination logic |
| Approval Gates | `constants/protocols/APPROVAL_GATES.md` | Gate proof requirements |
| Agent Handoff | `constants/protocols/AGENT_HANDOFF_PROTOCOL.md` | Spawn protocol |
| Self-Healing | `constants/protocols/SELF_HEALING_PROTOCOL.md` | Error recovery |
| MCP Tools | `mcp-server/src/tools/*.ts` | Tool implementations |

---

## Version History

- **1.2.0** (2026-01-08): All 10 items implemented - P2/P3 deferred items completed:
  - Self-healing log verification against command outputs
  - Teaching level enforcement with `check_communication_compliance()`
  - Cost/token tracking integrated into `complete_agent_spawn()`
- **1.1.0** (2026-01-08): P0/P1 items implemented (7/10 complete)
- **1.0.0** (2026-01-08): Initial plan based on CNDI-proto-2 lessons learned
