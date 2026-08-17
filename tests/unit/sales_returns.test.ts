import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesService } from '@/features/sales-management/services/salesService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      schema: vi.fn(),
    },
  };
});

describe('Sales Returns & Refund Module Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Correctly calculates returned_amount, net_amount, and return_status for sales log', async () => {
    const mockSalesData = [
      {
        id: 'sale-1',
        sale_number: 'POS-000001',
        subtotal: 1000,
        discount: 100,
        total_amount: 900,
        created_at: '2026-08-17T10:00:00Z',
        customer: { full_name: 'Rahul Sharma', phone: '9876543210' },
        sale_items: [
          {
            id: 'item-1',
            product_id: 'prod-1',
            quantity: 2,
            unit_selling_price: 500,
            unit_cost_price: 300,
            total_selling_amount: 1000,
            total_cost_amount: 600,
            product: { name: 'LED Remote', product_code: 'REM-01', unit: 'pcs' },
          },
        ],
        sale_returns: [
          {
            id: 'ret-1',
            return_number: 'RET-000001',
            total_refund_amount: 450,
            refund_method: 'CASH',
            reason: 'CUSTOMER_CHANGED_MIND',
            sale_return_items: [
              {
                id: 'ret-item-1',
                sale_item_id: 'item-1',
                quantity: 1,
                refund_amount: 450,
              },
            ],
          },
        ],
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSalesData, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
      eq: vi.fn().mockReturnThis(),
    });

    const sales = await salesService.getSales();

    expect(sales).toHaveLength(1);
    const sale = sales[0];
    expect(sale.returned_amount).toBe(450);
    expect(sale.net_amount).toBe(450);
    expect(sale.return_status).toBe('PARTIALLY_RETURNED');
    expect(sale.sale_items?.[0].returned_quantity).toBe(1);
    expect(sale.sale_items?.[0].remaining_returnable_quantity).toBe(1);
  });

  it('2. Calls process_sale_return RPC with correct payload', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        return_id: 'ret-123',
        return_number: 'RET-000002',
        total_refund_amount: 450,
      },
      error: null,
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    const result = await salesService.processSaleReturn({
      sale_id: 'sale-1',
      refund_method: 'CASH',
      reason: 'CUSTOMER_CHANGED_MIND',
      items: [{ sale_item_id: 'item-1', quantity: 1 }],
    });

    expect(mockRpc).toHaveBeenCalledWith('process_sale_return', {
      p_sale_id: 'sale-1',
      p_refund_method: 'CASH',
      p_refund_reference: null,
      p_reason: 'CUSTOMER_CHANGED_MIND',
      p_reason_notes: null,
      p_items: [{ sale_item_id: 'item-1', quantity: 1 }],
    });

    expect(result.return_number).toBe('RET-000002');
    expect(result.total_refund_amount).toBe(450);
  });

  it('3. Handles process_sale_return RPC failure safely', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Return quantity exceeds remaining returnable quantity' },
    });

    (supabase.schema as any).mockReturnValue({
      rpc: mockRpc,
    });

    await expect(
      salesService.processSaleReturn({
        sale_id: 'sale-1',
        refund_method: 'CASH',
        reason: 'CUSTOMER_CHANGED_MIND',
        items: [{ sale_item_id: 'item-1', quantity: 10 }],
      })
    ).rejects.toThrow('Return quantity exceeds remaining returnable quantity');
  });
});
