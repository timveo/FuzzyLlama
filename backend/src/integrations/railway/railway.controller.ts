import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { RailwayService } from './railway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/user.types';

@ApiTags('railway')
@Controller('railway')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RailwayController {
  constructor(private readonly railwayService: RailwayService) {}

  @Post('projects/:id/deploy')
  @ApiOperation({ summary: 'Deploy project to Railway' })
  @ApiHeader({
    name: 'x-railway-token',
    description: 'Railway API token',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Project deployed successfully',
    schema: {
      example: {
        success: true,
        projectId: 'rail-proj-abc123',
        projectUrl: 'https://railway.app/project/abc123',
        deploymentUrl: 'https://myapp-production.up.railway.app',
        services: [
          {
            name: 'myapp',
            url: 'https://myapp-production.up.railway.app',
            status: 'SUCCESS',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Deployment failed' })
  async deployProject(
    @Param('id') projectId: string,
    @Headers('x-railway-token') railwayToken: string,
    @Body()
    body: {
      projectName?: string;
      environmentVariables?: Record<string, string>;
    },
    @CurrentUser() user: RequestUser,
  ) {
    if (!railwayToken) {
      throw new BadRequestException(
        'Railway token is required in x-railway-token header',
      );
    }

    return this.railwayService.deployProject(projectId, user.id, railwayToken, {
      projectName: body.projectName,
      environmentVariables: body.environmentVariables,
    });
  }

  @Post('projects/:id/redeploy')
  @ApiOperation({ summary: 'Redeploy existing Railway project' })
  @ApiHeader({
    name: 'x-railway-token',
    description: 'Railway API token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Redeployment triggered' })
  @ApiResponse({ status: 400, description: 'Redeploy failed' })
  async redeployProject(
    @Param('id') projectId: string,
    @Headers('x-railway-token') railwayToken: string,
    @CurrentUser() user: RequestUser,
  ) {
    if (!railwayToken) {
      throw new BadRequestException(
        'Railway token is required in x-railway-token header',
      );
    }

    return this.railwayService.redeployProject(projectId, user.id, railwayToken);
  }

  @Get('projects/:id/status')
  @ApiOperation({ summary: 'Get deployment status' })
  @ApiHeader({
    name: 'x-railway-token',
    description: 'Railway API token',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Deployment status retrieved',
    schema: {
      example: {
        projectId: 'rail-proj-abc123',
        status: 'SUCCESS',
        deployments: [
          {
            id: 'deploy-123',
            status: 'SUCCESS',
            createdAt: '2026-01-09T10:00:00Z',
            url: 'https://myapp-production.up.railway.app',
          },
        ],
      },
    },
  })
  async getDeploymentStatus(
    @Param('id') projectId: string,
    @Headers('x-railway-token') railwayToken: string,
    @CurrentUser() user: RequestUser,
  ) {
    if (!railwayToken) {
      throw new BadRequestException(
        'Railway token is required in x-railway-token header',
      );
    }

    // Get FuzzyLlama project to find Railway project ID
    const project = await this.railwayService['prisma'].project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.ownerId !== user.id) {
      throw new BadRequestException(
        'You can only view deployment status for your own projects',
      );
    }

    if (!project.railwayProjectId) {
      throw new BadRequestException('Project not yet deployed to Railway');
    }

    return this.railwayService.getDeploymentStatus(
      railwayToken,
      project.railwayProjectId,
    );
  }
}
