import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const CategoriesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Product Categories" subtitle="Organize inventory by device types and component groups." />
      <DataTablePlaceholder title="Categories List" columns={['Category ID', 'Category Name', 'Slug', 'Item Count']} />
    </div>
  );
};
