import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RecentRepairItem } from '../types/dashboard.types';
import { Wrench, CheckCircle2, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';

interface TechnicianWorkQueueProps {
  repairs: RecentRepairItem[];
}

export const TechnicianWorkQueue: React.FC<TechnicianWorkQueueProps> = ({ repairs }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary shrink-0" />
          <span>My Assigned Repair Work Queue</span>
        </h3>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {repairs.length} Assigned Jobs
        </span>
      </div>

      {/* Queue Body */}
      {repairs.length === 0 ? (
        <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-semibold text-sm text-foreground">Your work queue is clear!</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            There are currently no active repair jobs assigned to your queue. New customer repair intakes will appear here once assigned by store management.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {repairs.map((rep) => {
            const isReady = rep.status === 'READY_FOR_PICKUP';
            const isWaitingParts = rep.status === 'WAITING_FOR_PARTS';

            return (
              <div
                key={rep.id}
                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isReady
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500'
                    : isWaitingParts
                    ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                    : 'hover:bg-muted/30'
                }`}
              >
                {/* Device & Customer Info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-primary">{rep.job_number}</span>
                    <StatusBadge status={rep.status} />
                  </div>

                  <div className="flex items-center space-x-1.5 text-sm font-bold text-foreground">
                    <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {rep.device_brand} {rep.device_type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-start gap-1">
                    <ShieldAlert className="w-3 h-3 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <span>Reported Problem: {rep.reported_problem}</span>
                  </p>

                  <p className="text-[11px] text-muted-foreground font-medium">
                    Customer: <span className="text-foreground">{rep.customer_name}</span>
                  </p>
                </div>

                {/* Right: Quoted Amount & Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                      Quoted Total
                    </span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatCurrency(rep.total_amount || rep.quoted_amount, 'INR')}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isReady ? 'default' : 'outline'}
                    onClick={() => navigate(ROUTES.REPAIRS.REPAIR_STATUS)}
                    className="flex items-center space-x-1 text-xs pressable shrink-0"
                  >
                    <span>Update Status</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
