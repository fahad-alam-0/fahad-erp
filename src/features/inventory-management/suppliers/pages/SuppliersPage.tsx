import React, { useState, useEffect, useCallback } from 'react';
import { Supplier, CreateSupplierInput, UpdateSupplierInput, Purchase } from '../../purchasing/types/purchasing.types';
import { Product } from '../../types/inventory.types';
import { purchasingService } from '../../purchasing/services/purchasingService';
import { inventoryService } from '../../services/inventoryService';
import { SupplierTable } from '../../purchasing/components/SupplierTable';
import { SupplierFormModal } from '../../purchasing/components/SupplierFormModal';
import { SupplierDetailDrawer } from '../../purchasing/components/SupplierDetailDrawer';
import { PurchaseTable } from '../../purchasing/components/PurchaseTable';
import { PurchaseDetailModal } from '../../purchasing/components/PurchaseDetailModal';
import { NewPurchaseModal } from '../../purchasing/components/NewPurchaseModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import {
  Building2,
  ShoppingCart,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState('');
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(true);

  // Purchases state
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [debouncedPurchaseSearch, setDebouncedPurchaseSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modals / Drawers state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isSupplierDrawerOpen, setIsSupplierDrawerOpen] = useState(false);
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);

  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [purchaseTargetSupplier, setPurchaseTargetSupplier] = useState<Supplier | null>(null);

  const [isPurchaseDetailModalOpen, setIsPurchaseDetailModalOpen] = useState(false);
  const [selectedPurchaseForDetail, setSelectedPurchaseForDetail] = useState<Purchase | null>(null);

  // Debounce searches
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [supplierSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPurchaseSearch(purchaseSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [purchaseSearch]);

  // Load Products catalog on mount (for new purchase modal)
  useEffect(() => {
    const loadProds = async () => {
      try {
        const pData = await inventoryService.getProducts({ isActive: true });
        setProducts(pData);
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    loadProds();
  }, []);

  // Fetch Suppliers
  const loadSuppliers = useCallback(async () => {
    try {
      setIsSuppliersLoading(true);
      setError(null);
      const data = await purchasingService.getSuppliers(debouncedSupplierSearch);
      setSuppliers(data);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers list.');
    } finally {
      setIsSuppliersLoading(false);
    }
  }, [debouncedSupplierSearch]);

  // Fetch Purchases
  const loadPurchases = useCallback(async () => {
    try {
      setIsPurchasesLoading(true);
      setError(null);
      const data = await purchasingService.getPurchases({
        search: debouncedPurchaseSearch,
        paymentStatus: paymentStatusFilter,
      });
      setPurchases(data);
    } catch (err: any) {
      console.error('Failed to load purchases:', err);
      setError(err.message || 'Failed to load purchase orders list.');
    } finally {
      setIsPurchasesLoading(false);
    }
  }, [debouncedPurchaseSearch, paymentStatusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleAddSupplierClick = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplierClick = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsSupplierModalOpen(true);
  };

  const handleViewSupplierDetailsClick = (sup: Supplier) => {
    setSelectedSupplierForDetail(sup);
    setIsSupplierDrawerOpen(true);
  };

  const handleNewPurchaseClick = (sup?: Supplier) => {
    setPurchaseTargetSupplier(sup || null);
    setIsNewPurchaseModalOpen(true);
  };

  const handleViewPurchaseDetailsClick = (pur: Purchase) => {
    setSelectedPurchaseForDetail(pur);
    setIsPurchaseDetailModalOpen(true);
  };

  const handleSaveSupplier = async (data: CreateSupplierInput | UpdateSupplierInput) => {
    if (editingSupplier) {
      const updated = await purchasingService.updateSupplier(editingSupplier.id, data);
      setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSupplierForDetail?.id === updated.id) {
        setSelectedSupplierForDetail(updated);
      }
    } else {
      const created = await purchasingService.createSupplier(data as CreateSupplierInput);
      setSuppliers((prev) => [created, ...prev]);
    }
  };

  const handlePurchaseSuccess = () => {
    loadPurchases();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Suppliers & Inventory Procurement"
        subtitle="Manage supplier contacts, purchase history, and atomic procurement orders."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNewPurchaseClick()}
              className="flex items-center space-x-1.5 text-xs pressable"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-primary" />
              <span>New Order</span>
            </Button>

            <Button
              onClick={handleAddSupplierClick}
              size="sm"
              className="flex items-center space-x-1.5 text-xs pressable"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Add Supplier</span>
            </Button>
          </div>
        }
      />

      {/* Tabs Selection Bar */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers Directory ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'purchases'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase Orders Log ({purchases.length})</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search suppliers by company name or phone number..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
              {supplierSearch && (
                <button
                  onClick={() => setSupplierSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-muted-foreground">
              <span className="font-mono font-medium">{suppliers.length} Registered Suppliers</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSuppliers}
                disabled={isSuppliersLoading}
                className="h-8 px-2.5 text-xs pressable"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSuppliersLoading ? 'animate-spin text-primary' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* Table Body */}
          {error ? (
            <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={loadSuppliers}>
                Retry Loading
              </Button>
            </div>
          ) : isSuppliersLoading ? (
            <div className="space-y-3">
              <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-muted text-muted-foreground">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {supplierSearch ? 'No matching suppliers found' : 'No suppliers registered yet'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {supplierSearch
                  ? `No supplier records matched "${supplierSearch}". Try searching by company name or phone.`
                  : 'Add your first supplier to record inventory procurement and track purchases.'}
              </p>
              {!supplierSearch && (
                <Button onClick={handleAddSupplierClick} size="sm" className="mt-2 text-xs pressable">
                  <Building2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Add First Supplier</span>
                </Button>
              )}
            </div>
          ) : (
            <SupplierTable
              suppliers={suppliers}
              onViewDetails={handleViewSupplierDetailsClick}
              onEdit={handleEditSupplierClick}
              onNewPurchase={handleNewPurchaseClick}
            />
          )}
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS LOG */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Purchase Search & Filter Bar */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by purchase order number (e.g. PUR-2026...)..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
                {purchaseSearch && (
                  <button
                    onClick={() => setPurchaseSearch('')}
                    className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPurchases}
                  disabled={isPurchasesLoading}
                  className="h-8 px-2.5 text-xs pressable"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isPurchasesLoading ? 'animate-spin text-primary' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Payment Status Filters */}
            <div className="flex items-center space-x-2 pt-1 border-t border-border/60 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" /> Payment Status:
              </span>
              {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setPaymentStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all pressable ${
                    paymentStatusFilter === st
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Purchases Table Body */}
          {error ? (
            <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={loadPurchases}>
                Retry Loading Purchases
              </Button>
            </div>
          ) : isPurchasesLoading ? (
            <div className="space-y-3">
              <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-muted text-muted-foreground">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {purchaseSearch || paymentStatusFilter !== 'ALL'
                  ? 'No matching purchase orders found'
                  : 'No purchase orders recorded yet'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {purchaseSearch || paymentStatusFilter !== 'ALL'
                  ? 'Try adjusting your search criteria or payment status filter.'
                  : 'Submit your first purchase order to increase stock and track inventory costs.'}
              </p>
              {!purchaseSearch && paymentStatusFilter === 'ALL' && (
                <Button onClick={() => handleNewPurchaseClick()} size="sm" className="mt-2 text-xs pressable">
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  <span>Create First Purchase</span>
                </Button>
              )}
            </div>
          ) : (
            <PurchaseTable purchases={purchases} onViewDetails={handleViewPurchaseDetailsClick} />
          )}
        </div>
      )}

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        supplier={editingSupplier}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
      />

      {/* Supplier Detail Drawer */}
      <SupplierDetailDrawer
        isOpen={isSupplierDrawerOpen}
        supplier={selectedSupplierForDetail}
        onClose={() => setIsSupplierDrawerOpen(false)}
        onEdit={handleEditSupplierClick}
        onNewPurchase={handleNewPurchaseClick}
      />

      {/* New Purchase Modal */}
      <NewPurchaseModal
        isOpen={isNewPurchaseModalOpen}
        initialSupplier={purchaseTargetSupplier}
        suppliers={suppliers}
        products={products}
        onClose={() => setIsNewPurchaseModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        isOpen={isPurchaseDetailModalOpen}
        purchase={selectedPurchaseForDetail}
        onClose={() => setIsPurchaseDetailModalOpen(false)}
      />
    </div>
  );
};
