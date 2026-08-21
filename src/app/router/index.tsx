import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';
import { UserRole } from '@/constants/roles.constants';
import { ROUTES } from '@/constants/routes.constants';

// Pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { UnauthorizedPage } from '@/features/auth/pages/UnauthorizedPage';
import { AccountDisabledPage } from '@/features/auth/pages/AccountDisabledPage';
import { NotFoundPage } from '@/features/auth/pages/NotFoundPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { CustomersPage } from '@/features/customer-management/pages/CustomersPage';

import { InventoryPage } from '@/features/inventory-management/pages/InventoryPage';
import { StockPage } from '@/features/inventory-management/stock/pages/StockPage';
import { CategoriesPage } from '@/features/inventory-management/categories/pages/CategoriesPage';
import { BrandsPage } from '@/features/inventory-management/brands/pages/BrandsPage';
import { SuppliersPage } from '@/features/inventory-management/suppliers/pages/SuppliersPage';

import { SalesPage } from '@/features/sales-management/pages/SalesPage';

import { RepairsPage } from '@/features/repair-management/pages/RepairsPage';
import { JobCardsPage } from '@/features/repair-management/job-cards/pages/JobCardsPage';
import { ServiceHistoryPage } from '@/features/repair-management/service-history/pages/ServiceHistoryPage';
import { RepairStatusPage } from '@/features/repair-management/repair-status/pages/RepairStatusPage';
import { WarrantyPage } from '@/features/repair-management/warranty/pages/WarrantyPage';
import { SparePartsPage } from '@/features/repair-management/spare-parts-used/pages/SparePartsPage';

import { TechniciansPage } from '@/features/technician-management/pages/TechniciansPage';
import { ExpensesPage } from '@/features/expense-management/pages/ExpensesPage';
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { BackupPage } from '@/features/backup/pages/BackupPage';
import { ActivityLogPage } from '@/features/activity-log/pages/ActivityLogPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.AUTH.LOGIN, element: <LoginPage /> },
          { path: ROUTES.AUTH.RESET_PASSWORD, element: <ResetPasswordPage /> },
          { path: ROUTES.AUTH.UNAUTHORIZED, element: <UnauthorizedPage /> },
          { path: ROUTES.AUTH.ACCOUNT_DISABLED, element: <AccountDisabledPage /> },
        ],
      },
      {
        element: <AuthGuard />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
              { path: ROUTES.CUSTOMERS, element: <CustomersPage /> },

              // Inventory Sub-routes
              { path: ROUTES.INVENTORY.ROOT, element: <InventoryPage /> },
              { path: ROUTES.INVENTORY.PRODUCTS, element: <InventoryPage /> },
              { path: ROUTES.INVENTORY.STOCK, element: <StockPage /> },
              { path: ROUTES.INVENTORY.CATEGORIES, element: <CategoriesPage /> },
              { path: ROUTES.INVENTORY.BRANDS, element: <BrandsPage /> },
              { path: ROUTES.INVENTORY.SUPPLIERS, element: <SuppliersPage /> },

              { path: ROUTES.SALES, element: <SalesPage /> },

              // Repair Sub-routes
              { path: ROUTES.REPAIRS.ROOT, element: <RepairsPage /> },
              { path: ROUTES.REPAIRS.JOB_CARDS, element: <JobCardsPage /> },
              { path: ROUTES.REPAIRS.SERVICE_HISTORY, element: <ServiceHistoryPage /> },
              { path: ROUTES.REPAIRS.REPAIR_STATUS, element: <RepairStatusPage /> },
              { path: ROUTES.REPAIRS.WARRANTY, element: <WarrantyPage /> },
              { path: ROUTES.REPAIRS.SPARE_PARTS, element: <SparePartsPage /> },

              { path: ROUTES.TECHNICIANS, element: <TechniciansPage /> },
              { path: ROUTES.EXPENSES, element: <ExpensesPage /> },
              { path: ROUTES.PAYMENTS, element: <PaymentsPage /> },
              { path: ROUTES.REPORTS, element: <ReportsPage /> },
              { path: ROUTES.ANALYTICS, element: <AnalyticsPage /> },
              { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
              { path: ROUTES.SETTINGS, element: <SettingsPage /> },
              { path: ROUTES.PROFILE, element: <ProfilePage /> },

              // Owner restricted area
              {
                element: <RoleGuard allowedRoles={[UserRole.OWNER]} />,
                children: [
                  { path: ROUTES.BACKUP, element: <BackupPage /> },
                  { path: ROUTES.ACTIVITY_LOG, element: <ActivityLogPage /> },
                ],
              },

              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
