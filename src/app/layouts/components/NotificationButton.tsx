import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes.constants';

export const NotificationButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate(ROUTES.NOTIFICATIONS)}
      title="View System Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-ping" />
      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
    </Button>
  );
};
