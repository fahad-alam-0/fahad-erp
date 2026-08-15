import React, { useState, useEffect, useCallback } from 'react';
import { RepairJob } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { useAuthStore } from '@/store/useAuthStore';
import { RepairTable } from '../components/RepairTable';
import { RepairFormModal } from '../components/RepairFormModal';
import { RepairDetailModal } from '../components/RepairDetailModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import {
  Wrench,
  Plus,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  PackageCheck,
  Filter,
} from 'lucide-react';

export const RepairsPage: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = (user?.role as 'OWNER' | 'TECHNICIAN' | 'STAFF') || 'STAFF';
  const userId = user?.id || '';

  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRepairDetail, setSelectedRepairDetail] = useState<RepairJob | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadRepairs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await repairService.getRepairJobs({
        search: debouncedSearch,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        financialStatus: financialStatusFilter,
        userRole: userRole,
        userId: userId,
      });
      setRepairs(data);
    } catch (err: any) {
      console.error('Failed to load repair jobs list:', err);
      setError(err.message || 'Failed to load repair jobs list.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, paymentStatusFilter, financialStatusFilter, userRole, userId]);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  const handleViewDetails = (job: RepairJob) => {
    setSelectedRepairDetail(job);
    setIsDetailModalOpen(true);
  };

  // Metrics
  const receivedCount = repairs.filter((r) => r.status === 'RECEIVED' || r.status === 'DIAGNOSING').length;
  const inProgressCount = repairs.filter((r) => r.status === 'IN_REPAIR' || r.status === 'WAITING_FOR_PARTS' || r.status === 'TESTING').length;
  const readyCount = repairs.filter((r) => r.status === 'READY_FOR_PICKUP').length;
  const deliveredCount = repairs.filter((r) => r.status === 'DELIVERED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Repair Service Center & Job Cards"
        subtitle="Track device intakes, diagnostic workflows, technician job queues, and repair status."
        actions={
          <Button
            onClick={() => setIsFormModalOpen(true)}
            size="sm"
            className="flex items-center space-x-1.5 text-xs pressable"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>New Repair Ticket</span>
          </Button>
        }
      />

      {/* KPI Metric Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Received / Diagnosing
            </span>
            <span className="text-xl font-bold font-mono text-foreground">{receivedCount} Tickets</span>
          </div>
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              In Repair / Testing
            </span>
            <span className="text-xl font-bold font-mono text-amber-500">{inProgressCount} Tickets</span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Ready for Pickup
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {readyCount} Ready
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Delivered Completed
            </span>
            <span className="text-xl font-bold font-mono text-foreground">{deliveredCount} Tickets</span>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ticket # (e.g. REP-2026...), device, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-muted-foreground">
            <span className="font-mono font-medium">{repairs.length} Repair Jobs</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadRepairs}
              disabled={isLoading}
              className="h-8 px-2.5 text-xs pressable"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="DIAGNOSING">DIAGNOSING</option>
            <option value="WAITING_FOR_PARTS">WAITING_FOR_PARTS</option>
            <option value="IN_REPAIR">IN_REPAIR</option>
            <option value="TESTING">TESTING</option>
            <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Payments</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
          </select>

          <select
            value={financialStatusFilter}
            onChange={(e) => setFinancialStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Financials</option>
            <option value="PENDING">PENDING</option>
            <option value="FINALIZED">FINALIZED</option>
          </select>
        </div>
      </div>

      {/* Main Repair Table Body */}
      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadRepairs}>
            Retry Loading
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
        </div>
      ) : repairs.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-muted text-muted-foreground">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No matching repair tickets found'
              : 'No repair job cards registered yet'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or status filters.'
              : 'Create a new repair ticket to track customer device intakes and technician diagnostic workflows.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Button onClick={() => setIsFormModalOpen(true)} size="sm" className="mt-2 text-xs pressable">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Create First Repair Ticket</span>
            </Button>
          )}
        </div>
      ) : (
        <RepairTable repairs={repairs} onViewDetails={handleViewDetails} />
      )}

      {/* Intake Modal */}
      <RepairFormModal
        isOpen={isFormModalOpen}
        isOwner={userRole === 'OWNER'}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={loadRepairs}
      />

      {/* Detail Workspace Modal */}
      <RepairDetailModal
        isOpen={isDetailModalOpen}
        repair={selectedRepairDetail}
        userRole={userRole}
        userId={userId}
        onClose={() => setIsDetailModalOpen(false)}
        onRefresh={loadRepairs}
      />
    </div>
  );
};
