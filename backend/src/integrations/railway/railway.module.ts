import { Module } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { RailwayController } from './railway.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CodeGenerationModule } from '../../code-generation/code-generation.module';

@Module({
  imports: [PrismaModule, CodeGenerationModule],
  controllers: [RailwayController],
  providers: [RailwayService],
  exports: [RailwayService],
})
export class RailwayModule {}
