import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../types/customer.types';
import { customerService } from '../services/customerService';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { CustomerDetailDrawer } from '../components/CustomerDetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { UserPlus, Search, X, Users, RefreshCw, AlertCircle } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Drawers state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<Customer | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadCustomers = useCallback(async (query?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await customerService.getCustomers(query);
      setCustomers(data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Failed to load customer list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(debouncedSearch);
  }, [debouncedSearch, loadCustomers]);

  const handleCreateNewClick = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleViewDetailsClick = (customer: Customer) => {
    setSelectedCustomerForDetail(customer);
    setIsDetailDrawerOpen(true);
  };

  const handleSaveCustomer = async (data: CreateCustomerInput | UpdateCustomerInput) => {
    if (editingCustomer) {
      const updated = await customerService.updateCustomer(editingCustomer.id, data);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCustomerForDetail?.id === updated.id) {
        setSelectedCustomerForDetail(updated);
      }
    } else {
      const created = await customerService.createCustomer(data as CreateCustomerInput);
      setCustomers((prev) => [created, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customer Directory"
        subtitle="Manage customer contact information, POS sales history, and repair ticket records."
        actions={
          <Button onClick={handleCreateNewClick} className="flex items-center space-x-2 text-xs pressable">
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>Add New Customer</span>
          </Button>
        }
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by full name, primary phone, or alternate phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-muted-foreground">
          <span className="font-mono font-medium">
            {isLoading ? 'Searching...' : `${customers.length} Registered Customers`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadCustomers(debouncedSearch)}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs pressable"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Directory Body */}
      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadCustomers(debouncedSearch)}>
            Retry Loading
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
        </div>
      ) : customers.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-muted text-muted-foreground">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {searchQuery ? 'No matching customers found' : 'No customers registered yet'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery
              ? `No customer records matched "${searchQuery}". Try searching with a different name or phone number.`
              : 'Add your first customer to start tracking point-of-sale orders and electronics repair tickets.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateNewClick} size="sm" className="mt-2 text-xs pressable">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add First Customer</span>
            </Button>
          )}
        </div>
      ) : (
        <CustomerTable
          customers={customers}
          onViewDetails={handleViewDetailsClick}
          onEdit={handleEditClick}
        />
      )}

      {/* Customer Create/Edit Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        customer={editingCustomer}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveCustomer}
      />

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        isOpen={isDetailDrawerOpen}
        customer={selectedCustomerForDetail}
        onClose={() => setIsDetailDrawerOpen(false)}
        onEdit={handleEditClick}
      />
    </div>
  );
};
