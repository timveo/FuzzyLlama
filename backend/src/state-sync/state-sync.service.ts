import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileSystemService } from '../code-generation/filesystem.service';
import { GitIntegrationService } from '../code-generation/git-integration.service';
import { Project, ProjectState, Gate, Task, Document, Specification, Phase } from '@prisma/client';

/**
 * StateSyncService - Hybrid MCP + Database Architecture
 *
 * Implements bidirectional synchronization between:
 * 1. PostgreSQL database (source of truth for queries)
 * 2. Markdown files (for agent context and MCP protocol)
 * 3. Git repository (for version control)
 *
 * This enables:
 * - Fast database queries for web UI
 * - Human-readable markdown for AI agents
 * - Complete version history via Git
 * - MCP protocol compatibility
 */
@Injectable()
export class StateSyncService {
  private readonly logger = new Logger(StateSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesystem: FileSystemService,
    private readonly gitIntegration: GitIntegrationService,
  ) {}

  /**
   * Update project state in database and sync to markdown files
   */
  async updateProjectState(
    projectId: string,
    updates: Partial<ProjectState>,
    commitMessage?: string,
  ): Promise<ProjectState> {
    this.logger.log(`Updating project state: ${projectId}`);

    // 1. Update database (source of truth)
    const updatedState = await this.prisma.projectState.update({
      where: { projectId },
      data: updates,
    });

    // 2. Sync to markdown files (for agents/MCP)
    try {
      await this.syncProjectToMarkdown(projectId);

      // 3. Commit to git (version control)
      if (commitMessage) {
        await this.gitIntegration.commitAll(
          projectId,
          commitMessage || `State updated: ${Object.keys(updates).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to sync project to markdown: ${error.message}`);
      // Don't fail the update if sync fails - database is source of truth
    }

    return updatedState;
  }

  /**
   * Sync entire project state from database to markdown files
   */
  async syncProjectToMarkdown(projectId: string): Promise<void> {
    this.logger.log(`Syncing project to markdown: ${projectId}`);

    // Fetch complete project data
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        state: true,
        gates: { orderBy: { createdAt: 'asc' } },
        tasks: { orderBy: { createdAt: 'asc' } },
        documents: true,
        specifications: true,
        agents: { orderBy: { createdAt: 'desc' }, take: 20 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 50 },
        blockers: { where: { resolvedAt: null } },
        queries: { where: { status: 'pending' } },
        risks: { orderBy: { createdAt: 'desc' } },
        phaseHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Generate markdown files
    const statusMd = this.generateStatusMarkdown(project);
    const decisionsMd = this.generateDecisionsMarkdown(project);
    const memoryMd = this.generateMemoryMarkdown(project);
    const gatesMd = this.generateGatesMarkdown(project);
    const tasksMd = this.generateTasksMarkdown(project);

    // Write to filesystem
    await this.filesystem.writeFile(projectId, 'docs/STATUS.md', statusMd);
    await this.filesystem.writeFile(projectId, 'docs/DECISIONS.md', decisionsMd);
    await this.filesystem.writeFile(projectId, 'docs/MEMORY.md', memoryMd);
    await this.filesystem.writeFile(projectId, 'docs/GATES.md', gatesMd);
    await this.filesystem.writeFile(projectId, 'docs/TASKS.md', tasksMd);

    this.logger.log(`Successfully synced project to markdown: ${projectId}`);
  }

  /**
   * Sync markdown files back to database (for MCP updates)
   */
  async syncMarkdownToDatabase(projectId: string): Promise<void> {
    this.logger.log(`Syncing markdown to database: ${projectId}`);

    try {
      // Read markdown files
      const statusMd = await this.filesystem.readFile(projectId, 'docs/STATUS.md');

      // Parse STATUS.md for state updates
      const stateUpdates = this.parseStatusMarkdown(statusMd);

      if (Object.keys(stateUpdates).length > 0) {
        await this.prisma.projectState.update({
          where: { projectId },
          data: stateUpdates,
        });

        this.logger.log(`Synced ${Object.keys(stateUpdates).length} state updates from markdown`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync markdown to database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate STATUS.md from database
   */
  private generateStatusMarkdown(project: any): string {
    const state = project.state || {};
    const currentGate = project.gates?.find((g) => g.status === 'PENDING');

    return `# Project Status: ${project.name}

**Project ID**: ${project.id}
**Type**: ${project.type}
**Owner**: ${project.ownerId}
**Created**: ${project.createdAt.toISOString()}

---

## Current State

**Phase**: ${state.currentPhase || 'Intake'}
**Gate**: ${state.currentGate || 'G0_PENDING'}
**Status**: ${state.status || 'active'}
**Overall Progress**: ${this.calculateProgress(project)}%

**Current Gate Details**:
${currentGate ? `- Type: ${currentGate.gateType}
- Status: ${currentGate.status}
- Created: ${currentGate.createdAt.toISOString()}
- Proof Artifacts: ${currentGate.proofArtifacts?.length || 0}` : 'No active gate'}

---

## Statistics

- **Total Gates**: ${project.gates?.length || 0}
- **Approved Gates**: ${project.gates?.filter((g) => g.status === 'APPROVED').length || 0}
- **Total Tasks**: ${project.tasks?.length || 0}
- **Completed Tasks**: ${project.tasks?.filter((t) => t.status === 'completed').length || 0}
- **Active Blockers**: ${project.blockers?.length || 0}
- **Unresolved Queries**: ${project.queries?.length || 0}

---

## Recent Activity

${this.formatRecentActivity(project)}

---

## Blockers

${project.blockers?.length > 0
  ? project.blockers.map((b) => `- **${b.title}**: ${b.description} (${b.severity})`).join('\n')
  : 'No active blockers'}

---

## Queries

${project.queries?.length > 0
  ? project.queries.map((q) => `- **${q.question}** (${q.importance})`).join('\n')
  : 'No unresolved queries'}

---

## Metadata

\`\`\`json
${JSON.stringify({
  projectId: project.id,
  currentGate: state.currentGate,
  currentPhase: state.currentPhase,
  status: state.status,
  lastUpdated: new Date().toISOString(),
}, null, 2)}
\`\`\`

---

*This file is auto-generated from the database. Last sync: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate DECISIONS.md from database
   */
  private generateDecisionsMarkdown(project: any): string {
    const decisions = project.decisions || [];

    return `# Project Decisions: ${project.name}

All architectural and implementation decisions for this project.

---

${decisions.length > 0
  ? decisions.map((d, i) => `## Decision ${i + 1}: ${d.title}

**Date**: ${d.createdAt.toISOString()}
**Type**: ${d.decisionType}
**Status**: ${d.status}
**Made By**: ${d.madeBy}

### Context

${d.context}

### Decision

${d.decision}

### Rationale

${d.rationale}

${d.alternatives ? `### Alternatives Considered

${d.alternatives}` : ''}

${d.consequences ? `### Consequences

${d.consequences}` : ''}

---
`).join('\n')
  : 'No decisions recorded yet.'}

---

*This file is auto-generated from the database. Last sync: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate MEMORY.md from database
   */
  private generateMemoryMarkdown(project: any): string {
    const memories = project.systemMemory || [];
    const decisions = project.decisions || [];
    const agents = project.agents || [];

    return `# Project Memory: ${project.name}

Long-term memory and context for AI agents.

---

## Project Overview

**Name**: ${project.name}
**Type**: ${project.type}
**Description**: ${project.description || 'No description provided'}

---

## Key Decisions

${decisions.slice(0, 10).map((d) => `- **${d.title}**: ${d.decision}`).join('\n') || 'No decisions yet'}

---

## Tech Stack

${project.specifications?.find((s) => s.specType === 'TECH_STACK')
  ? project.specifications.find((s) => s.specType === 'TECH_STACK').content
  : 'Tech stack not defined yet'}

---

## Recent Agent Executions

${agents.slice(0, 5).map((a) => `- **${a.agentType}** (${a.status}): ${a.createdAt.toISOString()}`).join('\n') || 'No agents executed yet'}

---

## Important Context

${memories.length > 0
  ? memories.map((m) => `### ${m.title}

${m.content}

*Tags*: ${m.tags?.join(', ') || 'none'}
*Relevance*: ${m.relevanceScore || 'N/A'}
`).join('\n\n')
  : 'No system memory entries yet.'}

---

*This file is auto-generated from the database. Last sync: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate GATES.md from database
   */
  private generateGatesMarkdown(project: any): string {
    const gates = project.gates || [];

    return `# Project Gates: ${project.name}

Gate workflow progress (G0 → G9 → COMPLETE)

---

${gates.map((g) => `## ${g.gateType}

**Status**: ${g.status}
**Created**: ${g.createdAt.toISOString()}
${g.approvedAt ? `**Approved**: ${g.approvedAt.toISOString()}` : ''}
${g.approvedBy ? `**Approved By**: ${g.approvedBy}` : ''}

${g.reviewNotes ? `### Review Notes

${g.reviewNotes}` : ''}

${g.proofArtifacts?.length > 0 ? `### Proof Artifacts

${g.proofArtifacts.map((a) => `- ${a.artifactType}: ${a.filePath}`).join('\n')}` : ''}

---
`).join('\n')}

---

*This file is auto-generated from the database. Last sync: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate TASKS.md from database
   */
  private generateTasksMarkdown(project: any): string {
    const tasks = project.tasks || [];
    const pending = tasks.filter((t) => t.status === 'pending');
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const completed = tasks.filter((t) => t.status === 'completed');

    return `# Project Tasks: ${project.name}

Task queue and execution status.

---

## In Progress (${inProgress.length})

${inProgress.map((t) => `- [ ] **${t.title}** (${t.agentType})
  - ${t.description}
  - Priority: ${t.priority}
  - Assigned: ${t.createdAt.toISOString()}`).join('\n\n') || 'No tasks in progress'}

---

## Pending (${pending.length})

${pending.map((t) => `- [ ] **${t.title}** (${t.agentType})
  - ${t.description}
  - Priority: ${t.priority}`).join('\n\n') || 'No pending tasks'}

---

## Completed (${completed.length})

${completed.slice(0, 20).map((t) => `- [x] **${t.title}** (${t.agentType})
  - Completed: ${t.completedAt?.toISOString() || 'N/A'}`).join('\n') || 'No completed tasks'}

---

*This file is auto-generated from the database. Last sync: ${new Date().toISOString()}*
`;
  }

  /**
   * Parse STATUS.md back to database updates
   */
  private parseStatusMarkdown(statusMd: string): Partial<Omit<ProjectState, 'projectId' | 'project' | 'updatedAt'>> {
    const updates: Partial<Omit<ProjectState, 'projectId' | 'project' | 'updatedAt'>> = {};

    // Extract phase
    const phaseMatch = statusMd.match(/\*\*Phase\*\*: (.+)/);
    if (phaseMatch) {
      const phaseValue = phaseMatch[1].trim() as Phase;
      updates.currentPhase = phaseValue;
    }

    // Extract gate
    const gateMatch = statusMd.match(/\*\*Gate\*\*: (.+)/);
    if (gateMatch) {
      updates.currentGate = gateMatch[1].trim();
    }

    // Note: status is not a field in ProjectState, using currentGate instead

    return updates;
  }

  /**
   * Calculate overall project progress
   */
  private calculateProgress(project: any): number {
    const totalGates = 10; // G0-G9
    const approvedGates = project.gates?.filter((g) => g.status === 'APPROVED').length || 0;
    return Math.round((approvedGates / totalGates) * 100);
  }

  /**
   * Format recent activity
   */
  private formatRecentActivity(project: any): string {
    const activities: Array<{ date: Date; text: string }> = [];

    // Recent gates
    project.gates?.slice(-5).forEach((g) => {
      if (g.approvedAt) {
        activities.push({
          date: g.approvedAt,
          text: `✅ Gate ${g.gateType} approved`,
        });
      }
    });

    // Recent agents
    project.agents?.slice(0, 3).forEach((a) => {
      activities.push({
        date: a.createdAt,
        text: `🤖 Agent ${a.agentType} executed (${a.status})`,
      });
    });

    // Recent decisions
    project.decisions?.slice(0, 3).forEach((d) => {
      activities.push({
        date: d.createdAt,
        text: `📋 Decision: ${d.title}`,
      });
    });

    // Sort by date descending
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    return activities
      .slice(0, 10)
      .map((a) => `- ${a.text} (${a.date.toISOString().split('T')[0]})`)
      .join('\n') || 'No recent activity';
  }

  /**
   * Get project with all related data
   */
  async getProject(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        state: true,
        gates: true,
        tasks: true,
        documents: true,
        specifications: true,
        agents: true,
        decisions: true,
        blockers: true,
        queries: true,
        risks: true,
        // systemMemory: true, // Not a relation on Project model
        phaseHistory: true,
      },
    });
  }
}
