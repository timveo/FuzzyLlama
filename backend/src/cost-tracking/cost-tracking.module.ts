import { Module } from '@nestjs/common';
import { CostTrackingController } from './cost-tracking.controller';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostTrackingController],
  providers: [CostTrackingService],
  exports: [CostTrackingService],
})
export class CostTrackingModule {}
