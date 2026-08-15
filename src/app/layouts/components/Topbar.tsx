import React from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NotificationButton } from './NotificationButton';
import { ProfileMenu } from './ProfileMenu';
import { tenantConfig } from '@/config/tenant.config';
import { Store } from 'lucide-react';

export const Topbar: React.FC = () => {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Store Branch Switcher Placeholder */}
      <div className="flex items-center space-x-2 text-xs bg-muted px-3 py-1.5 rounded-full border border-border">
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold text-foreground">
          {tenantConfig.branches[0].name}
        </span>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
        <NotificationButton />
        <ProfileMenu />
      </div>
    </header>
  );
};
