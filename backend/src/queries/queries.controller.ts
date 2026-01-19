import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QueriesService } from './queries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQueryDto } from './dto/create-query.dto';
import { AnswerQueryDto } from './dto/answer-query.dto';

@Controller('queries')
@UseGuards(JwtAuthGuard)
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  /**
   * POST /api/queries
   * Create a new inter-agent query
   */
  @Post()
  async createQuery(@Body() createQueryDto: CreateQueryDto) {
    return this.queriesService.createQuery(createQueryDto);
  }

  /**
   * GET /api/queries?projectId=...&status=pending&toAgent=...
   * Get queries with optional filters
   */
  @Get()
  async getQueries(
    @Query('projectId') projectId: string,
    @Query('status') status?: 'pending' | 'answered',
    @Query('fromAgent') fromAgent?: string,
    @Query('toAgent') toAgent?: string,
    @Query('priority') priority?: 'critical' | 'high' | 'medium' | 'low',
  ) {
    const options: any = {};

    if (status) options.status = status;
    if (fromAgent) options.fromAgent = fromAgent;
    if (toAgent) options.toAgent = toAgent;
    if (priority) options.priority = priority;

    return this.queriesService.getQueries(projectId, options);
  }

  /**
   * GET /api/queries/pending/:projectId/:toAgent
   * Get pending queries for a specific agent (inbox)
   */
  @Get('pending/:projectId/:toAgent')
  async getPendingQueries(
    @Param('projectId') projectId: string,
    @Param('toAgent') toAgent: string,
  ) {
    return this.queriesService.getPendingQueries(projectId, toAgent);
  }

  /**
   * GET /api/queries/:id
   * Get a single query by ID
   */
  @Get(':id')
  async getQuery(@Param('id') id: string) {
    return this.queriesService.getQuery(id);
  }

  /**
   * POST /api/queries/:id/answer
   * Answer a pending query
   */
  @Post(':id/answer')
  async answerQuery(@Param('id') id: string, @Body() answerQueryDto: AnswerQueryDto) {
    return this.queriesService.answerQuery(id, answerQueryDto);
  }

  /**
   * GET /api/queries/statistics/:projectId
   * Get query statistics
   */
  @Get('statistics/:projectId')
  async getQueryStatistics(@Param('projectId') projectId: string) {
    return this.queriesService.getQueryStatistics(projectId);
  }

  /**
   * GET /api/queries/thread/:projectId/:agent1/:agent2
   * Get query thread between two agents
   */
  @Get('thread/:projectId/:agent1/:agent2')
  async getQueryThread(
    @Param('projectId') projectId: string,
    @Param('agent1') agent1: string,
    @Param('agent2') agent2: string,
  ) {
    return this.queriesService.getQueryThread(projectId, agent1, agent2);
  }
}
