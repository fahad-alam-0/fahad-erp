import React, { useState, useEffect } from 'react';
import { Product, InventoryMovement } from '../types/inventory.types';
import { inventoryService } from '../services/inventoryService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  X,
  Package,
  Sliders,
  Edit,
  History,
  Loader2,
  FileText,
  Coins,
  TrendingUp,
} from 'lucide-react';

interface ProductDetailDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onAdjustStock,
}) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadMovements(product.id);
    }
  }, [isOpen, product]);

  const loadMovements = async (productId: string) => {
    try {
      setIsLoadingMovements(true);
      const data = await inventoryService.getProductMovements(productId);
      setMovements(data);
    } catch (err) {
      console.error('Failed to load product movements:', err);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  if (!isOpen || !product) return null;

  const stock = Number(product.stock_quantity || 0);
  const costPrice = Number(product.current_cost_price || 0);
  const sellingPrice = Number(product.selling_price || 0);

  const invCostValue = stock * costPrice;
  const potSalesValue = stock * sellingPrice;
  const potGrossProfit = potSalesValue - invCostValue;

  const getStockStatus = (p: Product) => {
    if (p.stock_quantity === 0) return 'OUT_OF_STOCK';
    if (p.stock_quantity <= p.low_stock_threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const getMovementBadgeStyle = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'ADJUSTMENT_IN':
      case 'RETURN':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'SALE':
      case 'REPAIR_USAGE':
      case 'ADJUSTMENT_OUT':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const isPositiveMovement = (type: string) => {
    return ['PURCHASE', 'ADJUSTMENT_IN', 'RETURN'].includes(type);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border-l border-border w-full max-w-2xl h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug">{product.name}</h2>
              <p className="text-xs font-mono text-muted-foreground">
                SKU: {product.product_code || 'N/A'} • {product.category?.name || 'Uncategorized'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdjustStock(product)}
              className="h-8 text-xs pressable"
            >
              <Sliders className="w-3.5 h-3.5 mr-1" />
              <span>Adjust Stock</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(product)}
              className="h-8 text-xs pressable"
            >
              <Edit className="w-3.5 h-3.5 mr-1" />
              <span>Edit</span>
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pricing & Stock Summary Grid */}
        <div className="p-4 bg-muted/40 border-b border-border space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-card rounded-lg border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                Selling Price
              </span>
              <span className="font-mono font-bold text-sm text-foreground">
                {formatCurrency(sellingPrice, 'INR')}
              </span>
            </div>

            <div className="p-3 bg-card rounded-lg border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                Current Cost Basis
              </span>
              <span className="font-mono font-bold text-sm text-muted-foreground">
                {formatCurrency(costPrice, 'INR')}
              </span>
            </div>

            <div className="p-3 bg-card rounded-lg border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                Stock Level
              </span>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm text-foreground">
                  {stock} {product.unit}
                </span>
                <StatusBadge status={getStockStatus(product)} />
              </div>
            </div>
          </div>

          {/* Financial Valuation Summary Card */}
          <div className="p-3 bg-card rounded-lg border border-emerald-500/20 grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-muted-foreground font-sans font-semibold uppercase flex items-center gap-1">
                <Coins className="w-3 h-3 text-emerald-500" /> Inventory Value:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(invCostValue, 'INR')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-sans font-semibold uppercase flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-500" /> Potential Sales:
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(potSalesValue, 'INR')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-sans font-semibold uppercase flex items-center gap-1">
                <Coins className="w-3 h-3 text-primary" /> Potential Profit:
              </span>
              <span className="font-bold text-primary">
                {formatCurrency(potGrossProfit, 'INR')}
              </span>
            </div>
          </div>
        </div>

        {/* Product Meta */}
        <div className="p-4 border-b border-border text-xs space-y-1.5 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Brand: <strong className="text-foreground font-medium">{product.brand?.name || 'Generic'}</strong></span>
            <span>Alert Threshold: <strong className="text-foreground font-mono">{product.low_stock_threshold} {product.unit}</strong></span>
          </div>
          {product.description && (
            <p className="text-muted-foreground pt-1 flex items-start gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span>{product.description}</span>
            </p>
          )}
        </div>

        {/* Movement History Header */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="w-4 h-4 text-primary" />
            <span>Immutable Inventory Movement History ({movements.length})</span>
          </span>
        </div>

        {/* Movement History Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingMovements ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading movement history...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <History className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No inventory activity recorded</p>
              <p className="text-[11px] text-muted-foreground">
                Purchases, sales, repair usage, and manual adjustments will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3">Notes / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((mov) => {
                    const isPos = isPositiveMovement(mov.movement_type);
                    return (
                      <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(mov.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getMovementBadgeStyle(
                              mov.movement_type
                            )}`}
                          >
                            {mov.movement_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                            {isPos ? '+' : '-'}{mov.quantity} {product.unit}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {formatCurrency(mov.unit_cost, 'INR')}
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px] max-w-[160px] truncate">
                          {mov.notes || mov.reference_type || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
