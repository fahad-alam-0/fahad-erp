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
import { ShoppingCart, RefreshCw, AlertCircle, Building2 } from 'lucide-react';

export const StockPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<Purchase | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = async () => {
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
    loadData();
  }, []);

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
          <Button
            onClick={() => setIsNewPurchaseOpen(true)}
            size="sm"
            className="flex items-center space-x-1.5 text-xs pressable"
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>New Purchase Order</span>
          </Button>
        }
      />

      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-2xs">
        <div className="flex items-center space-x-3 text-xs">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {suppliers.length} Registered Suppliers • {products.length} Active Catalog Products
            </p>
            <p className="text-[10px] text-muted-foreground">
              Executing a purchase order atomically updates stock quantities and current cost prices.
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading} className="h-8 px-2 text-xs pressable">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </Button>
      </div>

      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry Loading
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <PurchaseTable purchases={purchases} onViewDetails={handleViewDetails} />
      )}

      {/* New Purchase Modal */}
      <NewPurchaseModal
        isOpen={isNewPurchaseOpen}
        suppliers={suppliers}
        products={products}
        onClose={() => setIsNewPurchaseOpen(false)}
        onSuccess={loadData}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        isOpen={isDetailModalOpen}
        purchase={selectedPurchaseDetail}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};
