import React from 'react';
import { RepairServicePerformanceReport } from '../types/reports.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wrench, ShieldCheck, UserCheck, Coins, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';

interface RepairServicePerformanceWidgetProps {
  data: RepairServicePerformanceReport | null;
  isLoading: boolean;
  userRole?: string;
}

export const RepairServicePerformanceWidget: React.FC<RepairServicePerformanceWidgetProps> = ({
  data,
  isLoading,
  userRole = 'OWNER',
}) => {
  if (isLoading) {
    return <SkeletonPlaceholder className="h-96 w-full rounded-xl" />;
  }

  // STRICT SECURITY RULE: STAFF MUST NOT SEE PROFIT SNAPSHOTS OR REPAIR SERVICE PERFORMANCE
  if (userRole === 'STAFF' || !data) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic bg-card rounded-xl border border-border">
        Operational repair activity is managed under the Repair Roster. Financial profit share performance reports are restricted to authorized Owner and Technician accounts.
      </div>
    );
  }

  const {
    totalRepairsCompleted,
    ownerRepairsCount,
    technicianRepairsCount,
    totalServiceRevenue,
    totalPartsCost,
    totalNetProfit,
    totalOwnerShare,
    totalTechnicianPayout,
    ownerPerformance,
    technicianPerformances,
    allWorkersComparison,
  } = data;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary shrink-0" />
            <span>REPAIR SERVICE PERFORMANCE</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative finalized repair performance based on actual revenue, historical parts cost, net profit, and profit share attribution.
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          {totalRepairsCompleted} Total Finalized Jobs
        </span>
      </div>

      {/* Summary Totals Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <Card className="p-4 space-y-1 bg-card">
          <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
            Repair Services Completed
          </span>
          <p className="text-xl font-extrabold text-foreground font-mono">
            {totalRepairsCompleted} <span className="text-xs font-normal text-muted-foreground">Jobs</span>
          </p>
          <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-2">
            <span>Owner: <strong className="text-foreground font-mono">{ownerRepairsCount}</strong></span>
            <span>•</span>
            <span>Techs: <strong className="text-foreground font-mono">{technicianRepairsCount}</strong></span>
          </p>
        </Card>

        <Card className="p-4 space-y-1 bg-card">
          <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
            Total Service Revenue
          </span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(totalServiceRevenue, 'INR')}
          </p>
          <p className="text-[11px] text-muted-foreground pt-1">Gross customer service charges</p>
        </Card>

        <Card className="p-4 space-y-1 bg-card">
          <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
            Total Parts Cost
          </span>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(totalPartsCost, 'INR')}
          </p>
          <p className="text-[11px] text-muted-foreground pt-1">Historical inventory parts cost</p>
        </Card>

        <Card className="p-4 space-y-1 bg-card">
          <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
            Total Net Repair Profit
          </span>
          <p className="text-xl font-extrabold text-primary font-mono">
            {formatCurrency(totalNetProfit, 'INR')}
          </p>
          <p className="text-[11px] text-muted-foreground pt-1">Revenue minus consumed parts cost</p>
        </Card>
      </div>

      {/* Owner Share vs Technician Payout Summary Header */}
      {userRole === 'OWNER' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Total Owner Share Earnings
              </span>
              <p className="text-2xl font-black font-mono mt-0.5">
                {formatCurrency(totalOwnerShare, 'INR')}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">
                100% owner repairs + 30% technician repairs
              </p>
            </div>
            <ShieldCheck className="w-8 h-8 text-emerald-500/50 shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Total Technician Payouts
              </span>
              <p className="text-2xl font-black font-mono mt-0.5">
                {formatCurrency(totalTechnicianPayout, 'INR')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cumulative 70% share distributed to technicians
              </p>
            </div>
            <Coins className="w-8 h-8 text-primary/50 shrink-0" />
          </div>
        </div>
      )}

      {/* Individual Performance Breakdown Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span>Worker Service Performance Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Owner Performance Card */}
          {ownerPerformance && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>OWNER ({ownerPerformance.workerName})</span>
                  </span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    100% Net Profit Retained
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Services Completed:</span>
                  <span className="font-bold text-foreground">{ownerPerformance.servicesCompleted}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Service Revenue:</span>
                  <span className="font-bold text-foreground">{formatCurrency(ownerPerformance.serviceRevenue, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Parts Cost:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(ownerPerformance.partsCost, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Net Profit:</span>
                  <span className="font-bold text-primary">{formatCurrency(ownerPerformance.netProfit, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="font-sans">Owner Share (100%):</span>
                  <span>{formatCurrency(ownerPerformance.ownerShare, 'INR')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technician Performance Cards */}
          {technicianPerformances.map((tech) => (
            <Card key={tech.workerId} className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>TECHNICIAN ({tech.workerName})</span>
                  </span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    70% Tech / 30% Owner Split
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Services Completed:</span>
                  <span className="font-bold text-foreground">{tech.servicesCompleted}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Service Revenue:</span>
                  <span className="font-bold text-foreground">{formatCurrency(tech.serviceRevenue, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Parts Cost:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(tech.partsCost, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">Net Profit:</span>
                  <span className="font-bold text-primary">{formatCurrency(tech.netProfit, 'INR')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="font-sans">Technician Share (70%):</span>
                  <span>{formatCurrency(tech.technicianShare, 'INR')}</span>
                </div>
                {userRole === 'OWNER' && (
                  <div className="flex justify-between py-1 pt-1.5 text-xs text-muted-foreground font-semibold">
                    <span className="font-sans">Owner Retained Share (30%):</span>
                    <span>{formatCurrency(tech.ownerShare, 'INR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Owner vs Technician Comparison Table */}
      {userRole === 'OWNER' && allWorkersComparison.length > 0 && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <span>Owner vs Technician Service Performance Comparison</span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-3 font-sans">Worker</th>
                  <th className="p-3 font-sans">Role</th>
                  <th className="p-3 text-center font-sans">Services</th>
                  <th className="p-3 text-right font-sans">Service Revenue</th>
                  <th className="p-3 text-right font-sans">Parts Cost</th>
                  <th className="p-3 text-right font-sans">Net Profit</th>
                  <th className="p-3 text-right font-sans">Owner Share</th>
                  <th className="p-3 text-right font-sans">Technician Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allWorkersComparison.map((worker) => (
                  <tr key={worker.workerId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground font-sans">{worker.workerName}</td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        worker.workerRole === 'OWNER'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {worker.workerRole}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-foreground">{worker.servicesCompleted}</td>
                    <td className="p-3 text-right font-bold text-foreground">{formatCurrency(worker.serviceRevenue, 'INR')}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">-{formatCurrency(worker.partsCost, 'INR')}</td>
                    <td className="p-3 text-right font-bold text-primary">{formatCurrency(worker.netProfit, 'INR')}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(worker.ownerShare, 'INR')}</td>
                    <td className="p-3 text-right font-bold text-foreground">{formatCurrency(worker.technicianShare, 'INR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
