import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/constants/roles.constants';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types/dashboard.types';

export const useDashboardData = () => {
  const { user, role, isInitialized, isAuthenticated } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!isInitialized || !isAuthenticated || !user || !role) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (role === UserRole.OWNER) {
        const metrics = await dashboardService.getOwnerMetrics();
        setData({ role: UserRole.OWNER, metrics });
      } else if (role === UserRole.TECHNICIAN) {
        const metrics = await dashboardService.getTechnicianMetrics(user.id);
        setData({ role: UserRole.TECHNICIAN, metrics });
      } else {
        const metrics = await dashboardService.getStaffMetrics();
        setData({ role: UserRole.STAFF, metrics });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard metrics.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isAuthenticated, user, role]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading: isLoading || !isInitialized,
    error,
    refetch: fetchMetrics,
    role,
  };
};
