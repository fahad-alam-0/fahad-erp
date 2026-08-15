import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const PaymentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="Payment Gateway & Cash Logs" subtitle="Audit payment receipts, cash drawer reconciliations, and digital transactions." />
      <DataTablePlaceholder title="Payment Transactions" columns={['Txn ID', 'Reference Invoice', 'Payment Method', 'Amount Received', 'Gateway Status', 'Timestamp']} />
    </div>
  );
};
