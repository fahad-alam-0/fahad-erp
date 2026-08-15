import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/constants/roles.constants';
import { ROUTES } from '@/constants/routes.constants';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { role, profile } = useAuthStore();
  const activeRole = role || profile?.role;

  if (!activeRole || !allowedRoles.includes(activeRole as UserRole)) {
    return <Navigate to={ROUTES.AUTH.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};
