import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const ExpensesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Store Operational Expenses" subtitle="Record rent, utilities, salaries, and inventory procurement costs." />
      <DataTablePlaceholder title="Expense Entries" columns={['Expense ID', 'Title', 'Category', 'Amount', 'Date', 'Logged By']} />
    </div>
  );
};
