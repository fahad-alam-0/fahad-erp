import React, { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  CustomerPurchaseHistoryItem,
  CustomerRepairHistoryItem,
} from '../types/customer.types';
import { customerService } from '../services/customerService';
import { repairService } from '@/features/repair-management/services/repairService';
import { RepairDetailModal } from '@/features/repair-management/components/RepairDetailModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
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
  Eye,
  UserCheck,
} from 'lucide-react';
import { RepairJob } from '@/features/repair-management/types/repair.types';

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
  const { user, role } = useAuthStore();
  const userRole = (role as 'OWNER' | 'TECHNICIAN' | 'STAFF') || 'STAFF';
  const userId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'purchases' | 'repairs'>('repairs');
  const [purchases, setPurchases] = useState<CustomerPurchaseHistoryItem[]>([]);
  const [repairs, setRepairs] = useState<CustomerRepairHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Selected Repair Job Card Modal State
  const [selectedRepairJob, setSelectedRepairJob] = useState<RepairJob | null>(null);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);

  const loadHistory = useCallback(async (customerId: string) => {
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
  }, []);

  useEffect(() => {
    if (isOpen && customer) {
      loadHistory(customer.id);
    }
  }, [isOpen, customer, loadHistory]);

  // Realtime Subscription: Automatically refresh history when repair_jobs, repair_payments, or sales change
  const realtimeTables = ['repair_jobs', 'repair_status_history', 'repair_payments', 'sales'];
  useRealtimeSubscription(
    customer ? `customer-detail-${customer.id}` : '',
    realtimeTables,
    useCallback(() => {
      if (customer) {
        loadHistory(customer.id);
      }
    }, [customer, loadHistory])
  );

  if (!isOpen || !customer) return null;

  const totalSalesAmount = purchases.reduce((sum, item) => sum + item.total_amount, 0);
  const activeRepairsCount = repairs.filter(
    (r) => !['DELIVERED', 'CANCELLED'].includes(r.status)
  ).length;

  const handleOpenRepairJobCard = async (repairId: string) => {
    try {
      const fullJob = await repairService.getRepairJobById(repairId, userRole);
      setSelectedRepairJob(fullJob);
      setIsRepairModalOpen(true);
    } catch (err) {
      console.error('Failed to open repair job card from customer history:', err);
    }
  };

  return (
    <>
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
          </div>

          {/* History Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              <div className="space-y-3">
                {repairs.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => handleOpenRepairJobCard(rep.id)}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-2xs space-y-3 pressable"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-mono font-bold text-xs text-primary">
                        <span>{rep.job_number}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={rep.status} />
                        <StatusBadge status={rep.payment_status} />
                      </div>
                    </div>

                    <div className="p-2.5 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
                      <p className="font-bold text-foreground">
                        {rep.device_brand} {rep.device_type} {rep.device_model || ''}
                      </p>
                      <p className="text-muted-foreground text-[11px] line-clamp-2">{rep.reported_problem}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">Assigned Specialist</span>
                        <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                          <UserCheck className="w-3 h-3 text-primary" />
                          {rep.technician_name || 'Unassigned'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">Quoted Revenue</span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(rep.service_revenue, 'INR')}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">Collected</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(rep.collected_amount, 'INR')}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans">Remaining Due</span>
                        <span className={`font-bold ${rep.remaining_due > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {formatCurrency(rep.remaining_due, 'INR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50 font-mono">
                      <span>Received: {new Date(rep.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 text-primary font-sans font-semibold">
                        <Eye className="w-3 h-3" />
                        <span>Open Job Card</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repair Job Card Modal */}
      <RepairDetailModal
        isOpen={isRepairModalOpen}
        onClose={() => setIsRepairModalOpen(false)}
        repair={selectedRepairJob}
        userRole={userRole}
        userId={userId}
        onRefresh={() => customer && loadHistory(customer.id)}
      />
    </>
  );
};
