import React, { useState, useEffect } from 'react';
import { CreateRepairJobInput } from '../types/repair.types';
import { repairService } from '../services/repairService';
import { customerService } from '@/features/customer-management/services/customerService';
import { Customer } from '@/features/customer-management/types/customer.types';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { Category, Brand } from '@/features/inventory-management/types/inventory.types';
import { UserProfile } from '@/types/user.types';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/SearchableCombobox';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceType, setDeviceType] = useState(''); // Initial value EMPTY (NOT Mobile!)
  const [deviceBrand, setDeviceBrand] = useState(''); // Initial value EMPTY
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
          const [cList, catList, bList, tList] = await Promise.all([
            customerService.getCustomers(),
            inventoryService.getCategories(),
            inventoryService.getBrands(),
            repairService.getTechnicians(),
          ]);
          setCustomers(cList);
          setCategories(catList);
          setBrands(bList);
          setTechnicians(tList);
        } catch (err) {
          console.error('Failed to load initial data for repair intake modal:', err);
        }
      };
      loadInitialData();

      setCustomerId('');
      setCustomerPhone('');
      setDeviceType('');
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

  // Handle existing customer selection
  const handleSelectCustomer = (selectedId: string) => {
    setCustomerId(selectedId);
    if (!selectedId) {
      setCustomerPhone('');
      return;
    }
    const found = customers.find((c) => c.id === selectedId);
    if (found && found.phone && found.phone !== 'N/A') {
      setCustomerPhone(found.phone);
    }
  };

  // Inline Customer Creation with Phone Number & Duplicate Prevention
  const handleCreateCustomer = async (fullName: string) => {
    const createdOrExisting = await customerService.findOrCreateCustomer({
      full_name: fullName,
      phone: customerPhone || 'N/A',
    });

    setCustomers((prev) => {
      if (prev.some((c) => c.id === createdOrExisting.id)) return prev;
      return [createdOrExisting, ...prev];
    });

    setCustomerId(createdOrExisting.id);
    if (createdOrExisting.phone && createdOrExisting.phone !== 'N/A') {
      setCustomerPhone(createdOrExisting.phone);
    }

    return { id: createdOrExisting.id, name: createdOrExisting.full_name };
  };

  // Inline Device Type (Category) Creation
  const handleCreateCategory = async (typeName: string) => {
    const cat = await inventoryService.createCategory(typeName);
    setCategories((prev) => {
      if (prev.some((c) => c.id === cat.id)) return prev;
      return [...prev, cat];
    });
    setDeviceType(cat.name);
    return { id: cat.name, name: cat.name };
  };

  // Inline Device Brand Creation
  const handleCreateBrand = async (brandName: string) => {
    const b = await inventoryService.createBrand(brandName);
    setBrands((prev) => {
      if (prev.some((item) => item.id === b.id)) return prev;
      return [...prev, b];
    });
    setDeviceBrand(b.name);
    return { id: b.name, name: b.name };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let activeCustId = customerId;

    if (!activeCustId) {
      setFormError('Please select or create a customer for this repair ticket.');
      return;
    }

    if (!customerPhone.trim()) {
      setFormError('Customer phone number is required.');
      return;
    }

    if (!deviceType.trim()) {
      setFormError('Please select or create a Device Type (e.g. LED TV, Master Remote).');
      return;
    }

    if (!deviceBrand.trim()) {
      setFormError('Please select or create a Device Brand (e.g. Samsung, LG, Sony).');
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

    try {
      setIsSubmitting(true);

      // Ensure customer phone number is updated if modified
      const currentCust = customers.find((c) => c.id === activeCustId);
      if (currentCust && customerPhone.trim() && currentCust.phone !== customerPhone.trim()) {
        await customerService.updateCustomer(activeCustId, { phone: customerPhone.trim() });
      }

      const payload: CreateRepairJobInput = {
        customer_id: activeCustId,
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

      await repairService.createRepairJob(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create repair job ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    id: c.id,
    name: c.full_name,
    subtitle: c.phone ? `Ph: ${c.phone}` : undefined,
  }));

  const categoryOptions: ComboboxOption[] = categories.map((cat) => ({
    id: cat.name,
    name: cat.name,
  }));

  const brandOptions: ComboboxOption[] = brands.map((b) => ({
    id: b.name,
    name: b.name,
  }));

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    id: t.id,
    name: t.full_name,
    subtitle: `Role: ${t.role}`,
  }));

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

          {/* Customer Selection & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Customer Name</span>
                <span className="text-destructive">*</span>
              </label>
              <SearchableCombobox
                options={customerOptions}
                value={customerId}
                onChange={handleSelectCustomer}
                placeholder="Select or create customer..."
                searchPlaceholder="Search customer by name or phone..."
                onCreateNew={handleCreateCustomer}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Customer Phone Number</span>
                <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Smart Master-Data Comboboxes for Device Type & Device Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Device Type</span>
                <span className="text-destructive">*</span>
              </label>
              <SearchableCombobox
                options={categoryOptions}
                value={deviceType}
                onChange={setDeviceType}
                placeholder="Select or create device type..."
                searchPlaceholder="Search or create device type (e.g. LED TV, Remote)..."
                onCreateNew={handleCreateCategory}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Device Brand</span>
                <span className="text-destructive">*</span>
              </label>
              <SearchableCombobox
                options={brandOptions}
                value={deviceBrand}
                onChange={setDeviceBrand}
                placeholder="Select or create brand..."
                searchPlaceholder="Search or create brand (e.g. Samsung, LG, Sony)..."
                onCreateNew={handleCreateBrand}
                required
              />
            </div>
          </div>

          {/* Model & Serial Number (Free-Text Fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Model Name / No. (Free-text)</label>
              <input
                type="text"
                placeholder="e.g. LG 43UR7500, Samsung UA55AUE60"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Serial / IMEI Number (Optional)</label>
              <input
                type="text"
                placeholder="Optional serial or IMEI number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Reported Problem (Free-Text Area) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Reported Problem / Issue</span>
              <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. No display, vertical lines on panel, power standby red light blinking..."
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
              placeholder="e.g. Includes original remote, back cover minor scratches"
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

          {/* Technician Assignment (Owner Only) Combobox */}
          {isOwner && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-semibold text-foreground">
                Assign Repair Technician (Owner Only)
              </label>
              <SearchableCombobox
                options={technicianOptions}
                value={technicianId}
                onChange={setTechnicianId}
                placeholder="Unassigned (Shared Repair Queue)..."
                searchPlaceholder="Search technician by name..."
                allowClear
                clearLabel="Unassigned (Shared Repair Queue)"
              />
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
