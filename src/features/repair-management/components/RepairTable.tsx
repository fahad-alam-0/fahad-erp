import React from 'react';
import { RepairJob } from '../types/repair.types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Eye, Wrench, User, Calendar } from 'lucide-react';

interface RepairTableProps {
  repairs: RepairJob[];
  onViewDetails: (repair: RepairJob) => void;
}

export const RepairTable: React.FC<RepairTableProps> = ({ repairs, onViewDetails }) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Ticket #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Device & Problem</th>
              <th className="p-3">Assigned Tech</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Financials</th>
              <th className="p-3">Received Date</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {repairs.map((job) => (
              <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono font-semibold text-primary">{job.job_number}</td>
                <td className="p-3 font-medium text-foreground">
                  {job.customer?.full_name || 'Customer'}
                  <span className="block text-[10px] text-muted-foreground font-mono">
                    {job.customer?.phone}
                  </span>
                </td>
                <td className="p-3">
                  <p className="font-semibold text-foreground">
                    {job.device_brand} {job.device_type} {job.device_model || ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {job.reported_problem}
                  </p>
                </td>
                <td className="p-3 text-muted-foreground">
                  {job.technician?.full_name ? (
                    <span className="font-medium text-foreground">{job.technician.full_name}</span>
                  ) : (
                    <span className="italic text-muted-foreground text-[11px]">Unassigned</span>
                  )}
                </td>
                <td className="p-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="p-3">
                  <StatusBadge status={job.payment_status} />
                </td>
                <td className="p-3">
                  <StatusBadge status={job.financial_status} />
                </td>
                <td className="p-3 text-muted-foreground font-mono text-[11px]">
                  {new Date(job.received_at).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: '2-digit',
                  })}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(job)}
                    className="h-8 px-2.5 text-xs pressable"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>Job Card</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="md:hidden divide-y divide-border">
        {repairs.map((job) => (
          <div key={job.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-mono font-bold text-xs text-primary">{job.job_number}</h4>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground/70" />
                    <span>{job.customer?.full_name || 'Customer'}</span>
                  </p>
                </div>
              </div>
              <StatusBadge status={job.status} />
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <p className="font-bold text-foreground">
                {job.device_brand} {job.device_type} {job.device_model || ''}
              </p>
              <p className="text-muted-foreground text-[11px] line-clamp-2">{job.reported_problem}</p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center space-x-2">
                <StatusBadge status={job.payment_status} />
                <StatusBadge status={job.financial_status} />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(job)}
                className="h-8 text-xs pressable"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>Job Card</span>
              </Button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50 font-mono">
              <span>
                Tech: {job.technician?.full_name ? job.technician.full_name : 'Unassigned'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                <span>{new Date(job.received_at).toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
