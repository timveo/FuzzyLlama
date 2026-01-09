import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentExecutionService } from './services/agent-execution.service';
import { AgentTemplateLoaderService } from './services/agent-template-loader.service';
import { AIProviderService } from './services/ai-provider.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AgentsController],
  providers: [
    AgentExecutionService,
    AgentTemplateLoaderService,
    AIProviderService,
  ],
  exports: [
    AgentExecutionService,
    AgentTemplateLoaderService,
    AIProviderService,
  ],
})
export class AgentsModule {}
