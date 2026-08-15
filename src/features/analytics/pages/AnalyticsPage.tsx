import React from 'react';
import { Header } from '@/components/common/Header';
import { ChartPlaceholder } from '@/components/charts/ChartPlaceholder';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Advanced Retail Analytics" subtitle="Interactive charts analyzing sales velocity and repair ticket turnaround times." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartPlaceholder title="Quarterly Revenue Trends" />
        <ChartPlaceholder title="Top 10 Fast-Selling Accessories" />
      </div>
    </div>
  );
};
