import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { QueueManagerService } from './queue-manager.service';
import { AgentWorkerService } from './agent-worker.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AgentsModule } from '../agents/agents.module';

/**
 * QueueModule - Priority Task Queue System
 *
 * Implements 4-tier priority queue system:
 * - Critical: Orchestrator, gate approvals (concurrency: 5)
 * - High: Gate-blocking agents (PM, Architect, QA) (concurrency: 3)
 * - Medium: Code generation agents (concurrency: 2)
 * - Low: Analytics, cleanup (concurrency: 1)
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500, // Keep last 500 failed jobs for debugging
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    // Register 4 priority queues
    BullModule.registerQueue(
      { name: 'agents-critical' },
      { name: 'agents-high' },
      { name: 'agents-medium' },
      { name: 'agents-low' },
    ),
    PrismaModule,
    AgentsModule,
  ],
  providers: [QueueManagerService, AgentWorkerService],
  exports: [QueueManagerService],
})
export class QueueModule {}
