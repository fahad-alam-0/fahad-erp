import React from 'react';
import { useSidebarStore } from '@/store/useSidebarStore';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Laptop, Sliders, CheckCircle2 } from 'lucide-react';

export const ApplicationSettingsSection: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [themeMode, setThemeMode] = React.useState<'system' | 'light' | 'dark'>('system');

  const handleThemeChange = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System default
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Theme Preference */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-2xs">
        <div>
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
            Appearance & Theme Preference
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your preferred interface theme mode for Fahad ERP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleThemeChange('system')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all pressable ${
              themeMode === 'system'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Laptop className="w-4 h-4" />
              <span className="text-xs font-semibold">System Default</span>
            </div>
            {themeMode === 'system' && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </button>

          <button
            onClick={() => handleThemeChange('light')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all pressable ${
              themeMode === 'light'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold">Light Surface</span>
            </div>
            {themeMode === 'light' && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all pressable ${
              themeMode === 'dark'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Moon className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold">Dark Theme</span>
            </div>
            {themeMode === 'dark' && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>

      {/* Sidebar Preference */}
      <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-2xs">
        <div className="space-y-0.5">
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Navigation Sidebar Mode</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            Current status: <strong className="text-foreground">{isCollapsed ? 'Collapsed (Icons Only)' : 'Expanded (Full Labels)'}</strong>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSidebar}
          className="text-xs pressable"
        >
          <span>{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</span>
        </Button>
      </div>
    </div>
  );
};
