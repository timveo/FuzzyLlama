/**
 * Inter-Agent Query Tools
 *
 * Tools for agents to ask questions to each other asynchronously.
 * Queries enable clarification, validation, and consultation between agents.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateQueryInput = z.object({
  id: z.string().min(1).regex(/^QUERY-\d+$/, 'Query ID must be format QUERY-001'),
  project_id: z.string().min(1),
  from_agent: z.string().min(1),
  to_agent: z.string().min(1),
  type: z.enum(['clarification', 'validation', 'consultation', 'estimation']),
  question: z.string().min(10),
});

const AnswerQueryInput = z.object({
  query_id: z.string().min(1),
  answer: z.string().min(1),
});

const GetPendingQueriesInput = z.object({
  project_id: z.string().min(1),
  to_agent: z.string().optional(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const queryTools: Tool[] = [
  {
    name: 'create_query',
    description: `Create a question for another agent to answer asynchronously.

WHEN TO USE: When you need information from another agent's domain to proceed with your work.

QUERY TYPES:
- clarification: Need to understand something better. Example: "What error codes should the login endpoint return?"
- validation: Confirm an assumption before proceeding. Example: "Is it okay to use localStorage for auth tokens?"
- consultation: Get expert opinion on approach. Example: "What's the best pattern for handling file uploads?"
- estimation: Request effort/time estimate. Example: "How long to implement payment integration?"

RETURNS: { id, project_id, from_agent, to_agent, type, question, status: "pending", created_at }

IMPORTANT: Be specific in your question. Include:
- Context: What you're working on
- Constraint: What you need to know
- Impact: How it affects your work

FOLLOW-UP: Check get_pending_queries periodically for answers, or proceed with assumptions and note them.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Query ID. Format: QUERY-001. Must be unique.',
        },
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        from_agent: {
          type: 'string',
          description: 'Agent asking the question',
        },
        to_agent: {
          type: 'string',
          description: 'Agent who should answer',
        },
        type: {
          type: 'string',
          enum: ['clarification', 'validation', 'consultation', 'estimation'],
          description: 'Query type',
        },
        question: {
          type: 'string',
          description: 'The question. Be specific and include context.',
        },
      },
      required: ['id', 'project_id', 'from_agent', 'to_agent', 'type', 'question'],
    },
  },
  {
    name: 'answer_query',
    description: `Provide an answer to a pending query addressed to you.

WHEN TO USE: At session start, check pending queries and answer those in your domain.

RETURNS: { success: true } or { success: false, error: "Query not found" }

ANSWERING WELL:
- Be direct: Answer the specific question asked
- Be complete: Include relevant context
- Be actionable: Suggest next steps if applicable
- Reference sources: Point to docs/decisions if relevant

IMPORTANT: Answer queries promptly. Unanswered queries block other agents.`,
    inputSchema: {
      type: 'object',
      properties: {
        query_id: {
          type: 'string',
          description: 'Query ID to answer. Example: QUERY-001',
        },
        answer: {
          type: 'string',
          description: 'Your answer to the question',
        },
      },
      required: ['query_id', 'answer'],
    },
  },
  {
    name: 'get_pending_queries',
    description: `Get queries awaiting answers, optionally filtered by target agent.

WHEN TO USE:
- At session start: See what questions are pending for you
- Periodically: Check for new questions during long work sessions
- For Orchestrator: Monitor all pending queries to ensure responsiveness

RETURNS: Array of pending queries with question and metadata.

FILTER: Pass to_agent to see only queries directed to specific agent. Omit to see all pending.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        to_agent: {
          type: 'string',
          description: 'Filter by target agent. Omit to see all pending queries.',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type QueryToolName = 'create_query' | 'answer_query' | 'get_pending_queries';

export async function handleQueryToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'create_query': {
      const input = CreateQueryInput.parse(args);
      return state.createQuery({
        id: input.id,
        project_id: input.project_id,
        from_agent: input.from_agent,
        to_agent: input.to_agent,
        type: input.type,
        question: input.question,
      });
    }

    case 'answer_query': {
      const input = AnswerQueryInput.parse(args);
      return state.answerQuery(input.query_id, input.answer);
    }

    case 'get_pending_queries': {
      const input = GetPendingQueriesInput.parse(args);
      return state.getPendingQueries(input.project_id, input.to_agent);
    }

    default:
      return null;
  }
}

export const QUERY_TOOL_NAMES: readonly QueryToolName[] = [
  'create_query',
  'answer_query',
  'get_pending_queries',
] as const;
