import apiClient from '../lib/api-client';
import type { Document, DocumentType } from '../types';

export interface CreateDocumentData {
  projectId: string;
  title: string;
  content: string;
  documentType: DocumentType;
  filePath?: string;
  language?: string;
  agentId?: string;
  gateId?: string;
  version?: number;
}

export interface UpdateDocumentData {
  title?: string;
  content?: string;
  documentType?: DocumentType;
  filePath?: string;
  language?: string;
}

export interface DocumentStats {
  total: number;
  byType: Record<string, number>;
}

export const documentsApi = {
  // List documents by project
  list: async (projectId: string, documentType?: DocumentType): Promise<Document[]> => {
    const params = new URLSearchParams({ projectId });
    if (documentType) {
      params.append('documentType', documentType);
    }
    const response = await apiClient.get<Document[]>(`/documents?${params}`);
    return response.data;
  },

  // Get document by ID
  get: async (id: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  // Create document
  create: async (data: CreateDocumentData): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents', data);
    return response.data;
  },

  // Update document
  update: async (id: string, data: UpdateDocumentData): Promise<Document> => {
    const response = await apiClient.patch<Document>(`/documents/${id}`, data);
    return response.data;
  },

  // Delete document
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Get documents by agent
  getByAgent: async (agentId: string): Promise<Document[]> => {
    const response = await apiClient.get<Document[]>(`/documents/agent/${agentId}`);
    return response.data;
  },

  // Get document statistics
  getStats: async (projectId: string): Promise<DocumentStats> => {
    const response = await apiClient.get<DocumentStats>(`/documents/stats/${projectId}`);
    return response.data;
  },
};
