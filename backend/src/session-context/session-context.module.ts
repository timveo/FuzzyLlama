import { Module } from '@nestjs/common';
import { SessionContextController } from './session-context.controller';
import { SessionContextService } from './session-context.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SessionContextController],
  providers: [SessionContextService],
  exports: [SessionContextService],
})
export class SessionContextModule {}
