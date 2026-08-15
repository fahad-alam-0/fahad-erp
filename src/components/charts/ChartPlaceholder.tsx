import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const ChartPlaceholder: React.FC<{ title: string }> = ({ title }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 rounded-md bg-muted/40 border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
          Recharts Visual Analytics Placeholder ({title})
        </div>
      </CardContent>
    </Card>
  );
};
