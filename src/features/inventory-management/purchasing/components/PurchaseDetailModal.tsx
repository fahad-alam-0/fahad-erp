import React, { useState, useEffect } from 'react';
import { Purchase } from '../types/purchasing.types';
import { purchasingService } from '../services/purchasingService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, Building2, Calendar, Loader2, FileText, Package } from 'lucide-react';

interface PurchaseDetailModalProps {
  purchase: Purchase | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  isOpen,
  onClose,
}) => {
  const [fullPurchase, setFullPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchase) {
      loadFullPurchase(purchase.id);
    }
  }, [isOpen, purchase]);

  const loadFullPurchase = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await purchasingService.getPurchaseById(id);
      setFullPurchase(data);
    } catch (err) {
      console.error('Failed to load purchase details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !purchase) return null;

  const displayData = fullPurchase || purchase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-mono leading-none">
                {displayData.purchase_number}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Official Inventory Procurement Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={displayData.payment_status} />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading purchase order details...</span>
            </div>
          ) : (
            <>
              {/* Supplier Info & Date Box */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Supplier Entity
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{displayData.supplier?.name || 'Unknown Supplier'}</span>
                  </p>
                  {displayData.supplier?.phone && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      Ph: {displayData.supplier.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Procurement Date
                  </span>
                  <p className="font-mono font-bold text-foreground flex items-center justify-end gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{new Date(displayData.purchase_date || displayData.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>Purchased Line Items</span>
                </h4>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Product Name & SKU</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Cost</th>
                        <th className="p-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayData.purchase_items && displayData.purchase_items.length > 0 ? (
                        displayData.purchase_items.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <p className="font-semibold text-foreground">
                                {item.product?.name || 'Item'}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.product?.product_code || 'N/A'}
                              </p>
                            </td>
                            <td className="p-3 text-center font-mono font-semibold text-foreground">
                              {item.quantity} {item.product?.unit || 'pcs'}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {formatCurrency(item.unit_cost, 'INR')}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {formatCurrency(item.total_cost, 'INR')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                            No line items associated with this purchase record.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Totals Box */}
              <div className="p-4 bg-card rounded-xl border border-border space-y-2 text-xs max-w-xs ml-auto">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(displayData.subtotal, 'INR')}</span>
                </div>
                {displayData.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(displayData.discount, 'INR')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border text-sm font-bold text-foreground">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">
                    {formatCurrency(displayData.total_amount, 'INR')}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {displayData.notes && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground flex items-start gap-2">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Notes: </span>
                    <span>{displayData.notes}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Document
          </Button>
        </div>
      </div>
    </div>
  );
};
