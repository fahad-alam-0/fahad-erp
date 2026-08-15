import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Breadcrumb } from './components/Breadcrumb';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />

        {!isOnline && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span>Working Offline. Local queries active. Synchronization will resume when online.</span>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Breadcrumb />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <Footer />
      </div>

      {/* Touch Mobile Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
};
