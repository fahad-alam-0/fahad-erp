import React, { useState, useEffect } from 'react';
import { CreateSalePaymentInput } from '../types/sales.types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Loader2, CreditCard, Banknote, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';

interface PosPaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  onClose: () => void;
  onSubmit: (payments: CreateSalePaymentInput[]) => Promise<void>;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
  isOpen,
  totalAmount,
  onClose,
  onSubmit,
}) => {
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardRef, setCardRef] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Default to Full Cash
    setCashAmount(String(totalAmount));
    setUpiAmount('');
    setUpiRef('');
    setCardAmount('');
    setCardRef('');
    setErrorMsg(null);
  }, [totalAmount, isOpen]);

  if (!isOpen) return null;

  const cashNum = Number(cashAmount) || 0;
  const upiNum = Number(upiAmount) || 0;
  const cardNum = Number(cardAmount) || 0;

  const totalPaidSum = Math.round((cashNum + upiNum + cardNum) * 100) / 100;
  const diff = Math.round((totalAmount - totalPaidSum) * 100) / 100;
  const isSettled = Math.abs(diff) < 0.01;

  const handleQuickFill = (method: 'CASH' | 'UPI' | 'CARD') => {
    if (method === 'CASH') {
      setCashAmount(String(totalAmount));
      setUpiAmount('');
      setCardAmount('');
    } else if (method === 'UPI') {
      setCashAmount('');
      setUpiAmount(String(totalAmount));
      setCardAmount('');
    } else if (method === 'CARD') {
      setCashAmount('');
      setUpiAmount('');
      setCardAmount(String(totalAmount));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSettled) {
      if (diff > 0) {
        setErrorMsg(`Payment incomplete. Remaining amount due: ${formatCurrency(diff, 'INR')}`);
      } else {
        setErrorMsg(`Payment exceeds total by ${formatCurrency(-diff, 'INR')}. Overpayment is not allowed.`);
      }
      return;
    }

    const paymentsPayload: CreateSalePaymentInput[] = [];

    if (cashNum > 0) {
      paymentsPayload.push({ payment_method: 'CASH', amount: cashNum });
    }
    if (upiNum > 0) {
      paymentsPayload.push({ payment_method: 'UPI', amount: upiNum, payment_reference: upiRef.trim() || undefined });
    }
    if (cardNum > 0) {
      paymentsPayload.push({ payment_method: 'CARD', amount: cardNum, payment_reference: cardRef.trim() || undefined });
    }

    if (paymentsPayload.length === 0) {
      setErrorMsg('Please enter a valid payment method amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(paymentsPayload);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process sale checkout payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            <span>Settle POS Payment</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="p-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Total Amount Due
            </span>
            <span className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(totalAmount, 'INR')}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('CASH')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-card border border-border hover:bg-muted text-foreground pressable"
            >
              Full Cash
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('UPI')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-card border border-border hover:bg-muted text-foreground pressable"
            >
              Full UPI
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('CARD')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-card border border-border hover:bg-muted text-foreground pressable"
            >
              Full Card
            </button>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Inputs */}
          <div className="space-y-3">
            {/* CASH */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span>Cash Payment</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Currency notes</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="₹ 0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            {/* UPI */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-sky-500" />
                  <span>UPI / QR Scan</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">GPay, PhonePe, Paytm</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="₹ 0.00"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
                <input
                  type="text"
                  placeholder="UPI Txn Ref # (Opt)"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>

            {/* CARD */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>Credit / Debit Card</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">POS Machine Swiped</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="₹ 0.00"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
                <input
                  type="text"
                  placeholder="Approval Code # (Opt)"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Settlement Balance Status Bar */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
              isSettled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : diff > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isSettled ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold font-sans">
                {isSettled
                  ? 'Payment Fully Settled'
                  : diff > 0
                  ? `Remaining Due: ${formatCurrency(diff, 'INR')}`
                  : `Overpaid by: ${formatCurrency(-diff, 'INR')}`}
              </span>
            </div>
            <span className="font-bold">Total Entered: {formatCurrency(totalPaidSum, 'INR')}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!isSettled || isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Complete Sale Checkout</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
