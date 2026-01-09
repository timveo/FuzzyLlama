import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AgentExecutionService } from './services/agent-execution.service';
import { AgentTemplateLoaderService } from './services/agent-template-loader.service';
import { ExecuteAgentDto } from './dto/execute-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(
    private readonly executionService: AgentExecutionService,
    private readonly templateLoader: AgentTemplateLoaderService,
  ) {}

  @Get('templates')
  @ApiOperation({ summary: 'Get all available agent templates' })
  @ApiResponse({ status: 200, description: 'Agent templates retrieved successfully' })
  async getTemplates() {
    return this.templateLoader.getAllTemplates();
  }

  @Get('templates/:role')
  @ApiOperation({ summary: 'Get a specific agent template by role' })
  @ApiResponse({ status: 200, description: 'Agent template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent template not found' })
  async getTemplate(@Param('role') role: string) {
    const template = this.templateLoader.getTemplate(role as any);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute an agent' })
  @ApiResponse({ status: 200, description: 'Agent executed successfully' })
  @ApiResponse({ status: 400, description: 'Execution limit reached or invalid request' })
  @ApiResponse({ status: 403, description: 'Cannot execute agent for project you do not own' })
  async execute(
    @Body() executeDto: ExecuteAgentDto,
    @CurrentUser() user: any,
  ) {
    return this.executionService.executeAgent(executeDto, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get agent execution history for a project' })
  @ApiResponse({ status: 200, description: 'Agent history retrieved successfully' })
  async getHistory(
    @Query('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.executionService.getAgentHistory(projectId, user.id);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get a specific agent execution by ID' })
  @ApiResponse({ status: 200, description: 'Agent execution retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent execution not found' })
  async getExecution(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionService.getAgentExecution(id, user.id);
  }
}
