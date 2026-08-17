import { describe, it, expect, beforeEach, vi } from 'vitest';
import { salesService } from '@/features/sales-management/services/salesService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Completed Sales Log — Product Column & Search Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Fetches sale_items with product names and formats quantity correctly', async () => {
    const mockSalesData = [
      {
        id: 'sal_multi_01',
        sale_number: 'SAL-20260817-0001',
        subtotal: 1500,
        discount: 0,
        total_amount: 1500,
        payment_status: 'PAID',
        created_at: '2026-08-17T10:00:00Z',
        customer: { full_name: 'Alok Kumar', phone: '7501486941' },
        sale_items: [
          {
            id: 'item_01',
            quantity: 10,
            unit_selling_price: 100,
            product: { name: 'Samsung LED Remote', product_code: 'REM-01', unit: 'pcs' },
          },
          {
            id: 'item_02',
            quantity: 2,
            unit_selling_price: 250,
            product: { name: 'Sony Master LED', product_code: 'LED-02', unit: 'pcs' },
          },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') {
        const order = vi.fn().mockResolvedValue({ data: mockSalesData, error: null });
        return { select: vi.fn().mockReturnValue({ order }) } as any;
      }
      return {} as any;
    });

    const sales = await salesService.getSales();
    expect(sales).toHaveLength(1);
    expect(sales[0].sale_items).toHaveLength(2);
    expect(sales[0].sale_items![0].product?.name).toBe('Samsung LED Remote');
    expect(sales[0].sale_items![0].quantity).toBe(10);
    expect(sales[0].sale_items![1].product?.name).toBe('Sony Master LED');
    expect(sales[0].sale_items![1].quantity).toBe(2);
  });

  it('2. Filters sales by Product Name, Customer Name, or Invoice Number', async () => {
    const mockSalesData = [
      {
        id: 'sal_01',
        sale_number: 'SAL-101',
        subtotal: 500,
        discount: 0,
        total_amount: 500,
        customer: { full_name: 'Firoz Khan', phone: '9876543210' },
        sale_items: [
          { id: 'i1', quantity: 1, product: { name: 'Wireless Mouse', product_code: 'MOU-01', unit: 'pcs' } },
        ],
      },
      {
        id: 'sal_02',
        sale_number: 'SAL-102',
        subtotal: 1200,
        discount: 0,
        total_amount: 1200,
        customer: { full_name: 'Munnu Tech', phone: '8888888888' },
        sale_items: [
          { id: 'i2', quantity: 2, product: { name: 'HDMI Cable 5m', product_code: 'CAB-05', unit: 'pcs' } },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') {
        const order = vi.fn().mockResolvedValue({ data: mockSalesData, error: null });
        return { select: vi.fn().mockReturnValue({ order }) } as any;
      }
      return {} as any;
    });

    // Search by product name: "Mouse"
    const mouseResults = await salesService.getSales({ search: 'Mouse' });
    expect(mouseResults).toHaveLength(1);
    expect(mouseResults[0].sale_items![0].product?.name).toBe('Wireless Mouse');

    // Search by customer name: "Munnu"
    const customerResults = await salesService.getSales({ search: 'Munnu' });
    expect(customerResults).toHaveLength(1);
    expect(customerResults[0].customer?.full_name).toBe('Munnu Tech');

    // Search by invoice number: "SAL-101"
    const invoiceResults = await salesService.getSales({ search: 'SAL-101' });
    expect(invoiceResults).toHaveLength(1);
    expect(invoiceResults[0].sale_number).toBe('SAL-101');
  });
});
