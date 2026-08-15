import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Wrench,
  UserCheck,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  User,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes.constants';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/constants/roles.constants';

export const Sidebar: React.FC = () => {
  const { role, profile } = useAuthStore();
  const currentRole = role || profile?.role || UserRole.STAFF;

  const getNavItems = () => {
    switch (currentRole) {
      case UserRole.OWNER:
        return [
          { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
          { label: 'Customers', path: ROUTES.CUSTOMERS, icon: Users },
          { label: 'Inventory', path: ROUTES.INVENTORY.ROOT, icon: Package },
          { label: 'Suppliers', path: ROUTES.INVENTORY.SUPPLIERS, icon: Building2 },
          { label: 'Sales (POS)', path: ROUTES.SALES, icon: ShoppingCart },
          { label: 'Repairs', path: ROUTES.REPAIRS.ROOT, icon: Wrench },
          { label: 'Technicians', path: ROUTES.TECHNICIANS, icon: UserCheck },
          { label: 'Reports', path: ROUTES.REPORTS, icon: BarChart3 },
          { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
        ];
      case UserRole.TECHNICIAN:
        return [
          { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
          { label: 'Customers', path: ROUTES.CUSTOMERS, icon: Users },
          { label: 'Inventory', path: ROUTES.INVENTORY.ROOT, icon: Package },
          { label: 'Sales (POS)', path: ROUTES.SALES, icon: ShoppingCart },
          { label: 'Repairs', path: ROUTES.REPAIRS.ROOT, icon: Wrench },
          { label: 'My Account', path: ROUTES.PROFILE, icon: User },
        ];
      case UserRole.STAFF:
      default:
        return [
          { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
          { label: 'Customers', path: ROUTES.CUSTOMERS, icon: Users },
          { label: 'Inventory', path: ROUTES.INVENTORY.ROOT, icon: Package },
          { label: 'Suppliers', path: ROUTES.INVENTORY.SUPPLIERS, icon: Building2 },
          { label: 'Sales (POS)', path: ROUTES.SALES, icon: ShoppingCart },
          { label: 'Repairs', path: ROUTES.REPAIRS.ROOT, icon: Wrench },
          { label: 'My Account', path: ROUTES.PROFILE, icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border space-x-3">
        <div className="p-2 bg-primary text-primary-foreground rounded-lg">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-base tracking-tight leading-none">Fahad ERP</h2>
          <span className="text-[10px] text-muted-foreground font-mono">Retail & Repair</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
