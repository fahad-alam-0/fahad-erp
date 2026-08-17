import { supabase } from '@/lib/supabase';
import { UserProfileData, UpdateProfileInput } from '../types/settings.types';
import { UserRole } from '@/constants/roles.constants';

export const settingsService = {
  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UserProfileData[]> {
    let req = supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (params?.role && params.role !== 'ALL') {
      req = req.eq('role', params.role);
    }

    if (params?.status && params.status !== 'ALL') {
      const isActive = params.status === 'ACTIVE';
      req = req.eq('is_active', isActive);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      req = req.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching profiles list:', error);
      throw new Error(error.message || 'Failed to fetch user profiles list.');
    }

    return data || [];
  },

  async updateMyProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileData> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: input.full_name?.trim(),
        phone: input.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update profile details.');
    }

    return data;
  },

  async setUserRole(targetUserId: string, newRole: UserRole): Promise<void> {
    // Try schema('private') first, fallback to public rpc
    let res = await supabase.schema('private').rpc('set_user_role', {
      target_user_id: targetUserId,
      new_role: newRole,
    });

    if (res.error && res.error.message?.includes('schema cache')) {
      res = await supabase.rpc('set_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
      });
    }

    if (res.error) {
      console.error('Error executing set_user_role RPC:', res.error);
      throw new Error(res.error.message || 'Failed to modify user role.');
    }
  },

  async deleteUserPermanently(targetUserId: string): Promise<void> {
    // Try schema('private') first, fallback to public rpc
    let res = await supabase.schema('private').rpc('delete_user_permanently', {
      p_target_user_id: targetUserId,
    });

    if (res.error && res.error.message?.includes('schema cache')) {
      res = await supabase.rpc('delete_user_permanently', {
        p_target_user_id: targetUserId,
      });
    }

    if (res.error) {
      console.error('Error executing delete_user_permanently RPC:', res.error);
      throw new Error(res.error.message || 'Failed to permanently delete user.');
    }
  },

  async transferPrimaryOwnership(newOwnerId: string): Promise<void> {
    // Try schema('private') first, fallback to public rpc
    let res = await supabase.schema('private').rpc('transfer_primary_ownership', {
      p_new_owner_id: newOwnerId,
    });

    if (res.error && res.error.message?.includes('schema cache')) {
      res = await supabase.rpc('transfer_primary_ownership', {
        p_new_owner_id: newOwnerId,
      });
    }

    if (res.error) {
      console.error('Error executing transfer_primary_ownership RPC:', res.error);
      throw new Error(res.error.message || 'Failed to transfer primary ownership.');
    }
  },
};
