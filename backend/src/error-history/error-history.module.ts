import { Module } from '@nestjs/common';
import { ErrorHistoryController } from './error-history.controller';
import { ErrorHistoryService } from './error-history.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ErrorHistoryController],
  providers: [ErrorHistoryService],
  exports: [ErrorHistoryService],
})
export class ErrorHistoryModule {}
