import React, { useState, useCallback } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { StatCard } from '../components/StatCard';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { LowStockList } from '../components/LowStockList';
import { RecentSalesTable } from '../components/RecentSalesTable';
import { RecentRepairsTable } from '../components/RecentRepairsTable';
import { RecentPurchasesTable } from '../components/RecentPurchasesTable';
import { TechnicianEarningsCard } from '../components/TechnicianEarningsCard';
import { TechnicianWorkQueue } from '../components/TechnicianWorkQueue';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { DashboardErrorState } from '../components/DashboardErrorState';
import { DownloadBusinessReportModal } from '@/features/reports/components/DownloadBusinessReportModal';
import { UserRole } from '@/constants/roles.constants';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Building2,
  Wrench,
  CheckCircle2,
  Coins,
  Award,
  RefreshCw,
  Calendar,
  Store,
  UserCheck,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData();
  const { profile } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Realtime Sync: Auto-update dashboard metrics when sales, repair_jobs, purchases, or profit snapshots change
  useRealtimeSubscription(
    'dashboard-metrics-realtime',
    ['sales', 'repair_jobs', 'purchases', 'repair_profit_snapshots'],
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <DashboardErrorState
        message={error || 'No dashboard metrics available.'}
        onRetry={refetch}
      />
    );
  }

  const userName = profile?.full_name || 'Team Member';

  if (data.role === UserRole.OWNER) {
    const { metrics } = data;
    return (
      <div className="space-y-6">
        {/* Download Business Report Modal (Owner Only) */}
        <DownloadBusinessReportModal
          isOpen={isReportModalOpen}
          userRole={UserRole.OWNER}
          onClose={() => setIsReportModalOpen(false)}
        />

        {/* Personalized Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Store className="w-3.5 h-3.5" />
              <span>Fahad Electronics — Main Branch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{formattedDate}</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center space-x-2 text-xs font-bold bg-primary text-primary-foreground pressable"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Business Report</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 text-xs pressable"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActionsBar role={UserRole.OWNER} />

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(metrics.todaySalesTotal, 'INR')}
            subtitle="Gross point-of-sale revenue"
            icon={ShoppingCart}
            variant="emerald"
          />
          <StatCard
            title="Today's Purchases"
            value={formatCurrency(metrics.todayPurchasesTotal, 'INR')}
            subtitle="Stock purchasing expense"
            icon={Building2}
            variant="accent"
          />
          <StatCard
            title="Active Repairs"
            value={`${metrics.activeRepairsCount} Tickets`}
            subtitle="In progress / diagnosed"
            icon={Wrench}
            variant="warning"
          />
          <StatCard
            title="Ready for Pickup"
            value={`${metrics.readyRepairsCount} Tickets`}
            subtitle="Completed & ready"
            icon={CheckCircle2}
            variant="emerald"
          />
        </div>

        {/* Inventory Alerts & Technician Profit Sharing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockList products={metrics.lowStockProducts} />
          <TechnicianEarningsCard earnings={metrics.technicianEarnings} />
        </div>

        {/* Recent Transactions & Active Repair Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentSalesTable sales={metrics.recentSales} />
          <RecentRepairsTable repairs={metrics.recentRepairs} showTechnicianColumn={true} />
        </div>
      </div>
    );
  }

  if (data.role === UserRole.TECHNICIAN) {
    const { metrics } = data;
    return (
      <div className="space-y-6">
        {/* Technician Workbench Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Technician Repair Workbench</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {getGreeting()}, {userName} 🛠️
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{formattedDate} • Personal Repair Queue & Payouts</span>
            </p>
          </div>

          <div className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 text-xs pressable"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Queue'}</span>
            </Button>
          </div>
        </div>

        {/* Technician Quick Actions */}
        <QuickActionsBar role={UserRole.TECHNICIAN} />

        {/* Workload KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Active Repairs"
            value={`${metrics.activeRepairsCount} Tickets`}
            subtitle="Assigned in progress"
            icon={Wrench}
            variant="warning"
          />
          <StatCard
            title="Ready for Pickup"
            value={`${metrics.readyRepairsCount} Tickets`}
            subtitle="Awaiting customer"
            icon={CheckCircle2}
            variant="emerald"
          />
          <StatCard
            title="Completed Repairs"
            value={`${metrics.completedRepairsCount} Tickets`}
            subtitle="Total delivered"
            icon={Award}
            variant="default"
          />
          <StatCard
            title="My Total Earnings"
            value={formatCurrency(metrics.myEarningsTotal, 'INR')}
            subtitle="Cumulative 70% share"
            icon={Coins}
            variant="emerald"
          />
        </div>

        {/* Personal Work Queue Section */}
        <div className="space-y-6">
          <TechnicianWorkQueue repairs={metrics.myRecentRepairs} />
        </div>
      </div>
    );
  }

  // STAFF Dashboard (Operational Workspace)
  const { metrics } = data;
  return (
    <div className="space-y-6">
      {/* Staff Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Store Operational Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {getGreeting()}, {userName} 📋
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>{formattedDate} • Daily Sales & Counter Operations</span>
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 text-xs pressable"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Operations'}</span>
          </Button>
        </div>
      </div>

      {/* Staff Quick Actions */}
      <QuickActionsBar role={UserRole.STAFF} />

      {/* Operational KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(metrics.todaySalesTotal, 'INR')}
          subtitle="Gross point-of-sale revenue"
          icon={ShoppingCart}
          variant="emerald"
        />
        <StatCard
          title="Today's Purchases"
          value={formatCurrency(metrics.todayPurchasesTotal, 'INR')}
          subtitle="Stock purchasing expense"
          icon={Building2}
          variant="accent"
        />
        <StatCard
          title="Active Repairs"
          value={`${metrics.activeRepairsCount} Tickets`}
          subtitle="In progress / waiting"
          icon={Wrench}
          variant="warning"
        />
        <StatCard
          title="Ready for Pickup"
          value={`${metrics.readyRepairsCount} Tickets`}
          subtitle="Completed & ready"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* Top Priority: Inventory Stock Alerts & Recent Supplier Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockList products={metrics.lowStockProducts} />
        <RecentPurchasesTable purchases={metrics.recentPurchases} />
      </div>

      {/* Operational Activity: POS Transactions & Active Customer Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSalesTable sales={metrics.recentSales} />
        <RecentRepairsTable repairs={metrics.recentRepairs} showTechnicianColumn={true} />
      </div>
    </div>
  );
};
