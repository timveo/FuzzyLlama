import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Gate metadata - static information about each gate
const GATE_METADATA: Record<number, {
  name: string;
  narrative: string;
  description: string;
  deliverables: string[];
  celebration: string;
  phase: 'plan' | 'dev' | 'ship';
}> = {
  0: {
    name: 'The Vision Takes Shape',
    narrative: 'Every great product starts with a clear "why"',
    description: 'You defined what you\'re building and why it matters. The foundation of every great product.',
    deliverables: ['Problem statement', 'Target users defined', 'Initial concept validated'],
    celebration: '🎯 Vision Set!',
    phase: 'plan',
  },
  1: {
    name: 'Requirements Crystallize',
    narrative: 'From ideas to actionable specifications',
    description: 'Product requirements fully documented. Every feature has a purpose.',
    deliverables: ['PRD document', 'User stories', 'Success metrics', 'Feature prioritization'],
    celebration: '📋 PRD Complete!',
    phase: 'plan',
  },
  2: {
    name: 'Architecture Emerges',
    narrative: 'The skeleton that supports everything',
    description: 'The skeleton of your application took form. Decisions made here echo through every feature.',
    deliverables: ['System design doc', 'Tech stack decision', 'Database schema', 'API contracts'],
    celebration: '🏗️ Foundations Laid!',
    phase: 'plan',
  },
  3: {
    name: 'Design Takes Form',
    narrative: 'Where user experience meets visual craft',
    description: 'UX/UI design completed. Users will thank you for the attention to detail.',
    deliverables: ['Wireframes', 'Design system', 'User flows', 'Prototype'],
    celebration: '🎨 Design Approved!',
    phase: 'plan',
  },
  4: {
    name: 'Core Features Alive',
    narrative: 'Ideas become reality, one function at a time',
    description: 'You\'re breathing life into essential functionality. This is where ideas become real.',
    deliverables: ['Core features', 'Basic UI', 'Database setup', 'API endpoints'],
    celebration: '⚡ MVP Built!',
    phase: 'dev',
  },
  5: {
    name: 'Feature Complete',
    narrative: 'All the pieces come together',
    description: 'All planned features implemented. Your product is taking its full shape.',
    deliverables: ['All features built', 'Integration complete', 'Error handling', 'Edge cases covered'],
    celebration: '✨ Features Done!',
    phase: 'dev',
  },
  6: {
    name: 'Integration Harmony',
    narrative: 'Making all systems sing together',
    description: 'All systems integrated and working together seamlessly.',
    deliverables: ['Third-party integrations', 'Service connections', 'Data pipelines', 'Auth flow'],
    celebration: '🔗 All Connected!',
    phase: 'dev',
  },
  7: {
    name: 'Quality Assured',
    narrative: 'Confidence through comprehensive testing',
    description: 'Comprehensive testing passed. You can deploy with confidence.',
    deliverables: ['Unit tests', 'Integration tests', 'E2E tests', 'Performance tests', 'Security audit'],
    celebration: '🧪 Tests Pass!',
    phase: 'ship',
  },
  8: {
    name: 'Deploy Ready',
    narrative: 'Production environment awaits',
    description: 'Production environment prepared. The runway is clear for launch.',
    deliverables: ['CI/CD pipeline', 'Monitoring setup', 'Logging configured', 'Backup strategy'],
    celebration: '🚀 Ready to Launch!',
    phase: 'ship',
  },
  9: {
    name: 'Live & Learning',
    narrative: 'Your creation meets the world',
    description: 'Product successfully launched! Real users, real feedback, real impact.',
    deliverables: ['Production deployment', 'User onboarding', 'Documentation', 'Support process'],
    celebration: '🎉 You Shipped!',
    phase: 'ship',
  },
};

export interface GateJourneyData {
  gateNumber: number;
  gateType: string;
  status: 'completed' | 'current' | 'upcoming';
  metadata: {
    name: string;
    narrative: string;
    description: string;
    deliverables: string[];
    celebration: string;
    phase: 'plan' | 'dev' | 'ship';
  };
  tasks: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  decisions: Array<{
    id: number;
    choice: string;
    reason: string;
    agent: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
  }>;
  approvedAt?: string;
  approvedBy?: {
    id: string;
    name: string;
  };
}

