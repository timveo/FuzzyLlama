import { Module } from '@nestjs/common';
import { GatesService } from './gates.service';
import { GatesController } from './gates.controller';
import { GateStateMachineService } from './services/gate-state-machine.service';
import { G1PresentationService } from './services/g1-presentation.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RisksModule } from '../risks/risks.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { DeliverablesModule } from '../deliverables/deliverables.module';

@Module({
  imports: [PrismaModule, RisksModule, DecisionsModule, DeliverablesModule],
  controllers: [GatesController],
  providers: [GatesService, GateStateMachineService, G1PresentationService],
  exports: [GatesService, GateStateMachineService, G1PresentationService],
})
export class GatesModule {}
