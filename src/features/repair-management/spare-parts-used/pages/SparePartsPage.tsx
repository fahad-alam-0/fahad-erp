import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const SparePartsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Spare Parts Consumption Log" subtitle="Track components used during repair ticket fulfillment." />
      <DataTablePlaceholder title="Spare Parts Allocation" columns={['Part SKU', 'Part Description', 'Job Card #', 'Quantity Used', 'Unit Cost']} />
    </div>
  );
};
