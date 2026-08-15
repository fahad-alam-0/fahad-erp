import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes.constants';

export const ProfileMenu: React.FC = () => {
  const { user, profile, role, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate(ROUTES.AUTH.LOGIN, { replace: true });
  };

  const displayName = profile?.full_name || user?.email || 'User';
  const displayRole = role || profile?.role || 'Staff';

  return (
    <div className="flex items-center space-x-3 border-l border-border pl-4">
      <button
        onClick={() => navigate(ROUTES.PROFILE)}
        className="flex items-center space-x-2 text-sm font-medium hover:text-primary transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold leading-none">{displayName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">{displayRole}</p>
        </div>
      </button>

      <button
        onClick={handleLogout}
        className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
        title="Sign Out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
};
