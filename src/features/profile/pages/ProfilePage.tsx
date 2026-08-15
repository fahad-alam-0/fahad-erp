import React from 'react';
import { Header } from '@/components/common/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const ProfilePage: React.FC = () => {
  const { user, profile, role } = useAuthStore();

  return (
    <div className="space-y-6">
      <Header title="My Account Profile" subtitle="Manage personal details, security, and credentials." />
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong className="text-muted-foreground">Full Name:</strong> {profile?.full_name || 'N/A'}</p>
          <p><strong className="text-muted-foreground">Email:</strong> {user?.email || 'N/A'}</p>
          <p><strong className="text-muted-foreground">Phone:</strong> {profile?.phone || 'N/A'}</p>
          <p><strong className="text-muted-foreground">Assigned Role:</strong> <span className="uppercase font-semibold text-primary">{role || profile?.role || 'N/A'}</span></p>
          <p><strong className="text-muted-foreground">Account Status:</strong> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profile?.is_active ? 'Active' : 'Disabled'}</span></p>
        </CardContent>
      </Card>
    </div>
  );
};
