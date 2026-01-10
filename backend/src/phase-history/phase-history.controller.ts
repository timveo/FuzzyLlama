import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PhaseHistoryService } from './phase-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StartPhaseDto } from './dto/start-phase.dto';
import { CompletePhaseDto } from './dto/complete-phase.dto';

@Controller('api/phase-history')
@UseGuards(JwtAuthGuard)
export class PhaseHistoryController {
  constructor(private readonly phaseHistoryService: PhaseHistoryService) {}

  @Post('start')
  async startPhase(@Body() startPhaseDto: StartPhaseDto) {
    return this.phaseHistoryService.startPhase(startPhaseDto);
  }

  @Post(':id/complete')
  async completePhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() completePhaseDto: CompletePhaseDto,
  ) {
    return this.phaseHistoryService.completePhase(id, completePhaseDto);
  }

  @Get(':projectId')
  async getPhaseHistory(@Param('projectId') projectId: string) {
    return this.phaseHistoryService.getPhaseHistory(projectId);
  }

  @Get('current/:projectId')
  async getCurrentPhase(@Param('projectId') projectId: string) {
    return this.phaseHistoryService.getCurrentPhase(projectId);
  }
}
