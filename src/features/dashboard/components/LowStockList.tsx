import React from 'react';
import { LowStockProductItem } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, PackageCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';

interface LowStockListProps {
  products: LowStockProductItem[];
}

export const LowStockList: React.FC<LowStockListProps> = ({ products }) => {
  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Low Stock Inventory Alerts</span>
        </CardTitle>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {products.length} Items
        </span>
      </CardHeader>

      <CardContent className="flex-1">
        {products.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="w-6 h-6" />
            </div>
            <p className="font-medium text-foreground">All inventory levels healthy</p>
            <p className="text-[11px] text-muted-foreground">No active products are below their low-stock threshold.</p>
          </div>
        ) : (
          <div className="divide-y divide-border text-xs">
            {products.map((item) => {
              const isOutOfStock = item.stock_quantity === 0;
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-1 rounded-md transition-colors">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-medium truncate text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{item.product_code || 'N/A'}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge
                      status={isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK'}
                      label={
                        isOutOfStock
                          ? 'Out of Stock (0)'
                          : `${item.stock_quantity} ${item.unit} (Limit: ${item.low_stock_threshold})`
                      }
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatCurrency(item.selling_price, 'INR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
