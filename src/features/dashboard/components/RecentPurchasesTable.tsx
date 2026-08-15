import React from 'react';
import { RecentPurchaseItem } from '../types/dashboard.types';
import { Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecentPurchasesTableProps {
  purchases: RecentPurchaseItem[];
}

export const RecentPurchasesTable: React.FC<RecentPurchasesTableProps> = ({ purchases }) => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span>Recent Inventory Purchases</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono">{purchases.length} Listed</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Purchase #</th>
              <th className="p-3">Supplier</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground italic">
                  No purchases recorded today.
                </td>
              </tr>
            ) : (
              purchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-medium">{pur.purchase_number}</td>
                  <td className="p-3 font-medium">{pur.supplier_name}</td>
                  <td className="p-3 text-right font-semibold text-foreground">
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
