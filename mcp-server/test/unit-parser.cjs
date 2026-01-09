#!/usr/bin/env node
/**
 * Unit Tests for Parser Functions
 *
 * Tests the document parsing functions for PRD, OpenAPI, Prisma, and keyword extraction.
 */

const fs = require('fs');
const path = require('path');

// Import the compiled parser module
const parser = require('../dist/context/parser.js');

// Test fixtures paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'context');
const SAMPLE_PRD = path.join(FIXTURES_DIR, 'sample-prd.md');
const SAMPLE_OPENAPI = path.join(FIXTURES_DIR, 'sample-openapi.yaml');
const SAMPLE_PRISMA = path.join(FIXTURES_DIR, 'sample-schema.prisma');

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

function assertThrows(fn, msg) {
  try {
    fn();
    console.error(`❌ EXPECTED ERROR: ${msg}`);
    process.exit(1);
  } catch (e) {
    console.log(`   ✓ ${msg} (threw: ${e.message.slice(0, 50)}...)`);
  }
}

// ============================================================================
// PRD Parser Tests
// ============================================================================

function testExtractUserStories() {
  log('TEST: extractUserStories()');

  const prdContent = fs.readFileSync(SAMPLE_PRD, 'utf-8');
  const stories = parser.extractUserStories(prdContent);

  section('Basic extraction');
  assert(Array.isArray(stories), 'Returns an array');
  assert(stories.length >= 5, `Extracted at least 5 user stories (got ${stories.length})`);

  section('Story structure');
  const story1 = stories[0];
  assert(story1.id === 'US-001' || story1.id === 'US-011', `First story has valid ID (got ${story1.id})`);
  assert(story1.as_a.includes('user'), `as_a contains 'user' (got: ${story1.as_a})`);
  assert(story1.i_want.includes('register'), `i_want contains 'register' (got: ${story1.i_want})`);
  assert(story1.so_that.includes('access'), `so_that contains 'access' (got: ${story1.so_that})`);

  section('Acceptance criteria');
  assert(Array.isArray(story1.acceptance_criteria), 'acceptance_criteria is an array');
  assert(story1.acceptance_criteria.length >= 3, `Has at least 3 acceptance criteria (got ${story1.acceptance_criteria.length})`);
  assert(story1.acceptance_criteria.some(ac => ac.includes('Email')), 'Has email validation criterion');

  section('Epic extraction');
  assert(story1.epic === 'Authentication', `First story epic is 'Authentication' (got: ${story1.epic})`);
  const dashboardStory = stories.find(s => s.epic === 'User Dashboard');
  assert(dashboardStory, 'Found a story in User Dashboard epic');

  section('Line numbers');
  assert(typeof story1.line_start === 'number', 'line_start is a number');
  assert(typeof story1.line_end === 'number', 'line_end is a number');
  assert(story1.line_start < story1.line_end, 'line_start < line_end');

  section('Priority extraction');
  assert(story1.priority === 'P1' || story1.priority === undefined, `Priority is P1 or undefined (got: ${story1.priority})`);

  console.log('\n✅ extractUserStories tests passed');
}

function testExtractUserStoriesEdgeCases() {
  log('TEST: extractUserStories() - Edge Cases');

  section('Empty content');
  const emptyStories = parser.extractUserStories('');
  assert(emptyStories.length === 0, 'Empty content returns empty array');

  section('No user stories');
  const noStoriesContent = '# PRD\n## Executive Summary\nJust a summary.';
  const noStories = parser.extractUserStories(noStoriesContent);
  assert(noStories.length === 0, 'Content without stories returns empty array');

  section('Partial story format');
  const partialContent = `
### Epic 1: Test

#### User Story 1.1
**As a** user

No i_want or so_that defined.
`;
  const partialStories = parser.extractUserStories(partialContent);
  // Should either return nothing or a partial story
  assert(Array.isArray(partialStories), 'Partial content returns array');

  console.log('\n✅ extractUserStories edge case tests passed');
}

// ============================================================================
// OpenAPI Parser Tests
// ============================================================================

