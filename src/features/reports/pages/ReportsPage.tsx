import React from 'react';
import { Header } from '@/components/common/Header';
import { CardPlaceholder } from '@/components/cards/CardPlaceholder';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Accounting & Operational Reports" subtitle="Generate exportable profit & loss statements, sales audits, and inventory summaries." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardPlaceholder title="Sales Summary Report" value="Generate PDF" />
        <CardPlaceholder title="Inventory Valuation Report" value="Generate Excel" />
        <CardPlaceholder title="Technician Efficiency Report" value="Generate CSV" />
      </div>
    </div>
  );
};
