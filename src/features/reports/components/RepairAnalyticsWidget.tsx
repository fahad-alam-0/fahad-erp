import React from 'react';
import { RepairAnalytics } from '../types/reports.types';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Wrench, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface RepairAnalyticsWidgetProps {
  data: RepairAnalytics | null;
  isLoading: boolean;
}

export const RepairAnalyticsWidget: React.FC<RepairAnalyticsWidgetProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading || !data) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  const statuses = [
    'RECEIVED',
    'DIAGNOSING',
    'WAITING_FOR_PARTS',
    'IN_REPAIR',
    'TESTING',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'CANCELLED',
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Active Repairs</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {data.activeRepairsCount} Active
          </p>
          <p className="text-[10px] text-muted-foreground">In diagnostic / repair queue</p>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Ready for Pickup</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {data.readyForPickupCount} Ready
          </p>
          <p className="text-[10px] text-muted-foreground">Awaiting customer collection</p>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Pending Financials</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </span>
          <p className="text-xl font-bold font-mono text-amber-500">
            {data.pendingFinancialsCount} Pending
          </p>
          <p className="text-[10px] text-muted-foreground">Awaiting owner finalization</p>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Quoted Service Revenue</span>
            <Wrench className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-primary">
            {formatCurrency(data.totalRepairRevenue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground">Total quoted in range</p>
        </div>
      </div>

      {/* Repair Status Distribution Grid */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-primary" />
          <span>Repair Diagnostic Workflow Distribution</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {statuses.map((st) => (
            <div
              key={st}
              className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between"
            >
              <StatusBadge status={st} />
              <span className="font-mono font-bold text-sm text-foreground">
                {data.statusCounts[st] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
