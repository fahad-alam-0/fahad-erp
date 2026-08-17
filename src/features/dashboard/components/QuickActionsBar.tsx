import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/constants/roles.constants';
import { ROUTES } from '@/constants/routes.constants';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Wrench,
  PackagePlus,
  UserPlus,
  Building2,
  Package,
  User,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface QuickActionsBarProps {
  role: UserRole;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ role }) => {
  const navigate = useNavigate();

  const getActions = () => {
    switch (role) {
      case UserRole.OWNER:
      case UserRole.ADMIN:
        return [
          { label: 'New Sale (POS)', path: ROUTES.SALES, icon: ShoppingCart, variant: 'default' as const },
          { label: 'New Repair Intake', path: ROUTES.REPAIRS.ROOT, icon: Wrench, variant: 'outline' as const },
          { label: 'Purchase Parts', path: ROUTES.INVENTORY.SUPPLIERS, icon: Building2, variant: 'outline' as const },
          { label: 'Add Product', path: ROUTES.INVENTORY.PRODUCTS, icon: PackagePlus, variant: 'outline' as const },
          { label: 'Add Customer', path: ROUTES.CUSTOMERS, icon: UserPlus, variant: 'outline' as const },
        ];
      case UserRole.STAFF:
        return [
          { label: 'New Sale (POS)', path: ROUTES.SALES, icon: ShoppingCart, variant: 'default' as const },
          { label: 'New Repair Intake', path: ROUTES.REPAIRS.ROOT, icon: Wrench, variant: 'outline' as const },
          { label: 'Purchase Parts', path: ROUTES.INVENTORY.SUPPLIERS, icon: Building2, variant: 'outline' as const },
          { label: 'Add Customer', path: ROUTES.CUSTOMERS, icon: UserPlus, variant: 'outline' as const },
          { label: 'Stock Overview', path: ROUTES.INVENTORY.ROOT, icon: Package, variant: 'outline' as const },
        ];
      case UserRole.TECHNICIAN:
      default:
        return [
          { label: 'My Repair Jobs', path: ROUTES.REPAIRS.ROOT, icon: Wrench, variant: 'default' as const },
          { label: 'Update Job Status', path: ROUTES.REPAIRS.REPAIR_STATUS, icon: Sliders, variant: 'outline' as const },
          { label: 'Spare Parts Used', path: ROUTES.REPAIRS.SPARE_PARTS, icon: Package, variant: 'outline' as const },
          { label: 'My Account Profile', path: ROUTES.PROFILE, icon: User, variant: 'outline' as const },
        ];
    }
  };

  const actions = getActions();

  return (
    <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-xs space-y-3 shadow-2xs">
      <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <Button
              key={idx}
              variant={act.variant}
              size="sm"
              onClick={() => navigate(act.path)}
              className="flex items-center space-x-1.5 text-xs font-medium pressable"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{act.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
