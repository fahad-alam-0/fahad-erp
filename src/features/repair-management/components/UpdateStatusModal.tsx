import React, { useState, useEffect } from 'react';
import { RepairStatus } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search,
  Wrench,
  CheckCircle,
  PackageCheck,
  Ban,
  Clock,
  Check,
  Lock,
} from 'lucide-react';

interface UpdateStatusModalProps {
  isOpen: boolean;
  repairId: string | null;
  currentStatus: RepairStatus | null;
  isOwner: boolean;
  serviceRevenue?: number;
  paymentsTotalAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface StatusOptionMeta {
  status: RepairStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}

export const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  isOpen,
  repairId,
  currentStatus,
  isOwner,
  serviceRevenue = 0,
  paymentsTotalAmount = 0,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const remainingDue = Math.max(0, serviceRevenue - paymentsTotalAmount);
  const isDeliveryBlocked = remainingDue > 0.01;

  useEffect(() => {
    if (isOpen && currentStatus) {
      const allowed = getValidNextStatuses(currentStatus, isOwner);
      // Default to first non-blocked allowed status
      const selectable = allowed.find((st) => !(st === 'DELIVERED' && isDeliveryBlocked));
      setSelectedStatus(selectable || (allowed.length > 0 ? allowed[0] : null));
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, currentStatus, isOwner, isDeliveryBlocked]);

  if (!isOpen || !repairId || !currentStatus) return null;

  const validStatuses = getValidNextStatuses(currentStatus, isOwner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      setErrorMsg('Please select a valid next status state.');
      return;
    }

    if (selectedStatus === 'DELIVERED' && isDeliveryBlocked) {
      setErrorMsg(`Cannot mark repair as DELIVERED until full payment is collected. Amount Due: ${formatCurrency(remainingDue, 'INR')}`);
      return;
    }

    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await repairService.updateRepairStatus(repairId, selectedStatus, notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update repair status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMetaMap: Record<RepairStatus, StatusOptionMeta> = {
    RECEIVED: {
      status: 'RECEIVED',
      label: 'RECEIVED',
      description: 'Device registered at counter and awaiting specialist intake',
      icon: <Clock className="w-4 h-4 text-blue-500" />,
      colorClass: 'border-blue-500/30 bg-blue-500/5',
    },
    DIAGNOSING: {
      status: 'DIAGNOSING',
      label: 'DIAGNOSING',
      description: 'Specialist is actively inspecting hardware and diagnosing fault',
      icon: <Search className="w-4 h-4 text-amber-500" />,
      colorClass: 'border-amber-500/30 bg-amber-500/5',
    },
    WAITING_FOR_PARTS: {
      status: 'WAITING_FOR_PARTS',
      label: 'WAITING FOR PARTS',
      description: 'Repair paused pending arrival of required spare components',
      icon: <Clock className="w-4 h-4 text-orange-500" />,
      colorClass: 'border-orange-500/30 bg-orange-500/5',
    },
    IN_REPAIR: {
      status: 'IN_REPAIR',
      label: 'IN REPAIR',
      description: 'Specialist is replacing parts and soldering motherboard components',
      icon: <Wrench className="w-4 h-4 text-primary" />,
      colorClass: 'border-primary/30 bg-primary/5',
    },
    TESTING: {
      status: 'TESTING',
      label: 'TESTING',
      description: 'Performing post-repair quality assurance and stress testing',
      icon: <CheckCircle className="w-4 h-4 text-purple-500" />,
      colorClass: 'border-purple-500/30 bg-purple-500/5',
    },
    READY_FOR_PICKUP: {
      status: 'READY_FOR_PICKUP',
      label: 'READY FOR PICKUP',
      description: 'Repair completed and device ready for customer counter pickup',
      icon: <PackageCheck className="w-4 h-4 text-emerald-500" />,
      colorClass: 'border-emerald-500/30 bg-emerald-500/5',
    },
    DELIVERED: {
      status: 'DELIVERED',
      label: 'DELIVERED',
      description: 'Payment settled and device handed back to customer',
      icon: <Check className="w-4 h-4 text-emerald-600" />,
      colorClass: 'border-emerald-600/30 bg-emerald-600/5',
    },
    CANCELLED: {
      status: 'CANCELLED',
      label: 'CANCELLED',
      description: 'Owner cancelled ticket due to customer decline or unrepairable device',
      icon: <Ban className="w-4 h-4 text-destructive" />,
      colorClass: 'border-destructive/30 bg-destructive/5',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>Update Repair Diagnostic Status</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Status & Financial Payment Overview */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Current Status:</span>
              <span className="font-bold text-primary font-mono">{currentStatus}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] font-mono">
              <span className="text-muted-foreground">Amount: {formatCurrency(serviceRevenue, 'INR')}</span>
              <span className="text-muted-foreground">Paid: {formatCurrency(paymentsTotalAmount, 'INR')}</span>
              <span className={`font-bold ${remainingDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                Due: {formatCurrency(remainingDue, 'INR')}
              </span>
            </div>
          </div>

          {/* Direct Clickable Status Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Available Next Status States
            </label>

            {validStatuses.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-3 border border-border rounded-lg bg-muted/20">
                This repair job has reached a terminal status ({currentStatus}) and cannot be transitioned further.
              </p>
            ) : (
              <div className="space-y-2">
                {validStatuses.map((st) => {
                  const meta = statusMetaMap[st] || {
                    status: st,
                    label: st,
                    description: 'Transition to next workflow step',
                    icon: <RefreshCw className="w-4 h-4 text-primary" />,
                    colorClass: 'border-border bg-card',
                  };

                  const isBlocked = st === 'DELIVERED' && isDeliveryBlocked;
                  const isSelected = selectedStatus === st;

                  return (
                    <div
                      key={st}
                      onClick={() => {
                        if (!isBlocked) {
                          setSelectedStatus(st);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all flex items-start space-x-3 ${
                        isBlocked
                          ? 'opacity-60 bg-muted/30 border-muted-foreground/30 cursor-not-allowed'
                          : isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-xs cursor-pointer pressable'
                          : 'border-border bg-card hover:bg-muted/40 cursor-pointer pressable'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-background border border-border shrink-0 mt-0.5">
                        {isBlocked ? <Lock className="w-4 h-4 text-amber-500" /> : meta.icon}
                      </div>

                      <div className="flex-1 truncate">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground font-mono">{meta.label}</p>
                          {isSelected && !isBlocked && <Check className="w-4 h-4 text-primary shrink-0" />}
                          {isBlocked && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded">
                              LOCKED (DUE: {formatCurrency(remainingDue, 'INR')})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isBlocked ? 'Collect full payment before marking this repair as delivered.' : meta.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">Status History Log Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Full payment collected at counter, device delivered to customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedStatus || (selectedStatus === 'DELIVERED' && isDeliveryBlocked)}
              className="pressable bg-primary text-primary-foreground font-bold"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Update Status</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

function getValidNextStatuses(current: RepairStatus, isOwner: boolean): RepairStatus[] {
  const allowedMap: Record<RepairStatus, RepairStatus[]> = {
    RECEIVED: ['DIAGNOSING'],
    DIAGNOSING: ['WAITING_FOR_PARTS', 'IN_REPAIR', 'READY_FOR_PICKUP'],
    WAITING_FOR_PARTS: ['IN_REPAIR'],
    IN_REPAIR: ['WAITING_FOR_PARTS', 'TESTING', 'READY_FOR_PICKUP'],
    TESTING: ['WAITING_FOR_PARTS', 'IN_REPAIR', 'READY_FOR_PICKUP'],
    READY_FOR_PICKUP: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const list = allowedMap[current] || [];
  if (isOwner && current !== 'DELIVERED' && current !== 'CANCELLED') {
    if (!list.includes('CANCELLED')) {
      list.push('CANCELLED');
    }
  }
  return list;
}
