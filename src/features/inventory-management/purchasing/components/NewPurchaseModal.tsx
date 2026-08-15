import React, { useState, useEffect } from 'react';
import { Supplier } from '../types/purchasing.types';
import { Product } from '../../types/inventory.types';
import { purchasingService } from '../services/purchasingService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  X,
  Loader2,
  ShoppingCart,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LocalPurchaseItem {
  product_id: string;
  product_name: string;
  product_code: string | null;
  unit: string;
  quantity: number;
  unit_cost: number;
}

interface NewPurchaseModalProps {
  isOpen: boolean;
  initialSupplier?: Supplier | null;
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  initialSupplier,
  suppliers,
  products,
  onClose,
  onSuccess,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('UNPAID');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0');

  // Item selector temporary state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitCost, setItemUnitCost] = useState('0');

  // Draft items array
  const [items, setItems] = useState<LocalPurchaseItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ purchase_number: string; total_amount: number } | null>(null);

  useEffect(() => {
    if (initialSupplier) {
      setSupplierId(initialSupplier.id);
    } else if (suppliers.length > 0) {
      setSupplierId(suppliers[0].id);
    }

    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setItemUnitCost(String(products[0].current_cost_price || 0));
    }

    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('UNPAID');
    setNotes('');
    setDiscount('0');
    setItemQuantity('1');
    setItems([]);
    setFormError(null);
    setSuccessInfo(null);
  }, [initialSupplier, suppliers, products, isOpen]);

  if (!isOpen) return null;

  const handleProductSelectChange = (pId: string) => {
    setSelectedProductId(pId);
    const p = products.find((x) => x.id === pId);
    if (p) {
      setItemUnitCost(String(p.current_cost_price || 0));
    }
  };

  const handleAddItem = () => {
    setFormError(null);
    if (!selectedProductId) {
      setFormError('Please select a product to add.');
      return;
    }

    const qty = Number(itemQuantity);
    const cost = Number(itemUnitCost);

    if (isNaN(qty) || qty <= 0) {
      setFormError('Item quantity must be greater than zero.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setFormError('Item unit cost cannot be negative.');
      return;
    }

    // Check duplicate
    if (items.some((i) => i.product_id === selectedProductId)) {
      setFormError('This product is already in the purchase items list.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        product_code: prod.product_code,
        unit: prod.unit,
        quantity: qty,
        unit_cost: cost,
      },
    ]);

    // Reset item selector fields
    setItemQuantity('1');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Preview totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const discountNum = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      setFormError('At least one product line item is required.');
      return;
    }
    if (discountNum < 0) {
      setFormError('Discount cannot be negative.');
      return;
    }
    if (discountNum > subtotal) {
      setFormError(`Discount (${formatCurrency(discountNum, 'INR')}) cannot exceed subtotal (${formatCurrency(subtotal, 'INR')}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await purchasingService.createPurchase({
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        discount: discountNum,
        payment_status: paymentStatus,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
        })),
      });

      setSuccessInfo({
        purchase_number: res.purchase_number,
        total_amount: Number(res.total_amount || grandTotal),
      });
      onSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span>New Inventory Purchase Order (RPC)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-foreground">Purchase Order Committed!</h4>
              <p className="text-xs text-muted-foreground font-mono">
                Order #{successInfo.purchase_number} • Total: {formatCurrency(successInfo.total_amount, 'INR')}
              </p>
              <p className="text-[11px] text-muted-foreground pt-2">
                Stock quantities & current cost prices have been atomically updated in inventory.
              </p>
            </div>
            <Button size="sm" onClick={onClose} className="pressable">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
            {formError && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Header Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Supplier</span>
                  <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Purchase Date</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
            </div>

            {/* Add Line Item Box */}
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Add Products to Procurement Order
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.stock_quantity} {p.unit} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Qty"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit Cost (₹)"
                    value={itemUnitCost}
                    onChange={(e) => setItemUnitCost(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="w-full text-xs pressable flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Item Line</span>
              </Button>
            </div>

            {/* Line Items Table */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Order Line Items ({items.length})
              </span>

              {items.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                  No items added to this purchase order yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Cost</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-semibold text-foreground">
                            {item.product_name}
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {item.product_code || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-foreground">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">
                            {formatCurrency(item.unit_cost, 'INR')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-foreground">
                            {formatCurrency(item.quantity * item.unit_cost, 'INR')}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Subtotal & Discount Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Order Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              {/* Live Preview Summary */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal Preview:</span>
                  <span>{formatCurrency(subtotal, 'INR')}</span>
                </div>
                {discountNum > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountNum, 'INR')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                  <span>Grand Total Preview:</span>
                  <span className="text-primary">{formatCurrency(grandTotal, 'INR')}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Purchase Order Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Invoice #9821, Paid via Bank Transfer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <span>Submit Purchase Order</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
