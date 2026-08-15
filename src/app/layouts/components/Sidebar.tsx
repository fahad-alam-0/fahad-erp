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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes.constants';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { UserRole } from '@/constants/roles.constants';

export const Sidebar: React.FC = () => {
  const { role, profile } = useAuthStore();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
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
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-card border-r border-border flex flex-col h-screen sticky top-0 transition-all duration-200 ease-in-out z-20 shadow-xs`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-primary text-primary-foreground rounded-lg shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-200">
              <h2 className="font-bold text-sm tracking-tight leading-none text-foreground">Fahad ERP</h2>
              <span className="text-[10px] text-muted-foreground font-mono">Retail & Repair</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors pressable"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } py-2.5 text-xs font-medium rounded-lg transition-all duration-150 pressable ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'} shrink-0`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
