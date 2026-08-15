import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const JobCardsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Repair Job Cards" subtitle="Create and track individual device repair tickets." />
      <DataTablePlaceholder title="Job Cards" columns={['Ticket #', 'Customer Name', 'Phone', 'Brand & Model', 'Issue Description', 'Status']} />
    </div>
  );
};
