import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ThemeSwitcher } from './components/ThemeSwitcher';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary text-primary-foreground rounded-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">Fahad ERP</span>
        </div>
        <div>
          <blockquote className="text-lg font-medium italic mb-4">
            &ldquo;Streamlining our electronics retail inventory and repair diagnostic workflow across all branches.&rdquo;
          </blockquote>
          <p className="text-xs text-slate-400">&mdash; Fahad Electronics Management</p>
        </div>
        <div className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Multi-Tenant Architecture</div>
      </div>

      <div className="flex flex-col justify-between p-6 md:p-12 relative">
        <div className="flex justify-end">
          <ThemeSwitcher />
        </div>
        <div className="w-full max-w-md mx-auto">
          <Outlet />
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Protected Enterprise System
        </div>
      </div>
    </div>
  );
};
