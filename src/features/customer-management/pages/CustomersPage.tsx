import React from 'react';
import { Header } from '@/components/common/Header';
import { DataTablePlaceholder } from '@/components/tables/DataTablePlaceholder';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header
        title="Customer Management (CRM)"
        subtitle="Manage customer directories, contact numbers, and repair/purchase history."
        action={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" /> Add New Customer
          </Button>
        }
      />
      <DataTablePlaceholder
        title="Customer Database"
        columns={['ID', 'Full Name', 'Phone Number', 'Email', 'Total Visits', 'Actions']}
      />
    </div>
  );
};
