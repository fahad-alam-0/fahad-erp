import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/authentication/authService';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut, Loader2, KeyRound, UserCheck } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const { user, profile, clearAuth } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutClick = async () => {
    try {
      setIsSigningOut(true);
      await authService.signOut();
      clearAuth();
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to sign out:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Security Overview */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-2xs">
        <div>
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Active Supabase Auth Session</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified session token bound to PostgreSQL RLS security policies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold block flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" /> Authenticated User ID
            </span>
            <p className="font-bold text-foreground truncate">{user?.id || 'N/A'}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold block flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-primary" /> Auth Provider
            </span>
            <p className="font-bold text-foreground">Supabase Identity Auth</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Session Status:</span>
            <StatusBadge status={profile?.is_active ? 'ACTIVE' : 'INACTIVE'} />
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOutClick}
            disabled={isSigningOut}
            className="text-xs pressable flex items-center gap-1.5"
          >
            {isSigningOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sign Out Session</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
