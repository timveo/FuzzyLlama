// Types for UnifiedDashboard components

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeNode[];
  content?: string;
}

export interface GateApprovalData {
  gateNumber: number;
  title: string;
  description: string;
  checklist: { item: string; completed: boolean }[];
  artifacts: string[];
  agentRecommendation: string;
}

export type WorkspaceTab = 'ui' | 'docs' | 'code' | 'map';
export type MainView = 'dashboard' | 'projects';
export type Phase = 'plan' | 'dev' | 'ship';
export type ThemeMode = 'dark' | 'light';

export interface Agent {
  type: string;
  name: string;
  icon: string;
  status: 'idle' | 'working';
  phase: Phase;
}

export interface GateInfo {
  name: string;
  narrative: string;
  description: string;
  deliverables: string[];
  summary: string;
  decisions: { choice: string; reason: string }[];
  documents: { name: string; path: string; icon: string }[];
  celebration: string;
}

export interface GateTask {
  task: string;
  status: 'done' | 'in-progress' | 'pending';
}