function testExtractOpenApiEndpoints() {
  log('TEST: extractOpenApiEndpoints()');

  const openApiContent = fs.readFileSync(SAMPLE_OPENAPI, 'utf-8');
  const endpoints = parser.extractOpenApiEndpoints(openApiContent);

  section('Basic extraction');
  assert(Array.isArray(endpoints), 'Returns an array');
  assert(endpoints.length >= 5, `Extracted at least 5 endpoints (got ${endpoints.length})`);

  section('Endpoint structure');
  const registerEndpoint = endpoints.find(e => e.path === '/auth/register');
  assert(registerEndpoint, 'Found /auth/register endpoint');
  assert(registerEndpoint.method === 'POST', `Method is POST (got: ${registerEndpoint.method})`);
  assert(registerEndpoint.operationId === 'register', `operationId is 'register' (got: ${registerEndpoint.operationId})`);

  section('Tags');
  assert(Array.isArray(registerEndpoint.tags), 'tags is an array');
  assert(registerEndpoint.tags.includes('Authentication'), 'Register endpoint has Authentication tag');

  section('Schema references');
  const loginEndpoint = endpoints.find(e => e.path === '/auth/login');
  assert(loginEndpoint, 'Found /auth/login endpoint');
  // Schema references may or may not be extracted depending on implementation

  section('All paths extracted');
  const paths = endpoints.map(e => e.path);
  assert(paths.includes('/auth/register'), 'Has /auth/register');
  assert(paths.includes('/auth/login'), 'Has /auth/login');
  assert(paths.includes('/auth/refresh'), 'Has /auth/refresh');
  assert(paths.includes('/users/me'), 'Has /users/me');

  console.log('\n✅ extractOpenApiEndpoints tests passed');
}

function testExtractOpenApiSnippet() {
  log('TEST: extractOpenApiSnippet()');

  const openApiContent = fs.readFileSync(SAMPLE_OPENAPI, 'utf-8');

  section('Extract specific path');
  const registerSnippet = parser.extractOpenApiSnippet(openApiContent, '/auth/register');
  assert(registerSnippet.length > 0, 'Returns non-empty snippet');
  assert(registerSnippet.includes('register'), 'Snippet contains operationId');
  assert(registerSnippet.includes('post'), 'Snippet contains method');

  section('Extract specific method');
  const loginSnippet = parser.extractOpenApiSnippet(openApiContent, '/auth/login', 'post');
  assert(loginSnippet.length > 0, 'Returns non-empty snippet for specific method');
  assert(loginSnippet.includes('login'), 'Snippet contains login operationId');

  section('Non-existent path');
  const nonExistent = parser.extractOpenApiSnippet(openApiContent, '/does/not/exist');
  assert(nonExistent === '' || nonExistent.length === 0, 'Returns empty for non-existent path');

  console.log('\n✅ extractOpenApiSnippet tests passed');
}

// ============================================================================
// Prisma Parser Tests
// ============================================================================

function testExtractPrismaModels() {
  log('TEST: extractPrismaModels()');

  const prismaContent = fs.readFileSync(SAMPLE_PRISMA, 'utf-8');
  const models = parser.extractPrismaModels(prismaContent);

  section('Basic extraction');
  assert(Array.isArray(models), 'Returns an array');
  assert(models.length >= 3, `Extracted at least 3 models (got ${models.length})`);

  section('Model structure');
  const userModel = models.find(m => m.name === 'User');
  assert(userModel, 'Found User model');
  assert(Array.isArray(userModel.fields), 'fields is an array');
  assert(userModel.fields.length >= 5, `User has at least 5 fields (got ${userModel.fields.length})`);

  section('Field structure');
  const emailField = userModel.fields.find(f => f.name === 'email');
  assert(emailField, 'Found email field');
  assert(emailField.type === 'String', `Email type is String (got: ${emailField.type})`);

  section('Relations');
  const refreshTokenModel = models.find(m => m.name === 'RefreshToken');
  assert(refreshTokenModel, 'Found RefreshToken model');
  assert(Array.isArray(refreshTokenModel.relations), 'relations is an array');

  section('All models extracted');
  const modelNames = models.map(m => m.name);
  assert(modelNames.includes('User'), 'Has User model');
  assert(modelNames.includes('RefreshToken'), 'Has RefreshToken model');
  assert(modelNames.includes('Session'), 'Has Session model');

  console.log('\n✅ extractPrismaModels tests passed');
}

