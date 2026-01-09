/**
 * Learning Extractor Service
 *
 * Analyzes project decisions and resolved errors to extract learnable patterns.
 * Provides confidence scoring based on outcome clarity, reusability, and scope.
 *
 * KEY CONCEPTS:
 * - Patterns: Reusable approaches that worked (or didn't)
 * - Gotchas: Specific issues discovered during implementation
 * - Learnings: Combined insights from decisions and error resolutions
 *
 * CONFIDENCE SCORING (0-1):
 * - 0.8-1.0: High confidence, auto-sync eligible
 * - 0.5-0.79: Medium confidence, manual review suggested
 * - 0.0-0.49: Low confidence, project-specific only
 *
 * SCOPE DETERMINATION:
 * - universal: Applies to any project (e.g., "always validate user input")
 * - stack-specific: Applies to specific tech stack (e.g., "React hooks must...")
 * - domain-specific: Applies to specific domain (e.g., "e-commerce checkout needs...")
 * - project-specific: Only applies to this project
 */

import { getDatabase } from '../database.js';
import {
  isEmbeddingsAvailable,
  getEmbedding,
  cosineSimilarity,
  embeddingToBuffer,
  bufferToEmbedding,
} from './embeddings.js';
import type { MemoryType, MemoryScope } from '../schema.js';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedLearning {
  source_type: 'decision' | 'error' | 'pattern';
  source_id: number;
  learning_type: MemoryType;
  scope: MemoryScope;
  title: string;
  content: string;
  context?: string;
  example_code?: string;
  tags: string[];
  confidence: number;
  confidence_factors: ConfidenceFactors;
  reusability_signals: string[];
  already_exists: boolean;
  similar_memory_id?: number;
  similarity_score?: number;
}

interface ConfidenceFactors {
  has_clear_outcome: boolean;
  has_rationale: boolean;
  has_alternatives: boolean;
  is_generalizable: boolean;
  has_resolution: boolean;
  retry_count_low: boolean;
  has_example: boolean;
}

interface DecisionRow {
  id: number;
  project_id: string;
  gate: string;
  agent: string;
  decision_type: string;
  description: string;
  rationale: string | null;
  alternatives_considered: string | null;
  created_at: string;
}

interface ErrorRow {
  id: number;
  project_id: string;
  error_type: string;
  error_message: string;
  context_json: string | null;
  resolution: string | null;
  retry_count: number;
  resolved_at: string | null;
  created_at: string;
}

interface MemoryRow {
  id: number;
  title: string;
  content: string;
  embedding: Buffer | null;
}

// ============================================================================
// Scope Detection
// ============================================================================

// Patterns that indicate universal applicability
const UNIVERSAL_PATTERNS = [
  /always\s+(validate|sanitize|check|verify)/i,
  /never\s+(trust|allow|store|expose)/i,
  /must\s+(be|have|include|use)/i,
  /security\s+(best\s+practice|requirement)/i,
  /performance\s+(optimization|improvement)/i,
  /error\s+handling/i,
  /input\s+validation/i,
  /authentication|authorization/i,
  /caching\s+strategy/i,
  /logging\s+pattern/i,
];

// Tech stack keywords that indicate stack-specific scope
const STACK_KEYWORDS: Record<string, string[]> = {
  react: ['react', 'jsx', 'hook', 'usestate', 'useeffect', 'component'],
  node: ['node', 'express', 'npm', 'package.json', 'require', 'module'],
  typescript: ['typescript', 'type', 'interface', 'generic', 'ts'],
  python: ['python', 'pip', 'django', 'flask', 'fastapi'],
  database: ['sql', 'postgresql', 'mysql', 'mongodb', 'prisma', 'orm'],
};

// Domain keywords that indicate domain-specific scope
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  ecommerce: ['cart', 'checkout', 'payment', 'order', 'product', 'inventory'],
  auth: ['login', 'signup', 'password', 'session', 'token', 'oauth'],
  api: ['endpoint', 'rest', 'graphql', 'request', 'response', 'api'],
  ui: ['button', 'form', 'modal', 'navigation', 'layout', 'responsive'],
};

/**
 * Determine the scope of a learning based on its content
 */
