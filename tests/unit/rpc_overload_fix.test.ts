import { describe, it, expect, beforeEach, vi } from 'vitest';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    schema: vi.fn(),
    from: vi.fn(),
  },
}));

describe('RPC Function Overload Disambiguation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Invokes private.update_repair_status RPC cleanly with enum-compatible status string', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        repair_id: 'rep_001',
        old_status: 'RECEIVED',
        new_status: 'DIAGNOSING',
        history_id: 'hist_001',
        updated: true,
      },
      error: null,
    });

    vi.mocked(supabase.schema).mockReturnValue({
      rpc: mockRpc,
    } as any);

    await repairService.updateRepairStatus('rep_001', 'DIAGNOSING', 'Inspecting hardware motherboard');

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('update_repair_status', {
      p_repair_id: 'rep_001',
      p_new_status: 'DIAGNOSING',
      p_notes: 'Inspecting hardware motherboard',
    });
  });

  it('2. Handles RPC error from invalid transitions safely', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid status transition from RECEIVED to DELIVERED' },
    });

    vi.mocked(supabase.schema).mockReturnValue({
      rpc: mockRpc,
    } as any);

    await expect(
      repairService.updateRepairStatus('rep_001', 'DELIVERED', 'Attempting illegal transition')
    ).rejects.toThrow('Invalid status transition from RECEIVED to DELIVERED');
  });
});
