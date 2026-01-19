import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/user.types';

@ApiTags('decisions')
@Controller('decisions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new decision' })
  @ApiResponse({ status: 201, description: 'Decision created successfully' })
  @ApiResponse({ status: 403, description: 'Cannot create decision for project you do not own' })
  async create(@Body() createDecisionDto: CreateDecisionDto, @CurrentUser() user: RequestUser) {
    return this.decisionsService.create(createDecisionDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all decisions for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'gate', required: false, description: 'Filter by gate (e.g., G0, G1)' })
  @ApiResponse({ status: 200, description: 'Decisions retrieved successfully' })
  async findAll(
    @Query('projectId') projectId: string,
    @Query('gate') gate: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.decisionsService.findAll(projectId, user.id, gate);
  }

  @Get('gate/:projectId/:gate')
  @ApiOperation({ summary: 'Get all decisions for a specific gate' })
  @ApiResponse({ status: 200, description: 'Decisions retrieved successfully' })
  async findByGate(
    @Param('projectId') projectId: string,
    @Param('gate') gate: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.decisionsService.findByGate(projectId, gate, user.id);
  }

  @Get('stats/:projectId')
  @ApiOperation({ summary: 'Get decision statistics for a project' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Param('projectId') projectId: string, @CurrentUser() user: RequestUser) {
    return this.decisionsService.getStats(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific decision by ID' })
  @ApiResponse({ status: 200, description: 'Decision retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.decisionsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a decision' })
  @ApiResponse({ status: 200, description: 'Decision updated successfully' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDecisionDto: UpdateDecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.decisionsService.update(id, updateDecisionDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a decision' })
  @ApiResponse({ status: 200, description: 'Decision deleted successfully' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.decisionsService.delete(id, user.id);
  }
}
