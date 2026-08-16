import { describe, it, expect, beforeEach, vi } from 'vitest';
import { repairService } from '@/features/repair-management/services/repairService';
import { globalSearchService } from '@/services/search/globalSearchService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    schema: vi.fn(),
  },
}));

describe('Technician Roster & Global Search Unit Tests', () => {
  const mockRpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.schema).mockReturnValue({
      rpc: mockRpc,
    } as any);
  });

  it('1. repairService.getTechnicianRoster calculates active and monthly completed repair metrics', async () => {
    const mockProfiles = [
      { id: 'tech_01', full_name: 'Ali Technician', phone: '9876543210', role: 'TECHNICIAN', is_active: true },
    ];
    const mockJobs = [
      { id: 'j_01', technician_id: 'tech_01', status: 'IN_REPAIR', received_at: new Date().toISOString() },
      { id: 'j_02', technician_id: 'tech_01', status: 'DELIVERED', updated_at: new Date().toISOString() },
    ];

    const mockJobsSelect = vi.fn().mockResolvedValue({ data: mockJobs, error: null });
    const mockProfilesOrder = vi.fn().mockResolvedValue({ data: mockProfiles, error: null });
    const mockProfilesIn = vi.fn().mockReturnValue({ order: mockProfilesOrder });
    const mockProfilesSelect = vi.fn().mockReturnValue({ in: mockProfilesIn });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: mockProfilesSelect } as any;
      }
      if (table === 'repair_jobs') {
        return { select: mockJobsSelect } as any;
      }
      return {} as any;
    });

    const roster = await repairService.getTechnicianRoster();

    expect(roster).toHaveLength(1);
    expect(roster[0].full_name).toBe('Ali Technician');
    expect(roster[0].active_repairs_count).toBe(1);
    expect(roster[0].completed_this_month_count).toBe(1);
  });

  it('2. globalSearchService returns formatted results for allowed user roles', async () => {
    const mockCustomers = [{ id: 'c_01', full_name: 'John Customer', phone: '9999999999' }];
    const mockProducts = [{ id: 'p_01', name: 'iPhone Screen', product_code: 'LCD-14', stock_quantity: 10, selling_price: 3000 }];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'repair_jobs' || table === 'sales') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const searchResults = await globalSearchService.search('iPhone', 'OWNER', 'owner_01');

    expect(searchResults.length).toBeGreaterThan(0);
    const prodResult = searchResults.find((r) => r.type === 'PRODUCT');
    expect(prodResult?.title).toBe('iPhone Screen');
  });

  it('3. TECHNICIAN role creating repair invokes private.create_repair_job RPC', async () => {
    mockRpc.mockResolvedValue({
      data: { repair_id: 'rep_99', job_number: 'REP-20260816-000099', status: 'RECEIVED', service_revenue: 1500, assigned_technician_id: 'tech_01' },
      error: null,
    });

    const result = await repairService.createRepairJob({
      customer_id: 'cust_01',
      device_type: 'Mobile',
      device_brand: 'Apple',
      reported_problem: 'Battery replacement',
      quoted_amount: 1500,
    });

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('create_repair_job', expect.objectContaining({
      p_customer_id: 'cust_01',
      p_device_type: 'Mobile',
      p_device_brand: 'Apple',
      p_quoted_amount: 1500,
    }));
    expect(result.job_number).toBe('REP-20260816-000099');
  });
});
