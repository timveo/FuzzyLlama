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
import { ApproveDeliverableDto } from './dto/approve-deliverable.dto';

@Controller('api/deliverables')
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
    @Query('gateId') gateId?: string,
    @Query('status') status?: 'pending' | 'in_progress' | 'completed' | 'approved',
    @Query('deliverableType') deliverableType?: string,
  ) {
    const options: any = {};
    if (gateId) options.gateId = gateId;
    if (status) options.status = status;
    if (deliverableType) options.deliverableType = deliverableType;

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

  @Post(':id/approve')
  async approveDeliverable(
    @Param('id') id: string,
    @Body() approveDeliverableDto: ApproveDeliverableDto,
  ) {
    return this.deliverablesService.approveDeliverable(
      id,
      approveDeliverableDto.approvedBy,
    );
  }

  @Delete(':id')
  async deleteDeliverable(@Param('id') id: string) {
    await this.deliverablesService.deleteDeliverable(id);
    return { success: true };
  }
}
