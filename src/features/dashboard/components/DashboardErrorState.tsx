import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="p-8 rounded-lg border border-destructive/30 bg-destructive/5 text-center space-y-4 my-6">
      <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-base text-foreground">Unable to load dashboard data</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 text-xs">
        <RefreshCw className="w-3.5 h-3.5" />
        Retry Dashboard Query
      </Button>
    </div>
  );
};
