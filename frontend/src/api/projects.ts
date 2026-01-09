import apiClient from '../lib/api-client';
import type { Project, ProjectState } from '../types';

export interface CreateProjectData {
  name: string;
  type: 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';
  repository?: string;
  githubRepoUrl?: string;
}

export interface UpdateProjectData {
  name?: string;
  repository?: string;
  githubRepoUrl?: string;
}

export interface UpdateProjectStateData {
  currentPhase?: string;
  currentGate?: string;
  currentAgent?: string;
  percentComplete?: number;
}

export const projectsApi = {
  // List all projects
  list: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  // Get project by ID
  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  // Create project
  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  // Update project
  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    const response = await apiClient.patch<Project>(`/projects/${id}`, data);
    return response.data;
  },

  // Update project state
  updateState: async (id: string, data: UpdateProjectStateData): Promise<ProjectState> => {
    const response = await apiClient.patch<ProjectState>(`/projects/${id}/state`, data);
    return response.data;
  },

  // Delete project
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
