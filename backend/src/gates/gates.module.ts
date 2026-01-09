import { Module } from '@nestjs/common';
import { GatesService } from './gates.service';
import { GatesController } from './gates.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GatesController],
  providers: [GatesService],
  exports: [GatesService],
})
export class GatesModule {}
