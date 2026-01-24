import apiClient from '../lib/api-client';

export type AssetType = 'DESIGN_MOCKUP' | 'SCREENSHOT' | 'REFERENCE' | 'LOGO' | 'CODE_FILE' | 'CONFIG_FILE' | 'OTHER';
export type AssetSource = 'LOCAL_UPLOAD' | 'GITHUB';

export interface ProjectAsset {
  id: string;
  projectId: string;
  assetType: AssetType;
  sourceType: AssetSource;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  storageKey: string;
  description?: string | null;
  githubOwner?: string | null;
  githubRepo?: string | null;
  githubPath?: string | null;
  githubSha?: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string;
}

export interface TempUploadResult {
  tempKey: string;
  signedUrl: string;
  filename: string;
  size: number;
}

export const assetsApi = {
  /**
   * Upload a file to temporary storage (before project creation)
   */
  uploadTemp: async (
    file: File,
    sessionId: string,
    assetType?: AssetType,
    description?: string
  ): Promise<TempUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    if (assetType) formData.append('assetType', assetType);
    if (description) formData.append('description', description);

    const response = await apiClient.post<TempUploadResult>('/assets/upload-temp', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Upload a file directly to a project
   */
  uploadToProject: async (
    projectId: string,
    file: File,
    assetType: AssetType,
    description?: string
  ): Promise<ProjectAsset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetType', assetType);
    if (description) formData.append('description', description);

    const response = await apiClient.post<ProjectAsset>(
      `/assets/projects/${projectId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Associate temporary uploads with a project
   */
  associateWithProject: async (
    projectId: string,
    tempKeys: string[],
    assetType?: AssetType
  ): Promise<ProjectAsset[]> => {
    const response = await apiClient.post<ProjectAsset[]>('/assets/associate', {
      projectId,
      tempKeys,
      assetType,
    });
    return response.data;
  },

  /**
   * Get all assets for a project
   */
  getProjectAssets: async (projectId: string): Promise<ProjectAsset[]> => {
    const response = await apiClient.get<ProjectAsset[]>(`/assets/projects/${projectId}`);
    return response.data;
  },

  /**
   * Get a single asset by ID
   */
  getAsset: async (assetId: string): Promise<ProjectAsset> => {
    const response = await apiClient.get<ProjectAsset>(`/assets/${assetId}`);
    return response.data;
  },

  /**
   * Delete an asset
   */
  deleteAsset: async (assetId: string): Promise<void> => {
    await apiClient.delete(`/assets/${assetId}`);
  },

  /**
   * Delete a temporary upload
   */
  deleteTempUpload: async (tempKey: string): Promise<void> => {
    await apiClient.delete(`/assets/temp/${encodeURIComponent(tempKey)}`);
  },
};
