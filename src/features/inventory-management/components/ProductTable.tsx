import React from 'react';
import { Product } from '../types/inventory.types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Eye, Edit, Sliders, Package, Tag } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onViewDetails: (product: Product) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onViewDetails,
  onEdit,
  onAdjustStock,
}) => {
  const getStockStatus = (p: Product) => {
    if (p.stock_quantity === 0) return 'OUT_OF_STOCK';
    if (p.stock_quantity <= p.low_stock_threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Product Name & Code</th>
              <th className="p-3">Category & Brand</th>
              <th className="p-3 text-right">Selling Price</th>
              <th className="p-3 text-right">Cost Price</th>
              <th className="p-3 text-center">Stock Level</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((prod) => {
              const status = getStockStatus(prod);
              return (
                <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{prod.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {prod.product_code || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-foreground">
                      {prod.category?.name || 'Uncategorized'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {prod.brand?.name || 'Generic'}
                    </p>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(prod.selling_price, 'INR')}
                  </td>
                  <td className="p-3 text-right font-mono text-muted-foreground font-medium">
                    {formatCurrency(prod.current_cost_price, 'INR')}
                  </td>
                  <td className="p-3 text-center font-mono font-semibold text-foreground">
                    {prod.stock_quantity} {prod.unit}
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Threshold: {prod.low_stock_threshold}
                    </span>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(prod)}
                        className="h-8 px-2.5 text-xs pressable"
                        title="View Product History"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>History</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdjustStock(prod)}
                        className="h-8 px-2 text-xs pressable"
                        title="Adjust Stock Quantity"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1" />
                        <span>Adjust</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(prod)}
                        className="h-8 px-2 text-xs pressable"
                        title="Edit Product"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="md:hidden divide-y divide-border">
        {products.map((prod) => {
          const status = getStockStatus(prod);
          return (
            <div key={prod.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{prod.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {prod.product_code || 'N/A'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                    Selling Price
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(prod.selling_price, 'INR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                    Current Stock
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {prod.stock_quantity} {prod.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3 text-muted-foreground/70" />
                  <span>{prod.category?.name || 'Uncategorized'}</span>
                </span>

                <div className="flex items-center space-x-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(prod)}
                    className="h-8 text-xs pressable"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>History</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAdjustStock(prod)}
                    className="h-8 text-xs pressable"
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1" />
                    <span>Adjust</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(prod)}
                    className="h-8 text-xs pressable"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
