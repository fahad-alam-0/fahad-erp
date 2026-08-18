import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesService } from '@/features/sales-management/services/salesService';
import { reportsService } from '@/features/reports/services/reportsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      schema: vi.fn(),
    },
  };
});

describe('Technician Sales Operator Access & Security Isolation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. TECHNICIAN can create a retail product sale via secure RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        sale_id: 'sale-tech-101',
        sale_number: 'POS-000099',
        subtotal: 1200,
        discount: 0,
        total_amount: 1200,
        payment_status: 'PAID',
        sale_status: 'COMPLETED',
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    const result = await salesService.createSale({
      customer_id: null,
      discount: 0,
      notes: 'Sale processed by Technician Munnu during staff absence',
      items: [{ product_id: 'prod-50', quantity: 2 }],
      payments: [{ payment_method: 'UPI', amount: 1200 }],
    });

    expect(mockRpc).toHaveBeenCalledWith('create_sale', {
      p_customer_id: null,
      p_discount: 0,
      p_notes: 'Sale processed by Technician Munnu during staff absence',
      p_items: [{ product_id: 'prod-50', quantity: 2 }],
      p_payments: [{ payment_method: 'UPI', amount: 1200 }],
    });

    expect(result.sale_id).toBe('sale-tech-101');
    expect(result.sale_number).toBe('POS-000099');
    expect(result.total_amount).toBe(1200);
  });

  it('2. TECHNICIAN can search active products for POS checkout', async () => {
    const mockProducts = [
      {
        id: 'prod-50',
        name: '4K TV Power Supply Board',
        product_code: 'PSU-4K-01',
        selling_price: 600,
        current_cost_price: 350,
        stock_quantity: 15,
        low_stock_threshold: 3,
        is_active: true,
        category: { name: 'Mainboards' },
        brand: { name: 'Sony' },
      },
    ];

    const mockThenable: any = {
      data: mockProducts,
      error: null,
      then: (resolve: any) => resolve({ data: mockProducts, error: null }),
    };

    mockThenable.select = vi.fn().mockReturnValue(mockThenable);
    mockThenable.eq = vi.fn().mockReturnValue(mockThenable);
    mockThenable.or = vi.fn().mockReturnValue(mockThenable);
    mockThenable.order = vi.fn().mockReturnValue(mockThenable);
    mockThenable.limit = vi.fn().mockReturnValue(mockThenable);

    (supabase.from as any).mockReturnValue(mockThenable);

    const results = await salesService.searchProducts('Power Supply');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('4K TV Power Supply Board');
    expect(results[0].selling_price).toBe(600);
  });

  it('3. Sales reports separately group sales revenue by OWNER, STAFF, and TECHNICIAN roles', async () => {
    const mockSalesWithCreators = [
      {
        id: 's-1',
        sale_number: 'POS-001',
        sale_date: '2026-08-18T10:00:00Z',
        subtotal: 1000,
        discount: 0,
        total_amount: 1000,
        created_at: '2026-08-18T10:00:00Z',
        created_by: 'user-owner',
        creator: { id: 'user-owner', full_name: 'Fahad Owner', role: 'OWNER' },
      },
      {
        id: 's-2',
        sale_number: 'POS-002',
        sale_date: '2026-08-18T11:00:00Z',
        subtotal: 1500,
        discount: 0,
        total_amount: 1500,
        created_at: '2026-08-18T11:00:00Z',
        created_by: 'user-staff',
        creator: { id: 'user-staff', full_name: 'Sales Staff A', role: 'STAFF' },
      },
      {
        id: 's-3',
        sale_number: 'POS-003',
        sale_date: '2026-08-18T12:00:00Z',
        subtotal: 800,
        discount: 0,
        total_amount: 800,
        created_at: '2026-08-18T12:00:00Z',
        created_by: 'user-tech-munnu',
        creator: { id: 'user-tech-munnu', full_name: 'Munnu Technician', role: 'TECHNICIAN' },
      },
    ];

    const mockPayments = [
      { payment_method: 'UPI', amount: 1000 },
      { payment_method: 'CASH', amount: 1500 },
      { payment_method: 'UPI', amount: 800 },
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sales') {
        const q: any = {};
        q.select = vi.fn().mockReturnValue(q);
        q.gte = vi.fn().mockReturnValue(q);
        q.lt = vi.fn().mockReturnValue(q);
        q.order = vi.fn().mockResolvedValue({ data: mockSalesWithCreators, error: null });
        return q;
      }
      if (table === 'sale_payments') {
        const q: any = {};
        q.select = vi.fn().mockReturnValue(q);
        q.in = vi.fn().mockResolvedValue({ data: mockPayments, error: null });
        return q;
      }
      if (table === 'sale_items') {
        const q: any = {};
        q.select = vi.fn().mockReturnValue(q);
        q.in = vi.fn().mockResolvedValue({ data: [], error: null });
        return q;
      }
      const q: any = {};
      q.select = vi.fn().mockReturnValue(q);
      return q;
    });

    const analytics = await reportsService.getSalesAnalytics('2026-08-18T00:00:00Z', '2026-08-19T00:00:00Z');

    expect(analytics.totalRevenue).toBe(3300);
    expect(analytics.salesCount).toBe(3);

    const ownerRole = analytics.salesByRoleBreakdown.find((r) => r.role === 'OWNER');
    const staffRole = analytics.salesByRoleBreakdown.find((r) => r.role === 'STAFF');
    const techRole = analytics.salesByRoleBreakdown.find((r) => r.role === 'TECHNICIAN');

    expect(ownerRole?.amount).toBe(1000);
    expect(staffRole?.amount).toBe(1500);
    expect(techRole?.amount).toBe(800);

    const techUser = analytics.salesByUserBreakdown.find((u) => u.userId === 'user-tech-munnu');
    expect(techUser?.userName).toBe('Munnu Technician');
    expect(techUser?.amount).toBe(800);
    expect(techUser?.userRole).toBe('TECHNICIAN');
  });
});
