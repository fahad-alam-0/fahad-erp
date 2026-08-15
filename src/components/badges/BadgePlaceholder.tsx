import React from 'react';
import { Badge } from '@/components/ui/badge';

export const BadgePlaceholder: React.FC<{ label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }> = ({
  label,
  variant = 'default',
}) => {
  return <Badge variant={variant}>{label}</Badge>;
};
