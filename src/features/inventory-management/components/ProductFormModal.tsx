import React, { useState, useEffect } from 'react';
import { Product, Category, Brand, CreateProductInput } from '../types/inventory.types';
import { inventoryService } from '../services/inventoryService';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/SearchableCombobox';
import { Button } from '@/components/ui/button';
import { X, Loader2, Package } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: Product | null;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSave: (data: CreateProductInput) => Promise<void>;
  onCategoryCreated?: (newCategory: Category) => void;
  onBrandCreated?: (newBrand: Brand) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  product,
  categories,
  brands,
  onClose,
  onSave,
  onCategoryCreated,
  onBrandCreated,
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localBrands, setLocalBrands] = useState<Brand[]>(brands);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [currentCostPrice, setCurrentCostPrice] = useState('0');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalBrands(brands);
  }, [brands]);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategoryId(product.category_id || '');
      setBrandId(product.brand_id || '');
      setProductCode(product.product_code || '');
      setSellingPrice(String(product.selling_price || 0));
      setCurrentCostPrice(String(product.current_cost_price || 0));
      setStockQuantity(String(product.stock_quantity || 0));
      setLowStockThreshold(String(product.low_stock_threshold || 5));
      setUnit(product.unit || 'pcs');
      setDescription(product.description || '');
      setIsActive(product.is_active ?? true);
    } else {
      setName('');
      setCategoryId(localCategories[0]?.id || '');
      setBrandId('');
      setProductCode('');
      setSellingPrice('0');
      setCurrentCostPrice('0');
      setStockQuantity('0');
      setLowStockThreshold('5');
      setUnit('pcs');
      setDescription('');
      setIsActive(true);
    }
    setFormError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Category creation callback for Combobox
  const handleCreateCategory = async (catName: string) => {
    const created = await inventoryService.createCategory(catName);
    setLocalCategories((prev) => [...prev, created]);
    if (onCategoryCreated) onCategoryCreated(created);
    return { id: created.id, name: created.name };
  };

  // Brand creation callback for Combobox
  const handleCreateBrand = async (brandName: string) => {
    const created = await inventoryService.createBrand(brandName);
    setLocalBrands((prev) => [...prev, created]);
    if (onBrandCreated) onBrandCreated(created);
    return { id: created.id, name: created.name };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a Category.');
      return;
    }

    const sellPriceNum = Number(sellingPrice);
    const costPriceNum = Number(currentCostPrice);
    const lowStockNum = Number(lowStockThreshold);
    const stockQtyNum = Number(stockQuantity);

    if (isNaN(sellPriceNum) || sellPriceNum < 0) {
      setFormError('Selling Price must be a valid number >= 0.');
      return;
    }
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      setFormError('Current Cost Price must be a valid number >= 0.');
      return;
    }
    if (isNaN(lowStockNum) || lowStockNum < 0) {
      setFormError('Low Stock Threshold must be a valid number >= 0.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        name: name.trim(),
        category_id: categoryId,
        brand_id: brandId || undefined,
        product_code: productCode.trim() || undefined,
        description: description.trim() || undefined,
        selling_price: sellPriceNum,
        current_cost_price: costPriceNum,
        stock_quantity: isNaN(stockQtyNum) ? 0 : stockQtyNum,
        low_stock_threshold: lowStockNum,
        unit: unit.trim() || 'pcs',
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = Boolean(product);

  const categoryOptions: ComboboxOption[] = localCategories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const brandOptions: ComboboxOption[] = localBrands.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span>{isEditing ? 'Edit Product Details' : 'Add New Product'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {formError && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
              {formError}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Basic Product Information
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Product Name</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sony 55-inch 4K LED TV Mainboard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category Searchable Combobox */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Category</span>
                  <span className="text-destructive">*</span>
                </label>
                <SearchableCombobox
                  options={categoryOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Select Category..."
                  searchPlaceholder="Search or create category..."
                  onCreateNew={handleCreateCategory}
                  required
                />
              </div>

              {/* Brand Searchable Combobox */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Brand (Optional)</label>
                <SearchableCombobox
                  options={brandOptions}
                  value={brandId}
                  onChange={setBrandId}
                  placeholder="Select Brand..."
                  searchPlaceholder="Search or create brand..."
                  allowClear
                  clearLabel="None / Unbranded"
                  onCreateNew={handleCreateBrand}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Product SKU / Code</label>
              <input
                type="text"
                placeholder="e.g. TV-MB-SONY-55"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pricing Configuration (INR)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Customer Selling Price (₹)</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Internal Cost Price (₹)</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={currentCostPrice}
                  onChange={(e) => setCurrentCostPrice(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>

            {/* Dynamic Profit & Margin Calculation Display */}
            {(() => {
              const sellNum = Number(sellingPrice) || 0;
              const costNum = Number(currentCostPrice) || 0;
              const profitVal = sellNum - costNum;
              const marginVal = sellNum > 0 ? ((profitVal / sellNum) * 100).toFixed(1) : '0.0';
              return (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">Estimated Unit Profit</span>
                    <span className={`font-bold ${profitVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      ₹{profitVal.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">Profit Margin</span>
                    <span className={`font-bold ${profitVal >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {marginVal}%
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Inventory Limits */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Inventory & Alert Settings
            </h4>

            <div className="grid grid-cols-3 gap-3">
              {!isEditing && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Initial Stock</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Low Stock Alert Limit</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Unit</label>
                <input
                  type="text"
                  required
                  placeholder="pcs / mtrs"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description / Technical Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Compatible with Samsung and Sony 4K LED models"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <label className="flex items-center space-x-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input text-primary focus:ring-ring"
              />
              <span>Active Product in Catalog</span>
            </label>

            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="pressable">
                {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
