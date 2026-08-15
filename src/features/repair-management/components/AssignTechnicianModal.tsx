import React, { useState, useEffect } from 'react';
import { repairService } from '../services/repairService';
import { UserProfile } from '@/types/user.types';
import { Button } from '@/components/ui/button';
import { X, Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface AssignTechnicianModalProps {
  isOpen: boolean;
  repairId: string | null;
  currentTechnicianId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  repairId,
  currentTechnicianId,
  onClose,
  onSuccess,
}) => {
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadTechs = async () => {
        try {
          const list = await repairService.getTechnicians();
          setTechnicians(list);
          setSelectedTechId(currentTechnicianId || (list.length > 0 ? list[0].id : ''));
        } catch (err) {
          console.error('Failed to fetch technicians:', err);
        }
      };
      loadTechs();
      setErrorMsg(null);
    }
  }, [isOpen, currentTechnicianId]);

  if (!isOpen || !repairId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedTechId) {
      setErrorMsg('Please select a technician to assign.');
      return;
    }

    try {
      setIsSubmitting(true);
      await repairService.assignTechnician(repairId, selectedTechId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign technician.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <span>Assign / Reassign Technician (Owner Only)</span>
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select Technician</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">Select Technician</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Confirm Assignment</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
