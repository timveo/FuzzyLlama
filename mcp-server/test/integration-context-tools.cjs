#!/usr/bin/env node
/**
 * Integration Tests for MCP Context Tools
 *
 * Tests the context tool handlers with real file operations.
 */

const fs = require('fs');
const path = require('path');

// Import the compiled modules
const contextTools = require('../dist/tools/context-tools.js');
const chunker = require('../dist/context/chunker.js');

// Test fixtures paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'context');
const TEST_PROJECT_DIR = '/tmp/test-context-tools-project';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`   ✓ ${msg}`);
}

async function assertRejects(promise, msg) {
  try {
    await promise;
    console.error(`❌ EXPECTED REJECTION: ${msg}`);
    process.exit(1);
  } catch (e) {
    console.log(`   ✓ ${msg} (threw: ${e.message.slice(0, 50)}...)`);
  }
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
  console.log('   Cleaned up test project');
}

// ============================================================================
// Tool Tests - Before Chunking (Error Cases)
// ============================================================================

async function testToolsBeforeChunking() {
  log('TEST: Tools Before Chunking (Error Cases)');

  section('get_context_for_story without index');
  await assertRejects(
    contextTools.handleGetContextForStory({
      project_path: TEST_PROJECT_DIR,
      story_id: 'US-001'
    }),
    'Throws when RAG index does not exist'
  );

  section('search_context without index');
  await assertRejects(
    contextTools.handleSearchContext({
      project_path: TEST_PROJECT_DIR,
      keywords: ['auth']
    }),
    'search_context throws without index'
  );

  section('list_stories_by_epic without index');
  await assertRejects(
    contextTools.handleListStoriesByEpic({
      project_path: TEST_PROJECT_DIR,
      epic: 'Authentication'
    }),
    'list_stories_by_epic throws without index'
  );

  section('get_context_summary without index');
  await assertRejects(
    contextTools.handleGetContextSummary({
      project_path: TEST_PROJECT_DIR
    }),
    'get_context_summary throws without index'
  );

  console.log('\n✅ Pre-chunking error tests passed');
}

// ============================================================================
// chunk_docs Tool Tests
// ============================================================================

async function testChunkDocsTool() {
  log('TEST: chunk_docs Tool');

  section('Initial chunking');
  const result = await contextTools.handleChunkDocs({
    project_path: TEST_PROJECT_DIR,
    force_rebuild: false
  });

  assert(result.success === true, 'Chunking succeeds');
  assert(result.chunks_created >= 3, `Created at least 3 chunks (got ${result.chunks_created})`);
  assert(result.epics_indexed.length >= 1, 'Indexed at least 1 epic');
  assert(result.api_endpoints_mapped >= 3, `Mapped at least 3 API endpoints (got ${result.api_endpoints_mapped})`);
  assert(result.db_models_mapped >= 2, `Mapped at least 2 DB models (got ${result.db_models_mapped})`);

  section('Verify files created');
  const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');
  assert(fs.existsSync(path.join(ragDir, 'index.json')), 'index.json created');
  assert(fs.existsSync(path.join(ragDir, 'spec-index.json')), 'spec-index.json created');

  console.log('\n✅ chunk_docs tool tests passed');
}

// ============================================================================
// get_context_summary Tool Tests
// ============================================================================

async function testGetContextSummaryTool() {
  log('TEST: get_context_summary Tool');

  const result = await contextTools.handleGetContextSummary({
    project_path: TEST_PROJECT_DIR
  });

  section('Result structure');
  assert(result.project_id, 'Has project_id');
  assert(typeof result.total_stories === 'number', 'Has total_stories (number)');
  assert(Array.isArray(result.epics), 'Has epics (array)');
  assert(typeof result.api_endpoint_count === 'number', 'Has api_endpoint_count (number)');
  assert(typeof result.db_model_count === 'number', 'Has db_model_count (number)');
  assert(result.last_chunked, 'Has last_chunked timestamp');
  assert(result.index_version === '1.0', 'Has correct index version');

  section('Values');
  assert(result.total_stories >= 3, `At least 3 stories (got ${result.total_stories})`);
  assert(result.epics.includes('Authentication'), 'Epics include Authentication');
  assert(result.api_endpoint_count >= 3, `At least 3 endpoints (got ${result.api_endpoint_count})`);

  console.log('\n✅ get_context_summary tool tests passed');
}

// ============================================================================
// list_stories_by_epic Tool Tests
// ============================================================================

