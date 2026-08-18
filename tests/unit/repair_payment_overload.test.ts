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

describe('Repair Payment RPC Overload Disambiguation & Payment Methods Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. STAFF records CASH repair payment via canonical enum RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        payment_id: 'pay-cash-01',
        repair_id: 'rep-101',
        amount: 500,
        payment_method: 'CASH',
        total_payments: 500,
        payment_status: 'UNPAID',
        auto_finalized: false,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await repairService.addRepairPayment('rep-101', 'CASH', 500, undefined, 'Deposit at counter');

    expect(mockRpc).toHaveBeenCalledWith('add_repair_payment', {
      p_repair_id: 'rep-101',
      p_payment_method: 'CASH',
      p_amount: 500,
      p_payment_reference: null,
      p_notes: 'Deposit at counter',
    });
  });

  it('2. STAFF records UPI repair payment with transaction reference', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        payment_id: 'pay-upi-02',
        repair_id: 'rep-101',
        amount: 1500,
        payment_method: 'UPI',
        total_payments: 2000,
        payment_status: 'PAID',
        auto_finalized: true,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await repairService.addRepairPayment('rep-101', 'UPI', 1500, 'UPI/123456789/TXN', 'Full settlement');

    expect(mockRpc).toHaveBeenCalledWith('add_repair_payment', {
      p_repair_id: 'rep-101',
      p_payment_method: 'UPI',
      p_amount: 1500,
      p_payment_reference: 'UPI/123456789/TXN',
      p_notes: 'Full settlement',
    });
  });

  it('3. STAFF records CARD repair payment with slip reference', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        payment_id: 'pay-card-03',
        repair_id: 'rep-102',
        amount: 2500,
        payment_method: 'CARD',
        total_payments: 2500,
        payment_status: 'PAID',
        auto_finalized: false,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await repairService.addRepairPayment('rep-102', 'CARD', 2500, 'SLIP-998811', 'POS Card Swipe');

    expect(mockRpc).toHaveBeenCalledWith('add_repair_payment', {
      p_repair_id: 'rep-102',
      p_payment_method: 'CARD',
      p_amount: 2500,
      p_payment_reference: 'SLIP-998811',
      p_notes: 'POS Card Swipe',
    });
  });

  it('4. Handles RPC error gracefully when overpayment exceeds remaining balance', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Payment amount (3000) exceeds remaining balance due (1000)',
      },
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await expect(
      repairService.addRepairPayment('rep-101', 'CASH', 3000)
    ).rejects.toThrow('Payment amount (3000) exceeds remaining balance due (1000)');
  });
});
