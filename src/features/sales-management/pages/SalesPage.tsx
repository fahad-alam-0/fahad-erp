import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';
import { CardPlaceholder } from '@/components/cards/CardPlaceholder';

export const SalesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Retail Point of Sale (POS) & Sales Log" subtitle="Process customer purchases, receipts, and invoice records." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardPlaceholder title="Today's Total POS Sales" value="$3,120.00" />
        <CardPlaceholder title="Invoices Issued Today" value="28 Receipts" />
        <CardPlaceholder title="Average Invoice Size" value="$111.42" />
      </div>
      <DataTablePlaceholder title="Recent Invoices" columns={['Invoice #', 'Customer', 'Items Count', 'Subtotal', 'Tax', 'Grand Total', 'Payment Status']} />
    </div>
  );
};
