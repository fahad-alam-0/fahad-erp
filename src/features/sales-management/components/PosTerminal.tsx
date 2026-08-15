import React, { useState, useEffect, useRef } from 'react';
import { CartItem, CreateSalePaymentInput } from '../types/sales.types';
import { Product } from '@/features/inventory-management/types/inventory.types';
import { Customer } from '@/features/customer-management/types/customer.types';
import { salesService } from '../services/salesService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { PosPaymentModal } from './PosPaymentModal';
import { SaleReceiptModal } from './SaleReceiptModal';
import { Button } from '@/components/ui/button';
import {
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  Package,
  X,
  CreditCard,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export const PosTerminal: React.FC = () => {
  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProdSearch, setDebouncedProdSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Cart & Pricing State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [posError, setPosError] = useState<string | null>(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Debounce product search (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProdSearch(productSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [productSearch]);

  // Fetch product catalog
  const loadProducts = async (q?: string) => {
    try {
      setIsSearchingProducts(true);
      const data = await salesService.searchProducts(q);
      setProducts(data);
    } catch (err) {
      console.error('POS product search error:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts(debouncedProdSearch);
  }, [debouncedProdSearch]);

  // Keyboard shortcut Ctrl/Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Customer search
  const handleCustomerSearchChange = async (q: string) => {
    setCustomerSearch(q);
    if (!q.trim()) {
      setCustomerResults([]);
      return;
    }
    try {
      setIsSearchingCustomers(true);
      const data = await salesService.searchCustomers(q);
      setCustomerResults(data);
    } catch (err) {
      console.error('POS customer search error:', err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  // Cart Actions
  const handleAddToCart = (product: Product) => {
    setPosError(null);
    if (product.stock_quantity <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product_id === product.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.quantity >= product.stock_quantity) {
          setPosError(`Cannot add more. Available stock limit for ${product.name} is ${product.stock_quantity}.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_code: product.product_code,
          unit: product.unit,
          selling_price: product.selling_price,
          stock_quantity: product.stock_quantity,
          low_stock_threshold: product.low_stock_threshold,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setPosError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock_quantity) {
              setPosError(`Cannot exceed available stock (${item.stock_quantity} ${item.unit}).`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0);
  const discountNum = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountNum);

  const handleProceedToPayment = () => {
    setPosError(null);
    if (cart.length === 0) {
      setPosError('Your cart is empty. Add products to proceed.');
      return;
    }
    if (discountNum >= subtotal && subtotal > 0) {
      setPosError(`Discount (${formatCurrency(discountNum, 'INR')}) must be strictly less than subtotal (${formatCurrency(subtotal, 'INR')}).`);
      return;
    }
    if (grandTotal <= 0) {
      setPosError('Sale total amount must be greater than zero.');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleCompleteSaleCheckout = async (payments: CreateSalePaymentInput[]) => {
    const res = await salesService.createSale({
      customer_id: selectedCustomer?.id || null,
      discount: discountNum,
      notes: notes.trim() || undefined,
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      payments: payments,
    });

    setIsPaymentModalOpen(false);
    setReceiptInfo({
      ...res,
      customer_name: selectedCustomer?.full_name || 'Walk-in Customer',
    });
    setIsReceiptModalOpen(true);

    // Reset Cart
    setCart([]);
    setDiscount('0');
    setNotes('');
    setSelectedCustomer(null);
    loadProducts(debouncedProdSearch);
  };

  const getProductStatus = (p: Product) => {
    if (p.stock_quantity === 0) return 'OUT_OF_STOCK';
    if (p.stock_quantity <= p.low_stock_threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT AREA: PRODUCT DISCOVERY & CATALOG (7 COLS ON DESKTOP) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search Bar Header */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product by name or SKU code (Cmd/Ctrl+K)..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch('')}
                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {isSearchingProducts ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Searching products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p className="font-semibold text-xs text-foreground">No matching products found</p>
            <p className="text-[11px] text-muted-foreground">
              Try searching with a different product name or SKU code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {products.map((prod) => {
              const status = getProductStatus(prod);
              const isOutOfStock = prod.stock_quantity <= 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 bg-card ${
                    isOutOfStock
                      ? 'opacity-60 cursor-not-allowed border-border'
                      : 'hover:border-primary/50 hover:shadow-xs cursor-pointer border-border pressable'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-tight">
                        {prod.name}
                      </h4>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {prod.product_code || 'N/A'} • {prod.category?.name || 'Uncategorized'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatCurrency(prod.selling_price, 'INR')}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                      Stock: {prod.stock_quantity} {prod.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT AREA: POS CART & CHECKOUT TERMINAL (5 COLS ON DESKTOP) */}
      <div className="lg:col-span-5 bg-card border border-border rounded-xl shadow-md p-4 space-y-4 sticky top-4">
        {/* Customer Selector Bar */}
        <div className="space-y-2 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Customer Assignment</span>
            </span>
            <button
              type="button"
              onClick={() => setShowCustomerPicker(!showCustomerPicker)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              {selectedCustomer ? 'Change Customer' : 'Assign Customer'}
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
            {selectedCustomer ? (
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">{selectedCustomer.full_name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground font-medium">
                <User className="w-4 h-4 shrink-0" />
                <span>Walk-in Customer (Default)</span>
              </div>
            )}

            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer Search Dropdown */}
          {showCustomerPicker && (
            <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2 text-xs">
              <input
                type="text"
                placeholder="Type customer name or phone..."
                value={customerSearch}
                onChange={(e) => handleCustomerSearchChange(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {isSearchingCustomers ? (
                  <p className="text-[11px] text-muted-foreground p-1">Searching...</p>
                ) : customerResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setShowCustomerPicker(false);
                    }}
                    className="p-1.5 rounded hover:bg-card cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-semibold text-foreground">{c.full_name}</span>
                    <span className="font-mono text-muted-foreground text-[11px]">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {posError && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{posError}</span>
          </div>
        )}

        {/* Cart Item List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              <span>Current Cart ({cart.length})</span>
            </span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[10px] text-destructive hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl bg-card/40 flex flex-col items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
              <p className="font-semibold text-xs text-foreground">Your cart is empty</p>
              <p className="text-[11px] text-muted-foreground">
                Click on products on the left catalog grid to add items.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="p-2.5 bg-muted/30 border border-border rounded-lg flex items-center justify-between text-xs space-x-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {formatCurrency(item.selling_price, 'INR')} × {item.quantity} ={' '}
                      <strong className="text-foreground">
                        {formatCurrency(item.quantity * item.selling_price, 'INR')}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.product_id, -1)}
                      className="p-1 rounded bg-background border border-input hover:bg-muted text-foreground pressable"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product_id, 1)}
                      disabled={item.quantity >= item.stock_quantity}
                      className="p-1 rounded bg-background border border-input hover:bg-muted text-foreground disabled:opacity-40 pressable"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveFromCart(item.product_id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Summary Box */}
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2 text-xs font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal, 'INR')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-muted-foreground">Discount (₹):</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-24 text-right text-xs font-mono px-2 py-1 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            />
          </div>

          <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t border-border">
            <span className="font-sans uppercase tracking-wider">Total Amount:</span>
            <span className="text-primary font-mono text-base font-extrabold">
              {formatCurrency(grandTotal, 'INR')}
            </span>
          </div>
        </div>

        {/* Checkout Trigger Button */}
        <Button
          onClick={handleProceedToPayment}
          disabled={cart.length === 0}
          className="w-full text-xs font-bold py-2.5 pressable flex items-center justify-center space-x-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pay & Complete Sale</span>
        </Button>

        {/* Payment Sheet Modal */}
        <PosPaymentModal
          isOpen={isPaymentModalOpen}
          totalAmount={grandTotal}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleCompleteSaleCheckout}
        />

        {/* Success Voucher Modal */}
        <SaleReceiptModal
          isOpen={isReceiptModalOpen}
          saleInfo={receiptInfo}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      </div>
    </div>
  );
};
