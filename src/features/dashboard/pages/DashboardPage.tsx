import React from 'react';
import { Header } from '@/components/common/Header';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatCard } from '../components/StatCard';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { LowStockList } from '../components/LowStockList';
import { RecentSalesTable } from '../components/RecentSalesTable';
import { RecentRepairsTable } from '../components/RecentRepairsTable';
import { RecentPurchasesTable } from '../components/RecentPurchasesTable';
import { TechnicianEarningsCard } from '../components/TechnicianEarningsCard';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { DashboardErrorState } from '../components/DashboardErrorState';
import { UserRole } from '@/constants/roles.constants';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Building2,
  Wrench,
  CheckCircle2,
  Coins,
  Award,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData();

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

  if (data.role === UserRole.OWNER) {
    const { metrics } = data;
    return (
      <div className="space-y-6">
        <Header
          title="Store Owner Dashboard"
          subtitle="Real-time executive metrics for sales, purchases, repairs, and technician profit sharing."
        />

        <QuickActionsBar role={UserRole.OWNER} />

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
            variant="default"
          />
          <StatCard
            title="Ready for Pickup"
            value={`${metrics.readyRepairsCount} Tickets`}
            subtitle="Completed & ready"
            icon={CheckCircle2}
            variant="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockList products={metrics.lowStockProducts} />
          <TechnicianEarningsCard earnings={metrics.technicianEarnings} />
        </div>

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
        <Header
          title="Technician Workbench Dashboard"
          subtitle="Personalized view of your assigned repair jobs, completed tickets, and profit shares."
        />

        <QuickActionsBar role={UserRole.TECHNICIAN} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Active Repairs"
            value={`${metrics.activeRepairsCount} Tickets`}
            subtitle="Assigned to you"
            icon={Wrench}
            variant="accent"
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
            value={`${metrics.completedRepairsCount} Delivered`}
            subtitle="Historical completed"
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

        <div className="space-y-6">
          <RecentRepairsTable repairs={metrics.myRecentRepairs} showTechnicianColumn={false} />
        </div>
      </div>
    );
  }

  // STAFF Dashboard
  const { metrics } = data;
  return (
    <div className="space-y-6">
      <Header
        title="Store Staff Operations Dashboard"
        subtitle="Operational overview for daily store sales, stock alerts, and customer repair intake."
      />

      <QuickActionsBar role={UserRole.STAFF} />

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
          variant="default"
        />
        <StatCard
          title="Ready for Pickup"
          value={`${metrics.readyRepairsCount} Tickets`}
          subtitle="Completed & ready"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockList products={metrics.lowStockProducts} />
        <RecentPurchasesTable purchases={metrics.recentPurchases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSalesTable sales={metrics.recentSales} />
        <RecentRepairsTable repairs={metrics.recentRepairs} showTechnicianColumn={true} />
      </div>
    </div>
  );
};
