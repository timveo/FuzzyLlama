import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FileSystemService } from '../../code-generation/filesystem.service';
import axios, { AxiosInstance } from 'axios';

export interface RailwayDeploymentOptions {
  projectName: string;
  githubRepoUrl?: string;
  environmentVariables?: Record<string, string>;
  services?: Array<{
    name: string;
    dockerfile?: string;
    buildCommand?: string;
    startCommand?: string;
  }>;
}

export interface RailwayDeploymentResult {
  success: boolean;
  projectId?: string;
  projectUrl?: string;
  deploymentUrl?: string;
  services?: Array<{
    name: string;
    url: string;
    status: string;
  }>;
  error?: string;
}

export interface RailwayProjectStatus {
  projectId: string;
  status: string;
  deployments: Array<{
    id: string;
    status: string;
    createdAt: string;
    url?: string;
  }>;
}

@Injectable()
export class RailwayService {
  private railwayApi: AxiosInstance;
  private readonly RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

  constructor(
    private prisma: PrismaService,
    private filesystem: FileSystemService,
  ) {
    // Railway API client will be initialized with token per request
  }

  /**
   * Create Railway API client with user's token
   */
  private getApiClient(token: string): AxiosInstance {
    return axios.create({
      baseURL: this.RAILWAY_API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Execute GraphQL query
   */
  private async executeGraphQL(token: string, query: string, variables?: any): Promise<any> {
    try {
      const client = this.getApiClient(token);
      const response = await client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(response.data.errors.map((e: any) => e.message).join(', '));
      }

      return response.data.data;
    } catch (error) {
      console.error('[Railway API] Error:', error.response?.data || error.message);
      throw new BadRequestException(
        'Railway API error: ' + (error.response?.data?.message || error.message),
      );
    }
  }

  /**
   * Create a new Railway project
   */
  async createProject(
    token: string,
    projectName: string,
  ): Promise<{ projectId: string; projectUrl: string }> {
    const mutation = `
      mutation CreateProject($name: String!) {
        projectCreate(input: { name: $name }) {
          id
          name
        }
      }
    `;

    const data = await this.executeGraphQL(token, mutation, { name: projectName });

    const projectId = data.projectCreate.id;
    const projectUrl = `https://railway.app/project/${projectId}`;

    console.log(`[Railway] Created project: ${projectName} (${projectId})`);

    return { projectId, projectUrl };
  }

  /**
   * Connect GitHub repository to Railway project
   */
  async connectGitHubRepo(
    token: string,
    projectId: string,
    repoFullName: string,
    branch = 'main',
  ): Promise<{ serviceId: string }> {
    const mutation = `
      mutation DeployService($projectId: String!, $repo: String!, $branch: String!) {
        serviceCreate(input: {
          projectId: $projectId
          source: {
            repo: $repo
            branch: $branch
          }
        }) {
          id
          name
        }
      }
    `;

    const data = await this.executeGraphQL(token, mutation, {
      projectId,
      repo: repoFullName,
      branch,
    });

    console.log(`[Railway] Connected GitHub repo: ${repoFullName} to project ${projectId}`);

    return { serviceId: data.serviceCreate.id };
  }

  /**
   * Set environment variables for a service
   */
  async setEnvironmentVariables(
    token: string,
    serviceId: string,
    environmentId: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const mutation = `
      mutation UpsertVariables($serviceId: String!, $environmentId: String!, $variables: Json!) {
        variableCollectionUpsert(input: {
          serviceId: $serviceId
          environmentId: $environmentId
          variables: $variables
        })
      }
    `;

    await this.executeGraphQL(token, mutation, {
      serviceId,
      environmentId,
      variables,
    });

    console.log(
      `[Railway] Set ${Object.keys(variables).length} environment variables for service ${serviceId}`,
    );
  }

  /**
   * Get project environments
   */
  async getProjectEnvironments(
    token: string,
    projectId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const query = `
      query GetProjectEnvironments($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(token, query, { projectId });

    return data.project.environments.edges.map((edge: any) => edge.node);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(token: string, projectId: string): Promise<RailwayProjectStatus> {
    const query = `
      query GetProjectStatus($projectId: String!) {
        project(id: $projectId) {
          id
          name
          services {
            edges {
              node {
                id
                name
                deployments {
                  edges {
                    node {
                      id
                      status
                      createdAt
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(token, query, { projectId });

    const deployments = data.project.services.edges
      .flatMap((serviceEdge: any) =>
        serviceEdge.node.deployments.edges.map((deployEdge: any) => ({
          id: deployEdge.node.id,
          status: deployEdge.node.status,
          createdAt: deployEdge.node.createdAt,
          url: deployEdge.node.url,
        })),
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      projectId,
      status: deployments.length > 0 ? deployments[0].status : 'NOT_DEPLOYED',
      deployments: deployments.slice(0, 10), // Last 10 deployments
    };
  }

  /**
   * Deploy project to Railway
   */
  async deployProject(
    projectId: string,
    userId: string,
    railwayToken: string,
    options?: Partial<RailwayDeploymentOptions>,
  ): Promise<RailwayDeploymentResult> {
    try {
      // Get FuzzyLlama project
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new BadRequestException('Project not found');
      }

      if (project.ownerId !== userId) {
        throw new BadRequestException('You can only deploy your own projects');
      }

      // Check if already deployed
      if (project.railwayProjectId) {
        return {
          success: true,
          projectId: project.railwayProjectId,
          projectUrl: `https://railway.app/project/${project.railwayProjectId}`,
          deploymentUrl: `https://railway.app/project/${project.railwayProjectId}`,
          error: 'Project already deployed to Railway',
        };
      }

      // Check if GitHub repo exists
      if (!project.githubRepoUrl) {
        throw new BadRequestException(
          'Project must be exported to GitHub first. Use /github/projects/:id/export',
        );
      }

      const projectName =
        options?.projectName || project.name || `fuzzyllama-${project.id.substring(0, 8)}`;

      // Create Railway project
      const { projectId: railwayProjectId, projectUrl } = await this.createProject(
        railwayToken,
        projectName,
      );

      // Extract GitHub repo name (owner/repo) from URL
      const repoFullName = this.extractRepoName(project.githubRepoUrl);

      // Connect GitHub repository
      const { serviceId } = await this.connectGitHubRepo(
        railwayToken,
        railwayProjectId,
        repoFullName,
        'main',
      );

      // Get production environment
      const environments = await this.getProjectEnvironments(railwayToken, railwayProjectId);
      const productionEnv = environments.find((env) => env.name === 'production');

      if (!productionEnv) {
        throw new Error('Production environment not found');
      }

      // Set environment variables if provided
      const envVars = options?.environmentVariables || this.getDefaultEnvVars(project.type);

      if (Object.keys(envVars).length > 0) {
        await this.setEnvironmentVariables(railwayToken, serviceId, productionEnv.id, envVars);
      }

      // Wait a few seconds for initial deployment to trigger
      await this.sleep(3000);

      // Get deployment status
      const status = await this.getDeploymentStatus(railwayToken, railwayProjectId);

      const deploymentUrl = status.deployments.find((d) => d.url)?.url || null;

      // Update FuzzyLlama project with Railway info
      // Note: Project schema only has railwayProjectId, not deploymentUrl/deploymentStatus
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          railwayProjectId,
        },
      });

      console.log(
        `[Railway] Successfully deployed project ${projectId} to Railway (${railwayProjectId})`,
      );

      return {
        success: true,
        projectId: railwayProjectId,
        projectUrl,
        deploymentUrl,
        services: [
          {
            name: projectName,
            url: deploymentUrl || 'Pending...',
            status: status.status,
          },
        ],
      };
    } catch (error) {
      console.error('[Railway Deploy] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Redeploy existing Railway project
   */
  async redeployProject(
    projectId: string,
    userId: string,
    railwayToken: string,
  ): Promise<RailwayDeploymentResult> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new BadRequestException('Project not found');
      }

      if (project.ownerId !== userId) {
        throw new BadRequestException('You can only redeploy your own projects');
      }

      if (!project.railwayProjectId) {
        throw new BadRequestException(
          'Project not yet deployed to Railway. Use deploy endpoint first.',
        );
      }

      // Trigger redeploy by creating a new deployment
      const mutation = `
        mutation TriggerDeploy($projectId: String!) {
          deploymentTrigger(input: { projectId: $projectId })
        }
      `;

      await this.executeGraphQL(railwayToken, mutation, {
        projectId: project.railwayProjectId,
      });

      // Wait for deployment to start
      await this.sleep(2000);

      // Get updated status
      const status = await this.getDeploymentStatus(railwayToken, project.railwayProjectId);

      const deploymentUrl = status.deployments.find((d) => d.url)?.url || null;

      // Note: Project schema doesn't have deploymentUrl/deploymentStatus fields

      console.log(`[Railway] Triggered redeploy for project ${projectId}`);

      return {
        success: true,
        projectId: project.railwayProjectId,
        projectUrl: `https://railway.app/project/${project.railwayProjectId}`,
        deploymentUrl,
      };
    } catch (error) {
      console.error('[Railway Redeploy] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get default environment variables based on project type
   */
  private getDefaultEnvVars(projectType: string): Record<string, string> {
    const baseVars: Record<string, string> = {
      NODE_ENV: 'production',
    };

    switch (projectType) {
      case 'fullstack_saas':
      case 'traditional':
        return {
          ...baseVars,
          DATABASE_URL: '${{Postgres.DATABASE_URL}}', // Railway internal variable
          JWT_SECRET: this.generateSecret(),
          PORT: '3000',
        };

      case 'ai_ml':
        return {
          ...baseVars,
          OPENAI_API_KEY: 'CHANGE_ME',
          DATABASE_URL: '${{Postgres.DATABASE_URL}}',
        };

      default:
        return baseVars;
    }
  }

  /**
   * Extract repo name from GitHub URL
   */
  private extractRepoName(githubUrl: string): string {
    // https://github.com/owner/repo → owner/repo
    const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : '';
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
