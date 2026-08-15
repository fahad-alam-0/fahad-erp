import React from 'react';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes.constants';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Header title="404 - Page Not Found" subtitle="The requested route does not exist." />
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        The link you followed may be broken or the page may have been moved.
      </p>
      <Button onClick={() => navigate(ROUTES.DASHBOARD)}>Return to Dashboard</Button>
    </div>
  );
};
