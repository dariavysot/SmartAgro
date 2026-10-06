import React, { createContext, useContext, useState } from 'react';
import type { User, AuthResponse } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse | any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('smartagro_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const login = (data: any) => {
    const token = data.accessToken || data.AccessToken;
    const refresh = data.refreshToken || data.RefreshToken;

    if (token) localStorage.setItem('smartagro_access_token', token);
    if (refresh) localStorage.setItem('smartagro_refresh_token', refresh);

    // Збираємо користувача з відповіді бекенду
    const resolvedUser: User = data.user || {
      id: data.userId || data.id,
      username: data.username || data.email?.split('@')[0] || 'Користувач',
      email: data.email || 'user@smartagro.ua',
      role: (data.role as 'Admin' | 'User') || 'User',
    };

    localStorage.setItem('smartagro_user', JSON.stringify(resolvedUser));
    setUser(resolvedUser);
  };

  const logout = () => {
    localStorage.removeItem('smartagro_access_token');
    localStorage.removeItem('smartagro_refresh_token');
    localStorage.removeItem('smartagro_user');
    localStorage.removeItem('smartagro_selected_greenhouse_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};