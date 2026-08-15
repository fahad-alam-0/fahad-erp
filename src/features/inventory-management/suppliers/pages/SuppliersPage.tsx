import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const SuppliersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Parts & Gadget Suppliers" subtitle="Supplier contact details and purchase order tracking." />
      <DataTablePlaceholder title="Suppliers Directory" columns={['Supplier Code', 'Company Name', 'Contact Person', 'Phone', 'Outstanding Payable']} />
    </div>
  );
};
