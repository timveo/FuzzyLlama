import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JourneyService } from './journey.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/user.types';

@ApiTags('journey')
@Controller('journey')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get(':projectId')
  @ApiOperation({ summary: 'Get complete journey data for a project' })
  @ApiResponse({
    status: 200,
    description: 'Journey data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Cannot view journey for project you do not own' })
  async getJourney(@Param('projectId') projectId: string, @CurrentUser() user: RequestUser) {
    return this.journeyService.getJourney(projectId, user.id);
  }
}
