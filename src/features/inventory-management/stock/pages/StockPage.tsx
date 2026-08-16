import React, { useState, useEffect } from 'react';
import { Purchase, Supplier } from '../../purchasing/types/purchasing.types';
import { Product } from '../../types/inventory.types';
import { purchasingService } from '../../purchasing/services/purchasingService';
import { inventoryService } from '../../services/inventoryService';
import { PurchaseTable } from '../../purchasing/components/PurchaseTable';
import { PurchaseDetailModal } from '../../purchasing/components/PurchaseDetailModal';
import { NewPurchaseModal } from '../../purchasing/components/NewPurchaseModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { useAuthStore } from '@/store/useAuthStore';
import { ShoppingCart, AlertCircle, Building2 } from 'lucide-react';

export const StockPage: React.FC = () => {
  const { isInitialized, isAuthenticated } = useAuthStore();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<Purchase | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = async () => {
    if (!isInitialized || !isAuthenticated) return;
    try {
      setIsLoading(true);
      setError(null);
      const [purData, supData, prodData] = await Promise.all([
        purchasingService.getPurchases(),
        purchasingService.getSuppliers(),
        inventoryService.getProducts({ isActive: true }),
      ]);
      setPurchases(purData);
      setSuppliers(supData);
      setProducts(prodData);
    } catch (err: any) {
      console.error('Failed to load stock procurement data:', err);
      setError(err.message || 'Failed to load stock procurement data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      loadData();
    }
  }, [isInitialized, isAuthenticated]);

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchaseDetail(purchase);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Procurement & Orders"
        subtitle="Monitor inventory stock purchases, supplier purchase orders, and warehouse receiving."
        actions={
          <Button onClick={() => setIsNewPurchaseOpen(true)} className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Create Purchase Order
          </Button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Purchase Orders</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{purchases.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Suppliers</p>
            <p className="text-2xl font-bold text-blue-600 mt-0.5">{suppliers.length}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Procurement Data</span>
          </div>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData()} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <SkeletonPlaceholder className="h-8 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
        </div>
      ) : (
        <PurchaseTable purchases={purchases} onViewDetails={handleViewDetails} />
      )}

      {/* New Purchase Modal */}
      <NewPurchaseModal
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
        onSuccess={async () => {
          setIsNewPurchaseOpen(false);
          loadData();
        }}
        suppliers={suppliers}
        products={products}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        purchase={selectedPurchaseDetail}
      />
    </div>
  );
};
