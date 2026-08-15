import React, { useState, useEffect } from 'react';
import {
  Customer,
  CustomerPurchaseHistoryItem,
  CustomerRepairHistoryItem,
} from '../types/customer.types';
import { customerService } from '../services/customerService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  X,
  Phone,
  MapPin,
  FileText,
  ShoppingCart,
  Wrench,
  Loader2,
  Calendar,
  Edit,
} from 'lucide-react';

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'repairs'>('purchases');
  const [purchases, setPurchases] = useState<CustomerPurchaseHistoryItem[]>([]);
  const [repairs, setRepairs] = useState<CustomerRepairHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadHistory(customer.id);
    }
  }, [isOpen, customer]);

  const loadHistory = async (customerId: string) => {
    try {
      setIsLoadingHistory(true);
      const [pData, rData] = await Promise.all([
        customerService.getCustomerPurchaseHistory(customerId),
        customerService.getCustomerRepairHistory(customerId),
      ]);
      setPurchases(pData);
      setRepairs(rData);
    } catch (err) {
      console.error('Failed to load customer history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen || !customer) return null;

  const totalSalesAmount = purchases.reduce((sum, item) => sum + item.total_amount, 0);
  const activeRepairsCount = repairs.filter(
    (r) => !['DELIVERED', 'CANCELLED'].includes(r.status)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border-l border-border w-full max-w-2xl h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0">
              {customer.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug">{customer.full_name}</h2>
              <p className="text-xs font-mono text-primary font-medium flex items-center gap-1">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{customer.phone}</span>
                {customer.alternate_phone && (
                  <span className="text-muted-foreground ml-1">
                    (Alt: {customer.alternate_phone})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(customer)}
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

        {/* Customer Summary Bar */}
        <div className="p-4 bg-muted/40 border-b border-border grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-card rounded-lg border border-border space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" /> POS Sales History
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              {purchases.length} Orders ({formatCurrency(totalSalesAmount, 'INR')})
            </div>
          </div>

          <div className="p-3 bg-card rounded-lg border border-border space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Wrench className="w-3.5 h-3.5 text-primary" /> Repair Jobs History
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              {repairs.length} Total ({activeRepairsCount} Active)
            </div>
          </div>
        </div>

        {/* Customer Contact Details */}
        <div className="p-4 border-b border-border text-xs space-y-2">
          {customer.address && (
            <p className="text-muted-foreground flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </p>
          )}
          {customer.notes && (
            <p className="text-muted-foreground flex items-start gap-1.5 bg-muted/30 p-2 rounded border border-border">
              <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span>Notes: {customer.notes}</span>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 pt-1">
            <Calendar className="w-3 h-3 text-muted-foreground/60" />
            <span>Customer registered on {new Date(customer.created_at).toLocaleDateString()}</span>
          </p>
        </div>

        {/* Tabs Selection */}
        <div className="flex border-b border-border bg-muted/20 px-4 pt-2">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'purchases'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Purchase History ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('repairs')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'repairs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Repair Jobs ({repairs.length})</span>
          </button>
        </div>

        {/* History Tab Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading customer history...</span>
            </div>
          ) : activeTab === 'purchases' ? (
            purchases.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">No purchases recorded</p>
                <p className="text-[11px] text-muted-foreground">
                  This customer has not completed any point-of-sale transactions yet.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Sale #</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((pur) => (
                      <tr key={pur.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono font-semibold text-primary">{pur.sale_number}</td>
                        <td className="p-3">
                          <StatusBadge status="PAID" label={pur.payment_method} />
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(pur.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(pur.total_amount, 'INR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : repairs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Wrench className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No repair history recorded</p>
              <p className="text-[11px] text-muted-foreground">
                This customer has no recorded electronics or TV repair tickets.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Job #</th>
                    <th className="p-3">Device</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Quoted Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {repairs.map((rep) => (
                    <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">{rep.job_number}</td>
                      <td className="p-3">
                        <p className="font-semibold text-foreground">
                          {rep.device_brand} {rep.device_type}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {rep.reported_problem}
                        </p>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(rep.total_amount || rep.quoted_amount, 'INR')}
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
