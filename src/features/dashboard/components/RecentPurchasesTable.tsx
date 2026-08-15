import React from 'react';
import { RecentPurchaseItem } from '../types/dashboard.types';
import { Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecentPurchasesTableProps {
  purchases: RecentPurchaseItem[];
}

export const RecentPurchasesTable: React.FC<RecentPurchasesTableProps> = ({ purchases }) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span>Recent Inventory Purchases</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
          {purchases.length} Listed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Purchase #</th>
              <th className="p-3">Supplier</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                  No purchases recorded today yet.
                </td>
              </tr>
            ) : (
              purchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-semibold text-foreground">{pur.purchase_number}</td>
                  <td className="p-3 font-medium text-foreground">{pur.supplier_name}</td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(pur.total_amount, 'INR')}
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
