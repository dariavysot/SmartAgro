export type UserRole = 'Admin' | 'User';

export interface User {
  id?: string;
  username: string;
  email: string;
  role: UserRole;
}

// Плоска відповідь напряму від бекенду
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiration: string;
  username: string;
  email: string;
  role: UserRole;
}

// Якщо ваш AuthContext мапить це у зручний стан:
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}