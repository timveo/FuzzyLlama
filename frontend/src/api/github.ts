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

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}

export interface TempImportResult {
  tempKey: string;
  filename: string;
  size: number;
  signedUrl: string;
  githubPath: string;
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

  // ==================== OAuth Methods ====================

  // Get OAuth URL (redirects to GitHub)
  getOAuthUrl: (): string => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${backendUrl}/auth/github`;
  },

  // Check GitHub connection status
  getConnectionStatus: async (): Promise<GitHubConnectionStatus> => {
    const response = await apiClient.get<GitHubConnectionStatus>('/auth/github/status');
    return response.data;
  },

  // Disconnect GitHub account
  disconnect: async (): Promise<void> => {
    await apiClient.post('/auth/github/disconnect');
  },

  // ==================== File Browsing Methods ====================

  // Get repository contents (files and directories)
  // Token is optional - uses OAuth token if connected
  getRepoContents: async (
    owner: string,
    repo: string,
    path = '',
    githubToken?: string
  ): Promise<GitHubContentItem[]> => {
    const response = await apiClient.get<GitHubContentItem[]>(
      `/github/repos/${owner}/${repo}/contents`,
      {
        params: { path },
        headers: githubToken ? { 'x-github-token': githubToken } : {},
      }
    );
    return response.data;
  },

  // Parse GitHub URL to extract owner and repo
  parseUrl: async (url: string): Promise<{ owner: string; repo: string }> => {
    const response = await apiClient.post<{ owner: string; repo: string }>(
      '/github/parse-url',
      { url }
    );
    return response.data;
  },

  // Import files from GitHub to temp storage
  // Token is optional - uses OAuth token if connected
  importFilesToTemp: async (
    owner: string,
    repo: string,
    filePaths: string[],
    sessionId: string,
    githubToken?: string
  ): Promise<TempImportResult[]> => {
    const response = await apiClient.post<TempImportResult[]>(
      '/github/import-temp',
      { owner, repo, filePaths, sessionId },
      { headers: githubToken ? { 'x-github-token': githubToken } : {} }
    );
    return response.data;
  },

  // List user repositories (uses OAuth token)
  listRepositoriesOAuth: async (
    page = 1,
    perPage = 30
  ): Promise<GitHubRepository[]> => {
    const response = await apiClient.get<GitHubRepository[]>(
      `/github/repositories?page=${page}&perPage=${perPage}`
    );
    return response.data;
  },
};
