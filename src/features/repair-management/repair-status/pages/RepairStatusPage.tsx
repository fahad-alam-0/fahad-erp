import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const RepairStatusPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Repair Status Stages" subtitle="Customizable diagnostic & repair workflow stages." />
      <DataTablePlaceholder title="Stage Definitions" columns={['Stage ID', 'Stage Name', 'Sequence', 'SMS Alert Enabled']} />
    </div>
  );
};
