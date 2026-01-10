import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMetricsDto } from './dto/update-metrics.dto';

@Controller('api/metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post(':projectId')
  async updateMetrics(
    @Param('projectId') projectId: string,
    @Body() updateMetricsDto: UpdateMetricsDto,
  ) {
    return this.metricsService.updateMetrics(projectId, updateMetricsDto);
  }

  @Get(':projectId')
  async getMetrics(@Param('projectId') projectId: string) {
    return this.metricsService.getMetrics(projectId);
  }

  @Post('calculate/:projectId')
  async calculateMetrics(@Param('projectId') projectId: string) {
    return this.metricsService.calculateMetrics(projectId);
  }
}
