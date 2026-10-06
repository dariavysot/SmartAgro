export interface User {
  id: string;
  email: string;
  role: 'Admin' | 'User';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}