import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateQueryInput {
  projectId: string;
  fromAgent: string;
  toAgent: string;
  queryType: string;
  question: string;
  context?: Record<string, any>;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface AnswerQueryInput {
  answer: string;
  answeredBy: string;
  answerContext?: Record<string, any>;
}

/**
 * QueriesService - Inter-agent communication and questions
 *
 * Purpose:
 * - Enable agents to ask questions to other agents
 * - Track unanswered queries
 * - Provide context for agent decision-making
 * - Audit agent communication patterns
 *
 * Use Cases:
 * 1. Backend agent needs clarification from frontend agent
 * 2. QA agent asks developer about test coverage expectations
 * 3. Security agent queries architect about authentication approach
 * 4. Orchestrator routes questions to appropriate agents
 */
@Injectable()
export class QueriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new inter-agent query
   */
  async createQuery(input: CreateQueryInput): Promise<any> {
    const query = await this.prisma.query.create({
      data: {
        projectId: input.projectId,
        fromAgent: input.fromAgent,
        toAgent: input.toAgent,
        queryType: input.queryType,
        question: input.question,
        context: input.context ? JSON.stringify(input.context) : null,
        priority: input.priority || 'medium',
        status: 'pending',
      },
      include: {
        project: { select: { name: true } },
      },
    });

    return {
      ...query,
      context: query.context ? JSON.parse(query.context as string) : null,
    };
  }

  /**
   * Get all queries for a project
   */
  async getQueries(
    projectId: string,
    options?: {
      status?: 'pending' | 'answered';
      fromAgent?: string;
      toAgent?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low';
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.fromAgent) {
      where.fromAgent = options.fromAgent;
    }

    if (options?.toAgent) {
      where.toAgent = options.toAgent;
    }

    if (options?.priority) {
      where.priority = options.priority;
    }

    const queries = await this.prisma.query.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
      },
    });

    return queries.map((query) => ({
      ...query,
      context: query.context ? JSON.parse(query.context as string) : null,
      answerContext: query.answerContext
        ? JSON.parse(query.answerContext as string)
        : null,
    }));
  }

  /**
   * Get pending queries for a specific agent (inbox)
   */
  async getPendingQueries(
    projectId: string,
    toAgent: string,
  ): Promise<any[]> {
    return this.getQueries(projectId, {
      status: 'pending',
      toAgent,
    });
  }

  /**
   * Get a single query by ID
   */
  async getQuery(queryId: string): Promise<any> {
    const query = await this.prisma.query.findUnique({
      where: { id: queryId },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!query) {
      throw new NotFoundException(`Query with ID ${queryId} not found`);
    }

    return {
      ...query,
      context: query.context ? JSON.parse(query.context as string) : null,
      answerContext: query.answerContext
        ? JSON.parse(query.answerContext as string)
        : null,
    };
  }

  /**
   * Answer a pending query
   */
  async answerQuery(
    queryId: string,
    input: AnswerQueryInput,
  ): Promise<any> {
    const query = await this.prisma.query.findUnique({
      where: { id: queryId },
    });

    if (!query) {
      throw new NotFoundException(`Query with ID ${queryId} not found`);
    }

    if (query.status === 'answered') {
      throw new Error('Query has already been answered');
    }

    const updated = await this.prisma.query.update({
      where: { id: queryId },
      data: {
        status: 'answered',
        answer: input.answer,
        answeredBy: input.answeredBy,
        answeredAt: new Date(),
        answerContext: input.answerContext
          ? JSON.stringify(input.answerContext)
          : null,
      },
      include: {
        project: { select: { name: true } },
      },
    });

    return {
      ...updated,
      context: updated.context ? JSON.parse(updated.context as string) : null,
      answerContext: updated.answerContext
        ? JSON.parse(updated.answerContext as string)
        : null,
    };
  }

  /**
   * Get query statistics for a project
   */
  async getQueryStatistics(projectId: string): Promise<{
    totalQueries: number;
    pendingQueries: number;
    answeredQueries: number;
    queriesByAgent: Record<string, { sent: number; received: number }>;
    queriesByType: Record<string, number>;
    averageResponseTime: number | null;
  }> {
    const queries = await this.prisma.query.findMany({
      where: { projectId },
      select: {
        fromAgent: true,
        toAgent: true,
        queryType: true,
        status: true,
        createdAt: true,
        answeredAt: true,
      },
    });

    const totalQueries = queries.length;
    const pendingQueries = queries.filter((q) => q.status === 'pending').length;
    const answeredQueries = queries.filter(
      (q) => q.status === 'answered',
    ).length;

    // Group by agent (sent and received)
    const queriesByAgent: Record<string, { sent: number; received: number }> =
      {};

    queries.forEach((q) => {
      if (!queriesByAgent[q.fromAgent]) {
        queriesByAgent[q.fromAgent] = { sent: 0, received: 0 };
      }
      if (!queriesByAgent[q.toAgent]) {
        queriesByAgent[q.toAgent] = { sent: 0, received: 0 };
      }

      queriesByAgent[q.fromAgent].sent++;
      queriesByAgent[q.toAgent].received++;
    });

    // Group by query type
    const queriesByType: Record<string, number> = {};
    queries.forEach((q) => {
      queriesByType[q.queryType] = (queriesByType[q.queryType] || 0) + 1;
    });

    // Calculate average response time (in minutes)
    const answeredWithTimes = queries.filter(
      (q) => q.status === 'answered' && q.answeredAt,
    );
    let averageResponseTime: number | null = null;

    if (answeredWithTimes.length > 0) {
      const totalTime = answeredWithTimes.reduce((sum, q) => {
        const created = new Date(q.createdAt).getTime();
        const answered = new Date(q.answeredAt!).getTime();
        return sum + (answered - created);
      }, 0);

      averageResponseTime =
        totalTime / answeredWithTimes.length / (1000 * 60); // Convert to minutes
    }

    return {
      totalQueries,
      pendingQueries,
      answeredQueries,
      queriesByAgent,
      queriesByType,
      averageResponseTime,
    };
  }

  /**
   * Get query thread (related queries between same agents)
   */
  async getQueryThread(
    projectId: string,
    agent1: string,
    agent2: string,
  ): Promise<any[]> {
    const queries = await this.prisma.query.findMany({
      where: {
        projectId,
        OR: [
          { fromAgent: agent1, toAgent: agent2 },
          { fromAgent: agent2, toAgent: agent1 },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        project: { select: { name: true } },
      },
    });

    return queries.map((query) => ({
      ...query,
      context: query.context ? JSON.parse(query.context as string) : null,
      answerContext: query.answerContext
        ? JSON.parse(query.answerContext as string)
        : null,
    }));
  }
}
