import React from 'react';
import { OwnerFinancialOverview } from '../types/reports.types';
import { formatCurrency } from '@/lib/utils';
import { ShieldCheck, DollarSign, TrendingUp, ShoppingCart, Wrench, UserCheck } from 'lucide-react';

interface OwnerFinancialOverviewWidgetProps {
  data: OwnerFinancialOverview | null;
  isLoading: boolean;
}

export const OwnerFinancialOverviewWidget: React.FC<OwnerFinancialOverviewWidgetProps> = ({
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

  return (
    <div className="space-y-4">
      {/* Financial Overview Banner */}
      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm font-sans uppercase tracking-wider">
              Owner Executive Financial Summary (Migration 006 Profit Snapshots)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            Confidential Owner View
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 bg-card rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> POS Sales Revenue
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.salesRevenue, 'INR')}
            </span>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block flex items-center gap-1">
              <ShoppingCart className="w-3 h-3 text-sky-500" /> Inventory Purchasing Value
            </span>
            <span className="text-lg font-extrabold text-foreground">
              {formatCurrency(data.purchaseValue, 'INR')}
            </span>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block flex items-center gap-1">
              <Wrench className="w-3 h-3 text-primary" /> Repair Service Revenue
            </span>
            <span className="text-lg font-extrabold text-primary">
              {formatCurrency(data.repairRevenue, 'INR')}
            </span>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-500" /> Net Repair Profit
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.netRepairProfit, 'INR')}
            </span>
            <span className="text-[10px] text-muted-foreground block font-sans">
              (Parts Cost: -{formatCurrency(data.repairPartsCost, 'INR')})
            </span>
          </div>
        </div>

        {/* Profit Split Distribution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-sans block font-semibold">
                Owner Repair Profit Share
              </span>
              <span className="text-base font-bold text-primary">
                {formatCurrency(data.ownerRepairShare, 'INR')}
              </span>
            </div>
            <span className="text-[10px] font-sans px-2 py-1 rounded bg-primary/10 text-primary font-bold">
              Owner Allocation
            </span>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-sans block font-semibold">
                Technicians Repair Profit Share
              </span>
              <span className="text-base font-bold text-sky-500">
                {formatCurrency(data.technicianRepairShare, 'INR')}
              </span>
            </div>
            <span className="text-[10px] font-sans px-2 py-1 rounded bg-sky-500/10 text-sky-500 font-bold">
              Tech Pool Allocation
            </span>
          </div>
        </div>
      </div>

      {/* Technician Earnings Breakdown Table */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-primary" />
          <span>Technician Repair Earnings Breakdown (70% Profit Share Model)</span>
        </h4>

        {data.technicianEarningsSummary.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No finalized repair profit snapshots recorded in this period.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-2.5">Technician Name</th>
                  <th className="p-2.5 text-center">Finalized Repairs</th>
                  <th className="p-2.5 text-right">Technician 70% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.technicianEarningsSummary.map((t) => (
                  <tr key={t.techId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 font-semibold text-foreground">{t.techName}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-primary">
                      {t.completedJobs} Jobs
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-sky-500">
                      {formatCurrency(t.techShare, 'INR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
