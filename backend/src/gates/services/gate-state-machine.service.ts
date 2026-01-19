import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Gate progression order (G1-G9, no G0)
const GATE_PROGRESSION = [
  'G1_PENDING',
  'G1_COMPLETE',
  'G2_PENDING',
  'G2_COMPLETE',
  'G3_PENDING',
  'G3_COMPLETE',
  'G4_PENDING',
  'G4_COMPLETE',
  'G5_PENDING',
  'G5_COMPLETE',
  'G6_PENDING',
  'G6_COMPLETE',
  'G7_PENDING',
  'G7_COMPLETE',
  'G8_PENDING',
  'G8_COMPLETE',
  'G9_PENDING',
  'G9_COMPLETE',
  'PROJECT_COMPLETE',
];

// Gate approval keywords
const VALID_APPROVAL_KEYWORDS = ['approved', 'yes', 'approve', 'accept'];
const INVALID_APPROVAL_KEYWORDS = ['ok', 'sure', 'fine', 'alright'];

@Injectable()
export class GateStateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize gates for a new project
   */
  async initializeProjectGates(projectId: string): Promise<void> {
    // Create G1_PENDING gate (scope/intake approval)
    // G1 is the first gate - no G0 in the Multi-Agent-Product-Creator framework
    await this.prisma.gate.create({
      data: {
        projectId,
        gateType: 'G1_PENDING',
        status: 'PENDING',
        description: 'Project scope approval - intake questionnaire complete',
        passingCriteria: 'User has approved project scope, vision, goals, and constraints',
      },
    });
  }

  /**
   * Get current active gate for a project
   */
  async getCurrentGate(projectId: string): Promise<any> {
    const gates = await this.prisma.gate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Find the first non-approved gate
    const currentGate = gates.find((g) => g.status !== 'APPROVED');

    return currentGate || gates[gates.length - 1]; // Return last gate if all approved
  }

  /**
   * Check if a gate can be transitioned
   */
  async canTransitionGate(
    projectId: string,
    gateType: string,
    userId: string,
  ): Promise<{ canTransition: boolean; reason?: string }> {
    // Get project to verify ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    });

    if (!project) {
      return { canTransition: false, reason: 'Project not found' };
    }

    if (project.ownerId !== userId) {
      return { canTransition: false, reason: 'Only project owner can approve gates' };
    }

    // Get current gate
    const gate = await this.prisma.gate.findFirst({
      where: { projectId, gateType },
    });

    if (!gate) {
      return { canTransition: false, reason: 'Gate not found' };
    }

    if (gate.status === 'APPROVED') {
      return { canTransition: false, reason: 'Gate already approved' };
    }

    if (gate.status === 'BLOCKED') {
      return { canTransition: false, reason: 'Gate is blocked by dependencies' };
    }

    // Check if previous gate is approved
    const gateIndex = GATE_PROGRESSION.indexOf(gateType);
    if (gateIndex > 0) {
      const previousGateType = GATE_PROGRESSION[gateIndex - 1];
      const previousGate = await this.prisma.gate.findFirst({
        where: { projectId, gateType: previousGateType },
      });

      if (!previousGate || previousGate.status !== 'APPROVED') {
        return {
          canTransition: false,
          reason: `Previous gate ${previousGateType} must be approved first`,
        };
      }
    }

    // Check if proof artifacts are required and present
    if (gate.requiresProof) {
      const proofCount = await this.prisma.proofArtifact.count({
        where: { gateId: gate.id },
      });

      if (proofCount === 0) {
        return {
          canTransition: false,
          reason: 'Gate requires proof artifacts before approval',
        };
      }
    }

    // Check if required deliverables are present and complete
    const deliverables = await this.prisma.deliverable.findMany({
      where: { projectId },
    });

    if (deliverables.length > 0) {
      // Check if all deliverables are complete
      const incompleteDeliverables = deliverables.filter((d) => d.status !== 'complete');

      if (incompleteDeliverables.length > 0) {
        const deliverableNames = incompleteDeliverables.map((d) => d.name).join(', ');
        return {
          canTransition: false,
          reason: `Gate has incomplete deliverables: ${deliverableNames}. All deliverables must be complete before gate approval.`,
        };
      }
    }

    return { canTransition: true };
  }

  /**
   * Validate approval response (must be explicit)
   */
  validateApprovalResponse(response: string): {
    isValid: boolean;
    reason?: string;
  } {
    const normalized = response.toLowerCase().trim();

    // Check for invalid keywords
    if (INVALID_APPROVAL_KEYWORDS.some((keyword) => normalized === keyword)) {
      return {
        isValid: false,
        reason: `"${response}" is not a clear approval. Please use "approved" or "yes" to approve this gate.`,
      };
    }

    // Check for valid keywords
    if (VALID_APPROVAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return { isValid: true };
    }

    return {
      isValid: false,
      reason: `Please provide explicit approval using "approved" or "yes"`,
    };
  }

  /**
   * Transition gate to IN_REVIEW status (ready for user approval)
   */
  async transitionToReview(
    projectId: string,
    gateType: string,
    reviewData?: {
      description?: string;
      passingCriteria?: string;
    },
  ): Promise<void> {
    const gate = await this.prisma.gate.findFirst({
      where: { projectId, gateType },
    });

    if (!gate) {
      throw new BadRequestException(`Gate ${gateType} not found`);
    }

    await this.prisma.gate.update({
      where: { id: gate.id },
      data: {
        status: 'IN_REVIEW',
        description: reviewData?.description || gate.description,
        passingCriteria: reviewData?.passingCriteria || gate.passingCriteria,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Approve a gate and create next gate
   */
  async approveGate(
    projectId: string,
    gateType: string,
    userId: string,
    approvalResponse: string,
    reviewNotes?: string,
  ): Promise<{ success: boolean; nextGate?: string }> {
    // Validate approval response
    const validation = this.validateApprovalResponse(approvalResponse);
    if (!validation.isValid) {
      throw new BadRequestException(validation.reason);
    }

    // Check if can transition
    const canTransition = await this.canTransitionGate(projectId, gateType, userId);
    if (!canTransition.canTransition) {
      throw new ForbiddenException(canTransition.reason);
    }

    // Get the gate
    const gate = await this.prisma.gate.findFirst({
      where: { projectId, gateType },
    });

    if (!gate) {
      throw new BadRequestException(`Gate ${gateType} not found`);
    }

    // Approve the gate
    await this.prisma.gate.update({
      where: { id: gate.id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        reviewNotes,
      },
    });

    // Update project state
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        state: {
          update: {
            currentGate: gateType,
          },
        },
      },
    });

    // Lock documents if applicable
    await this.lockDocumentsForGate(projectId, gateType);

    // Create next gate
    const nextGateType = this.getNextGateType(gateType);
    if (nextGateType) {
      await this.createNextGate(projectId, nextGateType);
      return { success: true, nextGate: nextGateType };
    }

    // Mark project as complete if this was G9_COMPLETE
    if (gateType === 'G9_COMPLETE') {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          state: {
            update: {
              currentGate: 'PROJECT_COMPLETE',
            },
          },
        },
      });
    }

    return { success: true };
  }

  /**
   * Reject a gate with reason
   */
  async rejectGate(
    projectId: string,
    gateType: string,
    userId: string,
    blockingReason: string,
  ): Promise<void> {
    const canTransition = await this.canTransitionGate(projectId, gateType, userId);
    if (!canTransition.canTransition) {
      throw new ForbiddenException(canTransition.reason);
    }

    const gate = await this.prisma.gate.findFirst({
      where: { projectId, gateType },
    });

    if (!gate) {
      throw new BadRequestException(`Gate ${gateType} not found`);
    }

    await this.prisma.gate.update({
      where: { id: gate.id },
      data: {
        status: 'REJECTED',
        blockingReason,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get next gate type in progression
   */
  private getNextGateType(currentGateType: string): string | null {
    const currentIndex = GATE_PROGRESSION.indexOf(currentGateType);
    if (currentIndex === -1 || currentIndex === GATE_PROGRESSION.length - 1) {
      return null;
    }
    return GATE_PROGRESSION[currentIndex + 1];
  }

  /**
   * Create next gate in progression
   */
  private async createNextGate(projectId: string, gateType: string): Promise<void> {
    // Gate descriptions and criteria
    const gateConfig: Record<
      string,
      { description: string; passingCriteria: string; requiresProof: boolean }
    > = {
      G1_COMPLETE: {
        description: 'Intake complete, requirements gathered',
        passingCriteria: 'User has reviewed and approved the intake summary',
        requiresProof: false,
      },
      G2_PENDING: {
        description: 'PRD creation in progress',
        passingCriteria: 'Product Manager has created complete PRD with user stories',
        requiresProof: false,
      },
      G2_COMPLETE: {
        description: 'PRD approved',
        passingCriteria: 'User has reviewed and approved the PRD',
        requiresProof: false,
      },
      G3_PENDING: {
        description: 'Architecture and specifications in progress',
        passingCriteria: 'Architect has created OpenAPI spec, Prisma schema, and Zod schemas',
        requiresProof: true,
      },
      G3_COMPLETE: {
        description: 'Architecture approved, specs locked',
        passingCriteria: 'User has reviewed and approved the architecture and specs',
        requiresProof: true,
      },
      G4_PENDING: {
        description: 'Design in progress',
        passingCriteria: 'UX/UI Designer has created 3 design options, user has selected one',
        requiresProof: false,
      },
      G4_COMPLETE: {
        description: 'Design approved',
        passingCriteria: 'User has reviewed and approved the final design',
        requiresProof: false,
      },
      G5_PENDING: {
        description: 'Development in progress',
        passingCriteria: 'Developers have implemented features, all builds passing',
        requiresProof: true,
      },
      G5_COMPLETE: {
        description: 'Development complete',
        passingCriteria: 'User has reviewed code, all tests passing',
        requiresProof: true,
      },
      G6_PENDING: {
        description: 'Testing in progress',
        passingCriteria: 'QA Engineer has created and executed test plan, >80% coverage',
        requiresProof: true,
      },
      G6_COMPLETE: {
        description: 'Testing complete',
        passingCriteria: 'User has reviewed test results, all critical tests passing',
        requiresProof: true,
      },
      G7_PENDING: {
        description: 'Security audit in progress',
        passingCriteria: 'Security Engineer has completed OWASP audit, no critical issues',
        requiresProof: true,
      },
      G7_COMPLETE: {
        description: 'Security audit complete',
        passingCriteria: 'User has reviewed security audit, all issues addressed',
        requiresProof: true,
      },
      G8_PENDING: {
        description: 'Staging deployment in progress',
        passingCriteria: 'DevOps has deployed to staging, smoke tests passing',
        requiresProof: true,
      },
      G8_COMPLETE: {
        description: 'Staging deployment complete',
        passingCriteria: 'User has tested staging environment, ready for production',
        requiresProof: true,
      },
      G9_PENDING: {
        description: 'Production deployment in progress',
        passingCriteria: 'DevOps has deployed to production, health checks passing',
        requiresProof: true,
      },
      G9_COMPLETE: {
        description: 'Production deployment complete',
        passingCriteria: 'Application is live and operational',
        requiresProof: true,
      },
    };

    const config = gateConfig[gateType] || {
      description: `Gate ${gateType}`,
      passingCriteria: 'Complete gate requirements',
      requiresProof: false,
    };

    await this.prisma.gate.create({
      data: {
        projectId,
        gateType,
        status: 'PENDING',
        description: config.description,
        passingCriteria: config.passingCriteria,
        requiresProof: config.requiresProof,
      },
    });
  }

  /**
   * Lock documents when gate is approved (for future implementation)
   */
  private async lockDocumentsForGate(_projectId: string, _gateType: string): Promise<void> {
    // TODO: Add document locking when schema supports it
    // Documents and specifications will be locked after gate approval
    // to prevent modifications without re-approval
  }

  /**
   * Get all gates for a project with status
   */
  async getProjectGates(projectId: string): Promise<any[]> {
    return this.prisma.gate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proofArtifacts: {
          select: {
            id: true,
            proofType: true,
            filePath: true,
            createdAt: true,
          },
        },
      },
    });
  }
}
