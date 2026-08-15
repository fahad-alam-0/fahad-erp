import React from 'react';
import { PurchasingAnalytics } from '../types/reports.types';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Building2, TrendingUp, Package } from 'lucide-react';

interface PurchasingAnalyticsWidgetProps {
  data: PurchasingAnalytics | null;
  isLoading: boolean;
}

export const PurchasingAnalyticsWidget: React.FC<PurchasingAnalyticsWidgetProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading || !data) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  const maxPurchaseTrend = Math.max(...data.purchaseTrend.map((t) => t.amount), 1);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Total Purchasing Value</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatCurrency(data.totalPurchaseValue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {data.purchasesCount} Purchase Orders
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Purchase Orders Count</span>
            <Package className="w-4 h-4 text-sky-500" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">{data.purchasesCount} Orders</p>
          <p className="text-[10px] text-muted-foreground">Committed procurement vouchers</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Average Order Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatCurrency(data.avgPurchaseValue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground">Cost per procurement order</p>
        </div>
      </div>

      {/* Purchasing Trend & Top Suppliers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Purchasing Trend Graph */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Inventory Purchasing Velocity Trend</span>
          </h4>

          {data.purchaseTrend.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No purchase orders recorded in this date range.
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {data.purchaseTrend.map((t, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t.date}</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(t.amount, 'INR')}{' '}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({t.count} orders)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (t.amount / maxPurchaseTrend) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Suppliers */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Top Purchasing Suppliers</span>
          </h4>

          {data.topSuppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No supplier purchase records in this period.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Supplier Name</th>
                    <th className="p-2.5 text-center">Orders</th>
                    <th className="p-2.5 text-right">Total Procurement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-semibold text-foreground">{s.name}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-primary">
                        {s.purchaseCount}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">
                        {formatCurrency(s.totalValue, 'INR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
