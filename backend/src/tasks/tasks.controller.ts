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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Cannot create task for project you do not own' })
  @ApiResponse({ status: 404, description: 'Project or parent task not found' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Cannot view tasks for project you do not own' })
  async findAll(
    @Query('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.findAll(projectId, user.id);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get all tasks for an agent' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async getTasksByAgent(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.getTasksByAgent(agentId, user.id);
  }

  @Get('stats/:projectId')
  @ApiOperation({ summary: 'Get task statistics for a project' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTaskStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.getTaskStats(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.delete(id, user.id);
  }
}
