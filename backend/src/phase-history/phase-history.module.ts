import { Module } from '@nestjs/common';
import { PhaseHistoryController } from './phase-history.controller';
import { PhaseHistoryService } from './phase-history.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PhaseHistoryController],
  providers: [PhaseHistoryService],
  exports: [PhaseHistoryService],
})
export class PhaseHistoryModule {}
