import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { repairService } from '@/features/repair-management/services/repairService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Combobox UX & Inventory/Repair Bug Fix Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Verifies repairService query does NOT request profiles.email', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'rep_01',
          job_number: 'REP-001',
          customer: { full_name: 'John Doe', phone: '9876543210' },
          technician: { full_name: 'Tech User', phone: '9000000002', role: 'TECHNICIAN' },
        },
      ],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    await repairService.getRepairJobs();

    expect(mockSelect).toHaveBeenCalled();
    const queryArg = mockSelect.mock.calls[0][0];

    // CRITICAL BUG FIX VERIFICATION: Must NOT contain 'email' in profiles query!
    expect(queryArg).not.toContain('email');
    expect(queryArg).toContain('technician:profiles!repair_jobs_technician_id_fkey(full_name, phone, role)');
  });

  it('2. Successfully creates category via inventoryService.createCategory', async () => {
    const mockCategory = { id: 'cat_tv_acc', name: 'TV Accessories', is_active: true };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockCategory, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const result = await inventoryService.createCategory('TV Accessories');

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(mockInsert).toHaveBeenCalledWith({ name: 'TV Accessories', is_active: true });
    expect(result.id).toBe('cat_tv_acc');
    expect(result.name).toBe('TV Accessories');
  });

  it('3. Successfully creates brand via inventoryService.createBrand', async () => {
    const mockBrand = { id: 'brd_samsung', name: 'Samsung', is_active: true };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockBrand, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const result = await inventoryService.createBrand('Samsung');

    expect(supabase.from).toHaveBeenCalledWith('brands');
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Samsung', is_active: true });
    expect(result.id).toBe('brd_samsung');
    expect(result.name).toBe('Samsung');
  });

  it('4. Handles unauthorized category creation error gracefully', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy for table "categories"' },
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await expect(inventoryService.createCategory('Restricted Category')).rejects.toThrow(
      'new row violates row-level security policy for table "categories"'
    );
  });

  it('5. Handles unauthorized brand creation error gracefully', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy for table "brands"' },
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await expect(inventoryService.createBrand('Restricted Brand')).rejects.toThrow(
      'new row violates row-level security policy for table "brands"'
    );
  });
});
