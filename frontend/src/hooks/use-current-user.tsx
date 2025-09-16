import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, User } from '@/contexts/AuthContext';

export interface CurrentUser extends User {}

export const useCurrentUser = () => {
  const { user, loading } = useAuth();
  return { user, loading, error: null };
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{ roles: Array<'estimator' | 'ops' | 'admin'>; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !roles.includes(user.role as any)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
