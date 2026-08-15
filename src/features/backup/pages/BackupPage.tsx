import React from 'react';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const BackupPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Header
        title="Database Backup & Cloud Sync"
        subtitle="Manage automated database backups and export local offline snapshots."
        action={
          <Button>
            <Download className="h-4 w-4 mr-2" /> Download Backup (JSON)
          </Button>
        }
      />
      <div className="p-6 border border-border bg-card rounded-lg text-sm">
        <h4 className="font-bold text-base mb-2">Cloud Backup Status</h4>
        <p className="text-muted-foreground">Automated database snapshot active. Last synced 2 hours ago.</p>
      </div>
    </div>
  );
};
