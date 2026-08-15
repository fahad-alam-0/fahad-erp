import React, { useState, useEffect } from 'react';
import { Sale } from '../types/sales.types';
import { salesService } from '../services/salesService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, User, Calendar, Loader2, FileText, Package, Banknote } from 'lucide-react';

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const [fullSale, setFullSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      loadFullSale(sale.id);
    }
  }, [isOpen, sale]);

  const loadFullSale = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await salesService.getSaleById(id);
      setFullSale(data);
    } catch (err) {
      console.error('Failed to load sale invoice details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !sale) return null;

  const displayData = fullSale || sale;

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
                {displayData.sale_number}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Official Retail Store Sales Receipt
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={displayData.payment_status || 'PAID'} />
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
              <span>Loading invoice document...</span>
            </div>
          ) : (
            <>
              {/* Customer & Date Box */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Customer Information
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{displayData.customer?.full_name || 'Walk-in Customer'}</span>
                  </p>
                  {displayData.customer?.phone && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      Ph: {displayData.customer.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Transaction Timestamp
                  </span>
                  <p className="font-mono font-bold text-foreground flex items-center justify-end gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {new Date(displayData.sale_date || displayData.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>Purchased Product Lines</span>
                </h4>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Product Name & SKU</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayData.sale_items && displayData.sale_items.length > 0 ? (
                        displayData.sale_items.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <p className="font-semibold text-foreground">
                                {item.product?.name || 'Product'}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.product?.product_code || 'N/A'}
                              </p>
                            </td>
                            <td className="p-3 text-center font-mono font-semibold text-foreground">
                              {item.quantity} {item.product?.unit || 'pcs'}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {formatCurrency(item.unit_selling_price, 'INR')}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {formatCurrency(item.total_selling_amount, 'INR')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                            No product lines recorded for this sale.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods & Totals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment Breakdown */}
                <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-primary" />
                    <span>Settled Payment Methods</span>
                  </span>
                  {displayData.sale_payments && displayData.sale_payments.length > 0 ? (
                    <div className="space-y-1.5">
                      {displayData.sale_payments.map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between font-mono bg-card p-2 rounded border border-border">
                          <span className="font-semibold text-foreground">{pay.payment_method}</span>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{formatCurrency(pay.amount, 'INR')}</span>
                            {pay.payment_reference && (
                              <span className="text-[10px] text-muted-foreground block">Ref: {pay.payment_reference}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-[11px]">Paid in full at checkout.</p>
                  )}
                </div>

                {/* Summary Totals Box */}
                <div className="p-4 bg-card rounded-xl border border-border space-y-2 text-xs">
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
            Close Invoice
          </Button>
        </div>
      </div>
    </div>
  );
};
