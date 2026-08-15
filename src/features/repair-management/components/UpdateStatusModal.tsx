import React, { useState, useEffect } from 'react';
import { RepairStatus } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { Button } from '@/components/ui/button';
import { X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface UpdateStatusModalProps {
  isOpen: boolean;
  repairId: string | null;
  currentStatus: RepairStatus | null;
  isOwner: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  isOpen,
  repairId,
  currentStatus,
  isOwner,
  onClose,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<RepairStatus>('DIAGNOSING');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentStatus) {
      const allowed = getValidNextStatuses(currentStatus, isOwner);
      setNewStatus(allowed.length > 0 ? allowed[0] : currentStatus);
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, currentStatus, isOwner]);

  if (!isOpen || !repairId || !currentStatus) return null;

  const validStatuses = getValidNextStatuses(currentStatus, isOwner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setIsSubmitting(true);
      await repairService.updateRepairStatus(repairId, newStatus, notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update repair status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs flex justify-between">
            <span className="text-muted-foreground font-semibold">Current Status:</span>
            <span className="font-bold text-primary">{currentStatus}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">New Status State</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RepairStatus)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              {validStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Status Log Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Waiting for replacement LCD display panel..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
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
    IN_REPAIR: ['WAITING_FOR_PARTS', 'TESTING'],
    TESTING: ['WAITING_FOR_PARTS', 'IN_REPAIR', 'READY_FOR_PICKUP'],
    READY_FOR_PICKUP: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const list = allowedMap[current] || [];
  if (isOwner && current !== 'DELIVERED' && current !== 'CANCELLED') {
    list.push('CANCELLED');
  }
  return list;
}
