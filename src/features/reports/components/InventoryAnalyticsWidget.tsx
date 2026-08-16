import React from 'react';
import { InventoryAnalytics } from '../types/reports.types';
import { Package, AlertTriangle, ArrowRightLeft, Coins, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface InventoryAnalyticsWidgetProps {
  data: InventoryAnalytics | null;
  isLoading: boolean;
  userRole?: string;
}

export const InventoryAnalyticsWidget: React.FC<InventoryAnalyticsWidgetProps> = ({
  data,
  isLoading,
  userRole = 'OWNER',
}) => {
  if (isLoading || !data) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  const val = data.inventoryValuation;
  const isOwner = userRole === 'OWNER';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Active Catalog Products</span>
            <Package className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {data.totalActiveProducts} Products
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {val?.totalInventoryUnits || 0} Total Units Held
          </p>
        </div>

        {isOwner && val && (
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Inventory Cost Value</span>
              <Coins className="w-4 h-4 text-emerald-500" />
            </span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(val.totalInventoryCostValue, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Cost basis (Stock × Cost Price)</p>
          </div>
        )}

        {isOwner && val && (
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Potential Retail Sales Value</span>
              <TrendingUp className="w-4 h-4 text-sky-500" />
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(val.totalPotentialSalesValue, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Retail value (Stock × Selling Price)</p>
          </div>
        )}

        {isOwner && val && (
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Potential Gross Margin</span>
              <Coins className="w-4 h-4 text-primary" />
            </span>
            <p className="text-xl font-bold font-mono text-primary">
              {formatCurrency(val.totalPotentialGrossMargin, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Potential retail gross profit</p>
          </div>
        )}
      </div>

      {/* Total Inventory Valuation Table & Breakdown (Owner Only) */}
      {isOwner && val && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>TOTAL INVENTORY VALUATION & POTENTIAL MARGIN ANALYSIS</span>
            </CardTitle>
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 bg-muted rounded border border-border">
              Current Cost Basis (products.current_cost_price)
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-3 font-sans">Product</th>
                  <th className="p-3 text-center font-sans">Current Stock</th>
                  <th className="p-3 text-right font-sans">Current Cost Price</th>
                  <th className="p-3 text-right font-sans">Current Selling Price</th>
                  <th className="p-3 text-right font-sans">Inventory Cost Value</th>
                  <th className="p-3 text-right font-sans">Potential Sales Value</th>
                  <th className="p-3 text-right font-sans">Potential Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {val.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground italic font-sans">
                      No active products in catalog.
                    </td>
                  </tr>
                ) : (
                  val.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground font-sans">
                        {item.name}
                        {item.code && (
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {item.code}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-foreground">{item.stockQuantity} pcs</td>
                      <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.currentCostPrice, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">
                        {formatCurrency(item.currentSellingPrice, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.inventoryCostValue, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">
                        {formatCurrency(item.potentialSalesValue, 'INR')}
                      </td>
                      <td className="p-3 text-right font-bold text-primary">
                        {formatCurrency(item.potentialGrossMargin, 'INR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {val.items.length > 0 && (
                <tfoot className="bg-muted/50 font-bold border-t-2 border-border text-foreground">
                  <tr>
                    <td className="p-3 font-sans uppercase">Total Inventory Valuation</td>
                    <td className="p-3 text-center text-primary">{val.totalInventoryUnits} pcs</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(val.totalInventoryCostValue, 'INR')}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(val.totalPotentialSalesValue, 'INR')}</td>
                    <td className="p-3 text-right text-primary">
                      {formatCurrency(val.totalPotentialGrossMargin, 'INR')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* Movement Breakdown Chips & Low Stock Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Movement Activity */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <span>Stock Movements Breakdown</span>
          </h4>

          <div className="space-y-2 pt-1">
            {data.movementCounts.map((m) => (
              <div
                key={m.type}
                className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between text-xs font-mono"
              >
                <span className="font-semibold text-foreground font-sans">{m.type}</span>
                <div className="text-right">
                  <span className="font-bold text-primary">{m.count} Movements</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    Total Qty: {m.totalQty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Low / Out of Stock Attention List</span>
          </h4>

          {data.lowStockList.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 py-6 text-center font-semibold">
              ✓ Inventory stock is healthy across all catalog products.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Stock</th>
                    <th className="p-2.5 text-center">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.lowStockList.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-semibold text-foreground">
                        {p.name}
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {p.code || 'N/A'}
                        </span>
                      </td>
                      <td
                        className={`p-2.5 text-center font-mono font-bold ${
                          p.stock <= 0 ? 'text-destructive' : 'text-amber-500'
                        }`}
                      >
                        {p.stock} {p.unit}
                      </td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">
                        {p.threshold} {p.unit}
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
