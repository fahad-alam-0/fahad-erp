import React from 'react';
import { RecentRepairItem } from '../types/dashboard.types';
import { Wrench } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecentRepairsTableProps {
  repairs: RecentRepairItem[];
  showTechnicianColumn?: boolean;
}

export const RecentRepairsTable: React.FC<RecentRepairsTableProps> = ({
  repairs,
  showTechnicianColumn = true,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'DELIVERED':
        return 'bg-muted text-muted-foreground border-border';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span>Active Repair Jobs</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono">{repairs.length} Listed</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Job #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Device & Issue</th>
              {showTechnicianColumn && <th className="p-3">Technician</th>}
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Quoted Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {repairs.length === 0 ? (
              <tr>
                <td
                  colSpan={showTechnicianColumn ? 6 : 5}
                  className="p-6 text-center text-muted-foreground italic"
                >
                  No repair jobs currently listed.
                </td>
              </tr>
            ) : (
              repairs.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-medium">{rep.job_number}</td>
                  <td className="p-3 font-medium">{rep.customer_name}</td>
                  <td className="p-3">
                    <p className="font-semibold text-foreground">
                      {rep.device_brand} {rep.device_type}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {rep.reported_problem}
                    </p>
                  </td>
                  {showTechnicianColumn && (
                    <td className="p-3 text-muted-foreground font-medium">
                      {rep.technician_name || 'Unassigned'}
                    </td>
                  )}
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                        rep.status
                      )}`}
                    >
                      {rep.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-foreground">
                    {formatCurrency(rep.total_amount || rep.quoted_amount, 'INR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
