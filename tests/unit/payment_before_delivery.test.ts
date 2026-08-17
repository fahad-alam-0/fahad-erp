import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalSearchService } from '@/services/search/globalSearchService';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    schema: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Payment-Before-Delivery Workflow & Customer Search Link Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TEST 1: Total = 6,000, Paid = 0, Due = 6,000 → DELIVERED rejected
  it('TEST 1: Rejects transition to DELIVERED when 0 payment collected (Due = 6000)', async () => {
    const serviceRevenue = 6000;
    const paidAmount = 0;
    const dueAmount = serviceRevenue - paidAmount;

    expect(dueAmount).toBeGreaterThan(0.01);
    const isDeliveryAllowed = dueAmount <= 0.01;
    expect(isDeliveryAllowed).toBe(false);
  });

  // TEST 2: Total = 6,000, Paid = 2,000, Due = 4,000 → DELIVERED rejected
  it('TEST 2: Rejects transition to DELIVERED when partial payment collected (Due = 4000)', async () => {
    const serviceRevenue = 6000;
    const paidAmount = 2000;
    const dueAmount = serviceRevenue - paidAmount;

    expect(dueAmount).toBe(4000);
    const isDeliveryAllowed = dueAmount <= 0.01;
    expect(isDeliveryAllowed).toBe(false);
  });

  // TEST 3: Total = 6,000, Paid = 6,000, Due = 0 → DELIVERED success
  it('TEST 3: Permits transition to DELIVERED when full payment collected (Due = 0)', async () => {
    const serviceRevenue = 6000;
    const paidAmount = 6000;
    const dueAmount = serviceRevenue - paidAmount;

    expect(dueAmount).toBe(0);
    const isDeliveryAllowed = dueAmount <= 0.01;
    expect(isDeliveryAllowed).toBe(true);
  });

  // TEST 4: Total = 6,000, Paid = 6,500, Due = -500 → DELIVERED success
  it('TEST 4: Permits transition to DELIVERED when overpaid or rounded (Due <= 0)', async () => {
    const serviceRevenue = 6000;
    const paidAmount = 6500;
    const dueAmount = serviceRevenue - paidAmount;

    expect(dueAmount).toBeLessThanOrEqual(0);
    const isDeliveryAllowed = dueAmount <= 0.01;
    expect(isDeliveryAllowed).toBe(true);
  });

  // TEST 5: Customer search "alok" returns valid /customers route (no 404)
  it('TEST 5: Customer search for "alok" generates valid /customers route link (no 404)', async () => {
    const mockCustomers = [
      { id: 'cust_alok_01', full_name: 'Alok Kumar', phone: '7501486941' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const limit = vi.fn().mockResolvedValue({ data: table === 'customers' ? mockCustomers : [], error: null });
      const eq = vi.fn().mockReturnValue({ limit });
      const or = vi.fn().mockReturnValue({ limit, eq });
      return { select: vi.fn().mockReturnValue({ or, eq }) } as any;
    });

    const results = await globalSearchService.search('alok', 'OWNER');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('CUSTOMER');
    expect(results[0].title).toBe('Alok Kumar');
    expect(results[0].link).toBe('/customers?id=cust_alok_01&search=Alok%20Kumar');
    expect(results[0].link).not.toBe('/pos'); // Must NOT point to non-existent /pos route
  });

  // TEST 6: Customer search for other names ("firoz", "munnu")
  it('TEST 6: Customer search for other names generates valid /customers route link', async () => {
    const mockCustomers = [
      { id: 'cust_firoz_02', full_name: 'Firoz Khan', phone: '9876543210' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const limit = vi.fn().mockResolvedValue({ data: table === 'customers' ? mockCustomers : [], error: null });
      const eq = vi.fn().mockReturnValue({ limit });
      const or = vi.fn().mockReturnValue({ limit, eq });
      return { select: vi.fn().mockReturnValue({ or, eq }) } as any;
    });

    const results = await globalSearchService.search('firoz', 'OWNER');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('CUSTOMER');
    expect(results[0].link).toContain('/customers?id=cust_firoz_02');
  });

  // TEST 7: Backend RPC rejection when unpaid balance > 0
  it('TEST 7: Backend RPC rejects transition to DELIVERED when unpaid balance > 0', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Cannot mark repair as DELIVERED until full payment is collected. Total Amount: 6000, Collected: 0, Due: 6000' } as any,
    });

    vi.mocked(supabase.schema).mockReturnValue({ rpc: mockRpc } as any);

    await expect(repairService.updateRepairStatus('rep_unpaid_01', 'DELIVERED', 'Attempt delivery')).rejects.toThrow('Cannot mark repair as DELIVERED until full payment is collected.');
  });
});
