#!/usr/bin/env node

/**
 * MCP Server CLI
 *
 * Starts the LayerCake MCP server for Claude Code integration
 *
 * Usage:
 *   node dist/mcp/mcp-cli.js
 *
 * Claude Code Configuration (~/.config/claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "layercake": {
 *       "command": "node",
 *       "args": ["/path/to/layercake/backend/dist/mcp/mcp-cli.js"],
 *       "env": {
 *         "DATABASE_URL": "postgresql://...",
 *         "JWT_SECRET": "..."
 *       }
 *     }
 *   }
 * }
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { McpServerService } from './mcp-server.service';

async function bootstrap() {
  console.error('Starting LayerCake MCP Server...');

  // Create NestJS application context (without HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Get MCP server service
  const mcpServer = app.get(McpServerService);

  // Start MCP server
  await mcpServer.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down MCP server...');
    await mcpServer.stop();
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down MCP server...');
    await mcpServer.stop();
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
