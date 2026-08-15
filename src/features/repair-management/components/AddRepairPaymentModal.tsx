import React, { useState, useEffect } from 'react';
import { repairService } from '../services/repairService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Loader2, Banknote, AlertCircle } from 'lucide-react';

interface AddRepairPaymentModalProps {
  isOpen: boolean;
  repairId: string | null;
  serviceRevenue: number;
  existingPaymentsTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRepairPaymentModal: React.FC<AddRepairPaymentModalProps> = ({
  isOpen,
  repairId,
  serviceRevenue,
  existingPaymentsTotal,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const remainingDue = Math.max(0, serviceRevenue - existingPaymentsTotal);

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      setAmount(String(remainingDue));
      setReference('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, remainingDue]);

  if (!isOpen || !repairId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const aNum = Number(amount);
    if (isNaN(aNum) || aNum <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    if (serviceRevenue > 0 && existingPaymentsTotal + aNum > serviceRevenue) {
      setErrorMsg(`Total payments cannot exceed service revenue (${formatCurrency(serviceRevenue, 'INR')}). Max allowed: ${formatCurrency(remainingDue, 'INR')}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await repairService.addRepairPayment(repairId, paymentMethod, aNum, reference.trim(), notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record repair payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            <span>Record Repair Payment</span>
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

          <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs space-y-1 font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Service Revenue Quoted:</span>
              <span>{formatCurrency(serviceRevenue, 'INR')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Already Collected:</span>
              <span>{formatCurrency(existingPaymentsTotal, 'INR')}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>Remaining Amount Due:</span>
              <span className="text-primary">{formatCurrency(remainingDue, 'INR')}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {(paymentMethod === 'UPI' || paymentMethod === 'CARD') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Reference / Approval Code #</label>
              <input
                type="text"
                placeholder="e.g. UPI Transaction ID or Card Slip #"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Payment Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Deposit paid at intake"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Record Payment</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
