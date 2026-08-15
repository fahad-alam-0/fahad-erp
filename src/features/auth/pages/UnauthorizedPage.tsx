import React from 'react';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes.constants';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Header title="403 - Access Denied" subtitle="You do not have permission to view this module." />
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Your current role does not grant permission to access this domain area. Contact your system owner if you require elevation.
      </p>
      <Button onClick={() => navigate(ROUTES.DASHBOARD)}>Back to Safety (Dashboard)</Button>
    </div>
  );
};
