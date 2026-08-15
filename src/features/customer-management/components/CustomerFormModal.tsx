import React, { useState, useEffect } from 'react';
import { Customer, CreateCustomerInput } from '../types/customer.types';
import { Button } from '@/components/ui/button';
import { X, Loader2, User, Phone, MapPin, FileText } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onSave: (data: CreateCustomerInput) => Promise<void>;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFullName(customer.full_name || '');
      setPhone(customer.phone || '');
      setAlternatePhone(customer.alternate_phone || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
    } else {
      setFullName('');
      setPhone('');
      setAlternatePhone('');
      setAddress('');
      setNotes('');
    }
    setFormError(null);
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone Number is required.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        full_name: fullName.trim(),
        phone: phone.trim(),
        alternate_phone: alternatePhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = Boolean(customer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>{isEditing ? 'Edit Customer Information' : 'Register New Customer'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {formError && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
              {formError}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Full Name</span>
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Primary Phone Number</span>
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Alternate Phone Number (Optional)
            </label>
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
            <label className="text-xs font-semibold text-muted-foreground">
              Shop / Home Address (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. Main Market, Shop No. 12, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Internal Notes / Details (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="e.g. Preferred contact time, VIP customer notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="pressable">
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
