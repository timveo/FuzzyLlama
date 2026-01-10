import { Module } from '@nestjs/common';
import { EscalationsController } from './escalations.controller';
import { EscalationsService } from './escalations.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EscalationsController],
  providers: [EscalationsService],
  exports: [EscalationsService],
})
export class EscalationsModule {}
