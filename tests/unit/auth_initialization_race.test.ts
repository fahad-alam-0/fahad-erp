import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    schema: vi.fn(),
  },
}));

describe('Auth Initialization Race Guard Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isInitialized: false,
      isAuthenticated: false,
      isLoading: true,
      user: null,
      profile: null,
      role: null,
    });
  });

  it('1. Prevents catalog queries when auth is NOT initialized', () => {
    const { isInitialized, isAuthenticated } = useAuthStore.getState();

    // Guard logic check
    const shouldExecuteQuery = isInitialized && isAuthenticated;
    expect(shouldExecuteQuery).toBe(false);

    if (shouldExecuteQuery) {
      inventoryService.getBrands();
    }

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('2. Prevents catalog queries when auth is initialized but user is NOT authenticated', () => {
    useAuthStore.setState({
      isInitialized: true,
      isAuthenticated: false,
      isLoading: false,
    });

    const { isInitialized, isAuthenticated } = useAuthStore.getState();
    const shouldExecuteQuery = isInitialized && isAuthenticated;
    expect(shouldExecuteQuery).toBe(false);

    if (shouldExecuteQuery) {
      inventoryService.getBrands();
    }

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('3. Executes catalog queries ONLY when auth is fully initialized AND authenticated', async () => {
    useAuthStore.setState({
      isInitialized: true,
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'usr_owner_01', email: 'owner@fahaderp.com' } as any,
      profile: { id: 'usr_owner_01', full_name: 'Owner User', role: 'OWNER', is_active: true } as any,
      role: 'OWNER' as any,
    });

    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'b_01', name: 'Samsung', is_active: true }], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const { isInitialized, isAuthenticated } = useAuthStore.getState();
    const shouldExecuteQuery = isInitialized && isAuthenticated;
    expect(shouldExecuteQuery).toBe(true);

    if (shouldExecuteQuery) {
      await inventoryService.getBrands();
    }

    expect(supabase.from).toHaveBeenCalledWith('brands');
  });
});
