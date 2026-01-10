import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';

@Controller('api/escalations')
@UseGuards(JwtAuthGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Post()
  async createEscalation(@Body() createEscalationDto: CreateEscalationDto) {
    return this.escalationsService.createEscalation(createEscalationDto);
  }

  @Get()
  async getEscalations(
    @Query('projectId') projectId: string,
    @Query('status') status?: 'pending' | 'resolved',
    @Query('severity') severity?: 'critical' | 'high' | 'medium' | 'low',
    @Query('escalationType') escalationType?: string,
  ) {
    const options: any = {};
    if (status) options.status = status;
    if (severity) options.severity = severity;
    if (escalationType) options.escalationType = escalationType;

    return this.escalationsService.getEscalations(projectId, options);
  }

  @Get('pending/:projectId')
  async getPendingEscalations(@Param('projectId') projectId: string) {
    return this.escalationsService.getPendingEscalations(projectId);
  }

  @Get(':id')
  async getEscalation(@Param('id') id: string) {
    return this.escalationsService.getEscalation(id);
  }

  @Post(':id/resolve')
  async resolveEscalation(
    @Param('id') id: string,
    @Body() resolveEscalationDto: ResolveEscalationDto,
  ) {
    return this.escalationsService.resolveEscalation(id, resolveEscalationDto);
  }

  @Get('statistics/:projectId')
  async getEscalationStatistics(@Param('projectId') projectId: string) {
    return this.escalationsService.getEscalationStatistics(projectId);
  }
}
