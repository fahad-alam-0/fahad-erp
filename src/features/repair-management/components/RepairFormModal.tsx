import React, { useState, useEffect } from 'react';
import { CreateRepairJobInput } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { customerService } from '@/features/customer-management/services/customerService';
import { Customer } from '@/features/customer-management/types/customer.types';
import { UserProfile } from '@/types/user.types';
import { Button } from '@/components/ui/button';
import { X, Loader2, Wrench, AlertCircle } from 'lucide-react';

interface RepairFormModalProps {
  isOpen: boolean;
  isOwner: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RepairFormModal: React.FC<RepairFormModalProps> = ({
  isOpen,
  isOwner,
  onClose,
  onSuccess,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [deviceType, setDeviceType] = useState('Mobile');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reportedProblem, setReportedProblem] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [technicianId, setTechnicianId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadInitialData = async () => {
        try {
          const [cList, tList] = await Promise.all([
            customerService.getCustomers(),
            repairService.getTechnicians(),
          ]);
          setCustomers(cList);
          setTechnicians(tList);
          if (cList.length > 0) setCustomerId(cList[0].id);
        } catch (err) {
          console.error('Failed to load customers/technicians for repair modal:', err);
        }
      };
      loadInitialData();

      setDeviceType('Mobile');
      setDeviceBrand('');
      setDeviceModel('');
      setSerialNumber('');
      setReportedProblem('');
      setIntakeNotes('');
      setQuotedAmount('');
      setDiscount('0');
      setTechnicianId('');
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError('Please select a customer for this repair ticket.');
      return;
    }
    if (!deviceType.trim()) {
      setFormError('Device type is required.');
      return;
    }
    if (!deviceBrand.trim()) {
      setFormError('Device brand is required.');
      return;
    }
    if (!reportedProblem.trim()) {
      setFormError('Reported problem description is required.');
      return;
    }

    const qNum = quotedAmount.trim() !== '' ? Number(quotedAmount) : undefined;
    const dNum = Number(discount) || 0;

    if (qNum !== undefined && qNum < 0) {
      setFormError('Quoted amount cannot be negative.');
      return;
    }
    if (dNum < 0) {
      setFormError('Discount cannot be negative.');
      return;
    }
    if (qNum !== undefined && dNum > qNum) {
      setFormError(`Discount (₹${dNum}) cannot exceed quoted amount (₹${qNum}).`);
      return;
    }

    const payload: CreateRepairJobInput = {
      customer_id: customerId,
      device_type: deviceType.trim(),
      device_brand: deviceBrand.trim(),
      reported_problem: reportedProblem.trim(),
      device_model: deviceModel.trim() || undefined,
      serial_number: serialNumber.trim() || undefined,
      intake_notes: intakeNotes.trim() || undefined,
      quoted_amount: qNum,
      discount: dNum,
      technician_id: isOwner && technicianId ? technicianId : undefined,
    };

    try {
      setIsSubmitting(true);
      await repairService.createRepairJob(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create repair job card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <span>New Repair Job Ticket Intake</span>
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
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Customer</span>
              <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Device Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Device Type</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Smartphone, Laptop, Tablet, TV"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Device Brand</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apple, Samsung, Dell, Sony"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Model & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Model Name / No.</label>
              <input
                type="text"
                placeholder="e.g. iPhone 14 Pro, Galaxy S23"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Serial / IMEI Number</label>
              <input
                type="text"
                placeholder="Optional IMEI or serial string"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Reported Problem */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Reported Problem / Issue</span>
              <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Cracked screen, battery drain, no power, water damage..."
              value={reportedProblem}
              onChange={(e) => setReportedProblem(e.target.value)}
              className="w-full text-xs p-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Intake Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Device Condition / Intake Notes</label>
            <input
              type="text"
              placeholder="e.g. Scratches on back cover, SIM tray included"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Financial Quote & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Quoted Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 2500"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Discount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Technician Assignment (Owner Only) */}
          {isOwner && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-semibold text-foreground">
                Assign Repair Technician (Owner Only)
              </label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="">Unassigned (Assign Later)</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="pressable">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Create Repair Ticket</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
