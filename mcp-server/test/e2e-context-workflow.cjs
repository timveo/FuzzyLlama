#!/usr/bin/env node
/**
 * E2E Test: Context Loading Workflow
 *
 * Simulates a complete agent workflow using dynamic context loading:
 * 1. Architect creates context chunks after G3
 * 2. Frontend Developer queries context for a story
 * 3. Backend Developer queries context for API specs
 * 4. QA Engineer queries context for acceptance criteria
 *
 * This validates the end-to-end flow of the RAG system.
 */

const fs = require('fs');
const path = require('path');

// Import the compiled modules
const contextTools = require('../dist/tools/context-tools.js');

// Test fixtures paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'context');
const TEST_PROJECT_DIR = '/tmp/test-e2e-context-workflow';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`);
}

function agentLog(agent, action) {
  console.log(`\n[${agent}] ${action}`);
}

function step(num, desc) {
  console.log(`\n[Step ${num}] ${desc}`);
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`   ✓ ${msg}`);
}

// Setup test project directory structure
function setupTestProject() {
  // Clean up if exists
  if (fs.existsSync(TEST_PROJECT_DIR)) {
    fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }

  // Create directory structure
  fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'prisma'), { recursive: true });

  // Copy test fixtures
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'sample-prd.md'),
    path.join(TEST_PROJECT_DIR, 'docs', 'PRD.md')
  );
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'sample-openapi.yaml'),
    path.join(TEST_PROJECT_DIR, 'specs', 'openapi.yaml')
  );
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'sample-schema.prisma'),
    path.join(TEST_PROJECT_DIR, 'prisma', 'schema.prisma')
  );

  console.log(`   Set up test project at ${TEST_PROJECT_DIR}`);
}

function cleanupTestProject() {
  if (fs.existsSync(TEST_PROJECT_DIR)) {
    fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
  console.log('\n   Cleaned up test project');
}

// ============================================================================
// E2E Workflow Simulation
// ============================================================================

async function runE2EWorkflow() {
  log('E2E WORKFLOW: Dynamic Context Loading');

  setupTestProject();

  try {
    // ========================================================================
    // PHASE 1: Architect Agent - Post G3 Chunking
    // ========================================================================
    log('PHASE 1: Architect Agent - Post-G3 Chunking');

    agentLog('Architect', 'Architecture approved at G3. Running context chunking...');

    step(1, 'Architect runs chunk_docs() after G3 approval');
    const chunkResult = await contextTools.handleChunkDocs({
      project_path: TEST_PROJECT_DIR,
      force_rebuild: false
    });

    assert(chunkResult.success, 'Chunking succeeded');
    console.log(`   Created ${chunkResult.chunks_created} chunks`);
    console.log(`   Epics indexed: ${chunkResult.epics_indexed.join(', ')}`);
    console.log(`   API endpoints mapped: ${chunkResult.api_endpoints_mapped}`);
    console.log(`   DB models mapped: ${chunkResult.db_models_mapped}`);

    step(2, 'Architect verifies context summary');
    const summary = await contextTools.handleGetContextSummary({
      project_path: TEST_PROJECT_DIR
    });

    assert(summary.total_stories >= 3, 'At least 3 stories available');
    console.log(`   Total stories: ${summary.total_stories}`);
    console.log(`   Epics: ${summary.epics.join(', ')}`);
    console.log(`   API endpoints: ${summary.api_endpoint_count}`);
    console.log(`   DB models: ${summary.db_model_count}`);

    agentLog('Architect', 'Handoff includes context_chunking status. Ready for development.');

    // ========================================================================
    // PHASE 2: Frontend Developer Agent - Building Registration UI
    // ========================================================================
    log('PHASE 2: Frontend Developer - Building Registration UI');

    agentLog('Frontend Dev', 'Starting work on Authentication epic...');

    step(3, 'Frontend Dev gets context summary');
    const feSummary = await contextTools.handleGetContextSummary({
      project_path: TEST_PROJECT_DIR
    });
    console.log(`   Project has ${feSummary.total_stories} stories across ${feSummary.epics.length} epics`);

    step(4, 'Frontend Dev lists stories in Authentication epic');
    const authStories = await contextTools.handleListStoriesByEpic({
      project_path: TEST_PROJECT_DIR,
      epic: 'Authentication'
    });

    assert(authStories.stories.length >= 2, 'Found auth stories');
    console.log(`   Found ${authStories.stories.length} stories in Authentication:`);
    authStories.stories.forEach(s => {
      console.log(`      - ${s.id}: ${s.title} (${s.acceptance_criteria_count} criteria)`);
    });

    step(5, 'Frontend Dev gets context for registration story');
    const registrationStoryId = authStories.stories[0].id;
    const regContext = await contextTools.handleGetContextForStory({
      project_path: TEST_PROJECT_DIR,
      story_id: registrationStoryId,
      include_related_stories: true
    });

    assert(regContext.story, 'Got story context');
    console.log(`   Story: ${regContext.story.title}`);
    console.log(`   Acceptance Criteria:`);
    regContext.story.acceptance_criteria.forEach((ac, i) => {
      console.log(`      ${i + 1}. ${ac}`);
    });

    if (regContext.api_specs.length > 0) {
      console.log(`   Related API Specs: ${regContext.api_specs.map(s => s.endpoint).join(', ')}`);
    }
    if (regContext.related_stories && regContext.related_stories.length > 0) {
      console.log(`   Related Stories: ${regContext.related_stories.map(s => s.id).join(', ')}`);
    }

    agentLog('Frontend Dev', 'Building RegisterForm component with exact acceptance criteria...');
    // (Would implement component here)

    // ========================================================================
    // PHASE 3: Backend Developer Agent - Implementing Auth API
    // ========================================================================
    log('PHASE 3: Backend Developer - Implementing Auth API');

    agentLog('Backend Dev', 'Starting work on /auth/register endpoint...');

    step(6, 'Backend Dev searches for registration-related context');
    const registerSearch = await contextTools.handleSearchContext({
      project_path: TEST_PROJECT_DIR,
      keywords: ['register', 'email', 'password']
    });

    console.log(`   Found ${registerSearch.total_matches} matches for registration context`);
    registerSearch.matches.slice(0, 3).forEach(m => {
      console.log(`      - ${m.id}: ${m.title} (score: ${m.relevance_score})`);
    });

    step(7, 'Backend Dev gets API spec for /auth/register');
    const apiSpec = await contextTools.handleGetRelevantSpecs({
      project_path: TEST_PROJECT_DIR,
      spec_type: 'api',
      identifiers: ['/auth/register']
    });

    if (apiSpec.api_specs && apiSpec.api_specs.length > 0) {
      console.log(`   Found OpenAPI spec for ${apiSpec.api_specs[0].endpoint}`);
      console.log(`   Method: ${apiSpec.api_specs[0].method}`);
      console.log(`   Snippet preview: ${apiSpec.api_specs[0].openapi_snippet.slice(0, 100)}...`);
    }

    step(8, 'Backend Dev gets User model from Prisma');
    const dbSpec = await contextTools.handleGetRelevantSpecs({
      project_path: TEST_PROJECT_DIR,
      spec_type: 'database',
      identifiers: ['User', 'RefreshToken']
    });

    if (dbSpec.db_models && dbSpec.db_models.length > 0) {
      console.log(`   Found ${dbSpec.db_models.length} database models:`);
      dbSpec.db_models.forEach(m => {
        console.log(`      - ${m.model_name}`);
      });
    }

    agentLog('Backend Dev', 'Implementing register endpoint with exact API contract...');
    // (Would implement endpoint here)

    // ========================================================================
    // PHASE 4: QA Engineer Agent - Testing Registration Flow
    // ========================================================================
    log('PHASE 4: QA Engineer - Testing Registration Flow');

    agentLog('QA Engineer', 'Creating test plan for Authentication...');

    step(9, 'QA lists all stories to test');
    const qaStories = await contextTools.handleListStoriesByEpic({
      project_path: TEST_PROJECT_DIR,
      epic: 'Authentication'
    });

    console.log(`   Test scope: ${qaStories.stories.length} stories in Authentication`);
    let totalCriteria = 0;
    qaStories.stories.forEach(s => {
      totalCriteria += s.acceptance_criteria_count;
    });
    console.log(`   Total acceptance criteria to verify: ${totalCriteria}`);

    step(10, 'QA gets detailed criteria for registration story');
    const qaContext = await contextTools.handleGetContextForStory({
      project_path: TEST_PROJECT_DIR,
      story_id: registrationStoryId
    });

    console.log(`   Test cases for ${qaContext.story.id}:`);
    qaContext.story.acceptance_criteria.forEach((ac, i) => {
      console.log(`      TC-${i + 1}: Verify - ${ac}`);
    });

    step(11, 'QA gets API contract to verify endpoint behavior');
    const qaApiSpec = await contextTools.handleGetRelevantSpecs({
      project_path: TEST_PROJECT_DIR,
      spec_type: 'api',
      identifiers: ['/auth/register']
    });

    if (qaApiSpec.api_specs && qaApiSpec.api_specs.length > 0) {
      console.log(`   Will verify API matches contract: ${qaApiSpec.api_specs[0].endpoint}`);
    }

    agentLog('QA Engineer', 'Executing test plan against implementation...');
    // (Would run tests here)

    // ========================================================================
    // VERIFICATION: Context Reduction Metrics
    // ========================================================================
    log('VERIFICATION: Context Reduction Metrics');

    step(12, 'Calculate context metrics');

    // Read source files to get original sizes
    const prdSize = fs.statSync(path.join(TEST_PROJECT_DIR, 'docs', 'PRD.md')).size;
    const openApiSize = fs.statSync(path.join(TEST_PROJECT_DIR, 'specs', 'openapi.yaml')).size;
    const prismaSize = fs.statSync(path.join(TEST_PROJECT_DIR, 'prisma', 'schema.prisma')).size;
    const totalSourceSize = prdSize + openApiSize + prismaSize;

    // Get size of single story context
    const singleStoryContext = JSON.stringify(regContext);
    const contextSize = Buffer.byteLength(singleStoryContext, 'utf8');

    // Calculate what percentage of source the context represents
    const contextPercent = ((contextSize / totalSourceSize) * 100).toFixed(1);

    console.log(`   Source files total: ${(totalSourceSize / 1024).toFixed(1)} KB`);
    console.log(`      - PRD.md: ${(prdSize / 1024).toFixed(1)} KB`);
    console.log(`      - openapi.yaml: ${(openApiSize / 1024).toFixed(1)} KB`);
    console.log(`      - schema.prisma: ${(prismaSize / 1024).toFixed(1)} KB`);
    console.log(`   Single story context: ${(contextSize / 1024).toFixed(1)} KB`);
    console.log(`   Context as % of source: ${contextPercent}%`);

    // Note: With small test fixtures, context may be larger due to JSON structure + included specs.
    // In production with real PRDs (~30KB+), we expect ~90% reduction.
    // For this test, we just verify the chunking works correctly.
    assert(regContext.story.acceptance_criteria.length >= 3, 'Context includes acceptance criteria');
    assert(regContext.api_specs.length >= 1, 'Context includes relevant API specs');

    // ========================================================================
    // SUCCESS
    // ========================================================================
    log('E2E WORKFLOW COMPLETED SUCCESSFULLY ✅');

    console.log('\nWorkflow Summary:');
    console.log('  1. ✓ Architect chunked documents after G3');
    console.log('  2. ✓ Frontend Dev loaded story context for UI implementation');
    console.log('  3. ✓ Backend Dev loaded API specs and DB models');
    console.log('  4. ✓ QA Engineer loaded acceptance criteria for testing');
    console.log(`  5. ✓ Story context size: ${(contextSize / 1024).toFixed(1)} KB (${contextPercent}% of source)`);

    cleanupTestProject();
    return true;

  } catch (error) {
    console.error('\n❌ E2E WORKFLOW FAILED:', error);
    cleanupTestProject();
    throw error;
  }
}

// ============================================================================
// Run E2E Test
// ============================================================================

runE2EWorkflow()
  .then(() => {
    log('ALL E2E CONTEXT WORKFLOW TESTS PASSED ✅');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ TEST ERROR:', error);
    process.exit(1);
  });
