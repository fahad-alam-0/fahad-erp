import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut } from 'lucide-react';

export const AccountDisabledPage: React.FC = () => {
  const { signOut, user, profile } = useAuthStore();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-6 rounded-lg border border-destructive/30 bg-card text-card-foreground shadow-lg space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Account Deactivated</h1>
          <p className="text-sm text-muted-foreground">
            The account for <span className="font-semibold text-foreground">{profile?.full_name || user?.email}</span> has been deactivated by an Administrator.
          </p>
          <p className="text-xs text-muted-foreground">
            You currently do not have access to Fahad ERP. Please contact the store owner to restore your system privileges.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
};
