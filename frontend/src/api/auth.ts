import apiClient, { tokenStorage } from '../lib/api-client';
import type { AuthTokens, LoginCredentials, RegisterData, User } from '../types';

export const authApi = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/register', data);
    const { accessToken, refreshToken } = response.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    return response.data;
  },

  // Login
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
    const { accessToken, refreshToken } = response.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    return response.data;
  },

  // Logout
  logout: () => {
    tokenStorage.clearTokens();
  },

  // Get current user
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    tokenStorage.setTokens(accessToken, newRefreshToken);
    return response.data;
  },
};
