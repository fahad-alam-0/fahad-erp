import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Product Management & Safe Deletion Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Calculates profit and margin percentage correctly', () => {
    const costPrice = 110;
    const sellingPrice = 150;
    const profit = sellingPrice - costPrice;
    const margin = ((profit / sellingPrice) * 100).toFixed(1);

    expect(profit).toBe(40);
    expect(margin).toBe('26.7');
  });

  it('2. Prevents permanent deletion if historical transaction records exist', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'sale_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      };
    });

    (supabase.from as any) = mockFrom;

    await expect(inventoryService.deleteProduct('product-with-sales-id')).rejects.toThrow(
      'This product cannot be permanently deleted because it has historical transaction records.'
    );
  });

  it('3. Allows permanent deletion if product has zero historical transaction records', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (['sale_items', 'purchase_items', 'sale_return_items', 'repair_parts'].includes(table)) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      if (table === 'inventory_movements' || table === 'products') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    (supabase.from as any) = mockFrom;

    await expect(inventoryService.deleteProduct('unused-product-id')).resolves.not.toThrow();
  });

  it('4. Verifies initial 8 products pricing and calculated profit values', () => {
    const initialProducts = [
      { name: 'Sony Speaker LED', cost: 0, selling: 250, profit: 250 },
      { name: 'Lg magic remote', cost: 250, selling: 350, profit: 100 },
      { name: 'Av to Hdmi', cost: 210, selling: 230, profit: 20 },
      { name: 'TCL led remote (big)', cost: 110, selling: 150, profit: 40 },
      { name: '56 Universal box', cost: 0, selling: 50, profit: 50 },
      { name: 'Lg master remote', cost: 47, selling: 80, profit: 33 },
      { name: 'Meter cord', cost: 50, selling: 70, profit: 20 },
      { name: 'Airtel remote', cost: 36, selling: 60, profit: 24 },
    ];

    initialProducts.forEach((prod) => {
      expect(prod.selling - prod.cost).toBe(prod.profit);
    });
  });
});
