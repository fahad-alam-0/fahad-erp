import React, { useState, useEffect } from 'react';
import { Supplier, CreateSupplierInput } from '../types/purchasing.types';
import { Button } from '@/components/ui/button';
import { X, Loader2, Building2, Phone, MapPin, FileText } from 'lucide-react';

interface SupplierFormModalProps {
  isOpen: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
  onSave: (data: CreateSupplierInput) => Promise<void>;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setPhone(supplier.phone || '');
      setAlternatePhone(supplier.alternate_phone || '');
      setAddress(supplier.address || '');
      setNotes(supplier.notes || '');
      setIsActive(supplier.is_active ?? true);
    } else {
      setName('');
      setPhone('');
      setAlternatePhone('');
      setAddress('');
      setNotes('');
      setIsActive(true);
    }
    setFormError(null);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Supplier Company Name is required.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        alternate_phone: alternatePhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = Boolean(supplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>{isEditing ? 'Edit Supplier Information' : 'Register New Supplier'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {formError && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
              {formError}
            </div>
          )}

          {/* Supplier Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Supplier / Company Name</span>
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. National Electronics Distributors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Primary Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Alternate Phone (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <input
                type="tel"
                placeholder="e.g. 9123456789"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Warehouse / Business Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. Electronics Market Hub, Sector 4"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Internal Notes / Terms</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="e.g. 7-day payment window, TV panel specialist"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <label className="flex items-center space-x-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input text-primary focus:ring-ring"
              />
              <span>Active Supplier</span>
            </label>

            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="pressable">
                {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <span>{isEditing ? 'Save Changes' : 'Register Supplier'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
