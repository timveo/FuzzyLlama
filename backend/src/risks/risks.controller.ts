import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RisksService } from './risks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRiskDto } from './dto/create-risk.dto';
import { MitigateRiskDto } from './dto/mitigate-risk.dto';

@Controller('risks')
@UseGuards(JwtAuthGuard)
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  async createRisk(@Body() createRiskDto: CreateRiskDto) {
    return this.risksService.createRisk(createRiskDto);
  }

  @Get()
  async getRisks(
    @Query('projectId') projectId: string,
    @Query('status') status?: 'identified' | 'mitigated' | 'occurred',
    @Query('impact') impact?: 'critical' | 'high' | 'medium' | 'low',
  ) {
    const options: any = {};
    if (status) options.status = status;
    if (impact) options.impact = impact;

    return this.risksService.getRisks(projectId, options);
  }

  @Get(':id')
  async getRisk(@Param('id') id: string) {
    return this.risksService.getRisk(id);
  }

  @Post(':id/mitigate')
  async mitigateRisk(@Param('id') id: string, @Body() mitigateRiskDto: MitigateRiskDto) {
    return this.risksService.mitigateRisk(id, mitigateRiskDto);
  }

  @Post(':id/occurred')
  async markRiskOccurred(@Param('id') id: string) {
    return this.risksService.markRiskOccurred(id);
  }
}