function determineScope(text: string, tags: string[]): MemoryScope {
  const lowerText = text.toLowerCase();
  const lowerTags = tags.map((t) => t.toLowerCase());

  // Check for universal patterns
  for (const pattern of UNIVERSAL_PATTERNS) {
    if (pattern.test(lowerText)) {
      return 'universal';
    }
  }

  // Check for stack-specific keywords
  for (const [_stack, keywords] of Object.entries(STACK_KEYWORDS)) {
    const matchCount = keywords.filter(
      (kw) => lowerText.includes(kw) || lowerTags.includes(kw)
    ).length;
    if (matchCount >= 2) {
      return 'stack-specific';
    }
  }

  // Check for domain-specific keywords
  for (const [_domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const matchCount = keywords.filter(
      (kw) => lowerText.includes(kw) || lowerTags.includes(kw)
    ).length;
    if (matchCount >= 2) {
      return 'domain-specific';
    }
  }

  // Default to project-specific
  return 'project-specific';
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Calculate confidence score for a decision-based learning
 */
function scoreDecisionConfidence(decision: DecisionRow): {
  confidence: number;
  factors: ConfidenceFactors;
} {
  const factors: ConfidenceFactors = {
    has_clear_outcome: decision.description.length > 20,
    has_rationale: !!decision.rationale && decision.rationale.length > 10,
    has_alternatives:
      !!decision.alternatives_considered &&
      decision.alternatives_considered.length > 10,
    is_generalizable: false, // Will be set based on content analysis
    has_resolution: true, // Decisions are inherently resolved
    retry_count_low: true, // N/A for decisions
    has_example: false, // Will be set based on content analysis
  };

  // Check if generalizable
  const text = `${decision.description} ${decision.rationale || ''}`;
  factors.is_generalizable = UNIVERSAL_PATTERNS.some((p) => p.test(text));

  // Check for code examples
  factors.has_example = /```|`[^`]+`|function\s+\w+|const\s+\w+/.test(text);

  // Calculate weighted score
  let score = 0;
  score += factors.has_clear_outcome ? 0.15 : 0;
  score += factors.has_rationale ? 0.25 : 0;
  score += factors.has_alternatives ? 0.2 : 0;
  score += factors.is_generalizable ? 0.25 : 0;
  score += factors.has_example ? 0.15 : 0;

  return { confidence: Math.min(score, 1), factors };
}

/**
 * Calculate confidence score for an error-based learning
 */
function scoreErrorConfidence(error: ErrorRow): {
  confidence: number;
  factors: ConfidenceFactors;
} {
  const factors: ConfidenceFactors = {
    has_clear_outcome: !!error.resolved_at,
    has_rationale: false, // N/A for errors
    has_alternatives: false, // N/A for errors
    is_generalizable: false, // Will be set based on content analysis
    has_resolution: !!error.resolution && error.resolution.length > 10,
    retry_count_low: error.retry_count <= 2,
    has_example: false, // Will be set based on content analysis
  };

  // Check if generalizable
  const text = `${error.error_message} ${error.resolution || ''}`;
  factors.is_generalizable = UNIVERSAL_PATTERNS.some((p) => p.test(text));

  // Check for code examples in resolution
  factors.has_example = /```|`[^`]+`|function\s+\w+|const\s+\w+/.test(
    error.resolution || ''
  );

  // Calculate weighted score
  let score = 0;
  score += factors.has_clear_outcome ? 0.2 : 0;
  score += factors.has_resolution ? 0.35 : 0;
  score += factors.retry_count_low ? 0.1 : 0;
  score += factors.is_generalizable ? 0.2 : 0;
  score += factors.has_example ? 0.15 : 0;

  return { confidence: Math.min(score, 1), factors };
}

// ============================================================================
// Reusability Signal Detection
// ============================================================================

/**
 * Detect signals that indicate a learning is reusable
 */
function detectReusabilitySignals(text: string): string[] {
  const signals: string[] = [];

  if (/always|never|must|should/i.test(text)) {
    signals.push('prescriptive_language');
  }
  if (/any\s+(project|application|codebase)/i.test(text)) {
    signals.push('general_applicability');
  }
  if (/best\s+practice|recommended|standard/i.test(text)) {
    signals.push('industry_standard');
  }
  if (/security|performance|scalability/i.test(text)) {
    signals.push('quality_attribute');
  }
  if (/pattern|approach|strategy|technique/i.test(text)) {
    signals.push('methodology');
  }
  if (/avoid|prevent|don't|do\s+not/i.test(text)) {
    signals.push('anti_pattern');
  }
  if (/example|sample|template/i.test(text)) {
    signals.push('has_example');
  }

  return signals;
}

// ============================================================================
// Memory Type Detection
// ============================================================================

/**
 * Determine the memory type for a learning
 */
function determineMemoryType(
  sourceType: 'decision' | 'error',
  text: string,
  decisionType?: string
): MemoryType {
  if (sourceType === 'error') {
    if (/workaround|gotcha|quirk|unexpected/i.test(text)) {
      return 'gotcha';
    }
    return 'failure';
  }

  // For decisions
  if (decisionType === 'technology' || decisionType === 'architecture') {
    return 'decision';
  }
  if (/pattern|approach|strategy/i.test(text)) {
    return 'pattern';
  }
  if (/integration|third-party|external/i.test(text)) {
    return 'integration';
  }
  if (/performance|optimization|speed/i.test(text)) {
    return 'performance';
  }
  if (/security|auth|encryption/i.test(text)) {
    return 'security';
  }
  if (/success|worked|solved/i.test(text)) {
    return 'success';
  }

  return 'pattern';
}

// ============================================================================
// Tag Extraction
// ============================================================================

/**
 * Extract relevant tags from text
 */
function extractTags(text: string, agent?: string, gate?: string): string[] {
  const tags: Set<string> = new Set();

  // Add agent and gate if provided
  if (agent) tags.add(agent);
  if (gate) tags.add(gate);

  // Extract technology keywords
  for (const [stack, keywords] of Object.entries(STACK_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.toLowerCase().includes(kw)) {
        tags.add(stack);
        break;
      }
    }
  }

  // Extract domain keywords
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.toLowerCase().includes(kw)) {
        tags.add(domain);
        break;
      }
    }
  }

  // Extract common technical terms
  const techTerms =
    text.match(
      /\b(API|REST|GraphQL|SQL|NoSQL|cache|queue|async|sync|batch|stream)\b/gi
    ) || [];
  for (const term of techTerms) {
    tags.add(term.toLowerCase());
  }

  return Array.from(tags);
}

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Check if a similar memory already exists
 */
