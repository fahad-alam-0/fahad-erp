import React from 'react';
import { LowStockProductItem } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LowStockListProps {
  products: LowStockProductItem[];
}

export const LowStockList: React.FC<LowStockListProps> = ({ products }) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Low Stock Inventory Alerts</span>
        </CardTitle>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {products.length} Items
        </span>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p>All product stock levels are healthy (above threshold).</p>
          </div>
        ) : (
          <div className="divide-y divide-border text-xs">
            {products.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-medium truncate text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{item.product_code || 'N/A'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-destructive/10 text-destructive">
                    {item.stock_quantity} {item.unit} (Threshold: {item.low_stock_threshold})
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatCurrency(item.selling_price, 'INR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
