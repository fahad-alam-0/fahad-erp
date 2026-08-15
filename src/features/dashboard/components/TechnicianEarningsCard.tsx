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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-500" />
          <span>Technician Profit Share Payouts</span>
        </CardTitle>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          Total: {formatCurrency(grandTotalTechnicianPayout, 'INR')}
        </span>
      </CardHeader>
      <CardContent>
        {earnings.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
            <UserCheck className="w-8 h-8 text-muted-foreground/40" />
            <p>No finalized repair profit snapshots recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border text-xs">
            {earnings.map((tech) => (
              <div key={tech.technician_id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{tech.technician_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tech.total_jobs_completed} {tech.total_jobs_completed === 1 ? 'Job' : 'Jobs'} Completed & Finalized
                  </p>
                </div>
                <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
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
