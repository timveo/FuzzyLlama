import apiClient from '../lib/api-client';

export interface Decision {
  id: number;
  projectId: string;
  gate: string;
  agent: string;
  decisionType: string;
  description: string;
  rationale?: string;
  alternativesConsidered?: string;
  outcome?: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateDecisionData {
  projectId: string;
  gate: string;
  agent: string;
  decisionType: string;
  description: string;
  rationale?: string;
  alternativesConsidered?: string;
  outcome?: string;
}

export interface UpdateDecisionData {
  gate?: string;
  agent?: string;
  decisionType?: string;
  description?: string;
  rationale?: string;
  alternativesConsidered?: string;
  outcome?: string;
}

export interface DecisionStats {
  total: number;
  byGate: Record<string, number>;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
}

export const decisionsApi = {
  // List decisions by project
  list: async (projectId: string, gate?: string): Promise<Decision[]> => {
    const params = new URLSearchParams({ projectId });
    if (gate) {
      params.append('gate', gate);
    }
    const response = await apiClient.get<Decision[]>(`/decisions?${params}`);
    return response.data;
  },

  // Get decisions by gate
  getByGate: async (projectId: string, gate: string): Promise<Decision[]> => {
    const response = await apiClient.get<Decision[]>(`/decisions/gate/${projectId}/${gate}`);
    return response.data;
  },

  // Get decision by ID
  get: async (id: number): Promise<Decision> => {
    const response = await apiClient.get<Decision>(`/decisions/${id}`);
    return response.data;
  },

  // Create decision
  create: async (data: CreateDecisionData): Promise<Decision> => {
    const response = await apiClient.post<Decision>('/decisions', data);
    return response.data;
  },

  // Update decision
  update: async (id: number, data: UpdateDecisionData): Promise<Decision> => {
    const response = await apiClient.patch<Decision>(`/decisions/${id}`, data);
    return response.data;
  },

  // Delete decision
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/decisions/${id}`);
  },

  // Get decision statistics
  getStats: async (projectId: string): Promise<DecisionStats> => {
    const response = await apiClient.get<DecisionStats>(`/decisions/stats/${projectId}`);
    return response.data;
  },
};
