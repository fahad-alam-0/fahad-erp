import React, { useState, useEffect } from 'react';
import { UserProfileData } from '../types/settings.types';
import { settingsService } from '../services/settingsService';
import { UserRole } from '@/constants/roles.constants';
import { Button } from '@/components/ui/button';
import { X, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';

interface ChangeRoleModalProps {
  isOpen: boolean;
  targetUser: UserProfileData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STAFF);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetUser) {
      setSelectedRole(targetUser.role === UserRole.OWNER ? UserRole.ADMIN : targetUser.role);
      setErrorMsg(null);
    }
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser) return null;

  if (targetUser.role === UserRole.OWNER) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <div className="bg-card border border-amber-500/40 rounded-xl shadow-lg w-full max-w-md p-5 space-y-4 text-xs">
          <div className="flex items-center space-x-2 text-amber-500 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>PRIMARY OWNER ROLE PROTECTED</span>
          </div>
          <p className="text-muted-foreground">
            The Primary OWNER role cannot be changed directly using simple role modification.
          </p>
          <p className="font-semibold text-foreground">
            Primary ownership must be transferred to another user using the "Transfer Ownership" button.
          </p>
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedRole === targetUser.role) {
      setErrorMsg(`User is already assigned to role "${selectedRole}".`);
      return;
    }

    try {
      setIsSubmitting(true);
      await settingsService.setUserRole(targetUser.id, selectedRole);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to modify user role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Modify User System Role</span>
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

          <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
            <p className="font-bold text-foreground">Target User: {targetUser.full_name}</p>
            <p className="text-[11px] text-muted-foreground">
              Current Role: <strong className="text-primary font-mono uppercase">{targetUser.role}</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select New Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value={UserRole.ADMIN}>ADMIN (Full ERP Operational Access & Reports)</option>
              <option value={UserRole.STAFF}>STAFF (POS Terminal & Intake Operations)</option>
              <option value={UserRole.TECHNICIAN}>TECHNICIAN (Repair Workbench & Diagnostic Tasks)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 space-y-1">
            <p className="font-semibold">Role Authority Notice:</p>
            <p>
              Modifying a user's role reconfigures system access boundaries across POS, Repairs, Inventory, and Reports modules.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Confirm Role Change</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
