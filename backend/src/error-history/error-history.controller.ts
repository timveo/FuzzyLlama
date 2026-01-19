import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ErrorHistoryService } from './error-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogErrorDto } from './dto/log-error.dto';
import { ResolveErrorDto } from './dto/resolve-error.dto';
import { ErrorType } from '@prisma/client';

@Controller('errors')
@UseGuards(JwtAuthGuard)
export class ErrorHistoryController {
  constructor(private readonly errorHistoryService: ErrorHistoryService) {}

  /**
   * POST /api/errors
   * Log an error with full context
   */
  @Post()
  async logError(@Body() logErrorDto: LogErrorDto) {
    return this.errorHistoryService.logError(logErrorDto);
  }

  /**
   * GET /api/errors?projectId=...&resolved=false&errorType=...&limit=50
   * Get error history for a project with optional filters
   */
  @Get()
  async getErrorHistory(
    @Query('projectId') projectId: string,
    @Query('resolved') resolved?: string,
    @Query('errorType') errorType?: ErrorType,
    @Query('limit') limit?: string,
  ) {
    const options: { resolved?: boolean; errorType?: ErrorType; limit?: number } = {};

    if (resolved !== undefined) {
      options.resolved = resolved === 'true';
    }

    if (errorType) {
      options.errorType = errorType;
    }

    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    return this.errorHistoryService.getErrorHistory(projectId, options);
  }

  /**
   * POST /api/errors/:id/resolve
   * Mark an error as resolved with resolution details
   */
  @Post(':id/resolve')
  async resolveError(
    @Param('id', ParseIntPipe) id: number,
    @Body() resolveErrorDto: ResolveErrorDto,
  ) {
    return this.errorHistoryService.resolveError(id, resolveErrorDto);
  }

  /**
   * GET /api/errors/similar?message=...&projectId=...&errorType=...&limit=10
   * Find similar resolved errors (for retry workers and agents)
   */
  @Get('similar')
  async findSimilarErrors(
    @Query('message') message: string,
    @Query('projectId') projectId: string,
    @Query('errorType') errorType?: ErrorType,
    @Query('limit') limit?: string,
  ) {
    const options: { errorType?: ErrorType; limit?: number } = {};

    if (errorType) {
      options.errorType = errorType;
    }

    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    return this.errorHistoryService.findSimilarErrors(message, projectId, options);
  }

  /**
   * GET /api/errors/task/:taskId/context
   * Get error context for retry workers (all task errors + similar resolutions)
   */
  @Get('task/:taskId/context')
  async getErrorContextForRetry(@Param('taskId') taskId: string) {
    return this.errorHistoryService.getErrorContextForRetry(taskId);
  }

  /**
   * GET /api/errors/statistics/:projectId
   * Get error statistics for a project
   */
  @Get('statistics/:projectId')
  async getErrorStatistics(@Param('projectId') projectId: string) {
    return this.errorHistoryService.getErrorStatistics(projectId);
  }
}
