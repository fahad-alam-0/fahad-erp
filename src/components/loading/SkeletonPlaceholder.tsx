import React from 'react';
import { cn } from '@/lib/utils';

export const SkeletonPlaceholder: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
};
