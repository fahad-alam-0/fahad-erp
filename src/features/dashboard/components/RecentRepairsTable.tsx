import React from 'react';
import { RecentRepairItem } from '../types/dashboard.types';
import { Wrench } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';

interface RecentRepairsTableProps {
  repairs: RecentRepairItem[];
  showTechnicianColumn?: boolean;
}

export const RecentRepairsTable: React.FC<RecentRepairsTableProps> = ({
  repairs,
  showTechnicianColumn = true,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary shrink-0" />
          <span>Active Repair Jobs</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
          {repairs.length} Listed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Device & Issue</th>
              {showTechnicianColumn && <th className="p-3">Assigned Specialist</th>}
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Quoted Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {repairs.length === 0 ? (
              <tr>
                <td
                  colSpan={showTechnicianColumn ? 5 : 4}
                  className="p-8 text-center text-muted-foreground italic"
                >
                  No active repair jobs listed.
                </td>
              </tr>
            ) : (
              repairs.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{rep.customer_name}</td>
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
                    <StatusBadge status={rep.status} />
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
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
