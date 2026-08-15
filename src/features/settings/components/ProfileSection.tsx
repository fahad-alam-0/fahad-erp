import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { settingsService } from '../services/settingsService';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, ShieldCheck, CheckCircle2, Loader2, Edit2, AlertCircle } from 'lucide-react';

export const ProfileSection: React.FC = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEditClick = () => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (!profile?.id) return;

    try {
      setIsSubmitting(true);
      await settingsService.updateMyProfile(profile.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });

      // Refresh Zustand store profile
      await refreshProfile();
      setSuccessMsg('Account profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl font-mono shadow-2xs shrink-0">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                <span>{profile?.full_name || 'Authenticated User'}</span>
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{user?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={profile?.role || 'STAFF'} />
            <StatusBadge status={profile?.is_active ? 'ACTIVE' : 'INACTIVE'} />
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className="h-8 text-xs pressable flex items-center gap-1.5 ml-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-primary" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Details / Form */}
        {isEditing ? (
          <form onSubmit={handleSaveSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Full Name</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
              <p>
                <strong>Role & Account Status:</strong> Protected security parameters ({profile?.role}) can only be modified by a store Owner.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Full Name
              </span>
              <p className="font-bold text-foreground">{profile?.full_name || 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
              </span>
              <p className="font-mono font-bold text-foreground">{user?.email || 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Contact Phone
              </span>
              <p className="font-mono font-bold text-foreground">{profile?.phone || 'Not Provided'}</p>
            </div>

            <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Assigned System Role
              </span>
              <p className="font-bold text-primary uppercase">{profile?.role || 'STAFF'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
