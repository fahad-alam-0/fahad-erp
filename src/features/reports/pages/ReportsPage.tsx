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
import { BusinessReportGeneratorWidget } from '../components/BusinessReportGeneratorWidget';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
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
  const { user, profile, role: storeRole } = useAuthStore();
  const userRole = storeRole || profile?.role || 'OWNER';
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
      const { startDate, endDate } = reportsService.getDateRangeBounds(dateRange);

      const [sRes, pRes, iRes, rRes, oRes, perfRes] = await Promise.all([
        reportsService.getSalesAnalytics(startDate, endDate),
        reportsService.getPurchasingAnalytics(startDate, endDate),
        reportsService.getInventoryAnalytics(),
        reportsService.getRepairAnalytics(startDate, endDate, userRole, userId),
        reportsService.getOwnerFinancialOverview(startDate, endDate, userRole),
        reportsService.getRepairServicePerformanceReport(startDate, endDate, userRole, userId),
      ]);

      setSalesData(sRes);
      setPurchasingData(pRes);
      setInventoryData(iRes);
      setRepairData(rRes);
      setOwnerFinancialData(oRes);
      setRepairPerformanceData(perfRes);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to fetch business analytics reports.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, userRole, userId]);

  useEffect(() => {
    loadAllReports();
  }, [loadAllReports]);

  // Real-time subscription to sales, purchases, repairs, snapshots for instant financial reports sync
  useEffect(() => {
    const channel = supabase
      .channel('reports-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          loadAllReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => {
          loadAllReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => {
          loadAllReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_jobs' },
        () => {
          loadAllReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_profit_snapshots' },
        () => {
          loadAllReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAllReports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reports & Financial Analytics"
        subtitle="Comprehensive business intelligence, sales profitability, inventory valuation, and worker performance."
        actions={
          <div className="flex items-center space-x-2">
            <DateRangeSelector selectedRange={dateRange} onRangeChange={setDateRange} />
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllReports}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Owner Business Report Generator Card */}
      {isOwner && (
        <BusinessReportGeneratorWidget userRole={userRole} />
      )}

      {/* Report Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-xs font-semibold">
        {isOwner && (
          <button
            onClick={() => setActiveTab('executive')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'executive'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Executive Financial Overview</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'sales'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Sales Analytics & Profitability</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('purchasing')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'purchasing'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchasing Analytics</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'inventory'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Health & Valuation</span>
          </button>
        )}

        {!isTechnician && (
          <button
            onClick={() => setActiveTab('service-performance')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'service-performance'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Repair Service Performance</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('repairs')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'repairs'
              ? 'bg-primary text-primary-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Repair Pipeline</span>
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

          {activeTab === 'service-performance' && !isTechnician && (
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
