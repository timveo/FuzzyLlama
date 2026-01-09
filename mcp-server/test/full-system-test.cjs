#!/usr/bin/env node
/**
 * Full System Test - Real File I/O and Proof Artifact Generation
 *
 * This test creates actual project files, generates real proof artifacts
 * with SHA256 hashes, and validates the complete workflow end-to-end.
 *
 * Unlike unit/integration tests, this test:
 * - Creates real directory structures
 * - Writes actual source code files
 * - Generates real build/test outputs
 * - Computes actual SHA256 hashes
 * - Tests gate blocking without proofs
 * - Tests gate approval with proofs
 * - Validates proof integrity verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test utilities
let passed = 0;
let failed = 0;
const startTime = Date.now();

function log(msg) {
  console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`   ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(`     Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`);
    }
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Setup: Import compiled modules
const DIST_PATH = path.join(__dirname, '..', 'dist');
const truthStoreModule = require(path.join(DIST_PATH, 'state', 'truth-store.js'));
const onboardingModule = require(path.join(DIST_PATH, 'tools', 'onboarding.js'));
const gatesModule = require(path.join(DIST_PATH, 'tools', 'gates.js'));
const proofModule = require(path.join(DIST_PATH, 'tools', 'proof-artifacts.js'));

const { getStore, closeStore, closeAllStores } = truthStoreModule;
const {
  startOnboarding,
  answerOnboardingQuestion,
  getOnboarding,
  getTeachingLevel,
  logProgressUpdate
} = onboardingModule;

const {
  approveGate,
  getGates,
  getGateReadiness,
  getPreDeploymentStatus
} = gatesModule;

const {
  submitProofArtifact,
  getGateProofStatus,
  verifyProofIntegrity,
  getProofArtifacts,
  generateProofReport
} = proofModule;

// Test project path
const TEST_BASE_PATH = path.join('/tmp', 'full-system-test-' + Date.now());
const PROJECT_ID = 'full-system-test';

function setupRealProject(name) {
  const projectPath = path.join(TEST_BASE_PATH, name);

  // Create full directory structure
  const dirs = [
    '.truth/proofs/G3',
    '.truth/proofs/G5',
    '.truth/proofs/G6',
    '.truth/proofs/G7',
    '.truth/proofs/G8',
    '.truth/proofs/G9',
    'docs',
    'specs',
    'prisma',
    'src',
    'src/components',
    'src/api',
    'designs/final',
    'test',
    'coverage'
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  });

  return projectPath;
}

function cleanupAll() {
  try {
    fs.rmSync(TEST_BASE_PATH, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
  closeAllStores();
}

// ============================================================
// FULL SYSTEM TEST
// ============================================================

log('FULL SYSTEM TEST: Real Files, Real Proofs, Real Validation');

// Test 1: Create Real Project with Source Files
log('TEST 1: Create Real Project Structure with Source Files');

const projectPath = setupRealProject('real-project');

test('Create docs/PRD.md with real content', () => {
  const prdContent = `# Product Requirements Document

## Project: Task Management Application

### Overview
A modern task management application that helps users organize their work efficiently.

### User Stories

#### US-001: Task Creation
As a user, I want to create tasks so that I can track my work.

**Acceptance Criteria:**
- User can enter task title (required)
- User can enter task description (optional)
- User can set due date (optional)
- Task is saved to database
- User sees confirmation

#### US-002: Task Completion
As a user, I want to mark tasks as complete so that I can track my progress.

**Acceptance Criteria:**
- User can click checkbox to mark complete
- Completed tasks show visual indicator
- Completion timestamp is recorded

### Non-Functional Requirements
- Response time < 200ms for all operations
- Support 1000 concurrent users
- 99.9% uptime SLA
`;

  fs.writeFileSync(path.join(projectPath, 'docs', 'PRD.md'), prdContent);
  assert(fs.existsSync(path.join(projectPath, 'docs', 'PRD.md')), 'PRD.md should exist');
});

test('Create docs/ARCHITECTURE.md with real content', () => {
  const archContent = `# Architecture Document

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL

### Infrastructure
- **Hosting**: Vercel (frontend), Railway (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry

## Component Architecture

Frontend -> API Client -> Backend -> Database
`;

  fs.writeFileSync(path.join(projectPath, 'docs', 'ARCHITECTURE.md'), archContent);
  assert(fs.existsSync(path.join(projectPath, 'docs', 'ARCHITECTURE.md')), 'ARCHITECTURE.md should exist');
});

test('Create specs/openapi.yaml with real API spec', () => {
  const openapiContent = `openapi: 3.0.3
info:
  title: Task Management API
  version: 1.0.0
  description: RESTful API for task management application

paths:
  /tasks:
    get:
      summary: List all tasks
      responses:
        '200':
          description: List of tasks
    post:
      summary: Create a new task
      responses:
        '201':
          description: Task created

  /tasks/{taskId}:
    get:
      summary: Get task by ID
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Task details
        '404':
          description: Task not found
`;

  fs.writeFileSync(path.join(projectPath, 'specs', 'openapi.yaml'), openapiContent);
  assert(fs.existsSync(path.join(projectPath, 'specs', 'openapi.yaml')), 'openapi.yaml should exist');
});

test('Create prisma/schema.prisma with real schema', () => {
  const prismaContent = `// Prisma Schema for Task Management App

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  tasks     Task[]
}

model Task {
  id          String    @id @default(uuid())
  title       String
  description String?
  status      String    @default("PENDING")
  userId      String
  user        User      @relation(fields: [userId], references: [id])
}
`;

  fs.writeFileSync(path.join(projectPath, 'prisma', 'schema.prisma'), prismaContent);
  assert(fs.existsSync(path.join(projectPath, 'prisma', 'schema.prisma')), 'schema.prisma should exist');
});

test('Create src/index.ts with real code', () => {
  const indexContent = `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export { app };
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'index.ts'), indexContent);
  assert(fs.existsSync(path.join(projectPath, 'src', 'index.ts')), 'index.ts should exist');
});

// Test 2: Complete Onboarding Flow
log('TEST 2: Complete Onboarding Flow');

test('Start onboarding and answer all questions', () => {
  startOnboarding({ project_path: projectPath });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q1',
    answer: 'A task management app for personal productivity'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q2',
    answer: 'Starting from scratch, no existing code'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q3',
    answer: 'I am an experienced developer, familiar with React and Node.js'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q4',
    answer: 'Deployed web app with authentication and database'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q5',
    answer: 'Use TypeScript, follow REST best practices, PostgreSQL database'
  });

  const onboarding = getOnboarding({ project_path: projectPath });
  assert(onboarding.completed === true, 'Onboarding should be complete');
});

test('Teaching level should be expert', () => {
  const level = getTeachingLevel({ project_path: projectPath });
  assert(level.level === 'expert', `Expected expert, got ${level.level}`);
});

// Test 3: Approve G1 (no proofs required)
log('TEST 3: Approve G1 (No Proofs Required)');

test('Approve G1 - Scope Definition', () => {
  const result = approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G1 should approve without proofs. Status: ${result.gate.status}`);

  const { gates } = getGates({ project_path: projectPath });
  assert(gates.G1.status === 'approved', 'G1 status should be approved');
});

// Test 3b: G2 Blocking Without PRD Review Proof
log('TEST 3b: G2 Blocking Without PRD Review Proof');

test('G2 should block without prd_review proof', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G2' });
  assert(proofStatus.missing_proofs.includes('prd_review'), 'Should be missing prd_review');
  assert(proofStatus.can_approve === false, 'Should not be able to proceed');

  try {
    approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user' });
    throw new Error('Should have thrown gate blocked error');
  } catch (err) {
    assert(err.message.includes('GATE BLOCKED'), `Expected GATE BLOCKED error, got: ${err.message}`);
    assert(err.message.includes('prd_review'), 'Error should mention prd_review');
  }
});

// Test 3c: Submit PRD Review and Approve G2
log('TEST 3c: Submit PRD Review and Approve G2');

test('Submit prd_review proof and approve G2', () => {
  // Create PRD review proof - user confirmation of reviewed sections
  const prdReview = {
    timestamp: new Date().toISOString(),
    prd_path: 'docs/PRD.md',
    reviewer: 'user',
    sections_reviewed: [
      'Overview',
      'User Stories',
      'Non-Functional Requirements'
    ],
    user_confirmation: 'I have reviewed the PRD and approve the scope',
    changes_requested: [],
    pass_fail: 'PASS'
  };

  const reviewContent = JSON.stringify(prdReview, null, 2);
  const reviewPath = path.join(projectPath, '.truth', 'proofs', 'G2', 'prd-review.json');
  fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
  fs.writeFileSync(reviewPath, reviewContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G2',
    proof_type: 'prd_review',
    file_path: reviewPath,
    content_summary: 'User reviewed 3 sections, approved scope',
    pass_fail: 'pass',
    created_by: 'user'
  });

  const result = approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G2 should approve with proof. Status: ${result.gate.status}`);

  const { gates } = getGates({ project_path: projectPath });
  assert(gates.G2.status === 'approved', 'G2 status should be approved');
});

// Test 4: G3 Blocking Without Proofs
log('TEST 4: G3 Blocking Without Proofs');

test('G3 should block without spec_validation proof', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G3' });
  assert(proofStatus.missing_proofs.includes('spec_validation'), 'Should be missing spec_validation');
  assert(proofStatus.can_approve === false, 'Should not be able to proceed');

  try {
    approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user' });
    throw new Error('Should have thrown gate blocked error');
  } catch (err) {
    assert(err.message.includes('GATE BLOCKED'), `Expected GATE BLOCKED error, got: ${err.message}`);
    assert(err.message.includes('spec_validation'), 'Error should mention spec_validation');
  }
});

// Test 5: Submit Proof Artifact and Approve G3
log('TEST 5: Submit Proof Artifact and Approve G3');

test('Create and submit spec_validation proof artifact', () => {
  // Create real validation output
  const validationOutput = {
    timestamp: new Date().toISOString(),
    validator: 'spec-validator-v1.0',
    results: {
      openapi: { valid: true, errors: [], warnings: [] },
      prisma: { valid: true, errors: [], warnings: [] },
      architecture: { valid: true }
    },
    summary: 'All specifications valid',
    pass_fail: 'PASS'
  };

  const validationContent = JSON.stringify(validationOutput, null, 2);
  const validationPath = path.join(projectPath, '.truth', 'proofs', 'G3', 'spec-validation.json');
  fs.writeFileSync(validationPath, validationContent);

  const result = submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G3',
    proof_type: 'spec_validation',
    file_path: validationPath,
    content_summary: 'All specifications valid (openapi, prisma, architecture)',
    pass_fail: 'pass',
    created_by: 'test'
  });

  assert(result.artifact_id !== undefined, 'Proof submission should return artifact_id');
});

test('G3 should now be approvable', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G3' });
  assert(proofStatus.missing_proofs.length === 0, `No proofs should be missing, got: ${proofStatus.missing_proofs.join(', ')}`);
  assert(proofStatus.can_approve === true, 'Should be able to proceed');

  const result = approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G3 should approve with proofs. Status: ${result.gate.status}`);
});

// Test 6: Approve G4 (no proofs required for design)
log('TEST 6: Approve G4 (Design Gate)');

test('Create design files and approve G4', () => {
  fs.writeFileSync(
    path.join(projectPath, 'designs', 'final', 'mockup.html'),
    '<html><body><h1>Task Manager</h1><div class="task-list"></div></body></html>'
  );

  const result = approveGate({ project_path: projectPath, gate: 'G4', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G4 should approve. Status: ${result.gate.status}`);
});

// Test 7: G5 with Build, Lint, and Test Proofs (all 3 required)
log('TEST 7: G5 with Build, Lint, and Test Proofs');

test('Submit build_output proof for G5', () => {
  const buildOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm run build',
    exitCode: 0,
    duration_ms: 4523,
    output: 'Build successful. 142 modules transformed.',
    pass_fail: 'PASS'
  };

  const buildContent = JSON.stringify(buildOutput, null, 2);
  const buildPath = path.join(projectPath, '.truth', 'proofs', 'G5', 'build-output.json');
  fs.writeFileSync(buildPath, buildContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G5',
    proof_type: 'build_output',
    file_path: buildPath,
    content_summary: 'Build successful in 4.5s',
    pass_fail: 'pass'
  });
});

test('Submit lint_output proof for G5', () => {
  const lintOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm run lint',
    exitCode: 0,
    results: { files_checked: 23, errors: 0, warnings: 2 },
    pass_fail: 'PASS'
  };

  const lintContent = JSON.stringify(lintOutput, null, 2);
  const lintPath = path.join(projectPath, '.truth', 'proofs', 'G5', 'lint-output.json');
  fs.writeFileSync(lintPath, lintContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G5',
    proof_type: 'lint_output',
    file_path: lintPath,
    content_summary: '0 errors, 2 warnings in 23 files',
    pass_fail: 'pass'
  });
});

test('Submit test_output proof for G5', () => {
  const testOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm test',
    framework: 'vitest',
    results: { total: 47, passed: 47, failed: 0 },
    pass_fail: 'PASS'
  };

  const testContent = JSON.stringify(testOutput, null, 2);
  const testPath = path.join(projectPath, '.truth', 'proofs', 'G5', 'test-output.json');
  fs.writeFileSync(testPath, testContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G5',
    proof_type: 'test_output',
    file_path: testPath,
    content_summary: '47/47 tests passed',
    pass_fail: 'pass'
  });
});

test('Approve G5 with all proofs', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G5' });
  assert(proofStatus.can_approve === true, `G5 should be ready. Missing: ${proofStatus.missing_proofs.join(', ')}`);

  const result = approveGate({ project_path: projectPath, gate: 'G5', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G5 should approve. Status: ${result.gate.status}`);
});

// Test 8: G6 with Test, Coverage, Accessibility, and Lighthouse Proofs
log('TEST 8: G6 with Test, Coverage, Accessibility, and Lighthouse Proofs');

test('Submit test_output proof for G6', () => {
  const testOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm test -- --coverage',
    framework: 'vitest',
    results: { total: 47, passed: 47, failed: 0 },
    pass_fail: 'PASS'
  };

  const testContent = JSON.stringify(testOutput, null, 2);
  const testPath = path.join(projectPath, '.truth', 'proofs', 'G6', 'test-output.json');
  fs.writeFileSync(testPath, testContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G6',
    proof_type: 'test_output',
    file_path: testPath,
    content_summary: '47/47 tests passed',
    pass_fail: 'pass'
  });
});

test('Submit coverage_report proof for G6', () => {
  const coverageReport = {
    timestamp: new Date().toISOString(),
    total: {
      lines: { total: 1250, covered: 1087, pct: 87.0 },
      branches: { total: 320, covered: 262, pct: 81.9 }
    },
    threshold_met: true,
    pass_fail: 'PASS'
  };

  const coverageContent = JSON.stringify(coverageReport, null, 2);
  const coveragePath = path.join(projectPath, '.truth', 'proofs', 'G6', 'coverage-report.json');
  fs.writeFileSync(coveragePath, coverageContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G6',
    proof_type: 'coverage_report',
    file_path: coveragePath,
    content_summary: '87% line coverage, 82% branch coverage',
    pass_fail: 'pass'
  });
});

test('Submit accessibility_scan proof for G6', () => {
  const a11yReport = {
    timestamp: new Date().toISOString(),
    tool: 'axe-core',
    violations: 0,
    passes: 45,
    incomplete: 2,
    pass_fail: 'PASS'
  };

  const a11yContent = JSON.stringify(a11yReport, null, 2);
  const a11yPath = path.join(projectPath, '.truth', 'proofs', 'G6', 'accessibility-scan.json');
  fs.writeFileSync(a11yPath, a11yContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G6',
    proof_type: 'accessibility_scan',
    file_path: a11yPath,
    content_summary: '0 violations, 45 passes, WCAG 2.1 AA compliant',
    pass_fail: 'pass'
  });
});

test('Submit lighthouse_report proof for G6', () => {
  const lighthouseReport = {
    timestamp: new Date().toISOString(),
    scores: {
      performance: 92,
      accessibility: 98,
      best_practices: 95,
      seo: 100
    },
    pass_fail: 'PASS'
  };

  const lighthouseContent = JSON.stringify(lighthouseReport, null, 2);
  const lighthousePath = path.join(projectPath, '.truth', 'proofs', 'G6', 'lighthouse-report.json');
  fs.writeFileSync(lighthousePath, lighthouseContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G6',
    proof_type: 'lighthouse_report',
    file_path: lighthousePath,
    content_summary: 'Lighthouse: Performance 92, A11y 98, BP 95, SEO 100',
    pass_fail: 'pass'
  });
});

test('Approve G6 with all proofs', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G6' });
  assert(proofStatus.can_approve === true, `G6 should be ready. Missing: ${proofStatus.missing_proofs.join(', ')}`);

  const result = approveGate({ project_path: projectPath, gate: 'G6', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G6 should approve. Status: ${result.gate.status}`);
});

// Test 9: G7 with Security Scan and Lint Proofs
log('TEST 9: G7 with Security Scan and Lint Proofs');

test('Submit security_scan proof for G7', () => {
  const securityScan = {
    timestamp: new Date().toISOString(),
    tool: 'npm audit',
    vulnerabilities: { critical: 0, high: 0, moderate: 2, low: 1 },
    notes: 'Moderate vulnerabilities reviewed and accepted',
    pass_fail: 'PASS'
  };

  const securityContent = JSON.stringify(securityScan, null, 2);
  const securityPath = path.join(projectPath, '.truth', 'proofs', 'G7', 'security-scan.json');
  fs.writeFileSync(securityPath, securityContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G7',
    proof_type: 'security_scan',
    file_path: securityPath,
    content_summary: '0 critical/high, 2 moderate (reviewed), 1 low',
    pass_fail: 'pass'
  });
});

test('Submit lint_output proof for G7', () => {
  const lintOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm run lint:security',
    exitCode: 0,
    results: { security_issues: 0, code_smells: 3 },
    pass_fail: 'PASS'
  };

  const lintContent = JSON.stringify(lintOutput, null, 2);
  const lintPath = path.join(projectPath, '.truth', 'proofs', 'G7', 'lint-output.json');
  fs.writeFileSync(lintPath, lintContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G7',
    proof_type: 'lint_output',
    file_path: lintPath,
    content_summary: '0 security issues, 3 code smells',
    pass_fail: 'pass'
  });
});

test('Approve G7 with proofs', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G7' });
  assert(proofStatus.can_approve === true, `G7 should be ready. Missing: ${proofStatus.missing_proofs.join(', ')}`);

  const result = approveGate({ project_path: projectPath, gate: 'G7', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G7 should approve. Status: ${result.gate.status}`);
});

// Test 10: G8 with Build and Deployment Proofs
log('TEST 10: G8 with Build and Deployment Proofs');

test('Submit build_output proof for G8', () => {
  const buildOutput = {
    timestamp: new Date().toISOString(),
    command: 'npm run build:prod',
    exitCode: 0,
    artifacts: ['dist/index.js', 'dist/index.css'],
    pass_fail: 'PASS'
  };

  const buildContent = JSON.stringify(buildOutput, null, 2);
  const buildPath = path.join(projectPath, '.truth', 'proofs', 'G8', 'build-output.json');
  fs.writeFileSync(buildPath, buildContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G8',
    proof_type: 'build_output',
    file_path: buildPath,
    content_summary: 'Production build successful',
    pass_fail: 'pass'
  });
});

test('Submit deployment_log proof for G8', () => {
  const deployLog = {
    timestamp: new Date().toISOString(),
    environment: 'staging',
    provider: 'vercel',
    deployment_id: 'dpl_staging_abc123',
    url: 'https://task-app-staging.vercel.app',
    status: 'success',
    pass_fail: 'PASS'
  };

  const deployContent = JSON.stringify(deployLog, null, 2);
  const deployPath = path.join(projectPath, '.truth', 'proofs', 'G8', 'deployment-log.json');
  fs.writeFileSync(deployPath, deployContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G8',
    proof_type: 'deployment_log',
    file_path: deployPath,
    content_summary: 'Deployed to staging: https://task-app-staging.vercel.app',
    pass_fail: 'pass'
  });
});

test('Approve G8 with proofs', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G8' });
  assert(proofStatus.can_approve === true, `G8 should be ready. Missing: ${proofStatus.missing_proofs.join(', ')}`);

  const result = approveGate({ project_path: projectPath, gate: 'G8', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G8 should approve. Status: ${result.gate.status}`);
});

// Test 11: G9 with Deployment and Smoke Test Proofs
log('TEST 11: G9 with Deployment and Smoke Test Proofs');

test('Submit deployment_log proof for G9', () => {
  const deployLog = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    provider: 'vercel',
    deployment_id: 'dpl_prod_xyz789',
    url: 'https://task-app.vercel.app',
    status: 'success',
    pass_fail: 'PASS'
  };

  const deployContent = JSON.stringify(deployLog, null, 2);
  const deployPath = path.join(projectPath, '.truth', 'proofs', 'G9', 'deployment-log.json');
  fs.writeFileSync(deployPath, deployContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G9',
    proof_type: 'deployment_log',
    file_path: deployPath,
    content_summary: 'Deployed to production: https://task-app.vercel.app',
    pass_fail: 'pass'
  });
});

test('Submit smoke_test proof for G9', () => {
  const smokeTest = {
    timestamp: new Date().toISOString(),
    tests: [
      { name: 'Homepage loads', passed: true },
      { name: 'API health check', passed: true },
      { name: 'Create task flow', passed: true },
      { name: 'Complete task flow', passed: true }
    ],
    total: 4,
    passed: 4,
    failed: 0,
    pass_fail: 'PASS'
  };

  const smokeContent = JSON.stringify(smokeTest, null, 2);
  const smokePath = path.join(projectPath, '.truth', 'proofs', 'G9', 'smoke-test.json');
  fs.writeFileSync(smokePath, smokeContent);

  submitProofArtifact({
    project_path: projectPath,
    project_id: PROJECT_ID,
    gate: 'G9',
    proof_type: 'smoke_test',
    file_path: smokePath,
    content_summary: '4/4 smoke tests passed on production',
    pass_fail: 'pass'
  });
});

test('Approve G9 with proofs', () => {
  const proofStatus = getGateProofStatus({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G9' });
  assert(proofStatus.can_approve === true, `G9 should be ready. Missing: ${proofStatus.missing_proofs.join(', ')}`);

  const result = approveGate({ project_path: projectPath, gate: 'G9', approved_by: 'user' });
  assert(result.gate.status === 'approved', `G9 should approve. Status: ${result.gate.status}`);
});

// Test 12: Verify Proof Integrity
log('TEST 12: Verify Proof Integrity');

test('All proof files should verify with stored hashes', () => {
  const allProofs = getProofArtifacts({ project_path: projectPath, project_id: PROJECT_ID });

  assert(allProofs.length >= 13, `Should have at least 13 proofs, got ${allProofs.length}`);

  // Verify each proof
  for (const proof of allProofs) {
    const verification = verifyProofIntegrity({
      project_path: projectPath,
      artifact_id: proof.id
    });
    assert(verification.valid === true, `${proof.gate}/${proof.proof_type} should verify. Reason: stored=${verification.stored_hash}, current=${verification.current_hash}`);
  }
});

test('Tampering with proof file should fail verification', () => {
  // Get G3 spec validation proof
  const g3Proofs = getProofArtifacts({ project_path: projectPath, project_id: PROJECT_ID, gate: 'G3' });
  const specProof = g3Proofs.find(p => p.proof_type === 'spec_validation');
  assert(specProof, 'Should have spec_validation proof');

  // Tamper with the file
  const original = fs.readFileSync(specProof.file_path, 'utf-8');
  fs.writeFileSync(specProof.file_path, original + '\n// tampered');

  const verification = verifyProofIntegrity({
    project_path: projectPath,
    artifact_id: specProof.id
  });

  assert(verification.valid === false, 'Tampered file should fail verification');
  assert(verification.stored_hash !== verification.current_hash, 'Hashes should not match');

  // Restore original
  fs.writeFileSync(specProof.file_path, original);
});

// Test 13: Pre-Deployment Status
log('TEST 13: Pre-Deployment Status Check');

test('Pre-deployment gates G1-G7 should be approved', () => {
  const status = getPreDeploymentStatus({ project_path: projectPath });

  // Pre-deployment status only checks G1-G7 (7 gates)
  assert(status.gates_completed.length >= 7, `Should have 7+ pre-deployment gates completed, got ${status.gates_completed.length}`);
  assert(status.gates_pending.length === 0, `Should have no pending gates, got: ${status.gates_pending.join(', ')}`);

  // Note: ready_for_deployment also checks quality metrics which require actual validation runs
  // In this test we only verify gates are approved and proofs exist
});

test('All gates G1-G9 should be approved', () => {
  const { summary } = getGates({ project_path: projectPath });

  assert(summary.approved.length >= 9, `Should have 9+ gates approved, got ${summary.approved.length}`);
  assert(summary.approved.includes('G1'), 'G1 should be approved');
  assert(summary.approved.includes('G9'), 'G9 should be approved');
});

// Test 14: Generate Proof Report
log('TEST 14: Generate Proof Report');

test('Generate comprehensive proof report', () => {
  const reportPath = path.join(projectPath, 'PROOF_REPORT.md');
  const { report, summary } = generateProofReport({
    project_path: projectPath,
    project_id: PROJECT_ID,
    output_path: reportPath
  });

  assert(fs.existsSync(reportPath), 'Report file should be created');
  assert(summary.total_proofs >= 13, `Should have 13+ proofs, got ${summary.total_proofs}`);
  assert(summary.passed >= 12, `Should have 12+ passed, got ${summary.passed}`);
  assert(summary.failed === 0, `Should have 0 failed, got ${summary.failed}`);
  assert(report.includes('G3'), 'Report should include G3');
  assert(report.includes('G9'), 'Report should include G9');
});

// Test 15: Force Approval Audit Trail
log('TEST 15: Force Approval Creates Audit Trail');

test('Force approval without proofs creates audit entry', () => {
  // Create a new project for this test
  const auditProjectPath = setupRealProject('audit-test');

  // Quick setup
  startOnboarding({ project_path: auditProjectPath });
  answerOnboardingQuestion({ project_path: auditProjectPath, question_id: 'Q1', answer: 'Test app' });
  answerOnboardingQuestion({ project_path: auditProjectPath, question_id: 'Q2', answer: 'Scratch' });
  answerOnboardingQuestion({ project_path: auditProjectPath, question_id: 'Q3', answer: 'Expert developer' });
  answerOnboardingQuestion({ project_path: auditProjectPath, question_id: 'Q4', answer: 'Working app' });
  answerOnboardingQuestion({ project_path: auditProjectPath, question_id: 'Q5', answer: 'None' });

  // Approve G1 (no proof needed), force G2 (would need prd_review but we're testing force)
  approveGate({ project_path: auditProjectPath, gate: 'G1', approved_by: 'user' });
  approveGate({ project_path: auditProjectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });

  // Create required files
  fs.writeFileSync(path.join(auditProjectPath, 'docs', 'ARCHITECTURE.md'), '# Arch');
  fs.writeFileSync(path.join(auditProjectPath, 'specs', 'openapi.yaml'), 'openapi: 3.0.0');
  fs.writeFileSync(path.join(auditProjectPath, 'prisma', 'schema.prisma'), 'model Test { id Int @id }');

  // Force approve G3 without proofs
  const result = approveGate({
    project_path: auditProjectPath,
    gate: 'G3',
    approved_by: 'admin',
    force_without_proofs: true
  });

  // Result should have approved gate
  assert(result.gate.status === 'approved', `Force approval should succeed. Status: ${result.gate.status}`);

  // Check warnings were generated
  assert(result.warnings && result.warnings.length > 0, 'Should have warnings about forced approval');
  assert(result.warnings[0].includes('WITHOUT required proofs'), 'Warning should mention missing proofs');

  closeStore(auditProjectPath);
});

// Cleanup and Summary
log('TEST SUMMARY');

cleanupAll();

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

console.log(`\n${'─'.repeat(70)}`);
console.log(`   Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`   Duration: ${duration}s`);
console.log(`${'─'.repeat(70)}\n`);

if (failed > 0) {
  console.error('❌ FULL SYSTEM TEST FAILED\n');
  process.exit(1);
} else {
  console.log('✅ FULL SYSTEM TEST PASSED\n');
  console.log('All proof artifacts, gate blocking, hash verification, and audit trails working correctly.');
  process.exit(0);
}
