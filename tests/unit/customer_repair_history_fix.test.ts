import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerService } from '@/features/customer-management/services/customerService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Customer Repair History & Foreign Key Relationship Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query repair_jobs with valid foreign key constraint hint repair_jobs_technician_id_fkey', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'repair-1',
          job_number: 'REP-20260821-000001',
          device_type: 'Led TV',
          device_brand: 'Akai',
          device_model: null,
          reported_problem: 'backlight change',
          status: 'DELIVERED',
          payment_status: 'PAID',
          quoted_amount: '100.00',
          service_revenue: '100.00',
          created_at: '2026-08-21T10:11:53.780Z',
          updated_at: '2026-08-21T10:15:00.000Z',
          technician: { full_name: 'Fahad Owner' },
        },
      ],
      error: null,
    });

    const mockPaymentsSelect = vi.fn().mockReturnThis();
    const mockPaymentsIn = vi.fn().mockResolvedValue({
      data: [{ repair_id: 'repair-1', amount: '100.00' }],
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'repair_jobs') {
        return {
          select: mockSelect.mockImplementation((selectStr: string) => {
            expect(selectStr).toContain('technician:profiles!repair_jobs_technician_id_fkey(full_name)');
            expect(selectStr).not.toContain('!left');
            return {
              eq: mockEq.mockImplementation(() => ({
                order: mockOrder,
              })),
            };
          }),
        };
      }
      if (table === 'repair_payments') {
        return {
          select: mockPaymentsSelect.mockReturnValue({
            in: mockPaymentsIn,
          }),
        };
      }
      return {};
    });

    const customerId = '51bb745a-a425-452e-9078-7d8d9808e383';
    const history = await customerService.getCustomerRepairHistory(customerId);

    expect(history.length).toBe(1);
    expect(history[0].job_number).toBe('REP-20260821-000001');
    expect(history[0].technician_name).toBe('Fahad Owner');
    expect(history[0].status).toBe('DELIVERED');
  });

  it('should throw error when getCustomerRepairHistory encounters query error', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      }),
    });

    await expect(
      customerService.getCustomerRepairHistory('51bb745a-a425-452e-9078-7d8d9808e383')
    ).rejects.toThrow('Database connection failed');
  });
});
