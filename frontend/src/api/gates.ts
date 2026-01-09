import apiClient from '../lib/api-client';
import type { Gate, GateType } from '../types';

export interface CreateGateData {
  projectId: string;
  gateType: GateType;
  description?: string;
  passingCriteria?: string;
}

export interface UpdateGateData {
  description?: string;
  passingCriteria?: string;
  reviewNotes?: string;
  blockingReason?: string;
}

export interface ApproveGateData {
  approved: boolean;
  reviewNotes?: string;
}

export interface GateStats {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  blocked: number;
  completionRate: number;
}

export const gatesApi = {
  // List gates by project
  list: async (projectId: string): Promise<Gate[]> => {
    const response = await apiClient.get<Gate[]>(`/gates?projectId=${projectId}`);
    return response.data;
  },

  // Get gate by ID
  get: async (id: string): Promise<Gate> => {
    const response = await apiClient.get<Gate>(`/gates/${id}`);
    return response.data;
  },

  // Create gate
  create: async (data: CreateGateData): Promise<Gate> => {
    const response = await apiClient.post<Gate>('/gates', data);
    return response.data;
  },

  // Update gate
  update: async (id: string, data: UpdateGateData): Promise<Gate> => {
    const response = await apiClient.patch<Gate>(`/gates/${id}`, data);
    return response.data;
  },

  // Approve or reject gate
  approve: async (id: string, data: ApproveGateData): Promise<Gate> => {
    const response = await apiClient.post<Gate>(`/gates/${id}/approve`, data);
    return response.data;
  },

  // Delete gate
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gates/${id}`);
  },

  // Get current gate for project
  getCurrent: async (projectId: string): Promise<Gate | null> => {
    const response = await apiClient.get<Gate | null>(`/gates/current/${projectId}`);
    return response.data;
  },

  // Get gate statistics
  getStats: async (projectId: string): Promise<GateStats> => {
    const response = await apiClient.get<GateStats>(`/gates/stats/${projectId}`);
    return response.data;
  },
};
