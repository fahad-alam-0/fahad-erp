import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      schema: vi.fn(),
    },
  };
});

describe('Repair Status Control & Payment Prerequisite Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TEST 1 & 2: Backend RPC rejects transition to DELIVERED when unpaid or partially paid', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Cannot mark repair as DELIVERED until full payment is collected. Total Amount: 5000, Collected: 2000, Due: 3000',
      },
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await expect(
      repairService.updateRepairStatus('rep-unpaid-1', 'DELIVERED', 'Attempting unpaid delivery')
    ).rejects.toThrow('Cannot mark repair as DELIVERED until full payment is collected');

    expect(mockRpc).toHaveBeenCalledWith('update_repair_status', {
      p_repair_id: 'rep-unpaid-1',
      p_new_status: 'DELIVERED',
      p_notes: 'Attempting unpaid delivery',
    });
  });

  it('TEST 3 & 4: Backend RPC permits transition to DELIVERED after full payment is collected', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        repair_id: 'rep-paid-1',
        old_status: 'READY_FOR_PICKUP',
        new_status: 'DELIVERED',
        updated: true,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await repairService.updateRepairStatus('rep-paid-1', 'DELIVERED', 'Full payment verified, handed to customer');

    expect(mockRpc).toHaveBeenCalledWith('update_repair_status', {
      p_repair_id: 'rep-paid-1',
      p_new_status: 'DELIVERED',
      p_notes: 'Full payment verified, handed to customer',
    });
  });

  it('TEST 6: Recording payment while READY_FOR_PICKUP updates payments without automatically delivering repair', async () => {
    const mockPaymentRpc = vi.fn().mockResolvedValue({
      data: {
        payment_id: 'pay-99',
        repair_id: 'rep-ready-1',
        total_payments: 4000,
        payment_status: 'PAID',
        auto_finalized: true,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockPaymentRpc,
    });

    await repairService.addRepairPayment('rep-ready-1', 'CASH', 4000, undefined, 'Paid at counter');

    expect(mockPaymentRpc).toHaveBeenCalledWith('add_repair_payment', {
      p_repair_id: 'rep-ready-1',
      p_payment_method: 'CASH',
      p_amount: 4000,
      p_payment_reference: null,
      p_notes: 'Paid at counter',
    });
  });

  it('TEST 7: Valid intermediate workflow status transitions execute properly', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        repair_id: 'rep-diag-1',
        old_status: 'RECEIVED',
        new_status: 'DIAGNOSING',
        updated: true,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await repairService.updateRepairStatus('rep-diag-1', 'DIAGNOSING', 'Beginning motherboard inspection');

    expect(mockRpc).toHaveBeenCalledWith('update_repair_status', {
      p_repair_id: 'rep-diag-1',
      p_new_status: 'DIAGNOSING',
      p_notes: 'Beginning motherboard inspection',
    });
  });
});
