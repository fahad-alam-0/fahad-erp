import React from 'react';
import { SalesAnalytics } from '../types/reports.types';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, TrendingUp, CreditCard, Banknote, QrCode, Package, Coins, Percent } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface SalesAnalyticsWidgetProps {
  data: SalesAnalytics | null;
  isLoading: boolean;
  userRole?: string;
}

export const SalesAnalyticsWidget: React.FC<SalesAnalyticsWidgetProps> = ({ data, isLoading, userRole = 'OWNER' }) => {
  if (isLoading || !data) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  const maxTrendRevenue = Math.max(...data.salesTrend.map((t) => t.revenue), 1);
  const prof = data.productProfitability;
  const isTechnician = userRole === 'TECHNICIAN';

  return (
    <div className="space-y-6">
      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Total Selling Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totalRevenue, 'INR')}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {data.salesCount} Completed Invoices
          </p>
        </div>

        {!isTechnician && prof && (
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Actual Cost</span>
              <Coins className="w-4 h-4 text-rose-500" />
            </span>
            <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(prof.totalActualCost, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Historical cost snapshot basis</p>
          </div>
        )}

        {!isTechnician && prof && (
          <div className="p-4 rounded-xl bg-card border border-emerald-500/30 bg-emerald-500/5 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Actual Profit</span>
              <Coins className="w-4 h-4 text-emerald-500" />
            </span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(prof.totalGrossProfit, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Selling Revenue − Actual Cost</p>
          </div>
        )}

        {!isTechnician && prof && (
          <div className="p-4 rounded-xl bg-card border border-primary/30 bg-primary/5 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Overall Profit Margin</span>
              <Percent className="w-4 h-4 text-primary" />
            </span>
            <p className="text-xl font-bold font-mono text-primary">
              {prof.overallMarginPct.toFixed(2)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Actual Profit / Revenue × 100</p>
          </div>
        )}

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Invoices Count</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">{data.salesCount} Sales</p>
          <p className="text-[10px] text-muted-foreground">Settled retail receipts</p>
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

      {/* PRODUCT PROFITABILITY ANALYSIS TABLE & TOTALS SUMMARY */}
      {!isTechnician && prof && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>PRODUCT PROFITABILITY ANALYSIS</span>
            </CardTitle>
            <span className="text-[10px] font-mono text-muted-foreground px-2.5 py-1 bg-muted rounded border border-border">
              Historical Cost Basis (sale_items.unit_cost_price)
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-3 font-sans">Product</th>
                  <th className="p-3 text-center font-sans">Qty Sold</th>
                  <th className="p-3 text-right font-sans">Actual Cost</th>
                  <th className="p-3 text-right font-sans">Selling Revenue</th>
                  <th className="p-3 text-right font-sans">Actual Profit</th>
                  <th className="p-3 text-right font-sans">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prof.products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic font-sans">
                      No completed product sales recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  prof.products.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground font-sans">
                        {item.name}
                        {item.code && (
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {item.code}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-foreground">{item.qtySold} pcs</td>
                      <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.actualCost, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">
                        {formatCurrency(item.sellingRevenue, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.grossProfit, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-primary">
                        {item.profitMarginPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {prof.products.length > 0 && (
                <tfoot className="bg-muted/50 font-bold border-t-2 border-border text-foreground">
                  <tr>
                    <td className="p-3 font-sans uppercase">TOTAL PROFITABILITY SUMMARY</td>
                    <td className="p-3 text-center text-primary">{prof.totalQtySold} pcs</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                      {formatCurrency(prof.totalActualCost, 'INR')}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(prof.totalSellingRevenue, 'INR')}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(prof.totalGrossProfit, 'INR')}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {prof.overallMarginPct.toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

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
