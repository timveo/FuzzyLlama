import { Module } from '@nestjs/common';
import { McpServerService } from './mcp-server.service';
import { McpToolsService } from './mcp-tools.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { StateSyncModule } from '../state-sync/state-sync.module';
import { AgentsModule } from '../agents/agents.module';
import { CodeGenerationModule } from '../code-generation/code-generation.module';
import { GitHubModule } from '../integrations/github/github.module';
import { RailwayModule } from '../integrations/railway/railway.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    StateSyncModule,
    AgentsModule,
    CodeGenerationModule,
    GitHubModule,
    RailwayModule,
    EventsModule,
  ],
  providers: [McpServerService, McpToolsService],
  exports: [McpServerService, McpToolsService],
})
export class McpModule {}
