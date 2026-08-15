import React from 'react';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonPlaceholder className="h-7 w-64" />
        <SkeletonPlaceholder className="h-4 w-96" />
      </div>

      {/* Quick Actions skeleton */}
      <SkeletonPlaceholder className="h-20 w-full" />

      {/* KPI Cards Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonPlaceholder className="h-28 w-full" />
        <SkeletonPlaceholder className="h-28 w-full" />
        <SkeletonPlaceholder className="h-28 w-full" />
        <SkeletonPlaceholder className="h-28 w-full" />
      </div>

      {/* Main Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonPlaceholder className="h-72 w-full" />
        <SkeletonPlaceholder className="h-72 w-full" />
      </div>
    </div>
  );
};
