import React from 'react';

export type StatusVariant =
  // Repair statuses
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'WAITING_FOR_PARTS'
  | 'IN_REPAIR'
  | 'TESTING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED'
  // Payment statuses
  | 'PAID'
  | 'UNPAID'
  | 'PARTIAL'
  // Stock statuses
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st.toUpperCase()) {
      case 'READY_FOR_PICKUP':
      case 'DELIVERED':
      case 'PAID':
      case 'IN_STOCK':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'DIAGNOSING':
      case 'IN_REPAIR':
      case 'TESTING':
      case 'RECEIVED':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'WAITING_FOR_PARTS':
      case 'LOW_STOCK':
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'CANCELLED':
      case 'UNPAID':
      case 'OUT_OF_STOCK':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formattedLabel = label || status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase shadow-2xs ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {formattedLabel}
    </span>
  );
};
