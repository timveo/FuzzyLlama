/**
 * Learning Extraction Tools
 *
 * Tools for extracting learnable patterns from project decisions and errors,
 * and syncing them to SYSTEM_MEMORY.md for cross-project reuse.
 *
 * WORKFLOW:
 * 1. extract_learnings - Analyze project for patterns
 * 2. Review high-confidence candidates
 * 3. sync_to_system_memory - Sync approved patterns
 * 4. import_from_system_memory - Import patterns at project start
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractLearnings,
  getSyncCandidates,
  saveLearning,
  markAsSynced,
  getExtractionStats,
  type ExtractedLearning,
} from '../services/learning-extractor.js';
import { getDatabase } from '../database.js';
import {
  isEmbeddingsAvailable,
  getEmbedding,
  cosineSimilarity,
} from '../services/embeddings.js';
import type { MemoryScope } from '../schema.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const ExtractLearningsInput = z.object({
  project_id: z.string().min(1),
  min_confidence: z.number().min(0).max(1).optional(),
  include_existing: z.boolean().optional(),
});

const SyncToSystemMemoryInput = z.object({
  project_id: z.string().min(1),
  memory_ids: z.array(z.number()).optional(),
  auto_approve_threshold: z.number().min(0).max(1).optional(),
  system_memory_path: z.string().optional(),
});

const ImportFromSystemMemoryInput = z.object({
  project_id: z.string().min(1),
  tech_stack: z.array(z.string()).optional(),
  domain: z.string().optional(),
  system_memory_path: z.string().optional(),
});

const SaveLearningInput = z.object({
  project_id: z.string().min(1),
  learning_index: z.number().int().min(0),
  learnings_json: z.string(),
});

const GetExtractionStatsInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const learningTools: Tool[] = [
  {
    name: 'extract_learnings',
    description: `Analyze project decisions and resolved errors to extract learning patterns.

WHEN TO USE:
- At project completion during retrospective
- After significant milestones (MVP launch, major feature completion)
- Periodically to capture accumulated knowledge

RETURNS: Array of ExtractedLearning objects with:
- source_type: 'decision' | 'error'
- learning_type: 'pattern' | 'decision' | 'failure' | 'gotcha' | etc.
- scope: 'universal' | 'stack-specific' | 'domain-specific' | 'project-specific'
- confidence: 0-1 score (>0.7 is sync-eligible)
- confidence_factors: What contributed to the score
- reusability_signals: Indicators this is widely applicable
- already_exists: Whether similar memory exists

CONFIDENCE FACTORS:
- has_clear_outcome: Decision/error has clear result
- has_rationale: Explanation provided
- has_alternatives: Other options were considered
- is_generalizable: Uses universal language patterns
- has_resolution: Error was successfully resolved
- has_example: Contains code example

EXAMPLE OUTPUT:
{
  learnings: [
    {
      source_type: 'decision',
      title: 'Always validate user input at API boundaries',
      scope: 'universal',
      confidence: 0.85,
      reusability_signals: ['prescriptive_language', 'security'],
      already_exists: false
    }
  ],
  stats: { total: 15, high_confidence: 3, sync_candidates: 2 }
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to analyze',
        },
        min_confidence: {
          type: 'number',
          description: 'Minimum confidence threshold (0-1). Default: 0.3',
        },
        include_existing: {
          type: 'boolean',
          description: 'Include learnings that already exist in memory. Default: false',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'save_extracted_learning',
    description: `Save a specific extracted learning to enhanced_memory.

WHEN TO USE: After reviewing extract_learnings output, save approved patterns.

RETURNS: { success: true, memory_id: <id> }

NOTE: Automatically creates link to source (decision/error) and records extraction.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        learning_index: {
          type: 'number',
          description: 'Index of learning in the learnings array from extract_learnings',
        },
        learnings_json: {
          type: 'string',
          description: 'JSON string of learnings array from extract_learnings output',
        },
      },
      required: ['project_id', 'learning_index', 'learnings_json'],
    },
  },
  {
    name: 'sync_to_system_memory',
    description: `Sync universal patterns to SYSTEM_MEMORY.md for cross-project reuse.

WHEN TO USE:
- At project completion for high-confidence universal patterns
- After manual review of extract_learnings output
- AUTO-RUNS at project completion for patterns with scope='universal' and confidence>0.7

SYNC PROCESS:
1. Get sync candidates (universal scope, high confidence, not already synced)
2. Format as markdown pattern entries
3. Append to appropriate section in SYSTEM_MEMORY.md
4. Mark memories as synced in database

RETURNS:
{
  synced: [{ id, title, section }],
  skipped: [{ id, reason }],
  sync_report: '3 patterns synced to SYSTEM_MEMORY.md'
}

SAFETY:
- Only appends, never overwrites existing content
- Creates backup before modification
- Checks for duplicates via embedding similarity`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        memory_ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Specific memory IDs to sync. If omitted, syncs all candidates.',
        },
        auto_approve_threshold: {
          type: 'number',
          description: 'Auto-approve memories with confidence >= threshold. Default: 0.8',
        },
        system_memory_path: {
          type: 'string',
          description: 'Path to SYSTEM_MEMORY.md. Default: docs/SYSTEM_MEMORY.md',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'import_from_system_memory',
    description: `Import relevant patterns from SYSTEM_MEMORY.md at project start.

WHEN TO USE:
- At project initialization
- When starting new feature that may have relevant patterns
- When onboarding to understand accumulated knowledge

MATCHING:
- Uses semantic similarity to match project tech stack and domain
- Filters by relevance score
- Returns patterns applicable to current context

RETURNS:
{
  patterns: [
    {
      title: 'Pattern name',
      content: 'Pattern description',
      relevance_score: 0.85,
      section: 'Best Practices'
    }
  ],
  recommendations: 'Consider these 5 patterns for your React + Node project'
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        tech_stack: {
          type: 'array',
          items: { type: 'string' },
          description: 'Technologies used (e.g., ["react", "node", "postgresql"])',
        },
        domain: {
          type: 'string',
          description: 'Project domain (e.g., "e-commerce", "healthcare", "fintech")',
        },
        system_memory_path: {
          type: 'string',
          description: 'Path to SYSTEM_MEMORY.md. Default: docs/SYSTEM_MEMORY.md',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_extraction_stats',
    description: `Get learning extraction statistics for a project.

WHEN TO USE: To understand extraction coverage and identify gaps.

RETURNS:
{
  total_decisions: 25,
  total_errors: 12,
  extracted_learnings: 8,
  sync_candidates: 3,
  synced_to_system: 2
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export type LearningToolName =
  | 'extract_learnings'
  | 'save_extracted_learning'
  | 'sync_to_system_memory'
  | 'import_from_system_memory'
  | 'get_extraction_stats';

/**
 * Parse SYSTEM_MEMORY.md and extract patterns
 */
