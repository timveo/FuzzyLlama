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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SpecificationsService } from './specifications.service';
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { UpdateSpecificationDto } from './dto/update-specification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/user.types';

@ApiTags('specifications')
@Controller('specifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SpecificationsController {
  constructor(private readonly specificationsService: SpecificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new specification' })
  @ApiResponse({ status: 201, description: 'Specification created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Cannot create specification for project you do not own',
  })
  async create(
    @Body() createSpecificationDto: CreateSpecificationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specificationsService.create(createSpecificationDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all specifications for a project' })
  @ApiQuery({
    name: 'specificationType',
    required: false,
    description: 'Filter by specification type',
  })
  @ApiResponse({
    status: 200,
    description: 'Specifications retrieved successfully',
  })
  async findAll(
    @Query('projectId') projectId: string,
    @Query('specificationType') specificationType: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specificationsService.findAll(projectId, user.id, specificationType);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get all specifications created by an agent' })
  @ApiResponse({
    status: 200,
    description: 'Specifications retrieved successfully',
  })
  async getSpecificationsByAgent(
    @Param('agentId') agentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specificationsService.getSpecificationsByAgent(agentId, user.id);
  }

  @Get('stats/:projectId')
  @ApiOperation({ summary: 'Get specification statistics for a project' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSpecificationStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specificationsService.getSpecificationStats(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific specification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Specification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.specificationsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specification' })
  @ApiResponse({
    status: 200,
    description: 'Specification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSpecificationDto: UpdateSpecificationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specificationsService.update(id, updateSpecificationDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specification' })
  @ApiResponse({
    status: 200,
    description: 'Specification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.specificationsService.delete(id, user.id);
  }
}
