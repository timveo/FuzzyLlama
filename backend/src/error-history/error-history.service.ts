import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ErrorType } from '@prisma/client';

export interface LogErrorInput {
  projectId: string;
  taskId?: string;
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  filePath?: string;
  lineNumber?: number;
  context?: Record<string, unknown>;
}

export interface ErrorResolution {
  resolution: string;
  resolutionAgent?: string;
}

export interface SimilarError {
  id: number;
  errorMessage: string;
  errorType: ErrorType;
  resolution?: string | null;
  resolutionAgent?: string | null;
  similarity: number;
}

/**
 * ErrorHistoryService - Context Engineering for error tracking and learning
 *
 * Purpose:
 * - Log errors with full context for debugging
 * - Track error patterns across agents and projects
 * - Enable agents to learn from previous error resolutions
 * - Provide retry workers with error context
 *
 * Use Cases:
 * 1. Agent encounters build error → Log with file/line context
 * 2. Retry worker retrieves similar resolved errors
 * 3. Cross-project learning from error patterns
 * 4. Error analytics and debugging
 */
@Injectable()
export class ErrorHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an error with full context
   */
  async logError(input: LogErrorInput): Promise<any> {
    return this.prisma.errorHistory.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        errorType: input.errorType,
        errorMessage: input.errorMessage,
        stackTrace: input.stackTrace,
        filePath: input.filePath,
        lineNumber: input.lineNumber,
        contextJson: input.context ? JSON.stringify(input.context) : null,
        retryCount: 0,
      },
    });
  }

  /**
   * Increment retry count for an error
   */
  async incrementRetryCount(errorId: number): Promise<any> {
    const error = await this.prisma.errorHistory.findUnique({
      where: { id: errorId },
    });

    if (!error) {
      throw new NotFoundException(`Error with ID ${errorId} not found`);
    }

    return this.prisma.errorHistory.update({
      where: { id: errorId },
      data: {
        retryCount: error.retryCount + 1,
      },
    });
  }

  /**
   * Get error history for a project
   */
  async getErrorHistory(
    projectId: string,
    options?: {
      resolved?: boolean;
      errorType?: ErrorType;
      limit?: number;
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.resolved !== undefined) {
      if (options.resolved) {
        where.resolvedAt = { not: null };
      } else {
        where.resolvedAt = null;
      }
    }

    if (options?.errorType) {
      where.errorType = options.errorType;
    }

    const errors = await this.prisma.errorHistory.findMany({
      where,
      orderBy: { id: 'desc' },
      take: options?.limit || 100,
      include: {
        project: {
          select: { name: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return errors.map((error) => ({
      ...error,
      context: error.contextJson ? JSON.parse(error.contextJson) : null,
    }));
  }

  /**
   * Mark an error as resolved with resolution details
   */
  async resolveError(errorId: number, resolution: ErrorResolution): Promise<any> {
    const error = await this.prisma.errorHistory.findUnique({
      where: { id: errorId },
    });

    if (!error) {
      throw new NotFoundException(`Error with ID ${errorId} not found`);
    }

    const updated = await this.prisma.errorHistory.update({
      where: { id: errorId },
      data: {
        resolvedAt: new Date(),
        resolution: resolution.resolution,
        resolutionAgent: resolution.resolutionAgent,
      },
    });

    return {
      ...updated,
      context: updated.contextJson ? JSON.parse(updated.contextJson) : null,
    };
  }

  /**
   * Find similar resolved errors (for retry workers and agents)
   * Uses basic string similarity - can be enhanced with embeddings later
   */
  async findSimilarErrors(
    errorMessage: string,
    projectId: string,
    options?: {
      errorType?: ErrorType;
      limit?: number;
    },
  ): Promise<SimilarError[]> {
    // Get all resolved errors from this project
    const where: any = {
      resolvedAt: { not: null },
      projectId,
    };

    if (options?.errorType) {
      where.errorType = options.errorType;
    }

    const resolvedErrors = await this.prisma.errorHistory.findMany({
      where,
      orderBy: { resolvedAt: 'desc' },
      take: 50, // Get recent resolved errors
    });

    // Calculate similarity scores
    const similarities = resolvedErrors.map((error) => ({
      id: error.id,
      errorMessage: error.errorMessage,
      errorType: error.errorType,
      resolution: error.resolution,
      resolutionAgent: error.resolutionAgent,
      similarity: this.calculateSimilarity(errorMessage, error.errorMessage),
    }));

    // Sort by similarity and return top matches
    const topMatches = similarities
      .filter((s) => s.similarity > 0.3) // Minimum 30% similarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options?.limit || 10);

    return topMatches;
  }

  /**
   * Get error context for retry workers
   * Returns all errors for a specific task, including similar resolved errors
   */
  async getErrorContextForRetry(taskId: string): Promise<{
    taskErrors: any[];
    similarResolutions: SimilarError[];
  }> {
    const taskErrors = await this.prisma.errorHistory.findMany({
      where: { taskId },
      orderBy: { id: 'desc' },
    });

    if (taskErrors.length === 0) {
      return { taskErrors: [], similarResolutions: [] };
    }

    // Get the most recent error message
    const latestError = taskErrors[0];
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });

    if (!task) {
      return {
        taskErrors: taskErrors.map((e) => ({
          ...e,
          context: e.contextJson ? JSON.parse(e.contextJson) : null,
        })),
        similarResolutions: [],
      };
    }

    // Find similar resolved errors
    const similarResolutions = await this.findSimilarErrors(
      latestError.errorMessage,
      task.projectId,
      { errorType: latestError.errorType, limit: 5 },
    );

    return {
      taskErrors: taskErrors.map((e) => ({
        ...e,
        context: e.contextJson ? JSON.parse(e.contextJson) : null,
      })),
      similarResolutions,
    };
  }

  /**
   * Get error statistics for a project
   */
  async getErrorStatistics(projectId: string): Promise<{
    totalErrors: number;
    resolvedErrors: number;
    unresolvedErrors: number;
    errorsByType: Record<string, number>;
    mostCommonErrors: Array<{ errorMessage: string; count: number }>;
  }> {
    const errors = await this.prisma.errorHistory.findMany({
      where: { projectId },
      select: {
        errorType: true,
        errorMessage: true,
        resolvedAt: true,
      },
    });

    const totalErrors = errors.length;
    const resolvedErrors = errors.filter((e) => e.resolvedAt !== null).length;
    const unresolvedErrors = totalErrors - resolvedErrors;

    // Group by error type
    const errorsByType: Record<string, number> = {};
    errors.forEach((e) => {
      errorsByType[e.errorType] = (errorsByType[e.errorType] || 0) + 1;
    });

    // Find most common error messages
    const messageCounts: Record<string, number> = {};
    errors.forEach((e) => {
      // Truncate long messages for grouping
      const shortMessage = e.errorMessage.substring(0, 100);
      messageCounts[shortMessage] = (messageCounts[shortMessage] || 0) + 1;
    });

    const mostCommonErrors = Object.entries(messageCounts)
      .map(([errorMessage, count]) => ({ errorMessage, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      resolvedErrors,
      unresolvedErrors,
      errorsByType,
      mostCommonErrors,
    };
  }

  /**
   * Simple string similarity calculation (Levenshtein distance)
   * Can be replaced with embeddings-based similarity later
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
