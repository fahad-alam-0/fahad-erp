import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportsService } from '@/features/reports/services/reportsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Sales Profitability Analysis Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Calculates product profitability using historical sale_items.unit_cost_price', async () => {
    const mockSales = [
      { id: 'sale_101', sale_number: 'SAL-001', sale_date: '2026-08-16', subtotal: 1000, discount: 0, total_amount: 1000, created_at: '2026-08-16T10:00:00Z' },
    ];

    const mockSaleItems = [
      {
        sale_id: 'sale_101',
        product_id: 'prod_rem_01',
        quantity: 10,
        unit_selling_price: 100,
        unit_cost_price: 50, // Historical cost snapshot
        total_selling_amount: 1000,
        product: { name: 'Samsung LED Remote', product_code: 'SAM-001' },
      },
    ];

    // Mock sales table query chain: select -> gte -> lt / lte -> order
    const mockSalesOrder = vi.fn().mockResolvedValue({ data: mockSales, error: null });
    const mockSalesLt = vi.fn().mockReturnValue({ order: mockSalesOrder });
    const mockSalesGte = vi.fn().mockReturnValue({ lt: mockSalesLt, lte: mockSalesLt });
    const mockSalesSelect = vi.fn().mockReturnValue({ gte: mockSalesGte });

    // Mock sale_payments query
    const mockPaymentsIn = vi.fn().mockResolvedValue({ data: [{ payment_method: 'CASH', amount: 1000 }], error: null });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ in: mockPaymentsIn });

    // Mock sale_items query
    const mockItemsIn = vi.fn().mockResolvedValue({ data: mockSaleItems, error: null });
    const mockItemsSelect = vi.fn().mockReturnValue({ in: mockItemsIn });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') return { select: mockSalesSelect } as any;
      if (table === 'sale_payments') return { select: mockPaymentsSelect } as any;
      if (table === 'sale_items') return { select: mockItemsSelect } as any;
      return {} as any;
    });

    const analytics = await reportsService.getSalesAnalytics('2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z');

    expect(analytics.totalRevenue).toBe(1000);
    const prof = analytics.productProfitability;
    expect(prof.products).toHaveLength(1);
    expect(prof.products[0].name).toBe('Samsung LED Remote');
    expect(prof.products[0].qtySold).toBe(10);
    expect(prof.products[0].actualCost).toBe(500); // 10 * 50
    expect(prof.products[0].sellingRevenue).toBe(1000); // 10 * 100
    expect(prof.products[0].grossProfit).toBe(500); // 1000 - 500
    expect(prof.products[0].profitMarginPct).toBe(50); // (500 / 1000) * 100
    expect(prof.totalGrossProfit).toBe(500);
    expect(prof.overallMarginPct).toBe(50);
  });

  it('2. Preserves historical unit cost when multiple sales occur at different cost snapshots', async () => {
    const mockSales = [
      { id: 'sale_201', subtotal: 200, discount: 0, total_amount: 200, created_at: '2026-08-16T10:00:00Z' },
      { id: 'sale_202', subtotal: 300, discount: 0, total_amount: 300, created_at: '2026-08-16T11:00:00Z' },
    ];

    const mockSaleItems = [
      // Sale 1: 2 units purchased historically at ₹80 cost, sold at ₹100
      {
        sale_id: 'sale_201',
        product_id: 'prod_rem_01',
        quantity: 2,
        unit_selling_price: 100,
        unit_cost_price: 80,
        total_selling_amount: 200,
        product: { name: 'Samsung LED Remote', product_code: 'SAM-001' },
      },
      // Sale 2: 3 units purchased later at ₹75 cost, sold at ₹100
      {
        sale_id: 'sale_202',
        product_id: 'prod_rem_01',
        quantity: 3,
        unit_selling_price: 100,
        unit_cost_price: 75,
        total_selling_amount: 300,
        product: { name: 'Samsung LED Remote', product_code: 'SAM-001' },
      },
    ];

    const mockSalesOrder = vi.fn().mockResolvedValue({ data: mockSales, error: null });
    const mockSalesLt = vi.fn().mockReturnValue({ order: mockSalesOrder });
    const mockSalesGte = vi.fn().mockReturnValue({ lt: mockSalesLt, lte: mockSalesLt });
    const mockSalesSelect = vi.fn().mockReturnValue({ gte: mockSalesGte });

    const mockPaymentsIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockPaymentsSelect = vi.fn().mockReturnValue({ in: mockPaymentsIn });

    const mockItemsIn = vi.fn().mockResolvedValue({ data: mockSaleItems, error: null });
    const mockItemsSelect = vi.fn().mockReturnValue({ in: mockItemsIn });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') return { select: mockSalesSelect } as any;
      if (table === 'sale_payments') return { select: mockPaymentsSelect } as any;
      if (table === 'sale_items') return { select: mockItemsSelect } as any;
      return {} as any;
    });

    const analytics = await reportsService.getSalesAnalytics('2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z');
    const prof = analytics.productProfitability;

    expect(prof.products[0].qtySold).toBe(5);
    // Actual cost = (2 * 80) + (3 * 75) = 160 + 225 = 385
    expect(prof.products[0].actualCost).toBe(385);
    // Selling revenue = (2 * 100) + (3 * 100) = 500
    expect(prof.products[0].sellingRevenue).toBe(500);
    // Actual profit = 500 - 385 = 115
    expect(prof.products[0].grossProfit).toBe(115);
    // Profit margin = (115 / 500) * 100 = 23%
    expect(prof.products[0].profitMarginPct).toBe(23);
  });
});
