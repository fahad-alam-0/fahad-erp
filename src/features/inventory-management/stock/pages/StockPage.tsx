import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const StockPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Stock Adjustments & Warehouse Levels" subtitle="Monitor current quantity and threshold alerts." />
      <DataTablePlaceholder title="Stock Counts" columns={['Item SKU', 'Item Name', 'Warehouse Qty', 'Minimum Stock Alert', 'Status']} />
    </div>
  );
};
