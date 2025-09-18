import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'estimator' | 'ops' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await api.auth.me();
      const normalizedRole = (userData?.role || "").toLowerCase();
      const normalized = { ...userData, role: normalizedRole } as User;
      setUser(normalized);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      // If error is 401, token is invalid, so clear it.
      if (error?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      await fetchUser();
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Re-throw so login page can handle it
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      await fetchUser();
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
