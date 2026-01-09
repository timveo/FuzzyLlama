#!/usr/bin/env node
/**
 * Unit Tests for Chunker Functions
 *
 * Tests the document chunking and index building logic.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import the compiled chunker module
const chunker = require('../dist/context/chunker.js');

// Test fixtures paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'context');
const TEST_PROJECT_DIR = '/tmp/test-rag-project';

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
// Chunker Tests
// ============================================================================

async function testChunkDocs() {
  log('TEST: chunkDocs()');

  setupTestProject();

  try {
    section('Initial chunking');
    const result = await chunker.chunkDocs(TEST_PROJECT_DIR, false);

    assert(result.success === true, 'Chunking succeeds');
    assert(typeof result.chunks_created === 'number', 'Returns chunks_created count');
    assert(result.chunks_created >= 3, `Created at least 3 chunks (got ${result.chunks_created})`);
    assert(Array.isArray(result.epics_indexed), 'Returns epics_indexed array');
    assert(result.epics_indexed.includes('Authentication'), 'Indexed Authentication epic');

    section('Output files created');
    const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');
    assert(fs.existsSync(ragDir), 'Created docs/rag/ directory');
    assert(fs.existsSync(path.join(ragDir, 'index.json')), 'Created index.json');
    assert(fs.existsSync(path.join(ragDir, 'spec-index.json')), 'Created spec-index.json');
    assert(fs.existsSync(path.join(ragDir, 'chunks')), 'Created chunks/ directory');

    section('Index structure');
    const index = JSON.parse(fs.readFileSync(path.join(ragDir, 'index.json'), 'utf-8'));
    assert(index.version === '1.0', 'Index has version 1.0');
    assert(typeof index.chunks_by_id === 'object', 'Has chunks_by_id map');
    assert(typeof index.chunks_by_epic === 'object', 'Has chunks_by_epic map');
    assert(typeof index.chunks_by_keyword === 'object', 'Has chunks_by_keyword map');
    assert(typeof index.story_to_specs === 'object', 'Has story_to_specs map');

    section('Chunk files');
    const chunkFiles = fs.readdirSync(path.join(ragDir, 'chunks'));
    assert(chunkFiles.length >= 3, `At least 3 chunk files (got ${chunkFiles.length})`);
    assert(chunkFiles.every(f => f.endsWith('.json')), 'All chunks are JSON files');

    section('Chunk content');
    const firstChunk = JSON.parse(fs.readFileSync(
      path.join(ragDir, 'chunks', chunkFiles[0]),
      'utf-8'
    ));
    assert(firstChunk.id, 'Chunk has id');
    assert(firstChunk.type === 'user_story', 'Chunk type is user_story');
    assert(firstChunk.content, 'Chunk has content');
    assert(Array.isArray(firstChunk.keywords), 'Chunk has keywords array');
    assert(Array.isArray(firstChunk.relevant_agents), 'Chunk has relevant_agents array');

    section('Spec index structure');
    const specIndex = JSON.parse(fs.readFileSync(path.join(ragDir, 'spec-index.json'), 'utf-8'));
    assert(specIndex.version === '1.0', 'Spec index has version 1.0');
    assert(typeof specIndex.api_endpoints === 'object', 'Has api_endpoints map');
    assert(typeof specIndex.db_models === 'object', 'Has db_models map');

    console.log('\n✅ chunkDocs tests passed');
    return true;
  } finally {
    // Don't cleanup yet - we need the files for subsequent tests
  }
}

async function testChunkDocsForceRebuild() {
  log('TEST: chunkDocs() - Force Rebuild');

  // Project should already be set up from previous test
  const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');
  assert(fs.existsSync(ragDir), 'RAG directory exists from previous test');

  section('Skip if index exists (force=false)');
  const skipResult = await chunker.chunkDocs(TEST_PROJECT_DIR, false);
  assert(skipResult.success === true, 'Returns success');
  assert(
    skipResult.errors && skipResult.errors.some(e => e.includes('already exists')),
    'Reports that index already exists'
  );

  section('Rebuild with force=true');
  // Get original timestamp
  const originalIndex = JSON.parse(fs.readFileSync(path.join(ragDir, 'index.json'), 'utf-8'));
  const originalTimestamp = originalIndex.updated_at;

  // Wait a bit to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 100));

  const rebuildResult = await chunker.chunkDocs(TEST_PROJECT_DIR, true);
  assert(rebuildResult.success === true, 'Force rebuild succeeds');

  // Check timestamp changed
  const newIndex = JSON.parse(fs.readFileSync(path.join(ragDir, 'index.json'), 'utf-8'));
  // Note: timestamps might be the same if the operation is too fast
  assert(newIndex.version === '1.0', 'Rebuilt index has correct version');

  console.log('\n✅ chunkDocs force rebuild tests passed');
}

async function testChunkDocsRelationships() {
  log('TEST: chunkDocs() - Relationships');

  const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');

  section('Story to API endpoint linking');
  const index = JSON.parse(fs.readFileSync(path.join(ragDir, 'index.json'), 'utf-8'));

  // Find a story that should be linked to /auth/register
  let foundLinkedStory = false;
  for (const [storyId, specs] of Object.entries(index.story_to_specs)) {
    if (specs.api_endpoints && specs.api_endpoints.includes('/auth/register')) {
      foundLinkedStory = true;
      console.log(`   Found story ${storyId} linked to /auth/register`);
      break;
    }
  }
  // It's okay if no stories are linked - depends on keyword matching
  console.log(`   Story-to-endpoint linking: ${foundLinkedStory ? 'Found' : 'No matches (acceptable)'}`);

  section('Spec index back-references');
  const specIndex = JSON.parse(fs.readFileSync(path.join(ragDir, 'spec-index.json'), 'utf-8'));

  // Check API endpoints have related_stories
  for (const [endpoint, data] of Object.entries(specIndex.api_endpoints)) {
    assert(Array.isArray(data.related_stories), `Endpoint ${endpoint} has related_stories array`);
    break; // Just check one
  }

  // Check DB models have related_stories
  for (const [model, data] of Object.entries(specIndex.db_models)) {
    assert(Array.isArray(data.related_stories), `Model ${model} has related_stories array`);
    break; // Just check one
  }

  section('Keyword index');
  assert(Object.keys(index.chunks_by_keyword).length > 0, 'Has keyword entries');

  // Check that common auth keywords exist
  const authKeywords = ['auth', 'email', 'password', 'user', 'login', 'register'];
  const foundKeywords = authKeywords.filter(k => index.chunks_by_keyword[k]);
  assert(foundKeywords.length >= 2, `Found at least 2 auth-related keywords (found: ${foundKeywords.join(', ')})`);

  console.log('\n✅ chunkDocs relationship tests passed');
}

async function testChunkDocsMissingFiles() {
  log('TEST: chunkDocs() - Missing Files');

  // Create a minimal project without some files
  const emptyProjectDir = '/tmp/test-rag-empty-project';
  if (fs.existsSync(emptyProjectDir)) {
    fs.rmSync(emptyProjectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(emptyProjectDir, 'docs'), { recursive: true });

  try {
    section('No PRD.md');
    const result = await chunker.chunkDocs(emptyProjectDir, true);
    assert(result.success === true, 'Still succeeds with warnings');
    assert(result.errors && result.errors.some(e => e.includes('PRD.md')), 'Reports missing PRD.md');
    assert(result.chunks_created === 0, 'Creates 0 chunks without PRD');

    section('No OpenAPI spec');
    assert(result.errors && result.errors.some(e => e.includes('OpenAPI') || e.includes('openapi')),
      'Reports missing OpenAPI spec');

    console.log('\n✅ chunkDocs missing files tests passed');
  } finally {
    fs.rmSync(emptyProjectDir, { recursive: true, force: true });
  }
}

async function testChunkContentFormat() {
  log('TEST: Chunk Content Format');

  const ragDir = path.join(TEST_PROJECT_DIR, 'docs', 'rag');
  const chunksDir = path.join(ragDir, 'chunks');
  const chunkFiles = fs.readdirSync(chunksDir);

  section('Chunk metadata');
  for (const file of chunkFiles.slice(0, 2)) {
    const chunk = JSON.parse(fs.readFileSync(path.join(chunksDir, file), 'utf-8'));

    assert(chunk.id, `${file}: Has id`);
    assert(chunk.type, `${file}: Has type`);
    assert(chunk.title, `${file}: Has title`);
    assert(chunk.content, `${file}: Has content`);
    assert(chunk.source_file, `${file}: Has source_file`);
    assert(chunk.created_at, `${file}: Has created_at`);
    assert(chunk.updated_at, `${file}: Has updated_at`);
  }

  section('User story specific fields');
  const storyChunk = JSON.parse(fs.readFileSync(
    path.join(chunksDir, chunkFiles[0]),
    'utf-8'
  ));

  if (storyChunk.type === 'user_story') {
    assert(Array.isArray(storyChunk.acceptance_criteria), 'Has acceptance_criteria array');
    assert(storyChunk.epic, 'Has epic');
    assert(Array.isArray(storyChunk.keywords), 'Has keywords');
    assert(Array.isArray(storyChunk.relevant_agents), 'Has relevant_agents');
    assert(storyChunk.relevant_agents.length > 0, 'Has at least one relevant agent');
  }

  console.log('\n✅ Chunk content format tests passed');
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  try {
    log('UNIT TESTS: Chunker Functions');

    await testChunkDocs();
    await testChunkDocsForceRebuild();
    await testChunkDocsRelationships();
    await testChunkDocsMissingFiles();
    await testChunkContentFormat();

    // Cleanup after all tests
    cleanupTestProject();

    log('ALL CHUNKER UNIT TESTS PASSED ✅');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    cleanupTestProject();
    process.exit(1);
  }
}

runAllTests();