async function findSimilarMemory(
  projectId: string,
  title: string,
  content: string
): Promise<{ exists: boolean; memoryId?: number; similarity?: number }> {
  const db = getDatabase();

  // If embeddings available, use semantic search
  if (isEmbeddingsAvailable()) {
    try {
      const queryEmbedding = await getEmbedding(`${title} ${content}`);

      // Get existing memories with embeddings
      const memories = db
        .prepare(
          `
        SELECT id, title, content, embedding
        FROM enhanced_memory
        WHERE project_id = ? AND embedding IS NOT NULL
      `
        )
        .all(projectId) as MemoryRow[];

      let bestMatch: { id: number; similarity: number } | null = null;

      for (const memory of memories) {
        if (memory.embedding) {
          const memoryEmbedding = bufferToEmbedding(memory.embedding);
          const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);

          if (similarity > 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
            bestMatch = { id: memory.id, similarity };
          }
        }
      }

      if (bestMatch) {
        return {
          exists: true,
          memoryId: bestMatch.id,
          similarity: bestMatch.similarity,
        };
      }
    } catch {
      // Fall through to keyword matching
    }
  }

  // Fallback: keyword matching
  const existing = db
    .prepare(
      `
    SELECT id FROM enhanced_memory
    WHERE project_id = ? AND (title = ? OR content LIKE ?)
    LIMIT 1
  `
    )
    .get(projectId, title, `%${content.slice(0, 100)}%`) as
    | { id: number }
    | undefined;

  if (existing) {
    return { exists: true, memoryId: existing.id };
  }

  return { exists: false };
}

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract learnings from a single decision
 */
