import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/constants/roles.constants';
import { authService } from '@/services/authentication/authService';

vi.mock('@/services/authentication/authService', () => ({
  authService: {
    getCurrentSession: vi.fn(),
    getCurrentProfile: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('Auth Store & Profile Foundation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  it('1. Initializes unauthenticated state when no session exists', async () => {
    vi.mocked(authService.getCurrentSession).mockResolvedValue({
      success: true,
      data: null,
    });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('2. Initializes authenticated active OWNER profile correctly', async () => {
    const mockSession = { user: { id: 'usr_owner_01' } } as any;
    const mockProfile = {
      id: 'usr_owner_01',
      full_name: 'Owner User',
      phone: '9000000001',
      role: UserRole.OWNER,
      is_active: true,
      created_at: '2026-08-08',
      updated_at: '2026-08-08',
    };

    vi.mocked(authService.getCurrentSession).mockResolvedValue({ success: true, data: mockSession });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ success: true, data: mockProfile });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe(UserRole.OWNER);
    expect(state.profile?.full_name).toBe('Owner User');
    expect(state.profile?.is_active).toBe(true);
  });

  it('3. Initializes authenticated active TECHNICIAN profile correctly', async () => {
    const mockSession = { user: { id: 'usr_tech_01' } } as any;
    const mockProfile = {
      id: 'usr_tech_01',
      full_name: 'Tech User',
      phone: '9000000002',
      role: UserRole.TECHNICIAN,
      is_active: true,
      created_at: '2026-08-08',
      updated_at: '2026-08-08',
    };

    vi.mocked(authService.getCurrentSession).mockResolvedValue({ success: true, data: mockSession });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ success: true, data: mockProfile });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe(UserRole.TECHNICIAN);
  });

  it('4. Initializes authenticated active STAFF profile correctly', async () => {
    const mockSession = { user: { id: 'usr_staff_01' } } as any;
    const mockProfile = {
      id: 'usr_staff_01',
      full_name: 'Staff User',
      phone: '9000000003',
      role: UserRole.STAFF,
      is_active: true,
      created_at: '2026-08-08',
      updated_at: '2026-08-08',
    };

    vi.mocked(authService.getCurrentSession).mockResolvedValue({ success: true, data: mockSession });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ success: true, data: mockProfile });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe(UserRole.STAFF);
  });

  it('5. Detects inactive profile state (is_active = false)', async () => {
    const mockSession = { user: { id: 'usr_inact_01' } } as any;
    const mockProfile = {
      id: 'usr_inact_01',
      full_name: 'Inactive User',
      phone: '9000000004',
      role: UserRole.STAFF,
      is_active: false,
      created_at: '2026-08-08',
      updated_at: '2026-08-08',
    };

    vi.mocked(authService.getCurrentSession).mockResolvedValue({ success: true, data: mockSession });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ success: true, data: mockProfile });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile?.is_active).toBe(false);
  });

  it('6. Handles missing user profile state gracefully', async () => {
    const mockSession = { user: { id: 'usr_noprofile_01' } } as any;

    vi.mocked(authService.getCurrentSession).mockResolvedValue({ success: true, data: mockSession });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ success: false, data: null, error: 'User profile not found.' });

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile).toBeNull();
    expect(state.error).toBe('User profile not found.');
  });

  it('7. Handles sign in failure and error state', async () => {
    vi.mocked(authService.signIn).mockResolvedValue({
      success: false,
      data: null,
      error: 'Invalid login credentials',
    });

    const success = await useAuthStore.getState().signIn('bad@email.com', 'wrongpassword');

    const state = useAuthStore.getState();
    expect(success).toBe(false);
    expect(state.error).toBe('Invalid login credentials');
    expect(state.isAuthenticated).toBe(false);
  });

  it('8. Sign out clears session and resets auth state', async () => {
    useAuthStore.setState({
      session: {} as any,
      user: {} as any,
      profile: { id: 'usr_01', role: UserRole.OWNER } as any,
      role: UserRole.OWNER,
      isAuthenticated: true,
    });

    vi.mocked(authService.signOut).mockResolvedValue({ success: true, data: undefined });

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.role).toBeNull();
  });
});
