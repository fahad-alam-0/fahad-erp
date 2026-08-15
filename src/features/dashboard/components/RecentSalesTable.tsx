import React from 'react';
import { RecentSaleItem } from '../types/dashboard.types';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecentSalesTableProps {
  sales: RecentSaleItem[];
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span>Recent Point of Sale (POS) Transactions</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono">{sales.length} Listed</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
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
                <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                  No sales recorded today.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-medium">{sale.sale_number}</td>
                  <td className="p-3 font-medium">{sale.customer_name}</td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-foreground">
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