async function extractFromDecision(
  decision: DecisionRow
): Promise<ExtractedLearning | null> {
  const text = `${decision.description} ${decision.rationale || ''} ${
    decision.alternatives_considered || ''
  }`;
  const tags = extractTags(text, decision.agent, decision.gate);
  const scope = determineScope(text, tags);
  const { confidence, factors } = scoreDecisionConfidence(decision);

  // Skip very low confidence learnings
  if (confidence < 0.3) {
    return null;
  }

  const memoryType = determineMemoryType(
    'decision',
    text,
    decision.decision_type
  );
  const reusabilitySignals = detectReusabilitySignals(text);

  // Check for duplicates
  const duplicate = await findSimilarMemory(
    decision.project_id,
    decision.description,
    text
  );

  // Extract code example if present
  const codeMatch = text.match(/```[\s\S]*?```|`[^`]+`/);
  const exampleCode = codeMatch ? codeMatch[0] : undefined;

  return {
    source_type: 'decision',
    source_id: decision.id,
    learning_type: memoryType,
    scope,
    title: decision.description.slice(0, 100),
    content: text,
    context: `Gate: ${decision.gate}, Agent: ${decision.agent}, Type: ${decision.decision_type}`,
    example_code: exampleCode,
    tags,
    confidence,
    confidence_factors: factors,
    reusability_signals: reusabilitySignals,
    already_exists: duplicate.exists,
    similar_memory_id: duplicate.memoryId,
    similarity_score: duplicate.similarity,
  };
}

/**
 * Extract learnings from a single resolved error
 */
async function extractFromError(
  error: ErrorRow
): Promise<ExtractedLearning | null> {
  // Only extract from resolved errors
  if (!error.resolved_at || !error.resolution) {
    return null;
  }

  const text = `${error.error_message} ${error.resolution}`;
  const tags = extractTags(text);
  tags.push(error.error_type);

  const scope = determineScope(text, tags);
  const { confidence, factors } = scoreErrorConfidence(error);

  // Skip very low confidence learnings
  if (confidence < 0.3) {
    return null;
  }

  const memoryType = determineMemoryType('error', text);
  const reusabilitySignals = detectReusabilitySignals(text);

  // Check for duplicates
  const duplicate = await findSimilarMemory(
    error.project_id,
    `Error: ${error.error_type}`,
    text
  );

  // Parse context if available
  let contextStr: string | undefined;
  if (error.context_json) {
    try {
      const ctx = JSON.parse(error.context_json);
      contextStr = `File: ${ctx.file_path || 'unknown'}, Task: ${
        ctx.task_id || 'unknown'
      }`;
    } catch {
      // Ignore parse errors
    }
  }

  // Extract code example if present
  const codeMatch = text.match(/```[\s\S]*?```|`[^`]+`/);
  const exampleCode = codeMatch ? codeMatch[0] : undefined;

  return {
    source_type: 'error',
    source_id: error.id,
    learning_type: memoryType,
    scope,
    title: `Gotcha: ${error.error_type} - ${error.error_message.slice(0, 50)}`,
    content: `Problem: ${error.error_message}\n\nSolution: ${error.resolution}`,
    context: contextStr,
    example_code: exampleCode,
    tags,
    confidence,
    confidence_factors: factors,
    reusability_signals: reusabilitySignals,
    already_exists: duplicate.exists,
    similar_memory_id: duplicate.memoryId,
    similarity_score: duplicate.similarity,
  };
}

/**
 * Extract all learnings from a project
 *
 * @param projectId - Project to analyze
 * @param minConfidence - Minimum confidence threshold (default 0.3)
 * @returns Array of extracted learnings sorted by confidence
 */
export async function extractLearnings(
  projectId: string,
  minConfidence: number = 0.3
): Promise<ExtractedLearning[]> {
  const db = getDatabase();
  const learnings: ExtractedLearning[] = [];

  // Get all decisions for the project
  const decisions = db
    .prepare(
      `
    SELECT id, project_id, gate, agent, decision_type, description, rationale, alternatives_considered, created_at
    FROM decisions
    WHERE project_id = ?
    ORDER BY created_at DESC
  `
    )
    .all(projectId) as DecisionRow[];

  // Get all resolved errors for the project
  const errors = db
    .prepare(
      `
    SELECT id, project_id, error_type, error_message, context_json, resolution, retry_count, resolved_at, created_at
    FROM error_history
    WHERE project_id = ? AND resolved_at IS NOT NULL
    ORDER BY created_at DESC
  `
    )
    .all(projectId) as ErrorRow[];

  // Extract from decisions
  for (const decision of decisions) {
    const learning = await extractFromDecision(decision);
    if (learning && learning.confidence >= minConfidence) {
      learnings.push(learning);
    }
  }

  // Extract from errors
  for (const error of errors) {
    const learning = await extractFromError(error);
    if (learning && learning.confidence >= minConfidence) {
      learnings.push(learning);
    }
  }

  // Sort by confidence descending
  learnings.sort((a, b) => b.confidence - a.confidence);

  return learnings;
}

