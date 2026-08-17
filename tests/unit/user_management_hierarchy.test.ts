import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsService } from '@/features/settings/services/settingsService';
import { UserRole } from '@/constants/roles.constants';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    schema: vi.fn(),
  },
}));

describe('Permanent User Deletion, Primary Ownership Transfer, & Admin Role Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Invokes private.delete_user_permanently RPC with correct target_user_id', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.schema).mockReturnValue({ rpc: mockRpc } as any);

    await settingsService.deleteUserPermanently('usr_tech_munnu');

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('delete_user_permanently', {
      p_target_user_id: 'usr_tech_munnu',
    });
  });

  it('2. Invokes private.transfer_primary_ownership RPC with correct new_owner_id', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.schema).mockReturnValue({ rpc: mockRpc } as any);

    await settingsService.transferPrimaryOwnership('usr_admin_firoz');

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('transfer_primary_ownership', {
      p_new_owner_id: 'usr_admin_firoz',
    });
  });

  it('3. Invokes private.set_user_role RPC with target_user_id and new_role', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.schema).mockReturnValue({ rpc: mockRpc } as any);

    await settingsService.setUserRole('usr_staff_alok', UserRole.ADMIN);

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'usr_staff_alok',
      new_role: UserRole.ADMIN,
    });
  });

  it('4. Handles RPC error when attempting unauthorized deletion or owner deletion', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Primary ownership must be transferred before this account can be removed.' },
    });
    vi.mocked(supabase.schema).mockReturnValue({ rpc: mockRpc } as any);

    await expect(settingsService.deleteUserPermanently('usr_owner_fahad')).rejects.toThrow(
      'Primary ownership must be transferred before this account can be removed.'
    );
  });
});
