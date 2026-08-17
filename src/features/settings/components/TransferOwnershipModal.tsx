import React, { useState, useEffect } from 'react';
import { UserProfileData } from '../types/settings.types';
import { settingsService } from '../services/settingsService';
import { Button } from '@/components/ui/button';
import { Crown, ShieldAlert, X, Loader2 } from 'lucide-react';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  currentOwner: UserProfileData | null;
  activeUsers: UserProfileData[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  isOpen,
  currentOwner,
  activeUsers,
  onClose,
  onSuccess,
}) => {
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState('');
  const [confirmationName, setConfirmationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible new owners: active users other than current owner
  const eligibleUsers = activeUsers.filter(
    (u) => u.id !== currentOwner?.id && u.is_active
  );

  const selectedTargetUser = eligibleUsers.find((u) => u.id === selectedNewOwnerId) || null;

  useEffect(() => {
    if (isOpen) {
      setSelectedNewOwnerId(eligibleUsers.length > 0 ? eligibleUsers[0].id : '');
      setConfirmationName('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !currentOwner) return null;

  const isConfirmed = selectedTargetUser && confirmationName.trim() === selectedTargetUser.full_name.trim();

  const handleTransfer = async () => {
    if (!selectedTargetUser || !isConfirmed) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await settingsService.transferPrimaryOwnership(selectedTargetUser.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to transfer primary ownership:', err);
      setError(err.message || 'Failed to transfer primary ownership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-amber-500/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Crown className="w-5 h-5 shrink-0 text-amber-500" />
            <span>TRANSFER PRIMARY OWNERSHIP</span>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Owner</span>
              <strong className="text-foreground text-xs block truncate">{currentOwner.full_name}</strong>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">Role: OWNER</span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">New Owner Target</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-xs block truncate">
                {selectedTargetUser ? selectedTargetUser.full_name : 'Select user'}
              </strong>
              <span className="text-[10px] text-muted-foreground block">Role: Will become OWNER</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">Select New Primary Owner:</label>
            <select
              value={selectedNewOwnerId}
              onChange={(e) => {
                setSelectedNewOwnerId(e.target.value);
                setConfirmationName('');
              }}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground font-mono"
            >
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role} - {u.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-muted-foreground bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
            <p className="font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              After ownership transfer:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li><strong className="text-foreground">{selectedTargetUser?.full_name || 'Target user'}</strong> will become the Primary OWNER.</li>
              <li><strong className="text-foreground">{currentOwner.full_name}</strong> will automatically become an ADMIN.</li>
              <li>The new owner will gain exclusive control over user deletion, role management, and ownership transfer.</li>
              <li>Exactly ONE Primary Owner account will exist.</li>
            </ul>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-semibold">
              {error}
            </div>
          )}

          {selectedTargetUser && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-foreground">
                Type the new owner's exact name <strong className="text-amber-600 font-mono">{selectedTargetUser.full_name}</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmationName}
                onChange={(e) => setConfirmationName(e.target.value)}
                placeholder={selectedTargetUser.full_name}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!isConfirmed || isSubmitting}
            onClick={handleTransfer}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 pressable"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crown className="w-3.5 h-3.5" />
            )}
            <span>Transfer Ownership</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
