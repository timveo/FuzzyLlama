import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubController } from './github.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CodeGenerationModule } from '../../code-generation/code-generation.module';

@Module({
  imports: [PrismaModule, CodeGenerationModule],
  controllers: [GitHubController],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}
