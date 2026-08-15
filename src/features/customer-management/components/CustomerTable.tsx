import React from 'react';
import { Customer } from '../types/customer.types';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, Eye, Edit, FileText } from 'lucide-react';

interface CustomerTableProps {
  customers: Customer[];
  onViewDetails: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onViewDetails,
  onEdit,
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Primary Phone</th>
              <th className="p-3">Alternate Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Registered</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((cust) => (
              <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                      {getInitials(cust.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{cust.full_name}</p>
                      {cust.notes && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5 shrink-0" />
                          <span>{cust.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 font-mono font-medium text-foreground">{cust.phone}</td>
                <td className="p-3 font-mono text-muted-foreground">
                  {cust.alternate_phone || '—'}
                </td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                  {cust.address || 'N/A'}
                </td>
                <td className="p-3 text-muted-foreground font-mono text-[11px]">
                  {new Date(cust.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(cust)}
                      className="h-8 px-2.5 text-xs pressable"
                      title="View Customer Details & History"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>History</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(cust)}
                      className="h-8 px-2 text-xs pressable"
                      title="Edit Customer Details"
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
        {customers.map((cust) => (
          <div key={cust.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                  {getInitials(cust.full_name)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{cust.full_name}</h4>
                  <p className="text-xs font-mono text-primary font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{cust.phone}</span>
                  </p>
                </div>
              </div>
            </div>

            {(cust.address || cust.alternate_phone) && (
              <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border">
                {cust.alternate_phone && (
                  <p className="text-muted-foreground flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                    <span>Alt: {cust.alternate_phone}</span>
                  </p>
                )}
                {cust.address && (
                  <p className="text-muted-foreground flex items-start gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70 mt-0.5" />
                    <span className="line-clamp-2">{cust.address}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                Reg: {new Date(cust.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(cust)}
                  className="h-8 text-xs pressable"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  <span>History</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(cust)}
                  className="h-8 text-xs pressable"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  <span>Edit</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
