export type ActivityEventType =
  | 'SALE_CREATED'
  | 'SALE_UPDATED'
  | 'SALE_CANCELLED'
  | 'INVENTORY_ADJUSTED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'REPAIR_CREATED'
  | 'REPAIR_UPDATED'
  | 'REPAIR_COMPLETED'
  | 'SPARE_PART_ADDED_TO_REPAIR'
  | 'TECHNICIAN_ASSIGNMENT_CHANGED'
  | 'FINANCIAL_INFO_CHANGED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'PAYMENT_RECORDED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SETTINGS_CHANGED';

export interface ActivityLogEntry {
  id: string;
  eventType: ActivityEventType;
  userId: string;
  userName: string;
  userRole: string;
  storeId?: string;
  entityId?: string;
  entityType?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}
