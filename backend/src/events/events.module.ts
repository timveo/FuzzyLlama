import { Module } from '@nestjs/common';
import { EventStoreService } from './event-store.service';
import { ProjectionService } from './projection.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EventStoreService, ProjectionService],
  exports: [EventStoreService, ProjectionService],
})
export class EventsModule {}
