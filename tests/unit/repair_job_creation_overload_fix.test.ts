import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    schema: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
  },
}));

describe('Repair Job Creation RPC Overload Disambiguation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should explicitly pass p_problem_tags as an array when calling create_repair_job RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        repair_id: 'test-repair-123',
        job_number: 'REP-2026-0001',
        status: 'RECEIVED',
        service_revenue: 2500,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({ rpc: mockRpc });

    const input = {
      customer_id: 'cust-uuid-1',
      device_type: 'TV',
      device_brand: 'LG',
      reported_problem: 'Backlight change',
      device_model: '43UR7500',
      quoted_amount: 2500,
      discount: 0,
    };

    const result = await repairService.createRepairJob(input);

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('create_repair_job', {
      p_customer_id: 'cust-uuid-1',
      p_device_type: 'TV',
      p_device_brand: 'LG',
      p_reported_problem: 'Backlight change',
      p_device_model: '43UR7500',
      p_serial_number: null,
      p_intake_notes: null,
      p_expected_completion_at: null,
      p_quoted_amount: 2500,
      p_discount: 0,
      p_technician_id: null,
      p_problem_tags: [],
    });

    expect(result).toEqual({
      repair_id: 'test-repair-123',
      job_number: 'REP-2026-0001',
      status: 'RECEIVED',
      service_revenue: 2500,
    });
  });

  it('should preserve free-text reported_problem while passing p_problem_tags as empty array', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        repair_id: 'test-repair-456',
        job_number: 'REP-2026-0002',
        status: 'RECEIVED',
        service_revenue: 3500,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({ rpc: mockRpc });

    const customText = 'Customer states display flickering and sound ok';

    await repairService.createRepairJob({
      customer_id: 'cust-uuid-2',
      device_type: 'LED TV',
      device_brand: 'Samsung',
      reported_problem: customText,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_repair_job',
      expect.objectContaining({
        p_reported_problem: customText,
        p_problem_tags: [],
      })
    );
  });
});
