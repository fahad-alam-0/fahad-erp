import React from 'react';
import { Header } from '@/components/common/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header title="System & Store Settings" subtitle="Configure branch information, receipt printing, tax settings, and PWA options." />
      <Card>
        <CardHeader>
          <CardTitle>General Store Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Store Name</label>
            <input defaultValue="Fahad Electronics & Repair Center" className="w-full h-10 px-3 border border-input rounded-md bg-background mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tax / VAT Percentage (%)</label>
            <input defaultValue="5.0" className="w-full h-10 px-3 border border-input rounded-md bg-background mt-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
