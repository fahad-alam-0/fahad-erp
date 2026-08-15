import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const ProductsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Products Directory" subtitle="All electronics gadgets, accessories, and spare parts." />
      <DataTablePlaceholder title="Products List" columns={['SKU', 'Title', 'Cost Price', 'Selling Price', 'Category', 'Brand']} />
    </div>
  );
};
