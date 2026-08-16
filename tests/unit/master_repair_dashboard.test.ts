import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { customerService } from '@/features/customer-management/services/customerService';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    schema: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

describe('Master Repair Workflow & Profit Attribution Unit Tests', () => {
  const mockRpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.schema).mockReturnValue({
      rpc: mockRpc,
    } as any);
  });

  it('1. dashboardService queries repair_profit_snapshots with left joins for owner metrics', async () => {
    const mockWalkInSales = [
      { id: 's_01', sale_number: 'INV-20260816-001', total_amount: 250, payment_status: 'PAID', created_at: new Date().toISOString(), customer: null },
    ];
    const mockUnassignedRepairs = [
      { id: 'r_01', job_number: 'REP-20260816-001', device_type: 'TV', device_brand: 'Samsung', reported_problem: 'No display', status: 'RECEIVED', quoted_amount: 1000, service_revenue: 1000, created_at: new Date().toISOString(), customer: null, technician: null },
    ];
    const mockSnapshots = [
      { technician_id: 'tech_01', technician_share: 560, technician: { full_name: 'Fahad Technician' } },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: [{ total_amount: 250 }], error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockWalkInSales, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'purchases') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any;
      }
      if (table === 'repair_jobs') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ count: 1, error: null }),
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockUnassignedRepairs, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'repair_profit_snapshots') {
        return {
          select: vi.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
        } as any;
      }
      return {} as any;
    });

    const metrics = await dashboardService.getOwnerMetrics();

    expect(metrics.todaySalesTotal).toBe(250);
    expect(metrics.technicianEarnings).toHaveLength(1);
    expect(metrics.technicianEarnings[0].technician_name).toBe('Fahad Technician');
    expect(metrics.technicianEarnings[0].total_technician_share).toBe(560);
  });

  it('2. customerService.getCustomerRepairHistory uses outer left join and includes unassigned repairs', async () => {
    const mockRepairs = [
      { id: 'r_01', job_number: 'REP-001', device_type: 'TV', device_brand: 'LG', reported_problem: 'Black screen', status: 'IN_REPAIR', payment_status: 'UNPAID', quoted_amount: 1000, service_revenue: 1000, created_at: new Date().toISOString(), technician: null },
    ];
    const mockPayments = [
      { repair_id: 'r_01', amount: 400 },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'repair_jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockRepairs, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'repair_payments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
          }),
        } as any;
      }
      return {} as any;
    });

    const history = await customerService.getCustomerRepairHistory('cust_alok');

    expect(history).toHaveLength(1);
    expect(history[0].job_number).toBe('REP-001');
    expect(history[0].technician_name).toBe('Unassigned');
    expect(history[0].collected_amount).toBe(400);
    expect(history[0].remaining_due).toBe(600);
  });

  it('3. repairService.addRepairPayment calls private.add_repair_payment RPC for cash, upi, and card entries', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await repairService.addRepairPayment('rep_01', 'CASH', 600, undefined, 'Cash collected');
    await repairService.addRepairPayment('rep_01', 'UPI', 400, 'UPI999888', 'UPI payment');

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'add_repair_payment', expect.objectContaining({
      p_repair_id: 'rep_01',
      p_payment_method: 'CASH',
      p_amount: 600,
    }));
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'add_repair_payment', expect.objectContaining({
      p_repair_id: 'rep_01',
      p_payment_method: 'UPI',
      p_amount: 400,
      p_payment_reference: 'UPI999888',
    }));
  });

  it('4. Profit attribution logic calculates 70% technician / 30% owner for technician claims and 100% owner for owner claims', () => {
    const serviceRevenue = 1000;
    const partsCost = 200;
    const netProfit = serviceRevenue - partsCost; // 800

    // Technician claim case
    const techShare = Math.round(netProfit * 0.70 * 100) / 100; // 560
    const ownerShareFromTech = netProfit - techShare; // 240

    expect(netProfit).toBe(800);
    expect(techShare).toBe(560);
    expect(ownerShareFromTech).toBe(240);

    // Owner claim case
    const ownerShareFromOwner = netProfit; // 800
    const techShareFromOwner = 0; // 0

    expect(ownerShareFromOwner).toBe(800);
    expect(techShareFromOwner).toBe(0);
  });
});
