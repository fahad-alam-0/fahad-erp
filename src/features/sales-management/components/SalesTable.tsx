import React from 'react';
import { Sale } from '../types/sales.types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Eye, ShoppingCart, Calendar, User } from 'lucide-react';

interface SalesTableProps {
  sales: Sale[];
  onViewDetails: (sale: Sale) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, onViewDetails }) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Sale #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Discount</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono font-semibold text-primary">{sale.sale_number}</td>
                <td className="p-3 font-medium text-foreground">
                  {sale.customer?.full_name || 'Walk-in Customer'}
                </td>
                <td className="p-3 text-muted-foreground font-mono text-[11px]">
                  {new Date(sale.sale_date || sale.created_at).toLocaleString('en-IN', {
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {formatCurrency(sale.subtotal, 'INR')}
                </td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {sale.discount > 0 ? formatCurrency(sale.discount, 'INR') : '—'}
                </td>
                <td className="p-3 text-right font-mono font-bold text-foreground">
                  {formatCurrency(sale.total_amount, 'INR')}
                </td>
                <td className="p-3">
                  <StatusBadge status={sale.payment_status || 'PAID'} />
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(sale)}
                    className="h-8 px-2.5 text-xs pressable"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>Invoice</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="md:hidden divide-y divide-border">
        {sales.map((sale) => (
          <div key={sale.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-mono font-bold text-xs text-primary">{sale.sale_number}</h4>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground/70" />
                    <span>{sale.customer?.full_name || 'Walk-in Customer'}</span>
                  </p>
                </div>
              </div>
              <StatusBadge status={sale.payment_status || 'PAID'} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                  Subtotal
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatCurrency(sale.subtotal, 'INR')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                  Total Collected
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(sale.total_amount, 'INR')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                <span>{new Date(sale.sale_date || sale.created_at).toLocaleDateString()}</span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(sale)}
                className="h-8 text-xs pressable"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>Invoice</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
