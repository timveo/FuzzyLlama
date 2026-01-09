import { Module } from '@nestjs/common';
import { SpecificationsService } from './specifications.service';
import { SpecificationsController } from './specifications.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecificationsController],
  providers: [SpecificationsService],
  exports: [SpecificationsService],
})
export class SpecificationsModule {}
