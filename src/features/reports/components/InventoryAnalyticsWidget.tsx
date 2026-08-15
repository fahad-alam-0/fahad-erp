import React from 'react';
import { InventoryAnalytics } from '../types/reports.types';
import { Package, AlertTriangle, XCircle, ArrowRightLeft } from 'lucide-react';

interface InventoryAnalyticsWidgetProps {
  data: InventoryAnalytics | null;
  isLoading: boolean;
}

export const InventoryAnalyticsWidget: React.FC<InventoryAnalyticsWidgetProps> = ({
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

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Active Catalog Products</span>
            <Package className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xl font-bold font-mono text-foreground">
            {data.totalActiveProducts} Products
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">Catalog stock items</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Low Stock Products</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
          <p className="text-xl font-bold font-mono text-amber-500">{data.lowStockCount} Products</p>
          <p className="text-[10px] text-muted-foreground">Below per-product threshold</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Out of Stock Products</span>
            <XCircle className="w-4 h-4 text-destructive" />
          </span>
          <p className="text-xl font-bold font-mono text-destructive">
            {data.outOfStockCount} Products
          </p>
          <p className="text-[10px] text-muted-foreground">Zero stock remaining</p>
        </div>
      </div>

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
