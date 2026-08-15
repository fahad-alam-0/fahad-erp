import React from 'react';
import { RecentSaleItem } from '../types/dashboard.types';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';

interface RecentSalesTableProps {
  sales: RecentSaleItem[];
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Recent Point of Sale (POS) Transactions</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
          {sales.length} Listed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Sale #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Payment</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
                  No sales recorded today yet.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-semibold text-primary">{sale.sale_number}</td>
                  <td className="p-3 font-medium text-foreground">{sale.customer_name}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={sale.payment_method === 'CASH' ? 'PAID' : 'PAID'}
                      label={sale.payment_method}
                    />
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(sale.total_amount, 'INR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
