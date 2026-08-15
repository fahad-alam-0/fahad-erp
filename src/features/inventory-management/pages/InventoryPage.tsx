import React from 'react';
import { Header } from '@/components/common/Header';
import { CardPlaceholder } from '@/components/cards/CardPlaceholder';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const InventoryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header
        title="Inventory Overview"
        subtitle="Manage product catalog, stock counts, categories, brands, and suppliers."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardPlaceholder title="Total Catalog SKUs" value="1,240 Items" />
        <CardPlaceholder title="Low Stock Items" value="12 Re-orders needed" />
        <CardPlaceholder title="Total Inventory Value" value="$84,500.00" />
      </div>
      <DataTablePlaceholder
        title="Master Product Catalog"
        columns={['SKU', 'Product Name', 'Category', 'Brand', 'Unit Price', 'Stock Level']}
      />
    </div>
  );
};
