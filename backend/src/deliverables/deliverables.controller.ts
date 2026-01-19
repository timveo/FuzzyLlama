import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { DeliverableStatus } from '@prisma/client';

@Controller('deliverables')
@UseGuards(JwtAuthGuard)
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post()
  async createDeliverable(@Body() createDeliverableDto: CreateDeliverableDto) {
    return this.deliverablesService.createDeliverable(createDeliverableDto);
  }

  @Get()
  async getDeliverables(
    @Query('projectId') projectId: string,
    @Query('status') status?: DeliverableStatus,
    @Query('owner') owner?: string,
  ) {
    const options: { status?: DeliverableStatus; owner?: string } = {};
    if (status) options.status = status;
    if (owner) options.owner = owner;

    return this.deliverablesService.getDeliverables(projectId, options);
  }

  @Get(':id')
  async getDeliverable(@Param('id') id: string) {
    return this.deliverablesService.getDeliverable(id);
  }

  @Patch(':id')
  async updateDeliverable(
    @Param('id') id: string,
    @Body() updateDeliverableDto: UpdateDeliverableDto,
  ) {
    return this.deliverablesService.updateDeliverable(id, updateDeliverableDto);
  }

  @Post(':id/complete')
  async markComplete(@Param('id') id: string) {
    return this.deliverablesService.markComplete(id);
  }

  @Post(':id/in-progress')
  async markInProgress(@Param('id') id: string) {
    return this.deliverablesService.markInProgress(id);
  }

  @Post(':id/in-review')
  async markInReview(@Param('id') id: string) {
    return this.deliverablesService.markInReview(id);
  }

  @Delete(':id')
  async deleteDeliverable(@Param('id') id: string) {
    await this.deliverablesService.deleteDeliverable(id);
    return { success: true };
  }

  @Get('statistics/:projectId')
  async getStatistics(@Param('projectId') projectId: string) {
    return this.deliverablesService.getDeliverableStatistics(projectId);
  }
}
