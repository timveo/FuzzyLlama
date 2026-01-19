import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentGitController } from './document-git.controller';
import { GateDocumentsService } from './services/gate-documents.service';
import { DocumentGitService } from './services/document-git.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CodeGenerationModule } from '../code-generation/code-generation.module';

@Module({
  imports: [PrismaModule, CodeGenerationModule],
  controllers: [DocumentsController, DocumentGitController],
  providers: [DocumentsService, GateDocumentsService, DocumentGitService],
  exports: [DocumentsService, GateDocumentsService, DocumentGitService],
})
export class DocumentsModule {}
