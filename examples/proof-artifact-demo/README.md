# Proof Artifact Enforcement Demo

This example demonstrates the proof artifact enforcement system that makes gates **actually blocking** rather than advisory.

## Problem Statement

Before enforcement, agents could:
- Claim "tests pass" without running them
- Skip security scans entirely
- Approve gates based on verbal descriptions

**Result:** The multi-agent framework was advisory theater, not production-grade.

## Solution: Proof Artifact Enforcement

Now every gate approval requires **cryptographically verifiable proof artifacts**:

1. **capture_command_output()** - Runs commands and captures output with SHA256 hash
2. **submit_proof_artifact()** - Submits file as proof with integrity verification
3. **get_gate_proof_status()** - Shows what proofs exist vs what's missing
4. **approve_gate()** - **BLOCKS** if required proofs are missing

## Gate Requirements

| Gate | Required Proofs | How to Generate |
|------|-----------------|-----------------|
| G3 (Spec Lock) | `spec_validation` | `validate_specs_for_g3()` |
| G5 (Dev Complete) | `build_output`, `lint_output`, `test_output` | `capture_command_output()` |
| G6 (QA Complete) | `test_output`, `coverage_report`, `accessibility_scan`, `lighthouse_report` | `capture_command_output()` |
| G7 (Security) | `security_scan`, `lint_output` | `capture_command_output()` |
| G8 (Pre-Deploy) | `build_output`, `deployment_log` | `capture_command_output()` |
| G9 (Production) | `deployment_log`, `smoke_test` | `capture_command_output()` |

## Demo Workflow

### Step 1: Try to Approve G5 Without Proofs

```typescript
// This will FAIL with blocking error
const result = await approve_gate({
  project_path: "/path/to/project",
  gate: "G5",
  approved_by: "user"
});
// Error: Cannot approve G5 - missing required proofs: build_output, lint_output, test_output
```

### Step 2: Generate Required Proofs

```typescript
// Run build and capture as proof
const build = await capture_command_output({
  project_path: "/path/to/project",
  project_id: "demo-app",
  gate: "G5",
  proof_type: "build_output",
  command: "npm run build",
  working_directory: "/path/to/project"
});
// Returns: { exit_code: 0, artifact_id: "build-abc123", proof_submitted: true }

// Run lint and capture as proof
const lint = await capture_command_output({
  project_path: "/path/to/project",
  project_id: "demo-app",
  gate: "G5",
  proof_type: "lint_output",
  command: "npm run lint",
  working_directory: "/path/to/project"
});

// Run tests and capture as proof
const test = await capture_command_output({
  project_path: "/path/to/project",
  project_id: "demo-app",
  gate: "G5",
  proof_type: "test_output",
  command: "npm test",
  working_directory: "/path/to/project"
});
```

### Step 3: Check Gate Readiness

```typescript
const status = await get_gate_proof_status({
  project_path: "/path/to/project",
  project_id: "demo-app",
  gate: "G5"
});
// Returns:
// {
//   gate: "G5",
//   required_proofs: ["build_output", "lint_output", "test_output"],
//   submitted_proofs: [
//     { type: "build_output", pass_fail: "pass", summary: "Build succeeded" },
//     { type: "lint_output", pass_fail: "pass", summary: "0 errors, 0 warnings" },
//     { type: "test_output", pass_fail: "pass", summary: "42 passed, 0 failed" }
//   ],
//   missing_proofs: [],
//   can_approve: true,
//   blocking_issues: []
// }
```

### Step 4: Approve Gate (Now Succeeds)

```typescript
const approval = await approve_gate({
  project_path: "/path/to/project",
  gate: "G5",
  approved_by: "user"
});
// Success: Gate G5 approved with all required proofs
```

## Proof Artifacts Directory Structure

```
.truth/
├── truth.json              # TruthStore with all state
└── proofs/
    ├── G3/
    │   └── spec-validation-2025-01-03T12-00-00.md
    ├── G5/
    │   ├── build-output-2025-01-03T12-01-00.txt
    │   ├── lint-output-2025-01-03T12-02-00.txt
    │   └── test-output-2025-01-03T12-03-00.txt
    ├── G6/
    │   ├── test-output-2025-01-03T13-00-00.txt
    │   ├── coverage-report-2025-01-03T13-01-00.json
    │   ├── accessibility-scan-2025-01-03T13-02-00.json
    │   └── lighthouse-report-2025-01-03T13-03-00.json
    ├── G7/
    │   ├── security-scan-2025-01-03T14-00-00.json
    │   └── lint-output-2025-01-03T14-01-00.txt
    ├── G8/
    │   ├── build-output-2025-01-03T15-00-00.txt
    │   └── deployment-log-2025-01-03T15-01-00.txt
    └── G9/
        ├── deployment-log-2025-01-03T16-00-00.txt
        └── smoke-test-2025-01-03T16-01-00.txt
```

## Integrity Verification

Every proof artifact has a SHA256 hash stored in truth.json:

```json
{
  "proof_artifacts": [
    {
      "id": "build-abc12345",
      "gate": "G5",
      "proof_type": "build_output",
      "file_path": ".truth/proofs/G5/build-output-2025-01-03T12-01-00.txt",
      "file_hash": "a1b2c3d4e5f6...",
      "content_summary": "Build succeeded",
      "pass_fail": "pass",
      "created_at": "2025-01-03T12:01:00.000Z",
      "created_by": "capture_command_output"
    }
  ]
}
```

Verify integrity at any time:

```typescript
const integrity = await verify_proof_integrity({
  project_path: "/path/to/project",
  artifact_id: "build-abc12345"
});
// Returns: { valid: true, stored_hash: "a1b2c3...", current_hash: "a1b2c3..." }
```

## Force Override (Audit Trail)

If absolutely necessary, gates can be forced (with audit logging):

```typescript
const forced = await approve_gate({
  project_path: "/path/to/project",
  gate: "G5",
  approved_by: "user",
  force_without_proofs: true  // NOT RECOMMENDED
});
// Warning: Gate approved WITHOUT required proofs
// Audit log entry created: protocol_violation
```

This creates an audit trail showing exactly who bypassed enforcement and when.

## CI/CD Integration

See [templates/code-examples/github-actions.md](../../templates/code-examples/github-actions.md) for:
- GitHub Actions workflow with proof artifact generation
- Gate-specific CI jobs (G5, G6, G7)
- Automated proof verification before deployment

## Local Verification Script

```bash
# Verify all proof artifacts exist
./scripts/verify-proofs.sh /path/to/project all

# Verify specific gate
./scripts/verify-proofs.sh /path/to/project G6
```

## Key Benefits

1. **Unambiguous Verification** - Either proofs exist or they don't
2. **Tamper Detection** - SHA256 hashes detect any modification
3. **Audit Trail** - Complete record of what was verified and when
4. **Blocking Enforcement** - Gates actually block without proofs
5. **Clear Guidance** - `missing_proofs` tells agents exactly what's needed
