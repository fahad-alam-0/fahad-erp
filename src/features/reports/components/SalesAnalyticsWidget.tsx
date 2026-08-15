import React from 'react';
import { SalesAnalytics } from '../types/reports.types';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, TrendingUp, CreditCard, Banknote, QrCode, Package } from 'lucide-react';

interface SalesAnalyticsWidgetProps {
  data: SalesAnalytics | null;
  isLoading: boolean;
}

export const SalesAnalyticsWidget: React.FC<SalesAnalyticsWidgetProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  const maxTrendRevenue = Math.max(...data.salesTrend.map((t) => t.revenue), 1);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totalRevenue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {data.salesCount} Completed Invoices
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Invoices Count</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">{data.salesCount} Sales</p>
          <p className="text-[10px] text-muted-foreground">Settled retail orders</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Average Invoice Size</span>
            <CreditCard className="w-4 h-4 text-sky-500" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatCurrency(data.avgSaleValue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground">Revenue per receipt</p>
        </div>
      </div>

      {/* Sales Revenue Trend Graph */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span>Sales Revenue Velocity Trend</span>
        </h4>

        {data.salesTrend.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No sales recorded in this date range.
          </p>
        ) : (
          <div className="space-y-2 pt-2">
            {data.salesTrend.map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{t.date}</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(t.revenue, 'INR')}{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({t.count} sales)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (t.revenue / maxTrendRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Methods & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-500" />
            <span>Revenue Settlement by Payment Channel</span>
          </h4>

          <div className="space-y-2.5 pt-1">
            {data.paymentMethodBreakdown.map((pm) => (
              <div
                key={pm.method}
                className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  {pm.method === 'CASH' && <Banknote className="w-4 h-4 text-emerald-500" />}
                  {pm.method === 'UPI' && <QrCode className="w-4 h-4 text-sky-500" />}
                  {pm.method === 'CARD' && <CreditCard className="w-4 h-4 text-purple-500" />}
                  <div>
                    <p className="font-bold text-foreground">{pm.method}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{pm.count} Transactions</p>
                  </div>
                </div>

                <span className="font-mono font-bold text-sm text-foreground">
                  {formatCurrency(pm.amount, 'INR')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-primary" />
            <span>Top Fast-Moving Products</span>
          </h4>

          {data.topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No product sales recorded in this period.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Qty Sold</th>
                    <th className="p-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-semibold text-foreground">
                        {p.name}
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {p.code || 'N/A'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-primary">
                        {p.qtySold}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">
                        {formatCurrency(p.revenue, 'INR')}
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
