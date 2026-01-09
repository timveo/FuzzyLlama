#!/usr/bin/env node
/**
 * MCP Server for Multi-Agent Product Creator State Management
 *
 * This server provides tools for agents to query and update project state
 * without parsing STATUS.md files. All state is stored in SQLite.
 *
 * Architecture:
 * - Tool definitions in /tools/*.ts modules
 * - Tool registry in /tools/index.ts
 * - State management in state.ts
 * - Database in database.ts with schema.ts
 *
 * Usage:
 *   product-creator-state --db-path /path/to/project.db
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';
import { initDatabase, closeDatabase } from './database.js';
import * as state from './state.js';
import { join } from 'path';

// Import unified tool registry
import { allTools, handleToolCall, getToolStats } from './tools/index.js';

// ============================================================================
// Main Server
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let dbPath = './.state/project.db';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db-path' && args[i + 1]) {
      dbPath = args[i + 1];
      i++;
    }
  }

  // Check if we should use a project-relative path
  if (!dbPath.startsWith('/') && !dbPath.startsWith('.')) {
    dbPath = join(process.cwd(), '.state', 'project.db');
  }

  // Initialize database
  console.error(`Initializing database at: ${dbPath}`);
  initDatabase(dbPath);

  // Log tool statistics
  const stats = getToolStats();
  console.error(`Registered ${stats.total} tools across ${Object.keys(stats).length - 1} categories`);

  // Create MCP server
  const server = new Server(
    {
      name: 'product-creator-state',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  // Handle tool calls with Zod validation error handling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, args || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Handle Zod validation errors with friendly messages
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Validation error',
                issues,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: String(error) }),
          },
        ],
        isError: true,
      };
    }
  });

  // Handle resource listing (expose project state as resources)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const projects = state.listProjects();
    return {
      resources: projects.map((p) => ({
        uri: `project://${p.id}/state`,
        name: `${p.name} - State`,
        description: `Current state for project ${p.name}`,
        mimeType: 'application/json',
      })),
    };
  });

  // Handle resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const match = uri.match(/^project:\/\/([^/]+)\/state$/);

    if (!match) {
      throw new Error(`Unknown resource URI: ${uri}`);
    }

    const projectId = match[1];
    const projectState = state.getFullProjectState(projectId);

    if (!projectState) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(projectState, null, 2),
        },
      ],
    };
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Cleanup on exit
  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });

  console.error('MCP State Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
