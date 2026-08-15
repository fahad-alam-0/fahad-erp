import React, { useState, useEffect, useCallback } from 'react';
import { UserProfileData } from '../types/settings.types';
import { settingsService } from '../services/settingsService';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { ChangeRoleModal } from './ChangeRoleModal';
import { Button } from '@/components/ui/button';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import { Search, X, RefreshCw, AlertCircle, ShieldCheck, User } from 'lucide-react';

export const UserManagementTable: React.FC = () => {
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfileData | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsService.getUsers({
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load user profiles:', err);
      setError(err.message || 'Failed to load user profiles.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleChangeRoleClick = (u: UserProfileData) => {
    setSelectedUserForRoleChange(u);
    setIsRoleModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Toolbar */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search users by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-muted-foreground">
            <span className="font-mono font-medium">{users.length} Registered Accounts</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadUsers}
              disabled={isLoading}
              className="h-8 px-2.5 text-xs pressable"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            Filter Role:
          </span>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">OWNER</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
            <option value="STAFF">STAFF</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Users Table Body */}
      {error ? (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={loadUsers}>
            Retry Loading Users
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
          <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
          <User className="w-8 h-8 text-muted-foreground/40" />
          <h3 className="text-sm font-bold text-foreground">No matching user accounts found</h3>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search criteria or role filters.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="p-3">User Profile</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{u.full_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{u.phone || 'N/A'}</td>
                    <td className="p-3">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangeRoleClick(u)}
                        className="h-8 px-2.5 text-xs pressable"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                        <span>Change Role</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View (<768px) */}
          <div className="md:hidden divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{u.full_name}</h4>
                    <p className="text-[11px] font-mono text-muted-foreground">{u.phone || 'No Phone'}</p>
                  </div>
                  <StatusBadge status={u.role} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeRoleClick(u)}
                    className="h-8 text-xs pressable"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                    <span>Change Role</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Modification Modal */}
      <ChangeRoleModal
        isOpen={isRoleModalOpen}
        targetUser={selectedUserForRoleChange}
        onClose={() => setIsRoleModalOpen(false)}
        onSuccess={loadUsers}
      />
    </div>
  );
};
