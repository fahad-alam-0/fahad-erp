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
import {
  PackagePlus,
  Search,
  X,
  Package,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
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

  // Load Categories & Brands on mount
  useEffect(() => {
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
  }, []);

  // Fetch Products based on search & filters
  const loadProducts = useCallback(async () => {
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
  }, [debouncedSearch, selectedCategory, selectedBrand, stockStatusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      await inventoryService.updateProduct(editingProduct.id, input);
    } else {
      await inventoryService.createProduct(input as CreateProductInput);
    }
    loadProducts();
  };

  const handleStockAdjustmentSuccess = () => {
    loadProducts();
    if (selectedProductForDetail) {
      // Refresh detail view
      inventoryService.getProductById(selectedProductForDetail.id).then((p) => {
        if (p) setSelectedProductForDetail(p);
      });
    }
  };

  // Metrics
  const totalProductsCount = products.length;
  const lowStockCount = products.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  ).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Products & Stock Catalog"
        subtitle="Manage spare parts, accessories, stock counts, category thresholds, and inventory movements."
        actions={
          <Button
            onClick={handleAddProductClick}
            size="sm"
            className="flex items-center space-x-1.5 text-xs pressable"
          >
            <PackagePlus className="h-4 w-4 shrink-0" />
            <span>Add New Product</span>
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Active Catalog Items
            </span>
            <span className="text-xl font-bold font-mono text-foreground">
              {totalProductsCount} Products
            </span>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Low Stock Items
            </span>
            <span className="text-xl font-bold font-mono text-amber-500">
              {lowStockCount} Items
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Out of Stock Items
            </span>
            <span className="text-xl font-bold font-mono text-destructive">
              {outOfStockCount} Items
            </span>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by product name or SKU / product code..."
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
            <span className="font-mono font-medium">{products.length} Products</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProducts}
              disabled={isLoading}
              className="h-8 px-2.5 text-xs pressable"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadProducts}>
            Retry Loading Catalog
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-muted text-muted-foreground">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {searchQuery || selectedCategory !== 'ALL' || selectedBrand !== 'ALL'
              ? 'No matching catalog products found'
              : 'No products in inventory catalog yet'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery || selectedCategory !== 'ALL' || selectedBrand !== 'ALL'
              ? 'Try adjusting your search filters or clearing dropdown selections.'
              : 'Add your first product, spare part, or accessory to begin managing inventory.'}
          </p>
          {!searchQuery && stockStatusFilter === 'ALL' && (
            <Button onClick={handleAddProductClick} size="sm" className="mt-2 text-xs pressable">
              <PackagePlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add First Product</span>
            </Button>
          )}
        </div>
      ) : (
        <ProductTable
          products={products}
          onViewDetails={handleViewDetailsClick}
          onEdit={handleEditClick}
          onAdjustStock={handleAdjustStockClick}
        />
      )}

      {/* Product Form Modal */}
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

      {/* Stock Adjustment RPC Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        product={adjustTargetProduct}
        products={products}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={handleStockAdjustmentSuccess}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        isOpen={isDetailDrawerOpen}
        product={selectedProductForDetail}
        onClose={() => setIsDetailDrawerOpen(false)}
        onEdit={handleEditClick}
        onAdjustStock={handleAdjustStockClick}
      />
    </div>
  );
};
