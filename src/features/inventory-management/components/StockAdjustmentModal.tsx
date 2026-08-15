import React, { useState, useEffect } from 'react';
import { Product } from '../types/inventory.types';
import { inventoryService } from '../services/inventoryService';
import { Button } from '@/components/ui/button';
import { X, Loader2, Sliders, AlertTriangle, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: Product | null;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  product,
  products,
  onClose,
  onSuccess,
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedProductId(product.id);
      setUnitCost(String(product.current_cost_price || ''));
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setUnitCost(String(products[0].current_cost_price || ''));
    }
    setMovementType('ADJUSTMENT_IN');
    setQuantity('1');
    setNotes('');
    setErrorMsg(null);
  }, [product, products, isOpen]);

  if (!isOpen) return null;

  const targetProduct = product || products.find((p) => p.id === selectedProductId);
  const qtyNum = Number(quantity);
  const isNegativeStockWarning =
    targetProduct &&
    movementType === 'ADJUSTMENT_OUT' &&
    !isNaN(qtyNum) &&
    qtyNum > targetProduct.stock_quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProductId) {
      setErrorMsg('Please select a product.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Adjustment quantity must be greater than zero.');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('A valid reason in notes is required for stock adjustments.');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.adjustStock({
        product_id: selectedProductId,
        movement_type: movementType,
        quantity: qtyNum,
        unit_cost: unitCost ? Number(unitCost) : undefined,
        notes: notes.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust inventory stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Atomic Stock Adjustment (RPC)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Product Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Selected Product</label>
            {product ? (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-0.5">
                <p className="font-semibold text-xs text-foreground">{product.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Code: {product.product_code || 'N/A'} • Available Stock: {product.stock_quantity} {product.unit}
                </p>
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setUnitCost(String(p.current_cost_price || ''));
                }}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stock_quantity} {p.unit} in stock)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Adjustment Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovementType('ADJUSTMENT_IN')}
                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  movementType === 'ADJUSTMENT_IN'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-2xs'
                    : 'bg-background text-muted-foreground border-input hover:bg-muted'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <span>Adjustment IN (+Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('ADJUSTMENT_OUT')}
                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  movementType === 'ADJUSTMENT_OUT'
                    ? 'bg-destructive/10 text-destructive border-destructive/40 shadow-2xs'
                    : 'bg-background text-muted-foreground border-input hover:bg-muted'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-destructive" />
                <span>Adjustment OUT (-Stock)</span>
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {isNegativeStockWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Insufficient Stock Warning</p>
                <p className="text-[11px] mt-0.5">
                  Requested removal of {qtyNum} exceeds available stock ({targetProduct.stock_quantity}). The backend transaction RPC will reject this adjustment to prevent negative stock.
                </p>
              </div>
            </div>
          )}

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Quantity</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Unit Cost (₹ Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Default current cost"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Reason Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Adjustment Reason / Notes</span>
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. Physical inventory count correction, Damaged stock removal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Execute Adjustment</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
