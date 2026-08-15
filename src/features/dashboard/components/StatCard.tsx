import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  variant?: 'default' | 'accent' | 'warning' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading = false,
  variant = 'default',
}) => {
  const getIconStyles = () => {
    switch (variant) {
      case 'accent':
        return 'bg-primary/10 text-primary border border-primary/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <Card className="relative overflow-hidden interactive-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg shrink-0 ${getIconStyles()}`}>
          <Icon className="w-4 h-4 shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonPlaceholder className="h-8 w-24" />
            <SkeletonPlaceholder className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums text-foreground">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
