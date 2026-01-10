import { Module } from '@nestjs/common';
import { BlockersController } from './blockers.controller';
import { BlockersService } from './blockers.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BlockersController],
  providers: [BlockersService],
  exports: [BlockersService],
})
export class BlockersModule {}
