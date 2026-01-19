import apiClient from '../lib/api-client';

export type Phase = 'plan' | 'dev' | 'ship';
export type GateStatus = 'completed' | 'current' | 'upcoming';

export interface GateTask {
  id: string;
  name: string;
  status: string;
}

export interface GateDecision {
  id: number;
  choice: string;
  reason: string;
  agent: string;
}

export interface GateDocument {
  id: string;
  name: string;
  path: string;
  type: string;
}

export interface GateMetadata {
  name: string;
  narrative: string;
  description: string;
  deliverables: string[];
  celebration: string;
  phase: Phase;
}

export interface GateJourneyData {
  gateNumber: number;
  gateType: string;
  status: GateStatus;
  metadata: GateMetadata;
  tasks: GateTask[];
  decisions: GateDecision[];
  documents: GateDocument[];
  approvedAt?: string;
  approvedBy?: {
    id: string;
    name: string;
  };
}

export interface JourneyData {
  projectId: string;
  projectName: string;
  currentGate: number;
  currentPhase: Phase;
  progressPercentage: number;
  totalGates: number;
  completedGates: number;
  gates: GateJourneyData[];
}

export const journeyApi = {
  // Get complete journey data for a project
  get: async (projectId: string): Promise<JourneyData> => {
    const response = await apiClient.get<JourneyData>(`/journey/${projectId}`);
    return response.data;
  },
};
