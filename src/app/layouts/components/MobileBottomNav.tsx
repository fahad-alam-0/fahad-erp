import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Wrench, Package, User } from 'lucide-react';
import { ROUTES } from '@/constants/routes.constants';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/constants/roles.constants';

export const MobileBottomNav: React.FC = () => {
  const { role, profile } = useAuthStore();
  const currentRole = role || profile?.role || UserRole.STAFF;

  const getMobileNavItems = () => {
    switch (currentRole) {
      case UserRole.TECHNICIAN:
        return [
          { label: 'Home', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
          { label: 'POS', path: ROUTES.SALES, icon: ShoppingCart },
          { label: 'My Repairs', path: ROUTES.REPAIRS.ROOT, icon: Wrench },
          { label: 'Stock', path: ROUTES.INVENTORY.ROOT, icon: Package },
          { label: 'Profile', path: ROUTES.PROFILE, icon: User },
        ];
      case UserRole.OWNER:
      case UserRole.STAFF:
      default:
        return [
          { label: 'Home', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
          { label: 'POS', path: ROUTES.SALES, icon: ShoppingCart },
          { label: 'Repairs', path: ROUTES.REPAIRS.ROOT, icon: Wrench },
          { label: 'Stock', path: ROUTES.INVENTORY.ROOT, icon: Package },
          { label: 'Profile', path: ROUTES.PROFILE, icon: User },
        ];
    }
  };

  const mobileNavItems = getMobileNavItems();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-20 px-2 shadow-lg">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5 mb-0.5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
