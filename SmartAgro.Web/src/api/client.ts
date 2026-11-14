import axios from 'axios';
import type { RefreshResponse } from '../types/auth';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5240';
const API_BASE_URL = `${API_ORIGIN}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartagro_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const accessToken = localStorage.getItem('smartagro_access_token');
      const refreshToken = localStorage.getItem('smartagro_refresh_token');

      if (!refreshToken || !accessToken) {
        localStorage.removeItem('smartagro_access_token');
        localStorage.removeItem('smartagro_refresh_token');
        localStorage.removeItem('smartagro_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<RefreshResponse>(
          `${API_BASE_URL}/Auth/refresh-token`,
          { accessToken, refreshToken }
        );

        localStorage.setItem('smartagro_access_token', data.accessToken);
        localStorage.setItem('smartagro_refresh_token', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('smartagro_access_token');
        localStorage.removeItem('smartagro_refresh_token');
        localStorage.removeItem('smartagro_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);