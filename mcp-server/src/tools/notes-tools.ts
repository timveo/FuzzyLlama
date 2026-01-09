/**
 * Notes and Basic Memory Tools
 *
 * Tools for free-form notes and basic memory recording.
 * These are lightweight tools for capturing context.
 *
 * NOTE: For enhanced memory with semantic search, see memory-tools.ts (Phase 1)
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const AddNoteInput = z.object({
  project_id: z.string().min(1),
  content: z.string().min(1),
});

const GetNotesInput = z.object({
  project_id: z.string().min(1),
});

const AddMemoryInput = z.object({
  project_id: z.string().min(1),
  type: z.enum(['decision_worked', 'decision_failed', 'pattern_discovered', 'gotcha']),
  content: z.string().min(10),
});

const GetMemoriesInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const notesTools: Tool[] = [
  {
    name: 'add_note',
    description: `Add a free-form note to the project.

WHEN TO USE: For observations, thoughts, or context that doesn't fit elsewhere. Notes are informal records.

RETURNS: { success: true } or { success: false, error: "..." }

NOTE VS MEMORY:
- Notes: Free-form, informal, any content
- Memory: Structured learnings with type classification

NOTE VS DECISION:
- Notes: Informal observations
- Decision: Formal decision with rationale and alternatives

EXAMPLES:
- "User mentioned they prefer dark mode by default"
- "API rate limit is 100 req/min, may need to implement caching"
- "Team prefers Tailwind over styled-components"`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        content: {
          type: 'string',
          description: 'Note content. Any free-form text.',
        },
      },
      required: ['project_id', 'content'],
    },
  },
  {
    name: 'get_notes',
    description: `Get all notes for a project.

WHEN TO USE:
- When resuming work: Review notes from previous sessions
- For context: See informal observations made during project
- At retrospectives: Review notable observations

RETURNS: Array of { content, created_at } sorted by created_at DESC (newest first).`,
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
  {
    name: 'add_memory',
    description: `Record a structured learning/memory with type classification.

WHEN TO USE: When you learn something that should be remembered for this project or future projects.

MEMORY TYPES:
- decision_worked: A decision that had positive outcome
- decision_failed: A decision that didn't work out (include what you learned)
- pattern_discovered: A reusable pattern found during development
- gotcha: A surprising behavior or edge case to remember

RETURNS: { success: true } or { success: false, error: "..." }

CONTENT GUIDANCE: Be specific and include:
- What: Clear description of the learning
- Context: When/where it applies
- Why: Why this matters
- How: How to apply this knowledge

EXAMPLE:
{
  type: "gotcha",
  content: "Prisma DateTime fields return UTC. When displaying to users, must convert to local timezone in the frontend. Caused 4 hours of debugging when timestamps appeared wrong."
}

NOTE: This is basic memory. For enhanced memory with semantic search and cross-project sync, see memory-tools.ts.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        type: {
          type: 'string',
          enum: ['decision_worked', 'decision_failed', 'pattern_discovered', 'gotcha'],
          description: 'Memory type',
        },
        content: {
          type: 'string',
          description: 'The learning/memory content. Be specific and include context.',
        },
      },
      required: ['project_id', 'type', 'content'],
    },
  },
  {
    name: 'get_memories',
    description: `Get recorded memories/learnings for a project.

WHEN TO USE:
- At session start: Review what's been learned so far
- Before making decisions: Check if similar situations have been encountered
- At retrospectives: Review learnings from the project

RETURNS: Array of { type, content, created_at }.

TIP: Check memories before making technology or architecture decisions to avoid repeating past mistakes.

NOTE: This returns basic memories. For semantic search across memories, see search_memory tool in memory-tools.ts.`,
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
// Tool Handler
// ============================================================================

export type NotesToolName = 'add_note' | 'get_notes' | 'add_memory' | 'get_memories';

export async function handleNotesToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'add_note': {
      const input = AddNoteInput.parse(args);
      return state.addNote(input.project_id, input.content);
    }

    case 'get_notes': {
      const input = GetNotesInput.parse(args);
      return state.getNotes(input.project_id);
    }

    case 'add_memory': {
      const input = AddMemoryInput.parse(args);
      return state.addMemory(input.project_id, input.type, input.content);
    }

    case 'get_memories': {
      const input = GetMemoriesInput.parse(args);
      return state.getMemories(input.project_id);
    }

    default:
      return null;
  }
}

export const NOTES_TOOL_NAMES: readonly NotesToolName[] = [
  'add_note',
  'get_notes',
  'add_memory',
  'get_memories',
] as const;