/**
 * Get sync candidates - learnings with high confidence and universal scope
 *
 * @param projectId - Project to analyze
 * @returns Learnings eligible for SYSTEM_MEMORY sync
 */
export async function getSyncCandidates(
  projectId: string
): Promise<ExtractedLearning[]> {
  const learnings = await extractLearnings(projectId, 0.7);

  return learnings.filter(
    (l) =>
      l.scope === 'universal' && l.confidence >= 0.7 && !l.already_exists
  );
}

/**
 * Save an extracted learning to enhanced_memory
 *
 * @param projectId - Project ID
 * @param learning - Learning to save
 * @returns Memory ID
 */
export async function saveLearning(
  projectId: string,
  learning: ExtractedLearning
): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Generate embedding if available
  let embeddingBuffer: Buffer | null = null;
  if (isEmbeddingsAvailable()) {
    try {
      const embedding = await getEmbedding(
        `${learning.title} ${learning.content}`
      );
      embeddingBuffer = embeddingToBuffer(embedding);
    } catch {
      // Continue without embedding
    }
  }

  const result = db
    .prepare(
      `
    INSERT INTO enhanced_memory (
      project_id, memory_type, scope, title, content, context, example_code,
      tags, agents, gate, outcome, embedding, created_at, synced_to_system
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `
    )
    .run(
      projectId,
      learning.learning_type,
      learning.scope,
      learning.title,
      learning.content,
      learning.context || null,
      learning.example_code || null,
      JSON.stringify(learning.tags),
      JSON.stringify([]), // agents array
      learning.context?.match(/Gate: (\w+)/)?.[1] || null,
      `confidence: ${learning.confidence.toFixed(2)}`,
      embeddingBuffer,
      now
    );

  // Create link to source
  const memoryId = Number(result.lastInsertRowid);
  db.prepare(
    `
    INSERT INTO memory_links (source_type, source_id, target_type, target_id, link_type, created_at)
    VALUES ('memory', ?, ?, ?, 'caused_by', ?)
  `
  ).run(memoryId, learning.source_type, String(learning.source_id), now);

  // Record extraction in learning_extractions table
  db.prepare(
    `
    INSERT INTO learning_extractions (
      project_id, source_type, source_id, memory_id, confidence, scope,
      auto_synced, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `
  ).run(
    projectId,
    learning.source_type,
    learning.source_id,
    memoryId,
    learning.confidence,
    learning.scope,
    now
  );

  return memoryId;
}

/**
 * Mark a memory as synced to SYSTEM_MEMORY
 */
export function markAsSynced(memoryId: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE enhanced_memory SET synced_to_system = 1 WHERE id = ?
  `
  ).run(memoryId);
}

/**
 * Get extraction statistics for a project
 */
export function getExtractionStats(projectId: string): {
  total_decisions: number;
  total_errors: number;
  extracted_learnings: number;
  sync_candidates: number;
  synced_to_system: number;
} {
  const db = getDatabase();

  const decisions = db
    .prepare('SELECT COUNT(*) as count FROM decisions WHERE project_id = ?')
    .get(projectId) as { count: number };

  const errors = db
    .prepare(
      'SELECT COUNT(*) as count FROM error_history WHERE project_id = ? AND resolved_at IS NOT NULL'
    )
    .get(projectId) as { count: number };

  const extracted = db
    .prepare(
      'SELECT COUNT(*) as count FROM learning_extractions WHERE project_id = ?'
    )
    .get(projectId) as { count: number };

  const syncCandidates = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM enhanced_memory
    WHERE project_id = ? AND scope = 'universal' AND synced_to_system = 0
  `
    )
    .get(projectId) as { count: number };

  const synced = db
    .prepare(
      'SELECT COUNT(*) as count FROM enhanced_memory WHERE project_id = ? AND synced_to_system = 1'
    )
    .get(projectId) as { count: number };

  return {
    total_decisions: decisions.count,
    total_errors: errors.count,
    extracted_learnings: extracted.count,
    sync_candidates: syncCandidates.count,
    synced_to_system: synced.count,
  };
}
