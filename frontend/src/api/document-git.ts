import apiClient from '../lib/api-client';

export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface DocumentCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  filesChanged: string[];
}

export interface DocumentVersion {
  commitHash: string;
  content: string;
  message: string;
  author: string;
  date: string;
}

export interface DocumentBranch {
  name: string;
  isCurrent: boolean;
  lastCommit?: string;
}

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  filesCommitted?: number;
}

export const documentGitApi = {
  // Get git status for project documents
  getStatus: async (projectId: string): Promise<GitStatus> => {
    const response = await apiClient.get<GitStatus>(`/documents/git/${projectId}/status`);
    return response.data;
  },

  // Get commit history for all documents
  getHistory: async (projectId: string, limit = 50): Promise<DocumentCommit[]> => {
    const response = await apiClient.get<DocumentCommit[]>(
      `/documents/git/${projectId}/history?limit=${limit}`
    );
    return response.data;
  },

  // Get commit history for a specific document
  getDocumentHistory: async (
    projectId: string,
    filePath: string,
    limit = 20
  ): Promise<DocumentCommit[]> => {
    const encodedPath = encodeURIComponent(filePath);
    const response = await apiClient.get<DocumentCommit[]>(
      `/documents/git/${projectId}/history/${encodedPath}?limit=${limit}`
    );
    return response.data;
  },

  // Get document content at a specific commit
  getDocumentAtCommit: async (
    projectId: string,
    filePath: string,
    commitHash: string
  ): Promise<DocumentVersion> => {
    const encodedPath = encodeURIComponent(filePath);
    const response = await apiClient.get<DocumentVersion>(
      `/documents/git/${projectId}/version/${commitHash}/${encodedPath}`
    );
    return response.data;
  },

  // Get list of branches
  getBranches: async (projectId: string): Promise<DocumentBranch[]> => {
    const response = await apiClient.get<DocumentBranch[]>(`/documents/git/${projectId}/branches`);
    return response.data;
  },

  // List all document files
  listFiles: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/documents/git/${projectId}/files`);
    return response.data;
  },

  // Commit all pending changes
  commitAll: async (projectId: string, message: string): Promise<CommitResult> => {
    const response = await apiClient.post<CommitResult>(`/documents/git/${projectId}/commit`, {
      message,
    });
    return response.data;
  },

  // Commit a specific document
  commitDocument: async (
    projectId: string,
    documentId: string,
    message: string
  ): Promise<CommitResult> => {
    const response = await apiClient.post<CommitResult>(
      `/documents/git/${projectId}/commit/${documentId}`,
      { message }
    );
    return response.data;
  },

  // Create a new branch
  createBranch: async (
    projectId: string,
    branchName: string
  ): Promise<{ success: boolean; branch: string }> => {
    const response = await apiClient.post<{ success: boolean; branch: string }>(
      `/documents/git/${projectId}/branch`,
      { branchName }
    );
    return response.data;
  },

  // Switch to a different branch
  switchBranch: async (
    projectId: string,
    branchName: string
  ): Promise<{ success: boolean; branch: string }> => {
    const response = await apiClient.post<{ success: boolean; branch: string }>(
      `/documents/git/${projectId}/switch-branch`,
      { branchName }
    );
    return response.data;
  },

  // Revert a document to a previous commit
  revertDocument: async (
    projectId: string,
    documentId: string,
    commitHash: string
  ): Promise<{ success: boolean; newCommitHash?: string }> => {
    const response = await apiClient.post<{ success: boolean; newCommitHash?: string }>(
      `/documents/git/${projectId}/revert/${documentId}`,
      { commitHash }
    );
    return response.data;
  },

  // Get diff between two commits
  getDiff: async (
    projectId: string,
    filePath: string,
    fromCommit: string,
    toCommit: string
  ): Promise<{ diff: string }> => {
    const encodedPath = encodeURIComponent(filePath);
    const response = await apiClient.get<{ diff: string }>(
      `/documents/git/${projectId}/diff?filePath=${encodedPath}&from=${fromCommit}&to=${toCommit}`
    );
    return response.data;
  },

  // Sync database documents to filesystem
  syncToFilesystem: async (
    projectId: string
  ): Promise<{ success: boolean; documentsSynced: number }> => {
    const response = await apiClient.post<{ success: boolean; documentsSynced: number }>(
      `/documents/git/${projectId}/sync`
    );
    return response.data;
  },

  // Initialize git repository
  initRepository: async (projectId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/documents/git/${projectId}/init`
    );
    return response.data;
  },
};