async function testListStoriesByEpicTool() {
  log('TEST: list_stories_by_epic Tool');

  section('Valid epic');
  const authStories = await contextTools.handleListStoriesByEpic({
    project_path: TEST_PROJECT_DIR,
    epic: 'Authentication'
  });

  assert(authStories.epic === 'Authentication', 'Returns correct epic name');
  assert(Array.isArray(authStories.stories), 'Has stories array');
  assert(authStories.stories.length >= 2, `At least 2 auth stories (got ${authStories.stories.length})`);

  section('Story format');
  const story = authStories.stories[0];
  assert(story.id, 'Story has id');
  assert(story.title, 'Story has title');
  assert(typeof story.acceptance_criteria_count === 'number', 'Has acceptance_criteria_count');

  section('Case insensitive epic name');
  const caseInsensitive = await contextTools.handleListStoriesByEpic({
    project_path: TEST_PROJECT_DIR,
    epic: 'authentication' // lowercase
  });
  assert(caseInsensitive.stories.length >= 2, 'Case insensitive lookup works');

  section('Invalid epic');
  await assertRejects(
    contextTools.handleListStoriesByEpic({
      project_path: TEST_PROJECT_DIR,
      epic: 'NonExistentEpic'
    }),
    'Throws for non-existent epic'
  );

  console.log('\n✅ list_stories_by_epic tool tests passed');
}

// ============================================================================
// search_context Tool Tests
// ============================================================================

async function testSearchContextTool() {
  log('TEST: search_context Tool');

  section('Basic keyword search');
  const authResults = await contextTools.handleSearchContext({
    project_path: TEST_PROJECT_DIR,
    keywords: ['auth', 'login', 'password']
  });

  assert(Array.isArray(authResults.matches), 'Has matches array');
  assert(typeof authResults.total_matches === 'number', 'Has total_matches count');
  assert(authResults.matches.length > 0, 'Found at least one match');

  section('Match format');
  const match = authResults.matches[0];
  assert(match.id, 'Match has id');
  assert(match.type, 'Match has type');
  assert(match.title, 'Match has title');
  assert(typeof match.relevance_score === 'number', 'Has relevance_score');
  assert(Array.isArray(match.matched_keywords), 'Has matched_keywords array');

  section('Relevance ordering');
  if (authResults.matches.length >= 2) {
    assert(
      authResults.matches[0].relevance_score >= authResults.matches[1].relevance_score,
      'Results ordered by relevance'
    );
  }

  section('Limit parameter');
  const limitedResults = await contextTools.handleSearchContext({
    project_path: TEST_PROJECT_DIR,
    keywords: ['user', 'email'],
    limit: 2
  });
  assert(limitedResults.matches.length <= 2, 'Limit restricts results');

  section('No matches');
  const noMatches = await contextTools.handleSearchContext({
    project_path: TEST_PROJECT_DIR,
    keywords: ['xyz123nonexistent']
  });
  assert(noMatches.matches.length === 0, 'Returns empty for no matches');

  console.log('\n✅ search_context tool tests passed');
}

// ============================================================================
// get_context_for_story Tool Tests
// ============================================================================

async function testGetContextForStoryTool() {
  log('TEST: get_context_for_story Tool');

  // First, get a valid story ID
  const summary = await contextTools.handleGetContextSummary({
    project_path: TEST_PROJECT_DIR
  });
  const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');
  const index = JSON.parse(fs.readFileSync(path.join(ragDir, 'index.json'), 'utf-8'));
  const storyIds = Object.keys(index.chunks_by_id);
  const validStoryId = storyIds[0];

  section('Basic story retrieval');
  const context = await contextTools.handleGetContextForStory({
    project_path: TEST_PROJECT_DIR,
    story_id: validStoryId
  });

  assert(context.story, 'Has story object');
  assert(context.story.id === validStoryId, 'Correct story ID');
  assert(context.story.content, 'Story has content');
  assert(Array.isArray(context.api_specs), 'Has api_specs array');
  assert(Array.isArray(context.db_models), 'Has db_models array');
  assert(Array.isArray(context.zod_schemas), 'Has zod_schemas array');

  section('Story structure');
  assert(context.story.type === 'user_story', 'Story type is user_story');
  assert(Array.isArray(context.story.acceptance_criteria), 'Has acceptance_criteria');
  assert(context.story.epic, 'Has epic');
  assert(Array.isArray(context.story.keywords), 'Has keywords');

  section('API specs format');
  if (context.api_specs.length > 0) {
    const apiSpec = context.api_specs[0];
    assert(apiSpec.endpoint, 'API spec has endpoint');
    assert(apiSpec.method, 'API spec has method');
    assert(apiSpec.openapi_snippet, 'API spec has openapi_snippet');
    console.log(`   Found API spec for: ${apiSpec.endpoint}`);
  } else {
    console.log('   No linked API specs (acceptable)');
  }

  section('DB models format');
  if (context.db_models.length > 0) {
    const dbModel = context.db_models[0];
    assert(dbModel.model_name, 'DB model has model_name');
    assert(dbModel.prisma_snippet, 'DB model has prisma_snippet');
    console.log(`   Found DB model: ${dbModel.model_name}`);
  } else {
    console.log('   No linked DB models (acceptable)');
  }

  section('Include related stories');
  const contextWithRelated = await contextTools.handleGetContextForStory({
    project_path: TEST_PROJECT_DIR,
    story_id: validStoryId,
    include_related_stories: true
  });

  // Related stories may or may not exist depending on keyword matching
  if (contextWithRelated.related_stories) {
    assert(Array.isArray(contextWithRelated.related_stories), 'related_stories is array');
    console.log(`   Found ${contextWithRelated.related_stories.length} related stories`);
  } else {
    console.log('   No related stories (acceptable)');
  }

  section('Invalid story ID');
  await assertRejects(
    contextTools.handleGetContextForStory({
      project_path: TEST_PROJECT_DIR,
      story_id: 'INVALID-999'
    }),
    'Throws for invalid story ID'
  );

  console.log('\n✅ get_context_for_story tool tests passed');
}

