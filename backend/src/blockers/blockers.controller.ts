import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BlockersService } from './blockers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBlockerDto } from './dto/create-blocker.dto';
import { ResolveBlockerDto } from './dto/resolve-blocker.dto';
import { EscalateBlockerDto } from './dto/escalate-blocker.dto';

@Controller('api/blockers')
@UseGuards(JwtAuthGuard)
export class BlockersController {
  constructor(private readonly blockersService: BlockersService) {}

  /**
   * POST /api/blockers
   * Create a new blocker
   */
  @Post()
  async createBlocker(@Body() createBlockerDto: CreateBlockerDto) {
    return this.blockersService.createBlocker(createBlockerDto);
  }

  /**
   * GET /api/blockers?projectId=...&status=open&severity=critical
   * Get blockers with optional filters
   */
  @Get()
  async getBlockers(
    @Query('projectId') projectId: string,
    @Query('status') status?: 'open' | 'resolved' | 'escalated',
    @Query('severity') severity?: 'critical' | 'high' | 'medium' | 'low',
    @Query('taskId') taskId?: string,
    @Query('gateId') gateId?: string,
  ) {
    const options: any = {};

    if (status) options.status = status;
    if (severity) options.severity = severity;
    if (taskId) options.taskId = taskId;
    if (gateId) options.gateId = gateId;

    return this.blockersService.getBlockers(projectId, options);
  }

  /**
   * GET /api/blockers/active/:projectId
   * Get all active (unresolved) blockers
   */
  @Get('active/:projectId')
  async getActiveBlockers(@Param('projectId') projectId: string) {
    return this.blockersService.getActiveBlockers(projectId);
  }

  /**
   * GET /api/blockers/:id
   * Get a single blocker by ID
   */
  @Get(':id')
  async getBlocker(@Param('id') id: string) {
    return this.blockersService.getBlocker(id);
  }

  /**
   * POST /api/blockers/:id/resolve
   * Resolve a blocker
   */
  @Post(':id/resolve')
  async resolveBlocker(
    @Param('id') id: string,
    @Body() resolveBlockerDto: ResolveBlockerDto,
  ) {
    return this.blockersService.resolveBlocker(id, resolveBlockerDto);
  }

  /**
   * POST /api/blockers/:id/escalate
   * Escalate a blocker to L1/L2/L3
   */
  @Post(':id/escalate')
  async escalateBlocker(
    @Param('id') id: string,
    @Body() escalateBlockerDto: EscalateBlockerDto,
  ) {
    return this.blockersService.escalateBlocker(id, escalateBlockerDto);
  }

  /**
   * PATCH /api/blockers/:id
   * Update a blocker
   */
  @Patch(':id')
  async updateBlocker(
    @Param('id') id: string,
    @Body() updates: Partial<CreateBlockerDto>,
  ) {
    return this.blockersService.updateBlocker(id, updates);
  }

  /**
   * GET /api/blockers/statistics/:projectId
   * Get blocker statistics
   */
  @Get('statistics/:projectId')
  async getBlockerStatistics(@Param('projectId') projectId: string) {
    return this.blockersService.getBlockerStatistics(projectId);
  }
}