export interface JourneyData {
  projectId: string;
  projectName: string;
  currentGate: number;
  currentPhase: 'plan' | 'dev' | 'ship';
  progressPercentage: number;
  totalGates: number;
  completedGates: number;
  gates: GateJourneyData[];
}

@Injectable()
export class JourneyService {
  constructor(private prisma: PrismaService) {}

  async getJourney(projectId: string, userId: string): Promise<JourneyData> {
    // Verify project ownership and get project details
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        state: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view journey for your own projects');
    }

    // Get all gates for the project
    const gates = await this.prisma.gate.findMany({
      where: { projectId },
      include: {
        proofArtifacts: true,
        approvedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all tasks for the project
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        status: true,
        phase: true,
      },
    });

    // Get all decisions for the project
    const decisions = await this.prisma.decision.findMany({
      where: { projectId },
      select: {
        id: true,
        gate: true,
        agent: true,
        description: true,
        rationale: true,
      },
    });

    // Get all documents for the project
    const documents = await this.prisma.document.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        filePath: true,
        documentType: true,
        gateId: true,
      },
    });

    // Determine current gate from project state
    const currentGateType = project.state?.currentGate || 'G0_PENDING';
    const currentGateNumber = this.parseGateNumber(currentGateType);

    // Build gate journey data
    const gatesData: GateJourneyData[] = [];

    for (let gateNum = 0; gateNum <= 9; gateNum++) {
      const gateKey = `G${gateNum}`;
      const metadata = GATE_METADATA[gateNum];

      // Find the actual gate record if it exists
      const gateRecord = gates.find(g =>
        g.gateType.startsWith(gateKey) ||
        g.gateType === `${gateKey}_COMPLETE` ||
        g.gateType === `${gateKey}_PENDING`
      );

      // Determine gate status
      let status: 'completed' | 'current' | 'upcoming';
      if (gateNum < currentGateNumber) {
        status = 'completed';
      } else if (gateNum === currentGateNumber) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      // Filter tasks for this gate (by phase mapping)
      const phaseMapping: Record<number, string[]> = {
        0: ['vision', 'discovery'],
        1: ['requirements', 'prd'],
        2: ['architecture', 'design'],
        3: ['ux', 'ui', 'design'],
        4: ['core', 'mvp', 'development'],
        5: ['features', 'implementation'],
        6: ['integration', 'connect'],
        7: ['testing', 'qa', 'quality'],
        8: ['deployment', 'devops', 'infra'],
        9: ['launch', 'production', 'release'],
      };
      const relevantPhases = phaseMapping[gateNum] || [];
      const gateTasks = tasks.filter(t =>
        relevantPhases.some(p => t.phase.toLowerCase().includes(p))
      ).slice(0, 5).map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
      }));

      // Filter decisions for this gate
      const gateDecisions = decisions
        .filter(d => d.gate === gateKey || d.gate === `G${gateNum}`)
        .map(d => ({
          id: d.id,
          choice: d.description,
          reason: d.rationale || '',
          agent: d.agent,
        }));

      // Filter documents for this gate
      const gateDocuments = documents
        .filter(d => d.gateId === gateRecord?.id)
        .map(d => ({
          id: d.id,
          name: d.title,
          path: d.filePath || '',
          type: d.documentType,
        }));

      gatesData.push({
        gateNumber: gateNum,
        gateType: gateRecord?.gateType || `${gateKey}_PENDING`,
        status,
        metadata,
        tasks: gateTasks,
        decisions: gateDecisions,
        documents: gateDocuments,
        approvedAt: gateRecord?.approvedAt?.toISOString(),
        approvedBy: gateRecord?.approvedBy ? {
          id: gateRecord.approvedBy.id,
          name: gateRecord.approvedBy.name || 'Unknown',
        } : undefined,
      });
    }

    // Calculate current phase
    let currentPhase: 'plan' | 'dev' | 'ship';
    if (currentGateNumber <= 3) {
      currentPhase = 'plan';
    } else if (currentGateNumber <= 6) {
      currentPhase = 'dev';
    } else {
      currentPhase = 'ship';
    }

    return {
      projectId,
      projectName: project.name,
      currentGate: currentGateNumber,
      currentPhase,
      progressPercentage: Math.round((currentGateNumber / 10) * 100),
      totalGates: 10,
      completedGates: currentGateNumber,
      gates: gatesData,
    };
  }

  private parseGateNumber(gateType: string): number {
    const match = gateType.match(/G(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
