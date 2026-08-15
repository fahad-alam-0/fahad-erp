import { create } from 'zustand';
import { UserRole } from '@/constants/roles.constants';
import { AuthState } from '@/types/auth.types';
import { authService } from '@/services/authentication/authService';

interface AuthActions {
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuth: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const sessionResult = await authService.getCurrentSession();

      if (!sessionResult.success || !sessionResult.data) {
        set({
          session: null,
          user: null,
          profile: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        return;
      }

      const session = sessionResult.data;
      const user = session.user;
      const profileResult = await authService.getCurrentProfile(user.id);

      if (!profileResult.success || !profileResult.data) {
        set({
          session,
          user,
          profile: null,
          role: null,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: 'User profile not found.',
        });
        return;
      }

      const profile = profileResult.data;
      set({
        session,
        user,
        profile,
        role: profile.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize authentication.';
      set({
        session: null,
        user: null,
        profile: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: message,
      });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.signIn({ email, password });

      if (!result.success || !result.data) {
        const errorMsg = result.error || 'Invalid email or password.';
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      const { session, user, profile } = result.data;
      set({
        session,
        user,
        profile,
        role: profile.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    await authService.signOut();
    get().clearAuth();
  },

  logout: async () => {
    await get().signOut();
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const result = await authService.getCurrentProfile(user.id);
    if (result.success && result.data) {
      set({
        profile: result.data,
        role: result.data.role as UserRole,
      });
    }
  },

  clearAuth: () => {
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  },

  setError: (error) => set({ error }),
}));