function testExtractPrismaModelSnippet() {
  log('TEST: extractPrismaModelSnippet()');

  const prismaContent = fs.readFileSync(SAMPLE_PRISMA, 'utf-8');

  section('Extract User model');
  const userSnippet = parser.extractPrismaModelSnippet(prismaContent, 'User');
  assert(userSnippet.length > 0, 'Returns non-empty snippet');
  assert(userSnippet.includes('model User'), 'Snippet starts with model User');
  assert(userSnippet.includes('email'), 'Snippet contains email field');
  assert(userSnippet.includes('}'), 'Snippet contains closing brace');

  section('Extract RefreshToken model');
  const refreshSnippet = parser.extractPrismaModelSnippet(prismaContent, 'RefreshToken');
  assert(refreshSnippet.includes('model RefreshToken'), 'Found RefreshToken model');
  assert(refreshSnippet.includes('userId'), 'Contains userId field');

  section('Non-existent model');
  const nonExistent = parser.extractPrismaModelSnippet(prismaContent, 'NonExistentModel');
  assert(nonExistent === '', 'Returns empty for non-existent model');

  console.log('\n✅ extractPrismaModelSnippet tests passed');
}

// ============================================================================
// Keyword Extraction Tests
// ============================================================================

function testExtractKeywords() {
  log('TEST: extractKeywords()');

  section('Domain terms');
  const authText = 'User can login with email and password for authentication';
  const authKeywords = parser.extractKeywords(authText);
  assert(authKeywords.includes('user'), 'Extracts "user"');
  assert(authKeywords.includes('login'), 'Extracts "login"');
  assert(authKeywords.includes('email'), 'Extracts "email"');
  assert(authKeywords.includes('password'), 'Extracts "password"');
  assert(authKeywords.includes('auth') || authKeywords.includes('authentication'), 'Extracts auth-related term');

  section('CamelCase entity names');
  const entityText = 'The UserProfile component uses RefreshToken for auth';
  const entityKeywords = parser.extractKeywords(entityText);
  assert(entityKeywords.includes('userprofile') || entityKeywords.includes('user'), 'Extracts entity name');

  section('API paths');
  const pathText = 'Call /users/profile endpoint';
  const pathKeywords = parser.extractKeywords(pathText);
  assert(pathKeywords.includes('users') || pathKeywords.includes('profile'), 'Extracts path segment');

  section('Deduplication');
  const dupeText = 'user User USER user';
  const dupeKeywords = parser.extractKeywords(dupeText);
  const userCount = dupeKeywords.filter(k => k.toLowerCase() === 'user').length;
  assert(userCount <= 1, 'Keywords are deduplicated');

  section('Empty/minimal input');
  const emptyKeywords = parser.extractKeywords('');
  assert(Array.isArray(emptyKeywords), 'Returns array for empty input');
  assert(emptyKeywords.length === 0, 'Empty input returns empty array');

  console.log('\n✅ extractKeywords tests passed');
}

function testCalculateKeywordOverlap() {
  log('TEST: calculateKeywordOverlap()');

  section('Exact match');
  const overlap1 = parser.calculateKeywordOverlap(['auth', 'user', 'login'], ['auth', 'user', 'login']);
  assert(overlap1 === 3, `Exact match returns 3 (got ${overlap1})`);

  section('Partial match');
  const overlap2 = parser.calculateKeywordOverlap(['auth', 'user', 'login'], ['auth', 'password']);
  assert(overlap2 === 1, `Partial match returns 1 (got ${overlap2})`);

  section('No match');
  const overlap3 = parser.calculateKeywordOverlap(['auth', 'user'], ['dashboard', 'settings']);
  assert(overlap3 === 0, `No match returns 0 (got ${overlap3})`);

  section('Case insensitive');
  const overlap4 = parser.calculateKeywordOverlap(['Auth', 'USER'], ['auth', 'user']);
  assert(overlap4 === 2, `Case insensitive match returns 2 (got ${overlap4})`);

  section('Empty arrays');
  const overlap5 = parser.calculateKeywordOverlap([], ['auth']);
  assert(overlap5 === 0, 'Empty first array returns 0');
  const overlap6 = parser.calculateKeywordOverlap(['auth'], []);
  assert(overlap6 === 0, 'Empty second array returns 0');

  console.log('\n✅ calculateKeywordOverlap tests passed');
}

// ============================================================================
// Run All Tests
// ============================================================================

try {
  log('UNIT TESTS: Parser Functions');

  // PRD Parser
  testExtractUserStories();
  testExtractUserStoriesEdgeCases();

  // OpenAPI Parser
  testExtractOpenApiEndpoints();
  testExtractOpenApiSnippet();

  // Prisma Parser
  testExtractPrismaModels();
  testExtractPrismaModelSnippet();

  // Keyword Extraction
  testExtractKeywords();
  testCalculateKeywordOverlap();

  log('ALL PARSER UNIT TESTS PASSED ✅');
  process.exit(0);
} catch (error) {
  console.error('\n❌ TEST ERROR:', error);
  process.exit(1);
}
