import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { reportsService } from '../services/reportsService';
import {
  DateRangeKey,
  SalesAnalytics,
  PurchasingAnalytics,
  InventoryAnalytics,
  RepairAnalytics,
  OwnerFinancialOverview,
  RepairServicePerformanceReport,
} from '../types/reports.types';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { SalesAnalyticsWidget } from '../components/SalesAnalyticsWidget';
import { PurchasingAnalyticsWidget } from '../components/PurchasingAnalyticsWidget';
import { InventoryAnalyticsWidget } from '../components/InventoryAnalyticsWidget';
import { RepairAnalyticsWidget } from '../components/RepairAnalyticsWidget';
import { OwnerFinancialOverviewWidget } from '../components/OwnerFinancialOverviewWidget';
import { RepairServicePerformanceWidget } from '../components/RepairServicePerformanceWidget';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Wrench,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Award,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = (user?.role as 'OWNER' | 'TECHNICIAN' | 'STAFF') || 'STAFF';
  const userId = user?.id || '';

  const isOwner = userRole === 'OWNER';
  const isTechnician = userRole === 'TECHNICIAN';

  const [dateRange, setDateRange] = useState<DateRangeKey>('THIS_MONTH');
  const [activeTab, setActiveTab] = useState<string>(isOwner ? 'executive' : 'sales');

  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null);
  const [purchasingData, setPurchasingData] = useState<PurchasingAnalytics | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryAnalytics | null>(null);
  const [repairData, setRepairData] = useState<RepairAnalytics | null>(null);
  const [ownerFinancialData, setOwnerFinancialData] = useState<OwnerFinancialOverview | null>(null);
  const [repairPerformanceData, setRepairPerformanceData] = useState<RepairServicePerformanceReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const bounds = reportsService.getDateRangeBounds(dateRange);

      const [sales, purchasing, inventory, repair, ownerFin, repairPerf] = await Promise.all([
        reportsService.getSalesAnalytics(bounds.startDate, bounds.endDate),
        reportsService.getPurchasingAnalytics(bounds.startDate, bounds.endDate),
        reportsService.getInventoryAnalytics(),
        reportsService.getRepairAnalytics(bounds.startDate, bounds.endDate, userRole, userId),
        reportsService.getOwnerFinancialOverview(bounds.startDate, bounds.endDate, userRole),
        reportsService.getRepairServicePerformanceReport(bounds.startDate, bounds.endDate, userRole, userId),
      ]);

      setSalesData(sales);
      setPurchasingData(purchasing);
      setInventoryData(inventory);
      setRepairData(repair);
      setOwnerFinancialData(ownerFin);
      setRepairPerformanceData(repairPerf);
    } catch (err: any) {
      console.error('Failed to load reports analytics data:', err);
      setError(err.message || 'Failed to load reports analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, userRole, userId]);

  useEffect(() => {
    loadAllReports();
  }, [loadAllReports]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reports & Retail Analytics"
        subtitle="Analyze sales velocity, inventory health, procurement purchasing, and repair performance."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllReports}
            disabled={isLoading}
            className="flex items-center space-x-1.5 text-xs pressable"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Data</span>
          </Button>
        }
      />

      {/* Date Range Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
        <DateRangeSelector selectedRange={dateRange} onRangeChange={setDateRange} />
        <span className="text-xs font-mono text-muted-foreground">
          {reportsService.getDateRangeBounds(dateRange).label} Reporting Window
        </span>
      </div>

      {/* Tab Selection Bar */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2 shadow-2xs overflow-x-auto">
        {isOwner && (
          <button
            onClick={() => setActiveTab('executive')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'executive'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Executive Financial Overview</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'sales'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Sales Analytics</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('purchasing')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'purchasing'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-sky-500" />
            <span>Purchasing Analytics</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'inventory'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span>Inventory Health</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('service-performance')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'service-performance'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-500" />
          <span>Repair Service Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('repairs')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'repairs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wrench className="w-4 h-4 text-primary" />
          <span>Repair Status Pipeline</span>
        </button>
      </div>

      {/* Main Tab Body */}
      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadAllReports}>
            Retry Loading Reports
          </Button>
        </div>
      ) : (
        <>
          {activeTab === 'executive' && isOwner && (
            <div className="space-y-6">
              <OwnerFinancialOverviewWidget data={ownerFinancialData} isLoading={isLoading} />
              <RepairServicePerformanceWidget data={repairPerformanceData} isLoading={isLoading} userRole={userRole} />
            </div>
          )}

          {activeTab === 'sales' && !isTechnician && (
            <SalesAnalyticsWidget data={salesData} isLoading={isLoading} userRole={userRole} />
          )}

          {activeTab === 'purchasing' && !isTechnician && (
            <PurchasingAnalyticsWidget data={purchasingData} isLoading={isLoading} />
          )}

          {activeTab === 'inventory' && !isTechnician && (
            <InventoryAnalyticsWidget data={inventoryData} isLoading={isLoading} userRole={userRole} />
          )}

          {activeTab === 'service-performance' && (
            <RepairServicePerformanceWidget data={repairPerformanceData} isLoading={isLoading} userRole={userRole} />
          )}

          {activeTab === 'repairs' && (
            <RepairAnalyticsWidget data={repairData} isLoading={isLoading} />
          )}
        </>
      )}
    </div>
  );
};
