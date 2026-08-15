import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const BrandsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Electronics Brands" subtitle="Supported original equipment manufacturers (OEM)." />
      <DataTablePlaceholder title="Brands List" columns={['Brand ID', 'Brand Name', 'Total Associated Products']} />
    </div>
  );
};
