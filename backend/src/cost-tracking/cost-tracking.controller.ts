import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CostTrackingService } from './cost-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('costs')
@UseGuards(JwtAuthGuard)
export class CostTrackingController {
  constructor(private readonly costTrackingService: CostTrackingService) {}

  /**
   * GET /api/costs/project/:projectId/per-gate
   * Get costs breakdown by gate for a project
   */
  @Get('project/:projectId/per-gate')
  async getCostsPerGate(@Param('projectId') projectId: string) {
    return this.costTrackingService.getCostsPerGate(projectId);
  }

  /**
   * GET /api/costs/project/:projectId
   * Get total project costs with breakdowns
   */
  @Get('project/:projectId')
  async getProjectCosts(@Param('projectId') projectId: string) {
    return this.costTrackingService.getProjectCosts(projectId);
  }

  /**
   * GET /api/costs/user/:userId
   * Get usage metrics for a user
   */
  @Get('user/:userId')
  async getUserUsage(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.costTrackingService.getUserUsage(userId, start, end);
  }

  /**
   * GET /api/costs/estimate/:gateType
   * Get cost estimate for a gate type based on historical data
   */
  @Get('estimate/:gateType')
  async estimateGateCost(@Param('gateType') gateType: string) {
    return this.costTrackingService.estimateGateCost(gateType);
  }
}
