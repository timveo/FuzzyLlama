import { Module } from '@nestjs/common';
import { StateSyncService } from './state-sync.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CodeGenerationModule } from '../code-generation/code-generation.module';

@Module({
  imports: [PrismaModule, CodeGenerationModule],
  providers: [StateSyncService],
  exports: [StateSyncService],
})
export class StateSyncModule {}
