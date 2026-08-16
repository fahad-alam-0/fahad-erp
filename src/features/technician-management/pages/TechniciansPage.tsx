import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { repairService } from '@/features/repair-management/services/repairService';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { Search, UserCheck, Wrench, CheckCircle, Phone, RefreshCw, AlertCircle } from 'lucide-react';

interface TechnicianRosterItem {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  active_repairs_count: number;
  completed_this_month_count: number;
}

export const TechniciansPage: React.FC = () => {
  const [roster, setRoster] = useState<TechnicianRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRoster = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await repairService.getTechnicianRoster();
      setRoster(data);
    } catch (err: any) {
      console.error('Failed to load technician roster:', err);
      setError(err.message || 'Failed to load technician roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const filteredRoster = roster.filter((t) =>
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (t.phone && t.phone.includes(searchQuery.trim())) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalActiveRepairs = roster.reduce((sum, t) => sum + t.active_repairs_count, 0);
  const totalCompletedThisMonth = roster.reduce((sum, t) => sum + t.completed_this_month_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician Roster & Workload"
        subtitle="Live team overview of assigned repair technicians, active diagnostic tickets, and monthly completed jobs."
        actions={
          <Button variant="outline" size="sm" onClick={loadRoster} disabled={isLoading} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Roster
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Repair Specialists</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{roster.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Ticket Queue</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{totalActiveRepairs}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed This Month</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{totalCompletedThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search technician name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Main Roster Table */}
      {error ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Technician Roster</span>
          </div>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadRoster} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <SkeletonPlaceholder className="h-8 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Technician Specialist</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Contact Phone</th>
                  <th className="p-3.5 text-center">Active Repairs</th>
                  <th className="p-3.5 text-center">Completed (This Month)</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRoster.length > 0 ? (
                  filteredRoster.map((tech) => (
                    <tr key={tech.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-semibold text-foreground">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {tech.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{tech.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                              ID: {tech.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-muted-foreground font-medium">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tech.role === 'OWNER'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        }`}>
                          {tech.role}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-muted-foreground">
                        {tech.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            {tech.phone}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">Not provided</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-foreground">
                        <span className={`px-2 py-0.5 rounded ${
                          tech.active_repairs_count > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {tech.active_repairs_count} active
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-foreground">
                        <span className={`px-2 py-0.5 rounded ${
                          tech.completed_this_month_count > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {tech.completed_this_month_count} jobs
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-semibold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tech.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {tech.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                      No technician profiles match the search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
