import { supabase } from '@/lib/supabase';
import { ServiceResult } from '@/types/common.types';
import { UserProfile } from '@/types/user.types';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export const authService = {
  async signIn(credentials: { email: string; password: string }): Promise<ServiceResult<{ session: Session; user: User; profile: UserProfile }>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          data: null,
          error: 'Authentication failed. Session not created.',
        };
      }

      const profileResult = await this.getCurrentProfile(data.user.id);
      if (!profileResult.success || !profileResult.data) {
        return {
          success: false,
          data: null,
          error: profileResult.error || 'User profile not found.',
        };
      }

      return {
        success: true,
        data: {
          session: data.session,
          user: data.user,
          profile: profileResult.data,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      return {
        success: false,
        data: null,
        error: message,
      };
    }
  },

  async resetPasswordForEmail(email: string): Promise<ServiceResult<void>> {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      return { success: true, data: undefined };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.';
      return { success: false, data: null, error: message };
    }
  },

  async signOut(): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out.';
      return { success: false, data: null, error: message };
    }
  },

  async getCurrentSession(): Promise<ServiceResult<Session | null>> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { success: false, data: null, error: error.message };
      }
      return { success: true, data: data.session };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve auth session.';
      return { success: false, data: null, error: message };
    }
  },

  async getCurrentUser(): Promise<ServiceResult<User | null>> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return { success: false, data: null, error: error.message };
      }
      return { success: true, data: data.user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve current user.';
      return { success: false, data: null, error: message };
    }
  },

  async getCurrentProfile(userId: string): Promise<ServiceResult<UserProfile | null>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user profile.';
      return { success: false, data: null, error: message };
    }
  },

  subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },
};
