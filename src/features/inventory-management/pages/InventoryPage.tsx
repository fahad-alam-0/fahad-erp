import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category, Brand, CreateProductInput, UpdateProductInput } from '../types/inventory.types';
import { inventoryService } from '../services/inventoryService';
import { ProductTable } from '../components/ProductTable';
import { ProductFormModal } from '../components/ProductFormModal';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal';
import { ProductDetailDrawer } from '../components/ProductDetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  PackagePlus,
  Search,
  X,
  Package,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Filter,
  Coins,
  TrendingUp,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { isInitialized, isAuthenticated, user } = useAuthStore();
  const userRole = user?.role || 'STAFF';
  const isOwner = userRole === 'OWNER';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);

  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Categories & Brands ONLY when auth is fully initialized and user is authenticated
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const loadMeta = async () => {
      try {
        const [cData, bData] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getBrands(),
        ]);
        setCategories(cData);
        setBrands(bData);
      } catch (err) {
        console.error('Failed to load categories/brands:', err);
      }
    };
    loadMeta();
  }, [isInitialized, isAuthenticated]);

  // Fetch Products based on search & filters ONLY when authenticated
  const loadProducts = useCallback(async () => {
    if (!isInitialized || !isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await inventoryService.getProducts({
        search: debouncedSearch,
        categoryId: selectedCategory,
        brandId: selectedBrand,
        stockStatus: stockStatusFilter,
        isActive: true,
      });
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load inventory product catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isAuthenticated, debouncedSearch, selectedCategory, selectedBrand, stockStatusFilter]);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      loadProducts();
    }
  }, [isInitialized, isAuthenticated, loadProducts]);

  // Supabase Realtime channel subscription for live updates on stock, sales, purchases
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const channel = supabase
      .channel('inventory-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInitialized, isAuthenticated, loadProducts]);

  const handleAddProductClick = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setIsFormModalOpen(true);
  };

  const handleAdjustStockClick = (p: Product) => {
    setAdjustTargetProduct(p);
    setIsAdjustModalOpen(true);
  };

  const handleViewDetailsClick = (p: Product) => {
    setSelectedProductForDetail(p);
    setIsDetailDrawerOpen(true);
  };

  const handleSaveProduct = async (input: CreateProductInput | UpdateProductInput) => {
    if (editingProduct) {
      await inventoryService.updateProduct(editingProduct.id, input as UpdateProductInput);
    } else {
      await inventoryService.createProduct(input as CreateProductInput);
    }
    setIsFormModalOpen(false);
    loadProducts();
  };

  const handleAdjustSuccess = async () => {
    setIsAdjustModalOpen(false);
    loadProducts();
  };

  const activeProductsCount = products.length;
  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  // Live monetary inventory valuations
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + Number(p.stock_quantity || 0) * Number(p.current_cost_price || 0),
    0
  );
  const totalPotentialSalesValue = products.reduce(
    (sum, p) => sum + Number(p.stock_quantity || 0) * Number(p.selling_price || 0),
    0
  );
  const totalPotentialGrossProfit = totalPotentialSalesValue - totalInventoryValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Products & Stock Catalog"
        subtitle="Manage product catalog, prices, weighted-average cost basis, and live monetary inventory value."
        actions={
          <Button onClick={handleAddProductClick} className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4" />
            Add New Product
          </Button>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL INVENTORY VALUE CARD (Owner Only) */}
        {isOwner ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Inventory Value</span>
              <Coins className="w-4 h-4 text-emerald-500" />
            </span>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalInventoryValue, 'INR')}
            </p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              <span>Potential Retail Value:</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(totalPotentialSalesValue, 'INR')}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Active Products</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{activeProductsCount}</p>
            </div>
          </div>
        )}

        {isOwner ? (
          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Potential Gross Margin</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </span>
            <p className="text-2xl font-bold font-mono text-primary mt-0.5">
              {formatCurrency(totalPotentialGrossProfit, 'INR')}
            </p>
            <p className="text-[10px] text-muted-foreground">Retail profit if all stock is sold</p>
          </div>
        ) : null}

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Items</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{lowStockCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-destructive mt-0.5">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 min-w-[150px]">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <span className="text-xs text-muted-foreground font-medium">Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <span className="text-xs text-muted-foreground font-medium">Status:</span>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Stock</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProducts()}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Inventory</span>
          </div>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadProducts()} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <SkeletonPlaceholder className="h-8 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
          <SkeletonPlaceholder className="h-12 w-full rounded" />
        </div>
      ) : (
        <ProductTable
          products={products}
          onEdit={handleEditClick}
          onAdjustStock={handleAdjustStockClick}
          onViewDetails={handleViewDetailsClick}
          userRole={userRole}
        />
      )}

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        product={editingProduct}
        categories={categories}
        brands={brands}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveProduct}
        onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
        onBrandCreated={(newBrand) => setBrands((prev) => [...prev, newBrand])}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        product={adjustTargetProduct}
        products={products}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={handleAdjustSuccess}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        product={selectedProductForDetail}
        onEdit={(p) => {
          setIsDetailDrawerOpen(false);
          handleEditClick(p);
        }}
        onAdjustStock={(p) => {
          setIsDetailDrawerOpen(false);
          handleAdjustStockClick(p);
        }}
      />
    </div>
  );
};
