import { Module } from '@nestjs/common';
import { GatesService } from './gates.service';
import { GatesController } from './gates.controller';
import { GateStateMachineService } from './services/gate-state-machine.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GatesController],
  providers: [GatesService, GateStateMachineService],
  exports: [GatesService, GateStateMachineService],
})
export class GatesModule {}