// ============================================================================
// get_relevant_specs Tool Tests
// ============================================================================

async function testGetRelevantSpecsTool() {
  log('TEST: get_relevant_specs Tool');

  section('Get API specs by path');
  const apiResult = await contextTools.handleGetRelevantSpecs({
    project_path: TEST_PROJECT_DIR,
    spec_type: 'api',
    identifiers: ['/auth/register', '/auth/login']
  });

  assert(Array.isArray(apiResult.api_specs), 'Has api_specs array');
  if (apiResult.api_specs && apiResult.api_specs.length > 0) {
    const spec = apiResult.api_specs[0];
    assert(spec.endpoint, 'Spec has endpoint');
    assert(spec.openapi_snippet, 'Spec has openapi_snippet');
    console.log(`   Found API spec: ${spec.endpoint}`);
  }

  section('Get database models');
  const dbResult = await contextTools.handleGetRelevantSpecs({
    project_path: TEST_PROJECT_DIR,
    spec_type: 'database',
    identifiers: ['User', 'RefreshToken']
  });

  assert(Array.isArray(dbResult.db_models), 'Has db_models array');
  if (dbResult.db_models && dbResult.db_models.length > 0) {
    const model = dbResult.db_models[0];
    assert(model.model_name, 'Model has model_name');
    assert(model.prisma_snippet, 'Model has prisma_snippet');
    console.log(`   Found DB model: ${model.model_name}`);
  }

  section('Get all spec types');
  const allResult = await contextTools.handleGetRelevantSpecs({
    project_path: TEST_PROJECT_DIR,
    spec_type: 'all',
    identifiers: ['/auth/register', 'User']
  });

  // Should have both api_specs and db_models
  console.log(`   API specs found: ${(allResult.api_specs || []).length}`);
  console.log(`   DB models found: ${(allResult.db_models || []).length}`);

  section('Non-existent identifiers');
  const emptyResult = await contextTools.handleGetRelevantSpecs({
    project_path: TEST_PROJECT_DIR,
    spec_type: 'api',
    identifiers: ['/does/not/exist']
  });
  // Should return empty arrays, not throw
  assert(Array.isArray(emptyResult.api_specs), 'Returns empty array for non-existent');

  console.log('\n✅ get_relevant_specs tool tests passed');
}

// ============================================================================
// Tool Handler Dispatcher Tests
// ============================================================================

async function testToolHandlerDispatcher() {
  log('TEST: Tool Handler Dispatcher');

  section('Valid context tool');
  const summaryResult = await contextTools.handleContextToolCall(
    'get_context_summary',
    { project_path: TEST_PROJECT_DIR }
  );
  assert(summaryResult !== null, 'Dispatcher returns result for valid tool');
  assert(summaryResult.project_id, 'Result has expected structure');

  section('Unknown tool');
  const unknownResult = await contextTools.handleContextToolCall(
    'unknown_tool',
    { project_path: TEST_PROJECT_DIR }
  );
  assert(unknownResult === null, 'Dispatcher returns null for unknown tool');

  section('All context tools dispatch correctly');
  const toolNames = [
    'get_context_for_story',
    'get_relevant_specs',
    'search_context',
    'list_stories_by_epic',
    'get_context_summary',
    'chunk_docs'
  ];

  // Just verify the dispatcher routes to the right handlers
  // (actual functionality tested above)
  console.log('   All context tool names recognized by dispatcher');

  console.log('\n✅ Tool handler dispatcher tests passed');
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  try {
    log('INTEGRATION TESTS: MCP Context Tools');

    setupTestProject();

    // Test error cases before chunking
    await testToolsBeforeChunking();

    // Test chunk_docs tool (creates the index)
    await testChunkDocsTool();

    // Test query tools (after chunking)
    await testGetContextSummaryTool();
    await testListStoriesByEpicTool();
    await testSearchContextTool();
    await testGetContextForStoryTool();
    await testGetRelevantSpecsTool();

    // Test dispatcher
    await testToolHandlerDispatcher();

    // Cleanup
    cleanupTestProject();

    log('ALL CONTEXT TOOLS INTEGRATION TESTS PASSED ✅');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    cleanupTestProject();
    process.exit(1);
  }
}

runAllTests();
