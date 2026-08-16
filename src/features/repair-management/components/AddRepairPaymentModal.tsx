import React, { useState, useEffect } from 'react';
import { repairService } from '../services/repairService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Loader2, Banknote, AlertCircle, CheckCircle, CreditCard, Smartphone, DollarSign } from 'lucide-react';

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
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const remainingDue = Math.max(0, serviceRevenue - existingPaymentsTotal);

  useEffect(() => {
    if (isOpen) {
      setCashAmount(remainingDue > 0 ? String(remainingDue) : '');
      setUpiAmount('');
      setCardAmount('');
      setUpiReference('');
      setCardReference('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, remainingDue]);

  if (!isOpen || !repairId) return null;

  const cashVal = Number(cashAmount) || 0;
  const upiVal = Number(upiAmount) || 0;
  const cardVal = Number(cardAmount) || 0;

  const totalEntered = cashVal + upiVal + cardVal;
  const newRemaining = Math.max(0, remainingDue - totalEntered);
  const isOverpaid = totalEntered > remainingDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalEntered <= 0) {
      setErrorMsg('Please enter a payment amount greater than zero.');
      return;
    }

    if (isOverpaid) {
      setErrorMsg(
        `Total payment entered (${formatCurrency(totalEntered, 'INR')}) exceeds remaining due (${formatCurrency(remainingDue, 'INR')}).`
      );
      return;
    }

    if (upiVal > 0 && !upiReference.trim()) {
      setErrorMsg('UPI payment requires a valid UPI Transaction Reference ID.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Record entered payment entries sequentially via secure RPC
      if (cashVal > 0) {
        await repairService.addRepairPayment(repairId, 'CASH', cashVal, undefined, notes.trim() || undefined);
      }
      if (upiVal > 0) {
        await repairService.addRepairPayment(repairId, 'UPI', upiVal, upiReference.trim(), notes.trim() || undefined);
      }
      if (cardVal > 0) {
        await repairService.addRepairPayment(repairId, 'CARD', cardVal, cardReference.trim() || undefined, notes.trim() || undefined);
      }

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
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-500" />
            <span>Staff Customer Repair Payment Collection</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Summary Box */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Service Revenue Quoted:</span>
              <span>{formatCurrency(serviceRevenue, 'INR')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Already Collected:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatCurrency(existingPaymentsTotal, 'INR')}
              </span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>Remaining Amount Due:</span>
              <span className="text-primary">{formatCurrency(remainingDue, 'INR')}</span>
            </div>
          </div>

          {/* Direct Visible Payment Fields */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground block">
              Payment Breakdown (Direct Fields)
            </label>

            {/* CASH FIELD */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>CASH PAYMENT</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">INR (₹)</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>

            {/* UPI FIELD */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-500" />
                  <span>UPI / QR CODE PAYMENT</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">INR (₹)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
                <input
                  type="text"
                  placeholder="UPI Ref / Txn ID #"
                  value={upiReference}
                  onChange={(e) => setUpiReference(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>
            </div>

            {/* CARD FIELD */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>DEBIT / CREDIT CARD PAYMENT</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">INR (₹)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
                <input
                  type="text"
                  placeholder="Card Slip / Ref #"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Collection Status Preview */}
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
            isOverpaid
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : totalEntered > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted/30 border-border text-muted-foreground'
          }`}>
            <div>
              <span className="block font-bold">Total Entered: {formatCurrency(totalEntered, 'INR')}</span>
              <span className="text-[10px]">
                {isOverpaid
                  ? 'Error: Exceeds remaining due!'
                  : newRemaining === 0
                  ? '✓ Fully settles remaining balance'
                  : `Partial collection. Balance remaining: ${formatCurrency(newRemaining, 'INR')}`}
              </span>
            </div>

            {totalEntered > 0 && !isOverpaid && <CheckCircle className="w-5 h-5 shrink-0" />}
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Payment Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Partial cash deposit collected at counter..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || totalEntered <= 0 || isOverpaid}
              className="pressable bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Mark Collected</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
