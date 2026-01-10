import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { AgentExecutionService } from '../agents/services/agent-execution.service';
import { AgentJob } from './queue-manager.service';
import { PrometheusMetricsService } from '../observability/metrics.service';

/**
 * AgentWorkerService - Worker Processes for Agent Execution
 *
 * Runs workers for each priority queue with different concurrency:
 * - Critical: 5 concurrent jobs
 * - High: 3 concurrent jobs
 * - Medium: 2 concurrent jobs
 * - Low: 1 concurrent job
 *
 * This ensures high-priority work is never blocked by low-priority tasks.
 */
@Injectable()
export class AgentWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AgentWorkerService.name);

  constructor(
    @InjectQueue('agents-critical') private criticalQueue: Queue,
    @InjectQueue('agents-high') private highQueue: Queue,
    @InjectQueue('agents-medium') private mediumQueue: Queue,
    @InjectQueue('agents-low') private lowQueue: Queue,
    private readonly agentExecution: AgentExecutionService,
    private readonly metrics: PrometheusMetricsService,
  ) {}

  onModuleInit() {
    this.logger.log('Agent workers initialized');
    this.logger.log('Critical queue: 5 concurrent workers');
    this.logger.log('High queue: 3 concurrent workers');
    this.logger.log('Medium queue: 2 concurrent workers');
    this.logger.log('Low queue: 1 concurrent worker');
  }

  /**
   * Process all agent jobs
   * Note: In NestJS Bull, the @Processor decorator is class-level
   * For multi-queue processing, use separate processor classes or
   * handle via queue name in the job data
   */
  @Process()
  async processAgentJobFromQueue(job: Job<AgentJob>): Promise<any> {
    const priority = job.data.priority || 'MEDIUM';
    return this.processAgentJob(job, priority);
  }

  /**
   * Process agent job (shared logic)
   */
  private async processAgentJob(job: Job<AgentJob>, priority: string): Promise<any> {
    const startTime = Date.now();

    this.logger.log(
      `[${priority}] Processing job ${job.id} (${job.data.agentType}) - Attempt ${job.attemptsMade + 1}/${job.opts.attempts}`,
    );

    try {
      // Execute agent via AgentExecutionService
      const result = await this.agentExecution.executeAgent(
        {
          projectId: job.data.projectId,
          agentType: job.data.agentType,
          userPrompt: job.data.userPrompt,
          model: job.data.model as any, // Cast from string to AIModel enum
          inputs: job.data.inputs,
        },
        job.data.userId,
      );

      const duration = Date.now() - startTime;

      this.logger.log(
        `[${priority}] Job ${job.id} completed in ${(duration / 1000).toFixed(2)}s`,
      );

      // Update job progress
      await job.progress(100);

      // Track metrics
      this.metrics.trackAgentExecution(
        job.data.agentType,
        job.data.model || 'unknown',
        duration / 1000, // Convert to seconds
        result.success,
        0, // Input tokens - not tracked in current interface
        0, // Output tokens - not tracked in current interface
        0, // Cost - not tracked in current interface
      );

      this.metrics.queueProcessingDuration
        .labels(priority.toLowerCase(), job.data.agentType)
        .observe(duration / 1000);

      return {
        success: result.success,
        output: result.output,
        nextAgent: result.nextAgent,
        gateReady: result.gateReady,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        `[${priority}] Job ${job.id} failed after ${(duration / 1000).toFixed(2)}s: ${(error as Error).message}`,
      );

      // Update job progress
      await job.progress(0);

      // Track failure metrics
      this.metrics.trackAgentExecution(
        job.data.agentType,
        job.data.model || 'unknown',
        duration / 1000,
        false,
        0,
        0,
        0,
      );

      this.metrics.errors.labels('agent_execution', 'error').inc();

      throw error; // BullMQ will handle retries
    }
  }

  /**
   * Job completed handler
   */
  @OnQueueCompleted()
  async onCompleted(job: Job<AgentJob>, result: any): Promise<void> {
    this.logger.log(
      `Job ${job.id} completed successfully - Output: ${result?.output?.substring(0, 100) || 'unknown'}...`,
    );
  }

  /**
   * Job failed handler
   */
  @OnQueueFailed()
  async onFailed(job: Job<AgentJob>, error: Error): Promise<void> {
    this.logger.error(
      `Job ${job.id} failed permanently after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // Could send notification, create escalation, etc.
  }
}
