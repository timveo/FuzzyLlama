import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
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
import { GitHubService } from './github.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/user.types';

@ApiTags('github')
@Controller('github')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get authenticated GitHub user info' })
  @ApiHeader({
    name: 'x-github-token',
    description: 'GitHub personal access token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'GitHub user info retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid GitHub token' })
  async getUser(@Headers('x-github-token') githubToken: string) {
    if (!githubToken) {
      throw new BadRequestException('GitHub token is required in x-github-token header');
    }

    return this.githubService.getAuthenticatedUser(githubToken);
  }

  @Get('repositories')
  @ApiOperation({ summary: 'List user repositories' })
  @ApiHeader({
    name: 'x-github-token',
    description: 'GitHub personal access token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Repositories retrieved' })
  async listRepositories(
    @Headers('x-github-token') githubToken: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    if (!githubToken) {
      throw new BadRequestException('GitHub token is required in x-github-token header');
    }

    return this.githubService.listUserRepositories(
      githubToken,
      page || 1,
      perPage || 30,
    );
  }

  @Post('projects/:id/export')
  @ApiOperation({ summary: 'Export project to GitHub' })
  @ApiHeader({
    name: 'x-github-token',
    description: 'GitHub personal access token',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Project exported to GitHub successfully',
  })
  @ApiResponse({ status: 400, description: 'Export failed' })
  async exportProject(
    @Param('id') projectId: string,
    @Headers('x-github-token') githubToken: string,
    @Body() body: { repoName?: string },
    @CurrentUser() user: RequestUser,
  ) {
    if (!githubToken) {
      throw new BadRequestException('GitHub token is required in x-github-token header');
    }

    return this.githubService.exportProjectToGitHub(
      projectId,
      user.id,
      githubToken,
      body.repoName,
    );
  }

  @Post('projects/:id/push')
  @ApiOperation({ summary: 'Push updates to existing GitHub repository' })
  @ApiHeader({
    name: 'x-github-token',
    description: 'GitHub personal access token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Updates pushed successfully' })
  @ApiResponse({ status: 400, description: 'Push failed' })
  async pushUpdates(
    @Param('id') projectId: string,
    @Headers('x-github-token') githubToken: string,
    @Body() body: { commitMessage?: string },
    @CurrentUser() user: RequestUser,
  ) {
    if (!githubToken) {
      throw new BadRequestException('GitHub token is required in x-github-token header');
    }

    return this.githubService.pushUpdatesToGitHub(
      projectId,
      user.id,
      githubToken,
      body.commitMessage,
    );
  }

  @Get('repositories/:owner/:repo')
  @ApiOperation({ summary: 'Get repository info' })
  @ApiHeader({
    name: 'x-github-token',
    description: 'GitHub personal access token',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Repository info retrieved' })
  async getRepositoryInfo(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Headers('x-github-token') githubToken: string,
  ) {
    if (!githubToken) {
      throw new BadRequestException('GitHub token is required in x-github-token header');
    }

    return this.githubService.getRepositoryInfo(githubToken, owner, repo);
  }

  @Post('projects/:id/readme')
  @ApiOperation({ summary: 'Generate and write README.md for project' })
  @ApiResponse({ status: 200, description: 'README created successfully' })
  async createReadme(@Param('id') projectId: string, @CurrentUser() user: RequestUser) {
    const readme = await this.githubService.createReadme(projectId);

    return {
      success: true,
      content: readme,
      message: 'README.md created',
    };
  }
}
