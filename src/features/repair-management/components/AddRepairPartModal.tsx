import React, { useState, useEffect } from 'react';
import { repairService } from '../services/repairService';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { Product } from '@/features/inventory-management/types/inventory.types';
import { Button } from '@/components/ui/button';
import { X, Loader2, Package, AlertCircle } from 'lucide-react';

interface AddRepairPartModalProps {
  isOpen: boolean;
  repairId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRepairPartModal: React.FC<AddRepairPartModalProps> = ({
  isOpen,
  repairId,
  onClose,
  onSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadProds = async () => {
        try {
          const list = await inventoryService.getProducts({ isActive: true });
          setProducts(list);
          if (list.length > 0) setSelectedProductId(list[0].id);
        } catch (err) {
          console.error('Failed to load spare parts catalog:', err);
        }
      };
      loadProds();
      setQuantity('1');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !repairId) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProductId) {
      setErrorMsg('Please select a product/part from catalog.');
      return;
    }

    const qNum = Number(quantity);
    if (isNaN(qNum) || qNum <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }

    if (selectedProduct && selectedProduct.stock_quantity < qNum) {
      setErrorMsg(`Insufficient stock for ${selectedProduct.name}. Available: ${selectedProduct.stock_quantity} ${selectedProduct.unit}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await repairService.addRepairPart(repairId, selectedProductId, qNum);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span>Add Repair Spare Part (RPC)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select Inventory Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock_quantity} {p.unit} in stock)
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs space-y-1 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Available Stock:</span>
                <span className="font-bold text-foreground">
                  {selectedProduct.stock_quantity} {selectedProduct.unit}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SKU Code:</span>
                <span>{selectedProduct.product_code || 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Quantity Used</label>
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

          <p className="text-[11px] text-muted-foreground">
            Submitting this part will atomically deduct stock and record a REPAIR_USAGE inventory movement.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Add Part</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
