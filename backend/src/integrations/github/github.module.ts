import { Module, forwardRef } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubController } from './github.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CodeGenerationModule } from '../../code-generation/code-generation.module';
import { AssetsModule } from '../../assets/assets.module';
import { StorageModule } from '../../storage/storage.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CodeGenerationModule,
    forwardRef(() => AssetsModule),
    StorageModule,
    AuthModule,
  ],
  controllers: [GitHubController],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}
