import React, { useState, useEffect, useCallback } from 'react';
import { RepairJob } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { useAuthStore } from '@/store/useAuthStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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

  // Realtime Sync: Auto-update repair queue on database changes across all user sessions
  useRealtimeSubscription(
    'repairs-page-queue',
    ['repair_jobs', 'repair_status_history', 'repair_payments'],
    useCallback(() => {
      loadRepairs();
    }, [loadRepairs])
  );

  const handleClaimRepair = async (repair: RepairJob) => {
    try {
      await repairService.claimRepair(repair.id);
      loadRepairs();
    } catch (err: any) {
      console.error('Failed to claim repair:', err);
      alert(err.message || 'Failed to claim repair job.');
    }
  };

  const handleViewDetails = (repair: RepairJob) => {
    setSelectedRepairDetail(repair);
    setIsDetailModalOpen(true);
  };

  const activeRepairsCount = repairs.filter(
    (r) => r.status !== 'DELIVERED' && r.status !== 'CANCELLED'
  ).length;

  const readyForPickupCount = repairs.filter((r) => r.status === 'READY_FOR_PICKUP').length;
  const completedRepairsCount = repairs.filter((r) => r.status === 'DELIVERED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Shared Repair Queue & Service Workspace"
        subtitle="Track device intakes, shared repair queue tickets, exclusive claiming, and diagnostic workflows."
        actions={
          <Button onClick={() => setIsFormModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Repair Ticket
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active In-Progress</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{activeRepairsCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ready for Pickup</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{readyForPickupCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivered & Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{completedRepairsCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search job ticket #, brand, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className="text-xs text-muted-foreground font-medium">Payment:</span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Payments</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
              </select>
            </div>

            {/* Financial Filter */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className="text-xs text-muted-foreground font-medium">Financials:</span>
              <select
                value={financialStatusFilter}
                onChange={(e) => setFinancialStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Financials</option>
                <option value="PENDING">PENDING</option>
                <option value="FINALIZED">FINALIZED</option>
              </select>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRepairs()}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table / State handling */}
      {error ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Repair Tickets</span>
          </div>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadRepairs()} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <SkeletonPlaceholder className="h-8 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
        </div>
      ) : repairs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No Repair Tickets Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No repair tickets match the active search or filter criteria.'
              : 'Create a new repair ticket to track customer device intakes and technician diagnostic workflows.'}
          </p>
          <Button size="sm" onClick={() => setIsFormModalOpen(true)} className="mt-2">
            Create Repair Ticket
          </Button>
        </div>
      ) : (
        <RepairTable
          repairs={repairs}
          currentUserId={userId}
          userRole={userRole}
          onViewDetails={handleViewDetails}
          onClaim={handleClaimRepair}
        />
      )}

      {/* New Repair Intake Form Modal */}
      <RepairFormModal
        isOpen={isFormModalOpen}
        isOwner={userRole === 'OWNER'}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={async () => {
          setIsFormModalOpen(false);
          loadRepairs();
        }}
      />

      {/* Repair Detail Workspace Modal */}
      <RepairDetailModal
        isOpen={selectedRepairDetail !== null && isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRepairDetail(null);
        }}
        repair={selectedRepairDetail}
        userRole={userRole}
        userId={userId}
        onRefresh={() => loadRepairs()}
      />
    </div>
  );
};
