import { Module, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { SentryService } from './sentry.service';
import { PrometheusMetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [TracingService, SentryService, PrometheusMetricsService],
  exports: [TracingService, SentryService, PrometheusMetricsService],
})
export class ObservabilityModule {}
