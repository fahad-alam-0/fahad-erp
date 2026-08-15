import React, { useState, useEffect } from 'react';
import { Supplier, Purchase } from '../types/purchasing.types';
import { purchasingService } from '../services/purchasingService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  X,
  Building2,
  Phone,
  MapPin,
  FileText,
  ShoppingCart,
  Loader2,
  Calendar,
  Edit,
  History,
} from 'lucide-react';

interface SupplierDetailDrawerProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (supplier: Supplier) => void;
  onNewPurchase: (supplier: Supplier) => void;
}

export const SupplierDetailDrawer: React.FC<SupplierDetailDrawerProps> = ({
  supplier,
  isOpen,
  onClose,
  onEdit,
  onNewPurchase,
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && supplier) {
      loadHistory(supplier.id);
    }
  }, [isOpen, supplier]);

  const loadHistory = async (supplierId: string) => {
    try {
      setIsLoadingHistory(true);
      const data = await purchasingService.getSupplierPurchaseHistory(supplierId);
      setPurchases(data);
    } catch (err) {
      console.error('Failed to load supplier purchase history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen || !supplier) return null;

  const totalSpent = purchases.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border-l border-border w-full max-w-2xl h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug">{supplier.name}</h2>
              {supplier.phone && (
                <p className="text-xs font-mono text-primary font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{supplier.phone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNewPurchase(supplier)}
              className="h-8 text-xs pressable"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1 text-primary" />
              <span>New Order</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(supplier)}
              className="h-8 text-xs pressable"
            >
              <Edit className="w-3.5 h-3.5 mr-1" />
              <span>Edit</span>
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="p-4 bg-muted/40 border-b border-border grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-card rounded-lg border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
              Total Purchase Orders
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              {purchases.length} Orders
            </span>
          </div>

          <div className="p-3 bg-card rounded-lg border border-border space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
              Total Procurement Value
            </span>
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalSpent, 'INR')}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-4 border-b border-border text-xs space-y-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <StatusBadge status={supplier.is_active ? 'ACTIVE' : 'INACTIVE'} />
            {supplier.alternate_phone && (
              <span className="font-mono text-[11px]">Alt: {supplier.alternate_phone}</span>
            )}
          </div>
          {supplier.address && (
            <p className="text-muted-foreground flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span>{supplier.address}</span>
            </p>
          )}
          {supplier.notes && (
            <p className="text-muted-foreground flex items-start gap-1.5 bg-muted/30 p-2 rounded border border-border">
              <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span>Notes: {supplier.notes}</span>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 pt-1">
            <Calendar className="w-3 h-3 text-muted-foreground/60" />
            <span>Supplier registered on {new Date(supplier.created_at).toLocaleDateString()}</span>
          </p>
        </div>

        {/* Purchase History Header */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="w-4 h-4 text-primary" />
            <span>Supplier Purchase Order History ({purchases.length})</span>
          </span>
        </div>

        {/* Purchase History Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading purchase history...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No purchases recorded yet</p>
              <p className="text-[11px] text-muted-foreground">
                Click "New Order" to record inventory procurement from this supplier.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Purchase #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-primary">{pur.purchase_number}</td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(pur.purchase_date || pur.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={pur.payment_status} />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(pur.total_amount, 'INR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
