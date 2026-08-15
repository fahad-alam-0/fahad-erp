import React from 'react';
import { TechnicianEarningSummary } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Coins, UserCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TechnicianEarningsCardProps {
  earnings: TechnicianEarningSummary[];
}

export const TechnicianEarningsCard: React.FC<TechnicianEarningsCardProps> = ({ earnings }) => {
  const grandTotalTechnicianPayout = earnings.reduce((sum, item) => sum + item.total_technician_share, 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Technician Profit Share Payouts</span>
        </CardTitle>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Payout Total: {formatCurrency(grandTotalTechnicianPayout, 'INR')}
        </span>
      </CardHeader>

      <CardContent className="flex-1">
        {earnings.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="font-medium text-foreground">No profit snapshots recorded</p>
            <p className="text-[11px] text-muted-foreground">Finalized technician repair profit shares will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border text-xs">
            {earnings.map((tech) => (
              <div key={tech.technician_id} className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-1 rounded-md transition-colors">
                <div>
                  <p className="font-semibold text-foreground">{tech.technician_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tech.total_jobs_completed} {tech.total_jobs_completed === 1 ? 'Job' : 'Jobs'} Completed & Finalized
                  </p>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(tech.total_technician_share, 'INR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
