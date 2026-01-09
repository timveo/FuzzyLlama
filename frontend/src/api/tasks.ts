import apiClient from '../lib/api-client';
import type { Task, TaskStats, TaskStatus, TaskPriority } from '../types';

export interface CreateTaskData {
  name: string;
  projectId: string;
  phase: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  estimatedEffort?: number;
  assignedToId?: string;
  parentTaskId?: string;
  agentId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimatedEffort?: number;
  actualEffort?: number;
  agentId?: string;
  assignedToId?: string;
  blockingReason?: string;
}

export const tasksApi = {
  // List tasks by project
  list: async (projectId: string): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>(`/tasks?projectId=${projectId}`);
    return response.data;
  },

  // Get task by ID
  get: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  // Create task
  create: async (data: CreateTaskData): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', data);
    return response.data;
  },

  // Update task
  update: async (id: string, data: UpdateTaskData): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  // Delete task
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  // Get task statistics
  getStats: async (projectId: string): Promise<TaskStats> => {
    const response = await apiClient.get<TaskStats>(`/tasks/stats/${projectId}`);
    return response.data;
  },
};
