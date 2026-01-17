import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpToolsService } from './mcp-tools.service';
import { ALL_TOOLS } from './tool-definitions';

/**
 * McpServerService - MCP Protocol Server
 *
 * Implements Model Context Protocol (MCP) for FuzzyLlama
 * Compatible with Claude Code and Multi-Agent-Product-Creator framework
 *
 * Features:
 * - 160+ tools exposed via MCP protocol
 * - Stdio transport for Claude Code integration
 * - Resource access (read markdown files, project state)
 * - Bidirectional sync with database
 */
@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly logger = new Logger(McpServerService.name);
  private server: Server;

  constructor(private readonly mcpTools: McpToolsService) {}

  async onModuleInit() {
    // MCP server is initialized but not started automatically
    // It should be started manually via CLI command
    this.logger.log('MCP Server Service initialized (not started)');
  }

  /**
   * Start MCP server with stdio transport
   * This should be called from a CLI command, not automatically
   */
  async start(): Promise<void> {
    this.logger.log('Starting MCP server...');

    // Create MCP server
    this.server = new Server(
      {
        name: 'fuzzyllama',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // Register tool handlers
    this.registerToolHandlers();

    // Register resource handlers
    this.registerResourceHandlers();

    // Connect stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.log('MCP server running on stdio');
    this.logger.log(`Registered ${ALL_TOOLS.length} tools`);
  }

  /**
   * Register tool list and execution handlers
   */
  private registerToolHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Listing tools');

      return {
        tools: ALL_TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Execute tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.log(`Executing tool: ${name}`);

      try {
        const result = await this.mcpTools.executeTool(name, args || {});

        // Format result for MCP
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.logger.error(`Tool execution failed: ${name} - ${error.message}`);

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register resource handlers (for reading project files)
   */
  private registerResourceHandlers(): void {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.logger.debug('Listing resources');

      // Return common resources (markdown files)
      return {
        resources: [
          {
            uri: 'fuzzyllama://project/{projectId}/status',
            name: 'Project Status',
            description: 'Current project status (STATUS.md)',
            mimeType: 'text/markdown',
          },
          {
            uri: 'fuzzyllama://project/{projectId}/decisions',
            name: 'Project Decisions',
            description: 'Project decisions log (DECISIONS.md)',
            mimeType: 'text/markdown',
          },
          {
            uri: 'fuzzyllama://project/{projectId}/memory',
            name: 'Project Memory',
            description: 'System memory for agents (MEMORY.md)',
            mimeType: 'text/markdown',
          },
          {
            uri: 'fuzzyllama://project/{projectId}/gates',
            name: 'Gate Status',
            description: 'Gate workflow progress (GATES.md)',
            mimeType: 'text/markdown',
          },
          {
            uri: 'fuzzyllama://project/{projectId}/tasks',
            name: 'Task Queue',
            description: 'Task queue and execution status (TASKS.md)',
            mimeType: 'text/markdown',
          },
        ],
      };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      this.logger.log(`Reading resource: ${uri}`);

      try {
        // Parse URI: fuzzyllama://project/{projectId}/{resource}
        const match = uri.match(/^fuzzyllama:\/\/project\/([^\/]+)\/(.+)$/);

        if (!match) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }

        const [, projectId, resourceType] = match;

        // Map resource type to tool
        let content: string;

        switch (resourceType) {
          case 'status':
            content = await this.mcpTools.executeTool('read_status', { projectId });
            break;

          case 'decisions':
            content = await this.mcpTools.executeTool('read_decisions', { projectId });
            break;

          case 'memory':
            content = await this.mcpTools.executeTool('read_memory', { projectId });
            break;

          case 'gates':
            content = await this.mcpTools.executeTool('read_gates', { projectId });
            break;

          case 'tasks':
            content = await this.mcpTools.executeTool('read_tasks', { projectId });
            break;

          default:
            throw new Error(`Unknown resource type: ${resourceType}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      } catch (error) {
        this.logger.error(`Resource read failed: ${uri} - ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      this.logger.log('MCP server stopped');
    }
  }
}