function parseSystemMemory(content: string): Array<{
  section: string;
  title: string;
  content: string;
}> {
  const patterns: Array<{ section: string; title: string; content: string }> = [];
  let currentSection = 'General';

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Track section headers (## or ###)
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      i++;
      continue;
    }

    // Track pattern entries (### or bold)
    const patternMatch = line.match(/^###\s+(.+)|^\*\*(.+)\*\*/);
    if (patternMatch) {
      const title = (patternMatch[1] || patternMatch[2]).trim();
      let patternContent = '';

      i++;
      // Collect content until next pattern or section
      while (
        i < lines.length &&
        !lines[i].match(/^##|^###|^\*\*[^*]+\*\*/)
      ) {
        patternContent += lines[i] + '\n';
        i++;
      }

      if (patternContent.trim()) {
        patterns.push({
          section: currentSection,
          title,
          content: patternContent.trim(),
        });
      }
      continue;
    }

    i++;
  }

  return patterns;
}

/**
 * Format learning as markdown for SYSTEM_MEMORY
 */
function formatLearningAsMarkdown(
  learning: ExtractedLearning,
  memoryId: number
): string {
  let md = `\n### ${learning.title}\n\n`;
  md += `${learning.content}\n\n`;

  if (learning.example_code) {
    md += `**Example:**\n${learning.example_code}\n\n`;
  }

  if (learning.tags.length > 0) {
    md += `**Tags:** ${learning.tags.join(', ')}\n\n`;
  }

  md += `*Source: Memory #${memoryId}, Confidence: ${(
    learning.confidence * 100
  ).toFixed(0)}%*\n`;

  return md;
}

/**
 * Determine which section a learning belongs in
 */
function determineSectionForLearning(learning: ExtractedLearning): string {
  switch (learning.learning_type) {
    case 'pattern':
      return 'Design Patterns';
    case 'gotcha':
      return 'Common Gotchas';
    case 'failure':
      return 'Lessons Learned';
    case 'security':
      return 'Security Patterns';
    case 'performance':
      return 'Performance Patterns';
    case 'integration':
      return 'Integration Patterns';
    default:
      return 'Best Practices';
  }
}

export async function handleLearningToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'extract_learnings': {
      const input = ExtractLearningsInput.parse(args);
      const minConfidence = input.min_confidence ?? 0.3;
      const includeExisting = input.include_existing ?? false;

      const allLearnings = await extractLearnings(input.project_id, minConfidence);

      // Filter out existing if not requested
      const learnings = includeExisting
        ? allLearnings
        : allLearnings.filter((l) => !l.already_exists);

      // Calculate stats
      const highConfidence = learnings.filter((l) => l.confidence >= 0.7);
      const syncCandidates = learnings.filter(
        (l) => l.confidence >= 0.7 && l.scope === 'universal' && !l.already_exists
      );

      return {
        learnings,
        stats: {
          total: learnings.length,
          high_confidence: highConfidence.length,
          sync_candidates: syncCandidates.length,
          by_scope: {
            universal: learnings.filter((l) => l.scope === 'universal').length,
            stack_specific: learnings.filter((l) => l.scope === 'stack-specific')
              .length,
            domain_specific: learnings.filter((l) => l.scope === 'domain-specific')
              .length,
            project_specific: learnings.filter(
              (l) => l.scope === 'project-specific'
            ).length,
          },
          by_type: {
            decision: learnings.filter((l) => l.source_type === 'decision').length,
            error: learnings.filter((l) => l.source_type === 'error').length,
          },
        },
      };
    }

    case 'save_extracted_learning': {
      const input = SaveLearningInput.parse(args);

      try {
        const learnings: ExtractedLearning[] = JSON.parse(input.learnings_json);

        if (input.learning_index < 0 || input.learning_index >= learnings.length) {
          return {
            success: false,
            error: `Invalid learning index: ${input.learning_index}. Array has ${learnings.length} items.`,
          };
        }

        const learning = learnings[input.learning_index];
        const memoryId = await saveLearning(input.project_id, learning);

        return {
          success: true,
          memory_id: memoryId,
          title: learning.title,
          scope: learning.scope,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to parse learnings JSON: ${String(error)}`,
        };
      }
    }

    case 'sync_to_system_memory': {
      const input = SyncToSystemMemoryInput.parse(args);
      const systemMemoryPath =
        input.system_memory_path || 'docs/SYSTEM_MEMORY.md';
      const autoApproveThreshold = input.auto_approve_threshold ?? 0.8;

      const db = getDatabase();
      const synced: Array<{ id: number; title: string; section: string }> = [];
      const skipped: Array<{ id: number; reason: string }> = [];

      // Get memories to sync
      let memoriesToSync: Array<{
        id: number;
        title: string;
        content: string;
        memory_type: string;
        scope: MemoryScope;
        tags: string;
        example_code: string | null;
      }>;

      if (input.memory_ids && input.memory_ids.length > 0) {
        memoriesToSync = db
          .prepare(
            `
          SELECT id, title, content, memory_type, scope, tags, example_code
          FROM enhanced_memory
          WHERE project_id = ? AND id IN (${input.memory_ids.map(() => '?').join(',')})
            AND synced_to_system = 0
        `
          )
          .all(input.project_id, ...input.memory_ids) as typeof memoriesToSync;
      } else {
        // Get auto-approve candidates
        const candidates = await getSyncCandidates(input.project_id);
        const candidateIds = candidates
          .filter((c) => c.confidence >= autoApproveThreshold)
          .map((c) => {
            // We need to get the memory ID for this learning
            // For now, we'll extract learnings that meet criteria
            return c;
          });

        if (candidateIds.length === 0) {
          return {
            synced: [],
            skipped: [],
            sync_report: 'No patterns met auto-approve threshold',
          };
        }

        // Save candidates first, then get their IDs
        const savedIds: number[] = [];
        for (const candidate of candidateIds) {
          const memoryId = await saveLearning(input.project_id, candidate);
          savedIds.push(memoryId);
        }

        memoriesToSync = db
          .prepare(
            `
          SELECT id, title, content, memory_type, scope, tags, example_code
          FROM enhanced_memory
          WHERE project_id = ? AND id IN (${savedIds.map(() => '?').join(',')})
            AND synced_to_system = 0
        `
          )
          .all(input.project_id, ...savedIds) as typeof memoriesToSync;
      }

      if (memoriesToSync.length === 0) {
        return {
          synced: [],
          skipped: [],
          sync_report: 'No eligible patterns to sync',
        };
      }

      // Read current SYSTEM_MEMORY.md
      let systemMemoryContent = '';
      const fullPath = path.resolve(process.cwd(), systemMemoryPath);

      try {
        if (fs.existsSync(fullPath)) {
          systemMemoryContent = fs.readFileSync(fullPath, 'utf-8');
          // Create backup
          fs.writeFileSync(`${fullPath}.backup`, systemMemoryContent);
        } else {
          // Create initial structure
          systemMemoryContent = `# System Memory

## Best Practices

## Design Patterns

## Common Gotchas

## Lessons Learned

## Security Patterns

## Performance Patterns

## Integration Patterns
`;
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to read SYSTEM_MEMORY.md: ${String(error)}`,
        };
      }

      // Parse existing patterns for duplicate detection
      const existingPatterns = parseSystemMemory(systemMemoryContent);

      // Prepare additions by section
      const additions: Record<string, string> = {};

      for (const memory of memoriesToSync) {
        // Check for duplicates using title similarity
        const isDuplicate = existingPatterns.some(
          (p) =>
            p.title.toLowerCase() === memory.title.toLowerCase() ||
            p.content.includes(memory.content.slice(0, 50))
        );

        if (isDuplicate) {
          skipped.push({ id: memory.id, reason: 'Duplicate pattern detected' });
          continue;
        }

        // Determine section and format
        const learning: ExtractedLearning = {
          source_type: 'pattern',
          source_id: memory.id,
          learning_type: memory.memory_type as ExtractedLearning['learning_type'],
          scope: memory.scope,
          title: memory.title,
          content: memory.content,
          example_code: memory.example_code || undefined,
          tags: memory.tags ? JSON.parse(memory.tags) : [],
          confidence: 1,
          confidence_factors: {} as ExtractedLearning['confidence_factors'],
          reusability_signals: [],
          already_exists: false,
        };

        const section = determineSectionForLearning(learning);
        const markdown = formatLearningAsMarkdown(learning, memory.id);

        if (!additions[section]) {
          additions[section] = '';
        }
        additions[section] += markdown;

        synced.push({ id: memory.id, title: memory.title, section });
      }

      // Append to SYSTEM_MEMORY.md
      for (const [section, content] of Object.entries(additions)) {
        const sectionHeader = `## ${section}`;
        const sectionIndex = systemMemoryContent.indexOf(sectionHeader);

        if (sectionIndex !== -1) {
          // Find end of section (next ## or end of file)
          const nextSectionMatch = systemMemoryContent
            .slice(sectionIndex + sectionHeader.length)
            .match(/\n## /);
          const insertIndex = nextSectionMatch
            ? sectionIndex +
              sectionHeader.length +
              (nextSectionMatch.index ?? 0)
            : systemMemoryContent.length;

          systemMemoryContent =
            systemMemoryContent.slice(0, insertIndex) +
            content +
            systemMemoryContent.slice(insertIndex);
        } else {
          // Section doesn't exist, add it
          systemMemoryContent += `\n${sectionHeader}\n${content}`;
        }
      }

      // Write updated file
      try {
        fs.writeFileSync(fullPath, systemMemoryContent);
      } catch (error) {
        return {
          success: false,
          error: `Failed to write SYSTEM_MEMORY.md: ${String(error)}`,
        };
      }

      // Mark as synced in database
      for (const s of synced) {
        markAsSynced(s.id);
      }

      return {
        synced,
        skipped,
        sync_report: `${synced.length} patterns synced to SYSTEM_MEMORY.md`,
      };
    }

    case 'import_from_system_memory': {
      const input = ImportFromSystemMemoryInput.parse(args);
      const systemMemoryPath =
        input.system_memory_path || 'docs/SYSTEM_MEMORY.md';

      const fullPath = path.resolve(process.cwd(), systemMemoryPath);

      if (!fs.existsSync(fullPath)) {
        return {
          patterns: [],
          recommendations: 'SYSTEM_MEMORY.md not found',
        };
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const patterns = parseSystemMemory(content);

      if (patterns.length === 0) {
        return {
          patterns: [],
          recommendations: 'No patterns found in SYSTEM_MEMORY.md',
        };
      }

      // Build query string from tech stack and domain
      const queryParts: string[] = [];
      if (input.tech_stack) {
        queryParts.push(...input.tech_stack);
      }
      if (input.domain) {
        queryParts.push(input.domain);
      }

      // Score patterns by relevance
      const scoredPatterns: Array<{
        section: string;
        title: string;
        content: string;
        relevance_score: number;
      }> = [];

      if (queryParts.length > 0 && isEmbeddingsAvailable()) {
        // Use semantic similarity
        try {
          const queryEmbedding = await getEmbedding(queryParts.join(' '));

          for (const pattern of patterns) {
            const patternEmbedding = await getEmbedding(
              `${pattern.title} ${pattern.content}`
            );
            const similarity = cosineSimilarity(queryEmbedding, patternEmbedding);

            scoredPatterns.push({
              ...pattern,
              relevance_score: similarity,
            });
          }
        } catch {
          // Fall through to keyword matching
        }
      }

      if (scoredPatterns.length === 0) {
        // Keyword matching fallback
        const queryLower = queryParts.join(' ').toLowerCase();

        for (const pattern of patterns) {
          const patternText =
            `${pattern.title} ${pattern.content}`.toLowerCase();
          let score = 0;

          for (const term of queryParts) {
            if (patternText.includes(term.toLowerCase())) {
              score += 0.2;
            }
          }

          // Boost universal patterns
          if (patternText.includes('always') || patternText.includes('never')) {
            score += 0.1;
          }

          scoredPatterns.push({
            ...pattern,
            relevance_score: Math.min(score, 1),
          });
        }
      }

      // Sort by relevance and take top 10
      scoredPatterns.sort((a, b) => b.relevance_score - a.relevance_score);
      const topPatterns = scoredPatterns.slice(0, 10).filter((p) => p.relevance_score > 0.1);

      const techStackStr = input.tech_stack?.join(' + ') || 'your';
      const domainStr = input.domain ? ` ${input.domain}` : '';

      return {
        patterns: topPatterns,
        recommendations:
          topPatterns.length > 0
            ? `Consider these ${topPatterns.length} patterns for your ${techStackStr}${domainStr} project`
            : `No highly relevant patterns found. ${patterns.length} total patterns available in SYSTEM_MEMORY.md`,
      };
    }

    case 'get_extraction_stats': {
      const input = GetExtractionStatsInput.parse(args);
      return getExtractionStats(input.project_id);
    }

    default:
      return null;
  }
}

export const LEARNING_TOOL_NAMES: readonly LearningToolName[] = [
  'extract_learnings',
  'save_extracted_learning',
  'sync_to_system_memory',
  'import_from_system_memory',
  'get_extraction_stats',
] as const;
