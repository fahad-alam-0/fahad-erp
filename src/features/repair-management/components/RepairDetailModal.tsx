import React, { useState, useEffect } from 'react';
import { RepairJob } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { UpdateStatusModal } from './UpdateStatusModal';
import { AddRepairPartModal } from './AddRepairPartModal';
import { AddRepairPaymentModal } from './AddRepairPaymentModal';
import { Button } from '@/components/ui/button';
import {
  X,
  Wrench,
  User,
  Calendar,
  Loader2,
  Package,
  Banknote,
  DollarSign,
  UserCheck,
  RefreshCw,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  Hand,
} from 'lucide-react';

interface RepairDetailModalProps {
  repair: RepairJob | null;
  userRole: 'OWNER' | 'TECHNICIAN' | 'STAFF';
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const RepairDetailModal: React.FC<RepairDetailModalProps> = ({
  repair,
  userRole,
  userId,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [fullJob, setFullJob] = useState<RepairJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Action Modals State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const isOwner = userRole === 'OWNER';
  const isTechnician = userRole === 'TECHNICIAN';
  const isStaff = userRole === 'STAFF';

  const loadJobData = async (id: string) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await repairService.getRepairJobById(id, userRole);
      setFullJob(data);
    } catch (err: any) {
      console.error('Failed to load repair job workspace details:', err);
      setErrorMsg(err.message || 'Failed to load repair job details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && repair) {
      loadJobData(repair.id);
    }
  }, [isOpen, repair]);

  if (!isOpen || !repair) return null;

  const displayJob = fullJob || repair;
  const isFinalized = displayJob.financial_status === 'FINALIZED';
  const isTerminal = displayJob.status === 'DELIVERED' || displayJob.status === 'CANCELLED';
  const isUnassigned = displayJob.technician_id === null;
  const isAssignedToMe = displayJob.technician_id === userId;

