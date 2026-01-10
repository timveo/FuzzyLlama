import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionContextService } from './session-context.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveContextDto } from './dto/save-context.dto';
import { ExtendTTLDto } from './dto/extend-ttl.dto';

@Controller('api/session-context')
@UseGuards(JwtAuthGuard)
export class SessionContextController {
  constructor(
    private readonly sessionContextService: SessionContextService,
  ) {}

  @Post()
  async saveContext(@Body() saveContextDto: SaveContextDto) {
    return this.sessionContextService.saveContext(saveContextDto);
  }

  @Get(':projectId/:sessionKey')
  async loadContext(
    @Param('projectId') projectId: string,
    @Param('sessionKey') sessionKey: string,
  ) {
    return this.sessionContextService.loadContext(projectId, sessionKey);
  }

  @Get(':projectId')
  async getAllContext(
    @Param('projectId') projectId: string,
    @Query('contextType') contextType?: string,
  ) {
    return this.sessionContextService.getAllContext(projectId, contextType);
  }

  @Get(':projectId/handoff')
  async getHandoffContext(@Param('projectId') projectId: string) {
    return this.sessionContextService.getHandoffContext(projectId);
  }

  @Delete(':projectId/:sessionKey')
  async deleteContext(
    @Param('projectId') projectId: string,
    @Param('sessionKey') sessionKey: string,
  ) {
    await this.sessionContextService.deleteContext(projectId, sessionKey);
    return { success: true };
  }

  @Post('cleanup/:projectId')
  async cleanupExpired(@Param('projectId') projectId: string) {
    const deleted =
      await this.sessionContextService.cleanupProjectExpiredContext(projectId);
    return { deleted };
  }

  @Get('statistics/:projectId')
  async getStatistics(@Param('projectId') projectId: string) {
    return this.sessionContextService.getContextStatistics(projectId);
  }

  @Post(':projectId/:sessionKey/extend-ttl')
  async extendTTL(
    @Param('projectId') projectId: string,
    @Param('sessionKey') sessionKey: string,
    @Body() extendTTLDto: ExtendTTLDto,
  ) {
    return this.sessionContextService.extendTTL(
      projectId,
      sessionKey,
      extendTTLDto.additionalSeconds,
    );
  }
}
