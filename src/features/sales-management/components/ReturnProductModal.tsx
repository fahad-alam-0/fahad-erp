import React, { useState, useEffect } from 'react';
import { Sale, ReturnReason, ProcessReturnInput } from '../types/sales.types';
import { salesService } from '../services/salesService';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { RotateCcw, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReturnProductModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnProductModal: React.FC<ReturnProductModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSuccess,
}) => {
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'OTHER'>('CASH');
  const [refundReference, setRefundReference] = useState('');
  const [reason, setReason] = useState<ReturnReason>('CUSTOMER_CHANGED_MIND');
  const [reasonNotes, setReasonNotes] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<{ [saleItemId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (sale && sale.sale_items) {
      const initialQtys: { [saleItemId: string]: number } = {};
      sale.sale_items.forEach((item) => {
        initialQtys[item.id] = 0;
      });
      setReturnQuantities(initialQtys);
    }
    setFormError(null);
    setRefundMethod('CASH');
    setRefundReference('');
    setReason('CUSTOMER_CHANGED_MIND');
    setReasonNotes('');
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const discountRatio = sale.subtotal > 0 ? sale.discount / sale.subtotal : 0;

  const handleQuantityChange = (saleItemId: string, valStr: string, maxQty: number) => {
    const val = Number(valStr);
    if (isNaN(val) || val < 0) {
      setReturnQuantities((prev) => ({ ...prev, [saleItemId]: 0 }));
      return;
    }
    const clamped = Math.min(val, maxQty);
    setReturnQuantities((prev) => ({ ...prev, [saleItemId]: clamped }));
  };

  const handleSelectAllItem = (saleItemId: string, maxQty: number) => {
    setReturnQuantities((prev) => ({ ...prev, [saleItemId]: maxQty }));
  };

  // Compute item-by-item refund and total refund
  const itemsRefundCalculation = (sale.sale_items || []).map((item) => {
    const qtyToReturn = returnQuantities[item.id] || 0;
    const remainingQty = item.remaining_returnable_quantity ?? item.quantity;
    const effectiveUnitPrice = Math.round(item.unit_selling_price * (1 - discountRatio) * 100) / 100;
    const itemRefund = Math.round(qtyToReturn * effectiveUnitPrice * 100) / 100;

    return {
      ...item,
      qtyToReturn,
      remainingQty,
      effectiveUnitPrice,
      itemRefund,
    };
  });

  const totalRefundAmount = itemsRefundCalculation.reduce((sum, item) => sum + item.itemRefund, 0);
  const hasItemsToReturn = itemsRefundCalculation.some((item) => item.qtyToReturn > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!hasItemsToReturn) {
      setFormError('Please enter a return quantity of at least 1 item.');
      return;
    }

    const itemsToProcess = itemsRefundCalculation
      .filter((item) => item.qtyToReturn > 0)
      .map((item) => ({
        sale_item_id: item.id,
        quantity: item.qtyToReturn,
      }));

    try {
      setIsSubmitting(true);
      const input: ProcessReturnInput = {
        sale_id: sale.id,
        refund_method: refundMethod,
        refund_reference: refundReference.trim() || undefined,
        reason,
        reason_notes: reasonNotes.trim() || undefined,
        items: itemsToProcess,
      };

      await salesService.processSaleReturn(input);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to process product return:', err);
      setFormError(err.message || 'Failed to process product return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Process Product Return — Invoice #{sale.sale_number}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Customer: {sale.customer?.full_name || 'Walk-in Customer'} • Date:{' '}
                {new Date(sale.sale_date).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {formError && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Product Items Return Table */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              1. Select Products & Quantity to Return
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Purchased</th>
                    <th className="p-2.5 text-center">Already Returned</th>
                    <th className="p-2.5 text-center">Returnable</th>
                    <th className="p-2.5 text-right">Orig Price</th>
                    <th className="p-2.5 text-center min-w-[110px]">Return Qty</th>
                    <th className="p-2.5 text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itemsRefundCalculation.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{item.product?.name || 'Item'}</div>
                        {item.product?.product_code && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {item.product.product_code}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-center font-mono text-amber-500 font-semibold">
                        {item.returned_quantity || 0}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-500">
                        {item.remainingQty}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {formatCurrency(item.unit_selling_price, 'INR')}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.remainingQty > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={item.remainingQty}
                              value={item.qtyToReturn}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value, item.remainingQty)}
                              className="w-16 px-2 py-1 text-center font-mono border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleSelectAllItem(item.id, item.remainingQty)}
                              className="text-[10px] text-primary hover:underline font-medium"
                            >
                              Max
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Fully Returned</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-destructive">
                        {formatCurrency(item.itemRefund, 'INR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reason & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Return Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium"
              >
                <option value="CUSTOMER_CHANGED_MIND">Customer changed mind</option>
                <option value="WRONG_PRODUCT">Wrong product / model</option>
                <option value="NOT_SUITABLE">Product not suitable</option>
                <option value="OTHER">Other reason</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Refund Payment Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium"
              >
                <option value="CASH">Cash Refund</option>
                <option value="UPI">UPI Refund</option>
                <option value="CARD">Card Refund</option>
                <option value="OTHER">Other Refund Method</option>
              </select>
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Refund Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Txn ID"
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Return Notes / Details</label>
              <input
                type="text"
                placeholder="Additional notes about return condition..."
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Total Refund Amount
              </span>
              <div className="text-xs text-muted-foreground">
                Stock will be restored automatically upon processing.
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-destructive">
              {formatCurrency(totalRefundAmount, 'INR')}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !hasItemsToReturn}
              className="bg-amber-600 hover:bg-amber-700 text-white pressable flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Process Refund ({formatCurrency(totalRefundAmount, 'INR')})</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
