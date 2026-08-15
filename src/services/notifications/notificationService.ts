import { ServiceResult } from '@/types/common.types';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async fetchNotifications(): Promise<ServiceResult<SystemNotification[]>> {
    return {
      success: true,
      data: [
        {
          id: 'notif_1',
          title: 'Low Stock Alert',
          message: 'iPhone 13 OLED Screens running low (2 units remaining).',
          type: 'warning',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notif_2',
          title: 'New Job Card Assigned',
          message: 'Job Ticket #JC-1049 assigned to Technician Ali.',
          type: 'info',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  },
  async markAsRead(_id: string): Promise<ServiceResult<void>> {
    return { success: true, data: null };
  },
};
