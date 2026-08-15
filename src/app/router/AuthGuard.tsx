import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from '@/constants/routes.constants';
import { Button } from '@/components/ui/button';
import { UserX, LogOut } from 'lucide-react';

export const AuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading, isInitialized, profile, error, signOut } = useAuthStore();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  if (profile && !profile.is_active && location.pathname !== ROUTES.AUTH.ACCOUNT_DISABLED) {
    return <Navigate to={ROUTES.AUTH.ACCOUNT_DISABLED} replace />;
  }

  if (error && error.includes('profile not found')) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-6 rounded-lg border border-destructive/30 bg-card text-card-foreground shadow-lg space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <UserX className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Profile Not Found</h1>
            <p className="text-sm text-muted-foreground">
              Your authentication account exists, but no active user profile was found in the database.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
