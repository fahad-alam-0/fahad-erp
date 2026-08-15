import React from 'react';
import { Supplier } from '../types/purchasing.types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { Eye, Edit, ShoppingCart, Building2, Phone, MapPin, FileText } from 'lucide-react';

interface SupplierTableProps {
  suppliers: Supplier[];
  onViewDetails: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onNewPurchase: (supplier: Supplier) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  onViewDetails,
  onEdit,
  onNewPurchase,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Supplier Company</th>
              <th className="p-3">Primary Phone</th>
              <th className="p-3">Alternate Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((sup) => (
              <tr key={sup.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{sup.name}</p>
                      {sup.notes && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5 shrink-0" />
                          <span>{sup.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 font-mono font-medium text-foreground">{sup.phone || '—'}</td>
                <td className="p-3 font-mono text-muted-foreground">{sup.alternate_phone || '—'}</td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                  {sup.address || 'N/A'}
                </td>
                <td className="p-3">
                  <StatusBadge status={sup.is_active ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(sup)}
                      className="h-8 px-2.5 text-xs pressable"
                      title="View Supplier History"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>History</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNewPurchase(sup)}
                      className="h-8 px-2.5 text-xs pressable"
                      title="Create Purchase Order"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1 text-primary" />
                      <span>Order</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(sup)}
                      className="h-8 px-2 text-xs pressable"
                      title="Edit Supplier"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="md:hidden divide-y divide-border">
        {suppliers.map((sup) => (
          <div key={sup.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{sup.name}</h4>
                  {sup.phone && (
                    <p className="text-xs font-mono text-primary font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{sup.phone}</span>
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={sup.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>

            {(sup.address || sup.alternate_phone) && (
              <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border">
                {sup.alternate_phone && (
                  <p className="text-muted-foreground flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                    <span>Alt: {sup.alternate_phone}</span>
                  </p>
                )}
                {sup.address && (
                  <p className="text-muted-foreground flex items-start gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70 mt-0.5" />
                    <span className="line-clamp-2">{sup.address}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(sup)}
                className="h-8 text-xs pressable"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>History</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNewPurchase(sup)}
                className="h-8 text-xs pressable"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1 text-primary" />
                <span>Order</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(sup)}
                className="h-8 text-xs pressable"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                <span>Edit</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
