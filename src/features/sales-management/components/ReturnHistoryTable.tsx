import React from 'react';
import { SaleReturn } from '../types/sales.types';
import { formatCurrency } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface ReturnHistoryTableProps {
  returns: SaleReturn[];
  isLoading?: boolean;
}

export const ReturnHistoryTable: React.FC<ReturnHistoryTableProps> = ({ returns, isLoading }) => {
  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'WRONG_PRODUCT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500">Wrong Product</span>;
      case 'CUSTOMER_CHANGED_MIND':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-500">Changed Mind</span>;
      case 'NOT_SUITABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500">Not Suitable</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">Other</span>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Cash</span>;
      case 'UPI':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-500">UPI</span>;
      case 'CARD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-500">Card</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-muted text-muted-foreground">{method}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading sales returns history...
      </div>
    );
  }

  if (returns.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-border rounded-xl space-y-3 bg-muted/10">
        <RotateCcw className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h4 className="text-sm font-semibold text-foreground">No Product Returns Recorded</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No product returns or customer refunds have been processed yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
            <tr>
              <th className="p-3">Return #</th>
              <th className="p-3">Sale Invoice #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Returned Items</th>
              <th className="p-3 text-right">Refund Amount</th>
              <th className="p-3 text-center">Refund Method</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {returns.map((ret) => (
              <tr key={ret.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-mono font-semibold text-foreground">
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span>{ret.return_number}</span>
                  </div>
                </td>
                <td className="p-3 font-mono text-muted-foreground">
                  {ret.sale?.sale_number || 'N/A'}
                </td>
                <td className="p-3">
                  <div className="font-medium text-foreground">{ret.customer?.full_name || 'Walk-in Customer'}</div>
                  {ret.customer?.phone && (
                    <div className="text-[10px] text-muted-foreground font-mono">{ret.customer.phone}</div>
                  )}
                </td>
                <td className="p-3">
                  <div className="space-y-1">
                    {(ret.items || []).map((item) => (
                      <div key={item.id} className="text-[11px] text-foreground">
                        <span className="font-medium">{item.product?.name || 'Product'}</span>
                        <span className="text-muted-foreground font-mono ml-1">× {item.quantity}</span>
                        <span className="text-muted-foreground text-[10px] ml-1.5">
                          ({formatCurrency(item.refund_amount, 'INR')})
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right font-mono font-bold text-destructive">
                  {formatCurrency(ret.total_refund_amount, 'INR')}
                </td>
                <td className="p-3 text-center">
                  {getMethodBadge(ret.refund_method)}
                </td>
                <td className="p-3">
                  <div className="space-y-1">
                    <div>{getReasonBadge(ret.reason)}</div>
                    {ret.reason_notes && (
                      <div className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                        "{ret.reason_notes}"
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                  {new Date(ret.created_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
