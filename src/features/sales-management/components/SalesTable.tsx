import React from 'react';
import { Sale } from '../types/sales.types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Eye, ShoppingCart, Calendar, User, Package, RotateCcw } from 'lucide-react';

interface SalesTableProps {
  sales: Sale[];
  onViewDetails: (sale: Sale) => void;
  onReturnProduct?: (sale: Sale) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, onViewDetails, onReturnProduct }) => {
  const getReturnStatusBadge = (status?: string) => {
    switch (status) {
      case 'FULLY_RETURNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">Fully Returned</span>;
      case 'PARTIALLY_RETURNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Partially Returned</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">No Return</span>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Product Items</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3 text-right">Orig Sale</th>
              <th className="p-3 text-right">Returned</th>
              <th className="p-3 text-right">Net Amount</th>
              <th className="p-3 text-center">Return Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.map((sale) => {
              const returnedAmt = sale.returned_amount || 0;
              const netAmt = sale.net_amount ?? sale.total_amount;
              const canReturn = sale.sale_status === 'COMPLETED' && sale.return_status !== 'FULLY_RETURNED';

              return (
                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                  {/* Column 1: INVOICE # */}
                  <td className="p-3 font-mono font-bold text-foreground">
                    {sale.sale_number}
                  </td>

                  {/* Column 2: PRODUCT ITEMS */}
                  <td className="p-3">
                    {sale.sale_items && sale.sale_items.length > 0 ? (
                      <div className="space-y-1">
                        {sale.sale_items.map((item, idx) => (
                          <div key={item.id || idx} className="font-medium text-foreground text-xs leading-tight flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{item.product?.name || 'Product'}</span>
                            <span className="text-primary font-mono font-bold text-[11px]">× {item.quantity}</span>
                            {(item.returned_quantity || 0) > 0 && (
                              <span className="text-[10px] text-amber-500 font-mono">
                                ({item.returned_quantity} returned)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No item details</span>
                    )}
                  </td>

                  {/* Column 3: CUSTOMER */}
                  <td className="p-3 font-medium text-foreground">
                    {sale.customer?.full_name || 'Walk-in Customer'}
                  </td>

                  {/* Column 4: DATE & TIME */}
                  <td className="p-3 text-muted-foreground font-mono text-[11px]">
                    {new Date(sale.sale_date || sale.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* Column 5: ORIG SALE */}
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    {formatCurrency(sale.total_amount, 'INR')}
                  </td>

                  {/* Column 6: RETURNED AMOUNT */}
                  <td className="p-3 text-right font-mono text-amber-500 font-semibold">
                    {returnedAmt > 0 ? formatCurrency(returnedAmt, 'INR') : '—'}
                  </td>

                  {/* Column 7: NET AMOUNT */}
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(netAmt, 'INR')}
                  </td>

                  {/* Column 8: RETURN STATUS */}
                  <td className="p-3 text-center">
                    {getReturnStatusBadge(sale.return_status)}
                  </td>

                  {/* Column 9: ACTIONS */}
                  <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                    {onReturnProduct && canReturn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReturnProduct(sale)}
                        className="h-8 px-2.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 pressable"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        <span>Return</span>
                      </Button>
                    )}

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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="md:hidden divide-y divide-border">
        {sales.map((sale) => {
          const returnedAmt = sale.returned_amount || 0;
          const netAmt = sale.net_amount ?? sale.total_amount;
          const canReturn = sale.sale_status === 'COMPLETED' && sale.return_status !== 'FULLY_RETURNED';

          return (
            <div key={sale.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xs text-primary">{sale.sale_number}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground/70" />
                      <span>{sale.customer?.full_name || 'Walk-in Customer'}</span>
                    </p>
                  </div>
                </div>
                <div>{getReturnStatusBadge(sale.return_status)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                    Orig Sale
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatCurrency(sale.total_amount, 'INR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500 block font-semibold uppercase">
                    Returned
                  </span>
                  <span className="font-mono font-semibold text-amber-500">
                    {returnedAmt > 0 ? formatCurrency(returnedAmt, 'INR') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                    Net Amount
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(netAmt, 'INR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                  <span>{new Date(sale.sale_date || sale.created_at).toLocaleDateString()}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {onReturnProduct && canReturn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReturnProduct(sale)}
                      className="h-8 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 pressable"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      <span>Return</span>
                    </Button>
                  )}

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
            </div>
          );
        })}
      </div>
    </div>
  );
};
