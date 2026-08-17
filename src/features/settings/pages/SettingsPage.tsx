import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { ProfileSection } from '../components/ProfileSection';
import { UserManagementTable } from '../components/UserManagementTable';
import { ApplicationSettingsSection } from '../components/ApplicationSettingsSection';
import { SecuritySection } from '../components/SecuritySection';
import { SystemInfoSection } from '../components/SystemInfoSection';
import { PageHeader } from '@/components/common/PageHeader';
import { User, Users, Sliders, ShieldCheck, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'STAFF';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<string>('profile');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="System Settings & Administration"
        subtitle="Manage personal profiles, administrative user roles, theme preferences, and session security."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4 text-primary" />
          <span>My Profile</span>
        </button>

        {isOwnerOrAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Users & Roles</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('app')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'app'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4 text-sky-500" />
          <span>Application Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Security & Session</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'info'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="w-4 h-4 text-amber-500" />
          <span>System Information</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'profile' && <ProfileSection />}
      {activeTab === 'users' && isOwnerOrAdmin && <UserManagementTable />}
      {activeTab === 'app' && <ApplicationSettingsSection />}
      {activeTab === 'security' && <SecuritySection />}
      {activeTab === 'info' && <SystemInfoSection />}
    </div>
  );
};
