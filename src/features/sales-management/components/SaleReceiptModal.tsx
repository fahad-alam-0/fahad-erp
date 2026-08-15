import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShoppingCart, User } from 'lucide-react';

interface SaleReceiptModalProps {
  saleInfo: {
    sale_id: string;
    sale_number: string;
    subtotal: number;
    discount: number;
    total_amount: number;
    payment_status: string;
    customer_name?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  saleInfo,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !saleInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden text-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-2xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-lg text-foreground">Sale Transaction Completed!</h3>
          <p className="text-xs font-mono font-semibold text-primary">
            Invoice #{saleInfo.sale_number}
          </p>
        </div>

        <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 text-xs text-left">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground/70" /> Customer:
            </span>
            <span className="font-semibold text-foreground">
              {saleInfo.customer_name || 'Walk-in Customer'}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Payment Status:</span>
            <StatusBadge status={saleInfo.payment_status || 'PAID'} />
          </div>

          {saleInfo.discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-mono">
              <span>Discount Applied:</span>
              <span>-{formatCurrency(saleInfo.discount, 'INR')}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
            <span>Total Collected:</span>
            <span className="font-mono text-primary">
              {formatCurrency(saleInfo.total_amount, 'INR')}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Stock quantities have been automatically updated and inventory movements logged.
        </p>

        <div className="pt-2">
          <Button onClick={onClose} className="w-full text-xs pressable flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>Start Next Sale</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
