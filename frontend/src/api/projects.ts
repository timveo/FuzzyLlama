import apiClient from '../lib/api-client';
import type { Project, ProjectState } from '../types';

export interface CreateProjectData {
  name?: string;
  type?: 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';
  description: string;
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

  // Get project events (for chat history)
  getEvents: async (id: string, eventType?: string): Promise<Array<{
    id: string;
    eventType: string;
    eventData: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>> => {
    const params = eventType ? `?eventType=${eventType}` : '';
    const response = await apiClient.get(`/projects/${id}/events${params}`);
    return response.data;
  },
};
