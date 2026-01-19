import apiClient from '../lib/api-client';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

export interface GitHubRepository {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  private: boolean;
  updatedAt: string;
}

export interface GitHubExportResult {
  success: boolean;
  repoUrl: string;
  repoName: string;
  filesExported: number;
  error?: string;
}

export const githubApi = {
  // Get authenticated GitHub user info
  getUser: async (githubToken: string): Promise<GitHubUser> => {
    const response = await apiClient.get<GitHubUser>('/github/user', {
      headers: { 'x-github-token': githubToken },
    });
    return response.data;
  },

  // List user's repositories
  listRepositories: async (
    githubToken: string,
    page = 1,
    perPage = 30
  ): Promise<GitHubRepository[]> => {
    const response = await apiClient.get<GitHubRepository[]>(
      `/github/repositories?page=${page}&perPage=${perPage}`,
      { headers: { 'x-github-token': githubToken } }
    );
    return response.data;
  },

  // Export project to GitHub (creates new repo)
  exportProject: async (
    projectId: string,
    githubToken: string,
    repoName?: string
  ): Promise<GitHubExportResult> => {
    const response = await apiClient.post<GitHubExportResult>(
      `/github/projects/${projectId}/export`,
      { repoName },
      { headers: { 'x-github-token': githubToken } }
    );
    return response.data;
  },

  // Push updates to existing GitHub repository
  pushUpdates: async (
    projectId: string,
    githubToken: string,
    commitMessage?: string
  ): Promise<GitHubExportResult> => {
    const response = await apiClient.post<GitHubExportResult>(
      `/github/projects/${projectId}/push`,
      { commitMessage },
      { headers: { 'x-github-token': githubToken } }
    );
    return response.data;
  },

  // Get repository info
  getRepositoryInfo: async (
    githubToken: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepository> => {
    const response = await apiClient.get<GitHubRepository>(
      `/github/repositories/${owner}/${repo}`,
      { headers: { 'x-github-token': githubToken } }
    );
    return response.data;
  },

  // Generate README for project
  createReadme: async (projectId: string): Promise<{ success: boolean; content: string }> => {
    const response = await apiClient.post<{ success: boolean; content: string }>(
      `/github/projects/${projectId}/readme`
    );
    return response.data;
  },
};
