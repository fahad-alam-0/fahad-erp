import React from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NotificationButton } from './NotificationButton';
import { ProfileMenu } from './ProfileMenu';
import { tenantConfig } from '@/config/tenant.config';
import { Store, Search, Command } from 'lucide-react';

export const Topbar: React.FC = () => {
  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs transition-colors">
      {/* Left: Branch Badge & Global Search Trigger */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 text-xs bg-muted/80 px-3 py-1.5 rounded-full border border-border">
          <Store className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[140px]">
            {tenantConfig.branches[0].name}
          </span>
        </div>

        {/* Global Search Bar Entry Point */}
        <button
          onClick={() => {
            // Future command palette entry point
          }}
          className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/50 hover:bg-muted border border-border px-3 py-1.5 rounded-lg w-40 sm:w-64 justify-between transition-colors pressable"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Search sales, repairs...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border shadow-xs text-muted-foreground">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Toolbar Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        <ThemeSwitcher />
        <NotificationButton />
        <ProfileMenu />
      </div>
    </header>
  );
};
