import React, { useState } from 'react';
import { RecentSaleItem } from '../types/dashboard.types';
import { ShoppingCart, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { SaleDetailModal } from '@/features/sales-management/components/SaleDetailModal';
import { Sale } from '@/features/sales-management/types/sales.types';

interface RecentSalesTableProps {
  sales: RecentSaleItem[];
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenSaleModal = (sale: RecentSaleItem) => {
    const modalSaleObj: Sale = {
      id: sale.id,
      sale_number: sale.sale_number,
      customer_id: null,
      sale_date: sale.created_at,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total_amount: sale.total_amount,
      payment_status: sale.payment_status,
      sale_status: 'COMPLETED',
      notes: null,
      created_by: '',
      created_at: sale.created_at,
      updated_at: sale.created_at,
      customer: {
        full_name: sale.customer_name,
        phone: sale.customer_phone || '',
      },
      sale_items: sale.items.map((item) => ({
        id: item.id,
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_selling_price: item.unit_selling_price,
        unit_cost_price: 0,
        total_selling_amount: item.total_selling_amount,
        total_cost_amount: 0,
        created_at: sale.created_at,
        product: {
          name: item.product_name,
          product_code: item.product_code,
          unit: 'pcs',
        },
      })),
      sale_payments: sale.payments.map((pay) => ({
        id: pay.id,
        sale_id: sale.id,
        payment_method: pay.payment_method,
        amount: pay.amount,
        payment_reference: pay.payment_reference || null,
        created_at: sale.created_at,
      })),
    };

    setSelectedSale(modalSaleObj);
    setIsModalOpen(true);
  };

  return (
    <>
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
                <th className="p-3">Product(s)</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    No sales recorded today yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => handleOpenSaleModal(sale)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    title="Click to view full sale receipt details"
                  >
                    {/* Product(s) */}
                    <td className="p-3 max-w-[240px]">
                      <div className="font-semibold text-foreground truncate flex items-center gap-1.5 group-hover:text-primary transition-colors" title={sale.products_summary}>
                        <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{sale.products_summary}</span>
                      </div>
                      {sale.items.length > 1 && (
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {sale.items.length} Product Lines
                        </span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="p-3 font-medium text-foreground whitespace-nowrap">
                      {sale.customer_name}
                    </td>

                    {/* Qty */}
                    <td className="p-3 text-center font-mono font-semibold text-foreground whitespace-nowrap">
                      {sale.total_quantity}
                    </td>

                    {/* Unit Price */}
                    <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                      {sale.items.length > 1 ? (
                        <span title="Multi-product sale total unit breakdown">Multiple</span>
                      ) : (
                        formatCurrency(sale.unit_price_display, 'INR')
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(sale.total_amount, 'INR')}
                    </td>

                    {/* Payment Breakdown */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={sale.payment_status || 'PAID'}
                          label={sale.payment_summary}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Sale Invoice Drawer / Modal */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSale(null);
        }}
      />
    </>
  );
};
