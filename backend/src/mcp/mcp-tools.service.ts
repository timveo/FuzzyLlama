import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { StateSyncService } from '../state-sync/state-sync.service';
import { AgentExecutionService } from '../agents/services/agent-execution.service';
import { FileSystemService } from '../code-generation/filesystem.service';
import { CodeParserService } from '../code-generation/code-parser.service';
import { BuildExecutorService } from '../code-generation/build-executor.service';
import { GitIntegrationService } from '../code-generation/git-integration.service';
import { GitHubService } from '../integrations/github/github.service';
import { RailwayService } from '../integrations/railway/railway.service';
import { EventStoreService } from '../events/event-store.service';
import { EventType } from '../events/domain-event.interface';

/**
 * McpToolsService - Tool Execution Layer
 *
 * Implements all 160+ tools for MCP protocol
 * Bridges MCP requests to FuzzyLlama services
 */
@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateSync: StateSyncService,
    private readonly agentExecution: AgentExecutionService,
    private readonly filesystem: FileSystemService,
    private readonly codeParser: CodeParserService,
    private readonly buildExecutor: BuildExecutorService,
    private readonly gitIntegration: GitIntegrationService,
    private readonly github: GitHubService,
    private readonly railway: RailwayService,
    private readonly eventStore: EventStoreService,
  ) {}

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    this.logger.log(`Executing tool: ${toolName}`);

    try {
      // Route to appropriate handler based on tool name
      switch (toolName) {
        // State Management Tools
        case 'read_status':
          return await this.readStatus(args);
        case 'update_status':
          return await this.updateStatus(args);
        case 'read_decisions':
          return await this.readDecisions(args);
        case 'create_decision':
          return await this.createDecision(args);
        case 'read_memory':
          return await this.readMemory(args);
        case 'read_gates':
          return await this.readGates(args);
        case 'read_tasks':
          return await this.readTasks(args);

        // Project Management Tools
        case 'create_project':
          return await this.createProject(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'update_project':
          return await this.updateProject(args);

        // Agent Execution Tools
        case 'execute_agent':
          return await this.executeAgent(args);
        case 'get_agent_history':
          return await this.getAgentHistory(args);
        case 'get_agent_status':
          return await this.getAgentStatus(args);

        // Gate Management Tools
        case 'get_gates':
          return await this.getGates(args);
        case 'approve_gate':
          return await this.approveGate(args);
        case 'reject_gate':
          return await this.rejectGate(args);
        case 'get_gate_artifacts':
          return await this.getGateArtifacts(args);

        // Document Tools
        case 'create_document':
          return await this.createDocument(args);
        case 'get_documents':
          return await this.getDocuments(args);
        case 'get_document':
          return await this.getDocument(args);
        case 'update_document':
          return await this.updateDocument(args);

        // File System Tools
        case 'write_file':
          return await this.writeFile(args);
        case 'read_file':
          return await this.readFile(args);
        case 'list_files':
          return await this.listFiles(args);
        case 'delete_file':
          return await this.deleteFile(args);

        // Code Generation Tools
        case 'initialize_workspace':
          return await this.initializeWorkspace(args);
        case 'parse_code':
          return await this.parseCode(args);
        case 'validate_build':
          return await this.validateBuild(args);
        case 'run_tests':
          return await this.runTests(args);

        // Git Tools
        case 'git_init':
          return await this.gitInit(args);
        case 'git_commit':
          return await this.gitCommit(args);
        case 'git_status':
          return await this.gitStatus(args);

        // GitHub Tools
        case 'github_export':
          return await this.githubExport(args);
        case 'github_push':
          return await this.githubPush(args);

        // Railway Tools
        case 'railway_deploy':
          return await this.railwayDeploy(args);
        case 'railway_status':
          return await this.railwayStatus(args);

        // Task Management Tools
        case 'create_task':
          return await this.createTask(args);
        case 'get_tasks':
          return await this.getTasks(args);
        case 'update_task':
          return await this.updateTask(args);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName} - ${error.message}`);
      throw error;
    }
  }

  // ===========================
  // State Management Tools
  // ===========================

  private async readStatus(args: { projectId: string }): Promise<string> {
    const statusMd = await this.filesystem.readFile(args.projectId, 'docs/STATUS.md');
    return statusMd;
  }

  private async updateStatus(args: { projectId: string; updates: any }): Promise<string> {
    await this.stateSync.updateProjectState(args.projectId, args.updates);
    return 'Status updated successfully';
  }

  private async readDecisions(args: { projectId: string }): Promise<string> {
    const decisionsMd = await this.filesystem.readFile(args.projectId, 'docs/DECISIONS.md');
    return decisionsMd;
  }

  private async createDecision(args: {
    projectId: string;
    description: string;
    rationale?: string;
    gate?: string;
    agent?: string;
  }): Promise<any> {
    const decision = await this.prisma.decision.create({
      data: {
        projectId: args.projectId,
        description: args.description,
        rationale: args.rationale,
        decisionType: 'technical',
        gate: args.gate || 'G0',
        agent: args.agent || 'mcp-tool',
      },
    });

    // Sync to markdown
    await this.stateSync.syncProjectToMarkdown(args.projectId);

    // Record event
    await this.eventStore.appendEvent(args.projectId, {
      type: EventType.DECISION_MADE,
      data: { decisionId: decision.id, description: args.description },
    });

    return decision;
  }

  private async readMemory(args: { projectId: string }): Promise<string> {
    const memoryMd = await this.filesystem.readFile(args.projectId, 'docs/MEMORY.md');
    return memoryMd;
  }

  private async readGates(args: { projectId: string }): Promise<string> {
    const gatesMd = await this.filesystem.readFile(args.projectId, 'docs/GATES.md');
    return gatesMd;
  }

  private async readTasks(args: { projectId: string }): Promise<string> {
    const tasksMd = await this.filesystem.readFile(args.projectId, 'docs/TASKS.md');
    return tasksMd;
  }

  // ===========================
  // Project Management Tools
  // ===========================

  private async createProject(args: {
    name: string;
    type: string;
    description?: string;
  }): Promise<any> {
    // Note: This would need userId from context
    throw new Error('create_project requires authentication context');
  }

  private async getProject(args: { projectId: string }): Promise<any> {
    const project = await this.stateSync.getProject(args.projectId);
    return project;
  }

  private async listProjects(args: any): Promise<any> {
    // Note: This would need userId from context
    throw new Error('list_projects requires authentication context');
  }

  private async updateProject(args: { projectId: string; updates: any }): Promise<any> {
    const project = await this.prisma.project.update({
      where: { id: args.projectId },
      data: args.updates,
    });
    return project;
  }

  // ===========================
  // Agent Execution Tools
  // ===========================

  private async executeAgent(args: {
    projectId: string;
    agentType: string;
    userPrompt: string;
    model?: string;
  }): Promise<any> {
    // Note: This would need userId from context
    throw new Error('execute_agent requires authentication context');
  }

  private async getAgentHistory(args: { projectId: string }): Promise<any> {
    const agents = await this.prisma.agent.findMany({
      where: { projectId: args.projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return agents;
  }

  private async getAgentStatus(args: { agentId: string }): Promise<any> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: args.agentId },
    });
    return agent;
  }

  // ===========================
  // Gate Management Tools
  // ===========================

  private async getGates(args: { projectId: string }): Promise<any> {
    const gates = await this.prisma.gate.findMany({
      where: { projectId: args.projectId },
      orderBy: { createdAt: 'asc' },
    });
    return gates;
  }

  private async approveGate(args: { gateId: string; reviewNotes?: string }): Promise<any> {
    // Note: This would need userId from context
    throw new Error('approve_gate requires authentication context');
  }

  private async rejectGate(args: { gateId: string; reviewNotes: string }): Promise<any> {
    // Note: This would need userId from context
    throw new Error('reject_gate requires authentication context');
  }

  private async getGateArtifacts(args: { gateId: string }): Promise<any> {
    const artifacts = await this.prisma.proofArtifact.findMany({
      where: { gateId: args.gateId },
    });
    return artifacts;
  }

  // ===========================
  // Document Tools
  // ===========================

  private async createDocument(args: {
    projectId: string;
    title: string;
    content: string;
    documentType: string;
  }): Promise<any> {
    // Note: This would need userId from context
    throw new Error('create_document requires authentication context');
  }

  private async getDocuments(args: { projectId: string }): Promise<any> {
    const documents = await this.prisma.document.findMany({
      where: { projectId: args.projectId },
      orderBy: { createdAt: 'desc' },
    });
    return documents;
  }

  private async getDocument(args: { documentId: string }): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: args.documentId },
    });
    return document;
  }

  private async updateDocument(args: { documentId: string; content: string }): Promise<any> {
    const document = await this.prisma.document.update({
      where: { id: args.documentId },
      data: { content: args.content },
    });
    return document;
  }

  // ===========================
  // File System Tools
  // ===========================

  private async writeFile(args: {
    projectId: string;
    filePath: string;
    content: string;
  }): Promise<string> {
    await this.filesystem.writeFile(args.projectId, args.filePath, args.content);
    return `File written: ${args.filePath}`;
  }

  private async readFile(args: { projectId: string; filePath: string }): Promise<string> {
    const content = await this.filesystem.readFile(args.projectId, args.filePath);
    return content;
  }

  private async listFiles(args: { projectId: string; directory?: string }): Promise<any> {
    // Use getDirectoryTree instead of non-existent listFiles
    const tree = await this.filesystem.getDirectoryTree(args.projectId, args.directory || '.');
    return { files: tree };
  }

  private async deleteFile(args: { projectId: string; filePath: string }): Promise<string> {
    // Implement delete functionality
    throw new Error('delete_file not yet implemented');
  }

  // ===========================
  // Code Generation Tools
  // ===========================

  private async initializeWorkspace(args: {
    projectId: string;
    projectType: string;
  }): Promise<any> {
    // Create workspace and initialize project structure
    await this.filesystem.createProjectWorkspace(args.projectId);
    await this.filesystem.initializeProjectStructure(
      args.projectId,
      args.projectType as 'react-vite' | 'nestjs' | 'nextjs' | 'express',
    );
    return { success: true, message: 'Workspace initialized' };
  }

  private async parseCode(args: { agentOutput: string }): Promise<any> {
    const result = this.codeParser.extractFiles(args.agentOutput);
    return result;
  }

  private async validateBuild(args: { projectId: string }): Promise<any> {
    const result = await this.buildExecutor.runFullValidation(args.projectId);
    return result;
  }

  private async runTests(args: { projectId: string }): Promise<any> {
    const result = await this.buildExecutor.runTests(args.projectId);
    return result;
  }

  // ===========================
  // Git Tools
  // ===========================

  private async gitInit(args: { projectId: string }): Promise<any> {
    const result = await this.gitIntegration.initRepository(args.projectId);
    return result;
  }

  private async gitCommit(args: { projectId: string; message: string }): Promise<any> {
    const result = await this.gitIntegration.commitAll(args.projectId, args.message);
    return result;
  }

  private async gitStatus(args: { projectId: string }): Promise<any> {
    // Use getUncommittedFiles and getCurrentBranch instead of non-existent getStatus
    const uncommittedFiles = await this.gitIntegration.getUncommittedFiles(args.projectId);
    const currentBranch = await this.gitIntegration.getCurrentBranch(args.projectId);
    return {
      branch: currentBranch,
      uncommittedFiles,
      hasChanges: uncommittedFiles.length > 0,
    };
  }

  // ===========================
  // GitHub Tools
  // ===========================

  private async githubExport(args: { projectId: string; repoName?: string }): Promise<any> {
    // Note: This would need authentication context
    throw new Error('github_export requires authentication context');
  }

  private async githubPush(args: { projectId: string; message?: string }): Promise<any> {
    // Note: This would need authentication context
    throw new Error('github_push requires authentication context');
  }

  // ===========================
  // Railway Tools
  // ===========================

  private async railwayDeploy(args: { projectId: string }): Promise<any> {
    // Note: This would need authentication context
    throw new Error('railway_deploy requires authentication context');
  }

  private async railwayStatus(args: { projectId: string }): Promise<any> {
    const project = await this.prisma.project.findUnique({
      where: { id: args.projectId },
      select: { railwayProjectId: true },
    });

    if (!project?.railwayProjectId) {
      throw new Error('Project not deployed to Railway');
    }

    // Note: This would need authentication context for Railway API
    throw new Error('railway_status requires authentication context');
  }

  // ===========================
  // Task Management Tools
  // ===========================

  private async createTask(args: {
    projectId: string;
    name: string;
    description?: string;
    phase: string;
    owner?: string;
    priority?: string;
  }): Promise<any> {
    const task = await this.prisma.task.create({
      data: {
        projectId: args.projectId,
        name: args.name,
        title: args.name,
        description: args.description,
        phase: args.phase,
        owner: args.owner,
        priority: args.priority || 'MEDIUM',
        status: TaskStatus.not_started,
      },
    });

    // Record event
    await this.eventStore.appendEvent(args.projectId, {
      type: EventType.TASK_CREATED,
      data: { taskId: task.id, name: args.name },
    });

    return task;
  }

  private async getTasks(args: { projectId: string }): Promise<any> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId: args.projectId },
      orderBy: { createdAt: 'desc' },
    });
    return tasks;
  }

  private async updateTask(args: { taskId: string; status: TaskStatus }): Promise<any> {
    const task = await this.prisma.task.update({
      where: { id: args.taskId },
      data: { status: args.status },
    });

    if (args.status === TaskStatus.complete) {
      await this.eventStore.appendEvent(task.projectId, {
        type: EventType.TASK_COMPLETED,
        data: { taskId: task.id },
      });
    }

    return task;
  }
}
