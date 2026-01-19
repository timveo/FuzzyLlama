import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueryType, QueryStatus } from '@prisma/client';

export interface CreateQueryInput {
  projectId: string;
  fromAgent: string;
  toAgent: string;
  type: QueryType;
  question: string;
}

export interface AnswerQueryInput {
  answer: string;
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
    return this.prisma.query.create({
      data: {
        projectId: input.projectId,
        fromAgent: input.fromAgent,
        toAgent: input.toAgent,
        type: input.type,
        question: input.question,
        status: QueryStatus.pending,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get all queries for a project
   */
  async getQueries(
    projectId: string,
    options?: {
      status?: QueryStatus;
      fromAgent?: string;
      toAgent?: string;
      type?: QueryType;
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

    if (options?.type) {
      where.type = options.type;
    }

    return this.prisma.query.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get pending queries for a specific agent (inbox)
   */
  async getPendingQueries(projectId: string, toAgent: string): Promise<any[]> {
    return this.getQueries(projectId, {
      status: QueryStatus.pending,
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

    return query;
  }

  /**
   * Answer a pending query
   */
  async answerQuery(queryId: string, input: AnswerQueryInput): Promise<any> {
    const query = await this.prisma.query.findUnique({
      where: { id: queryId },
    });

    if (!query) {
      throw new NotFoundException(`Query with ID ${queryId} not found`);
    }

    if (query.status === QueryStatus.answered) {
      throw new Error('Query has already been answered');
    }

    return this.prisma.query.update({
      where: { id: queryId },
      data: {
        status: QueryStatus.answered,
        answer: input.answer,
        answeredAt: new Date(),
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Mark a query as expired
   */
  async expireQuery(queryId: string): Promise<any> {
    const query = await this.prisma.query.findUnique({
      where: { id: queryId },
    });

    if (!query) {
      throw new NotFoundException(`Query with ID ${queryId} not found`);
    }

    return this.prisma.query.update({
      where: { id: queryId },
      data: {
        status: QueryStatus.expired,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get query statistics for a project
   */
  async getQueryStatistics(projectId: string): Promise<{
    totalQueries: number;
    pendingQueries: number;
    answeredQueries: number;
    expiredQueries: number;
    queriesByAgent: Record<string, { sent: number; received: number }>;
    queriesByType: Record<string, number>;
    averageResponseTime: number | null;
  }> {
    const queries = await this.prisma.query.findMany({
      where: { projectId },
      select: {
        fromAgent: true,
        toAgent: true,
        type: true,
        status: true,
        createdAt: true,
        answeredAt: true,
      },
    });

    const totalQueries = queries.length;
    const pendingQueries = queries.filter((q) => q.status === QueryStatus.pending).length;
    const answeredQueries = queries.filter((q) => q.status === QueryStatus.answered).length;
    const expiredQueries = queries.filter((q) => q.status === QueryStatus.expired).length;

    // Group by agent (sent and received)
    const queriesByAgent: Record<string, { sent: number; received: number }> = {};

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
      queriesByType[q.type] = (queriesByType[q.type] || 0) + 1;
    });

    // Calculate average response time (in minutes)
    const answeredWithTimes = queries.filter(
      (q) => q.status === QueryStatus.answered && q.answeredAt,
    );
    let averageResponseTime: number | null = null;

    if (answeredWithTimes.length > 0) {
      const totalTime = answeredWithTimes.reduce((sum, q) => {
        const created = new Date(q.createdAt).getTime();
        const answered = new Date(q.answeredAt!).getTime();
        return sum + (answered - created);
      }, 0);

      averageResponseTime = totalTime / answeredWithTimes.length / (1000 * 60); // Convert to minutes
    }

    return {
      totalQueries,
      pendingQueries,
      answeredQueries,
      expiredQueries,
      queriesByAgent,
      queriesByType,
      averageResponseTime,
    };
  }

  /**
   * Get query thread (related queries between same agents)
   */
  async getQueryThread(projectId: string, agent1: string, agent2: string): Promise<any[]> {
    return this.prisma.query.findMany({
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
  }
}
