import React from 'react';
import { SystemInfo } from '../types/settings.types';
import { Info, Cpu, Database, ShieldCheck, Smartphone } from 'lucide-react';

export const SystemInfoSection: React.FC = () => {
  const sysInfo: SystemInfo = {
    appName: 'Fahad Electronics & Service Center ERP',
    version: '1.0.0 (Production Stable)',
    environment: 'Production Environment',
    frontendStack: 'Vite 5 • React 18 • Tailwind CSS',
    backendStack: 'Supabase PostgreSQL (Migrations 001–006)',
    authProvider: 'Supabase JWT Auth & RPC Security Definer',
    pwaStatus: 'Progressive Web App Enabled (Vite PWA)',
  };

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-2xs">
        <div className="flex items-center space-x-2 border-b border-border pb-3">
          <Info className="w-5 h-5 text-primary" />
          <div>
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
              System Architecture & Environment Specifications
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified non-sensitive application technical specifications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Application Name
            </span>
            <p className="font-bold text-foreground">{sysInfo.appName}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" /> Build Release Version
            </span>
            <p className="font-mono font-bold text-foreground">{sysInfo.version}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Frontend Technology Stack
            </span>
            <p className="font-mono text-foreground font-semibold">{sysInfo.frontendStack}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" /> Backend Database Engine
            </span>
            <p className="font-mono text-foreground font-semibold">{sysInfo.backendStack}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Security Layer
            </span>
            <p className="font-mono text-foreground font-semibold">{sysInfo.authProvider}</p>
          </div>

          <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-sky-500" /> PWA Capabilities
            </span>
            <p className="font-mono text-foreground font-semibold">{sysInfo.pwaStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
