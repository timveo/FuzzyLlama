import apiClient from '../lib/api-client';
import type { User, UsageStats } from '../types';

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const usersApi = {
  // Get user by ID
  get: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  // Update user
  update: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  // Change password
  changePassword: async (id: string, data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(`/users/${id}/password`, data);
    return response.data;
  },

  // Delete user account
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Get usage statistics
  getUsage: async (id: string): Promise<UsageStats> => {
    const response = await apiClient.get<UsageStats>(`/users/${id}/usage`);
    return response.data;
  },
};
