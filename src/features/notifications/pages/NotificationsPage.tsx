import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="System Notifications & Alerts" subtitle="System alerts, low stock warnings, and automated customer notifications." />
      <DataTablePlaceholder title="Recent Notifications" columns={['Alert ID', 'Title', 'Message Payload', 'Severity', 'Read Status', 'Timestamp']} />
    </div>
  );
};
