import React, { useState, useEffect } from 'react';
import { UserProfileData } from '../types/settings.types';
import { settingsService } from '../services/settingsService';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  targetUser: UserProfileData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSuccess,
}) => {
  const [confirmationName, setConfirmationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmationName('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const isConfirmed = confirmationName.trim() === targetUser.full_name.trim();

  const handleDelete = async () => {
    if (!isConfirmed) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await settingsService.deleteUserPermanently(targetUser.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to permanently delete user:', err);
      setError(err.message || 'Failed to delete user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-destructive/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-destructive font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>PERMANENTLY DELETE USER</span>
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
          <div>
            <p className="text-foreground font-semibold">You are about to permanently delete:</p>
            <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border font-mono">
              <p className="font-bold text-foreground text-sm">{targetUser.full_name}</p>
              <p className="text-[11px] text-muted-foreground">Role: {targetUser.role} | Phone: {targetUser.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-muted-foreground bg-destructive/5 p-3 rounded-lg border border-destructive/20">
            <p className="font-bold text-destructive text-[11px] uppercase tracking-wider">This will permanently wipe:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>User account & authentication access</li>
              <li>Complete repair history & assigned repair jobs</li>
              <li>Repair status audit trail</li>
              <li>Technician earnings & profit-share records</li>
              <li>Related repair payments & repair parts</li>
              <li>Worker performance metrics & analytics</li>
            </ul>
          </div>

          <p className="font-bold text-destructive text-[11px] tracking-wide uppercase">
            THIS ACTION CANNOT BE UNDONE.
          </p>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Type the user's exact name <strong className="text-destructive font-mono">{targetUser.full_name}</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder={targetUser.full_name}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive font-mono"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isConfirmed || isSubmitting}
            onClick={handleDelete}
            className="flex items-center space-x-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Permanently Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