  const partsTotalCost = (displayJob.repair_parts || []).reduce((sum, p) => sum + p.total_cost, 0);
  const paymentsTotalAmount = (displayJob.repair_payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remainingDueAmount = Math.max(0, displayJob.service_revenue - paymentsTotalAmount);

  const handleClaimClick = async () => {
    if (isStaff) return;
    setErrorMsg(null);
    try {
      setIsClaiming(true);
      await repairService.claimRepair(displayJob.id);
      await loadJobData(displayJob.id);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim repair job.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleFinalizeFinancialsClick = async () => {
    if (!isOwner) return;
    setErrorMsg(null);
    try {
      setIsFinalizing(true);
      await repairService.finalizeFinancials(displayJob.id);
      await loadJobData(displayJob.id);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to finalize financials.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-mono leading-none flex items-center gap-2">
                <span>{displayJob.job_number}</span>
                {isFinalized && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Repair Service Ticket Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={displayJob.status} />
            <StatusBadge status={displayJob.payment_status} />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Toolbar */}
        <div className="p-3 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            {/* Take Repair Claim Button */}
            {isUnassigned && !isTerminal && !isStaff && (
              <Button
                size="sm"
                onClick={handleClaimClick}
                disabled={isClaiming}
                className="h-8 text-xs font-bold pressable flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hand className="w-3.5 h-3.5" />}
                <span>Take Repair</span>
              </Button>
            )}

            {/* Update Status Button (Assigned worker or Owner) */}
            {!isTerminal && !isFinalized && (isOwner || isAssignedToMe) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsStatusModalOpen(true)}
                className="h-8 text-xs pressable flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Update Status</span>
              </Button>
            )}

            {/* Assign Tech (Owner only) */}
            {isOwner && !isTerminal && !isFinalized && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAssignModalOpen(true)}
                className="h-8 text-xs pressable flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Assign Tech</span>
              </Button>
            )}

            {/* Add Part Button (Assigned worker or Owner) */}
            {!isTerminal && !isFinalized && (isOwner || isAssignedToMe) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPartModalOpen(true)}
                className="h-8 text-xs pressable flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Part</span>
              </Button>
            )}

            {/* Collect / Record Payment (Available to STAFF, OWNER, and Assigned TECH on non-terminal, unfinalized tickets) */}
            {!isTerminal && !isFinalized && (isOwner || isStaff || isAssignedToMe) && remainingDueAmount > 0 && (
              <Button
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="h-8 text-xs font-bold pressable flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>{isStaff ? 'Collect Payment' : 'Record Payment'}</span>
              </Button>
            )}
          </div>

          {/* Owner Finalization Trigger */}
          {isOwner && !isFinalized && (displayJob.status === 'READY_FOR_PICKUP' || displayJob.status === 'DELIVERED') && (
            <Button
              size="sm"
              onClick={handleFinalizeFinancialsClick}
              disabled={isFinalizing || paymentsTotalAmount !== displayJob.service_revenue}
              className="h-8 text-xs font-bold pressable flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isFinalizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Finalize Financials (RPC)</span>
            </Button>
          )}
        </div>

        {/* Main Body */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading job ticket workspace...</span>
            </div>
          ) : (
            <>
              {/* Customer & Device Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-xl border border-border text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Customer & Assignment Info
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{displayJob.customer?.full_name || 'Customer'}</span>
                  </p>
                  {displayJob.customer?.phone && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      Ph: {displayJob.customer.phone}
                    </p>
                  )}
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">Worker:</span>
                    {isUnassigned ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        UNASSIGNED (SHARED QUEUE)
                      </span>
                    ) : isAssignedToMe ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        ASSIGNED TO YOU
                      </span>
                    ) : (
                      <strong className="text-foreground text-[11px]">
                        {displayJob.technician?.full_name || 'Assigned Specialist'}
                      </strong>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Device Details
                  </span>
                  <p className="font-bold text-foreground">
                    {displayJob.device_brand} {displayJob.device_type} {displayJob.device_model || ''}
                  </p>
                  {displayJob.serial_number && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      SN/IMEI: {displayJob.serial_number}
                    </p>
                  )}
                  <p className="text-muted-foreground font-mono text-[11px] pt-1">
                    Received:{' '}
                    {new Date(displayJob.received_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Reported Problem & Revenue Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 p-3.5 bg-card rounded-xl border border-border space-y-1 text-xs">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Reported Problem Description
                  </span>
                  <p className="font-medium text-foreground">{displayJob.reported_problem}</p>
                  {displayJob.intake_notes && (
                    <p className="text-[11px] text-muted-foreground italic pt-1">
                      Intake Notes: {displayJob.intake_notes}
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-card rounded-xl border border-border space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block font-sans">
                    Quoted Service Revenue
                  </span>
                  <p className="text-lg font-extrabold text-primary">
                    {formatCurrency(displayJob.service_revenue, 'INR')}
                  </p>
                  {displayJob.discount > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Discount: -{formatCurrency(displayJob.discount, 'INR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Parts Used Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <span>Spare Parts Consumed ({displayJob.repair_parts?.length || 0})</span>
                  </span>
                  {!isStaff && (
                    <span className="font-mono text-muted-foreground text-[11px]">
                      Parts Total Cost: {formatCurrency(partsTotalCost, 'INR')}
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="p-2.5">Spare Part</th>
                        <th className="p-2.5 text-center">Qty</th>
                        {!isStaff && <th className="p-2.5 text-right">Unit Cost</th>}
                        {!isStaff && <th className="p-2.5 text-right">Total Cost</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayJob.repair_parts && displayJob.repair_parts.length > 0 ? (
                        displayJob.repair_parts.map((part) => (
                          <tr key={part.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-semibold text-foreground">
                              {part.product?.name || 'Part'}
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                {part.product?.product_code || 'N/A'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-semibold text-foreground">
                              {part.quantity} {part.product?.unit || 'pcs'}
                            </td>
                            {!isStaff && (
                              <td className="p-2.5 text-right font-mono text-muted-foreground">
                                {formatCurrency(part.unit_cost_price, 'INR')}
                              </td>
                            )}
                            {!isStaff && (
                              <td className="p-2.5 text-right font-mono font-bold text-foreground">
                                {formatCurrency(part.total_cost, 'INR')}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isStaff ? 2 : 4} className="p-4 text-center text-muted-foreground text-xs">
                            No spare parts recorded for this repair ticket yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Collected Payments ({displayJob.repair_payments?.length || 0})</span>
                  </span>
                  <span className="font-mono font-bold text-foreground text-[11px]">
                    Collected: {formatCurrency(paymentsTotalAmount, 'INR')} / Due:{' '}
                    {formatCurrency(displayJob.service_revenue, 'INR')}
                  </span>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayJob.repair_payments && displayJob.repair_payments.length > 0 ? (
                        displayJob.repair_payments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-mono font-semibold text-foreground">
                              {pay.payment_method}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground text-[11px]">
                              {pay.payment_reference || 'N/A'}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                              {new Date(pay.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(pay.amount, 'INR')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                            No payment entries recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Timeline History Audit Log */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Status Transition History Log</span>
                </span>

                <div className="p-3 bg-muted/20 rounded-xl border border-border space-y-2 max-h-36 overflow-y-auto">
                  {displayJob.repair_status_history && displayJob.repair_status_history.length > 0 ? (
                    displayJob.repair_status_history.map((hist) => (
                      <div key={hist.id} className="text-xs flex items-center justify-between font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="font-semibold text-foreground">
                            {hist.old_status ? `${hist.old_status} → ` : ''}{hist.new_status}
                          </span>
                          {hist.notes && (
                            <span className="text-muted-foreground font-sans text-[11px]">
                              ({hist.notes})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(hist.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No history logged yet.</p>
                  )}
                </div>
              </div>

              {/* ROLE-GATED PROFIT SNAPSHOT BOX */}
              {!isStaff && displayJob.repair_profit_snapshots && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>Financially Finalized Profit Snapshot</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Finalized by Owner
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-sans">
                        Service Revenue
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(displayJob.repair_profit_snapshots.service_revenue, 'INR')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-sans">
                        Parts Cost
                      </span>
                      <span className="font-bold text-destructive">
                        -{formatCurrency(displayJob.repair_profit_snapshots.parts_cost, 'INR')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-sans">
                        Net Profit
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(displayJob.repair_profit_snapshots.net_repair_profit, 'INR')}
                      </span>
                    </div>

                    {isOwner && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-sans">
                          Owner Share ({displayJob.repair_profit_snapshots.owner_percentage}%)
                        </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(displayJob.repair_profit_snapshots.owner_share, 'INR')}
                        </span>
                      </div>
                    )}

                    {(isOwner || (isTechnician && displayJob.technician_id === userId)) && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-sans">
                          Tech Share ({displayJob.repair_profit_snapshots.technician_percentage}%)
                        </span>
                        <span className="font-bold text-sky-500">
                          {formatCurrency(displayJob.repair_profit_snapshots.technician_share, 'INR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <AssignTechnicianModal
          isOpen={isAssignModalOpen}
          repairId={displayJob.id}
          currentTechnicianId={displayJob.technician_id}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            loadJobData(displayJob.id);
            onRefresh();
          }}
        />

        <UpdateStatusModal
          isOpen={isStatusModalOpen}
          repairId={displayJob.id}
          currentStatus={displayJob.status}
          isOwner={isOwner}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={() => {
            loadJobData(displayJob.id);
            onRefresh();
          }}
        />

        <AddRepairPartModal
          isOpen={isPartModalOpen}
          repairId={displayJob.id}
          onClose={() => setIsPartModalOpen(false)}
          onSuccess={() => {
            loadJobData(displayJob.id);
            onRefresh();
          }}
        />

        <AddRepairPaymentModal
          isOpen={isPaymentModalOpen}
          repairId={displayJob.id}
          serviceRevenue={displayJob.service_revenue}
          existingPaymentsTotal={paymentsTotalAmount}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            loadJobData(displayJob.id);
            onRefresh();
          }}
        />
      </div>
    </div>
  );
};
