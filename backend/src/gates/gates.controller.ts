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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GatesService } from './gates.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';
import { ApproveGateDto } from './dto/approve-gate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('gates')
@Controller('gates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new gate' })
  @ApiResponse({ status: 201, description: 'Gate created successfully' })
  @ApiResponse({ status: 403, description: 'Cannot create gate for project you do not own' })
  async create(
    @Body() createGateDto: CreateGateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.create(createGateDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all gates for a project' })
  @ApiResponse({ status: 200, description: 'Gates retrieved successfully' })
  async findAll(
    @Query('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.findAll(projectId, user.id);
  }

  @Get('current/:projectId')
  @ApiOperation({ summary: 'Get the current active gate for a project' })
  @ApiResponse({ status: 200, description: 'Current gate retrieved successfully' })
  async getCurrentGate(
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.getCurrentGate(projectId, user.id);
  }

  @Get('stats/:projectId')
  @ApiOperation({ summary: 'Get gate statistics for a project' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGateStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.getGateStats(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific gate by ID' })
  @ApiResponse({ status: 200, description: 'Gate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Gate not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.gatesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a gate' })
  @ApiResponse({ status: 200, description: 'Gate updated successfully' })
  @ApiResponse({ status: 404, description: 'Gate not found' })
  async update(
    @Param('id') id: string,
    @Body() updateGateDto: UpdateGateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.update(id, updateGateDto, user.id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve or reject a gate' })
  @ApiResponse({ status: 200, description: 'Gate approval processed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot approve gate without required proof artifacts' })
  @ApiResponse({ status: 404, description: 'Gate not found' })
  async approve(
    @Param('id') id: string,
    @Body() approveGateDto: ApproveGateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gatesService.approve(id, approveGateDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gate' })
  @ApiResponse({ status: 200, description: 'Gate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Gate not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.gatesService.delete(id, user.id);
  }
}
