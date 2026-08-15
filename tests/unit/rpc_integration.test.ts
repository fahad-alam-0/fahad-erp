import { describe, it, expect, beforeEach, vi } from 'vitest';
import { purchasingService } from '@/features/inventory-management/purchasing/services/purchasingService';
import { salesService } from '@/features/sales-management/services/salesService';
import { inventoryService } from '@/features/inventory-management/services/inventoryService';
import { repairService } from '@/features/repair-management/services/repairService';
import { settingsService } from '@/features/settings/services/settingsService';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/constants/roles.constants';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    schema: vi.fn(),
  },
}));

describe('Supabase Private Schema RPC Integration Unit Tests', () => {
  const mockRpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.schema).mockReturnValue({
      rpc: mockRpc,
    } as any);
  });

  it('1. purchasingService.createPurchase invokes private.create_purchase RPC correctly', async () => {
    const mockPayload = { purchase_id: 'p_01', purchase_number: 'PO-001', total_amount: 1500 };
    mockRpc.mockResolvedValue({ data: mockPayload, error: null });

    const result = await purchasingService.createPurchase({
      supplier_id: 'sup_01',
      discount: 100,
      payment_status: 'PAID',
      notes: 'Test PO',
      items: [{ product_id: 'prod_01', quantity: 5, unit_cost: 320 }],
    });

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('create_purchase', expect.objectContaining({
      p_supplier_id: 'sup_01',
      p_discount: 100,
      p_payment_status: 'PAID',
      p_notes: 'Test PO',
      p_items: [{ product_id: 'prod_01', quantity: 5, unit_cost: 320 }],
    }));
    expect(result.purchase_number).toBe('PO-001');
  });

  it('2. salesService.createSale invokes private.create_sale RPC correctly', async () => {
    const mockPayload = {
      sale_id: 's_01',
      sale_number: 'INV-001',
      subtotal: 1000,
      discount: 50,
      total_amount: 950,
      payment_status: 'PAID',
      sale_status: 'COMPLETED',
    };
    mockRpc.mockResolvedValue({ data: mockPayload, error: null });

    const result = await salesService.createSale({
      customer_id: 'cust_01',
      discount: 50,
      notes: 'POS Checkout',
      items: [{ product_id: 'prod_01', quantity: 2 }],
      payments: [{ payment_method: 'CASH', amount: 950 }],
    });

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('create_sale', expect.objectContaining({
      p_customer_id: 'cust_01',
      p_discount: 50,
      p_notes: 'POS Checkout',
      p_items: [{ product_id: 'prod_01', quantity: 2 }],
      p_payments: [{ payment_method: 'CASH', amount: 950 }],
    }));
    expect(result.sale_number).toBe('INV-001');
  });

  it('3. inventoryService.adjustStock invokes private.adjust_inventory RPC correctly', async () => {
    const mockPayload = { product_id: 'prod_01', new_stock_quantity: 25, movement_id: 'mov_01' };
    mockRpc.mockResolvedValue({ data: mockPayload, error: null });

    const result = await inventoryService.adjustStock({
      product_id: 'prod_01',
      movement_type: 'ADJUSTMENT_IN',
      quantity: 5,
      unit_cost: 200,
      notes: 'Restock batch',
    });

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('adjust_inventory', expect.objectContaining({
      p_product_id: 'prod_01',
      p_movement_type: 'ADJUSTMENT_IN',
      p_quantity: 5,
      p_unit_cost: 200,
      p_notes: 'Restock batch',
    }));
    expect(result.new_stock_quantity).toBe(25);
  });

  it('4. repairService.createRepairJob invokes private.create_repair_job RPC correctly', async () => {
    const mockPayload = { repair_id: 'rep_01', job_number: 'REP-001', status: 'RECEIVED', service_revenue: 1200 };
    mockRpc.mockResolvedValue({ data: mockPayload, error: null });

    const result = await repairService.createRepairJob({
      customer_id: 'cust_01',
      device_type: 'Mobile',
      device_brand: 'Apple',
      reported_problem: 'Screen crack',
      quoted_amount: 1200,
    });

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('create_repair_job', expect.objectContaining({
      p_customer_id: 'cust_01',
      p_device_type: 'Mobile',
      p_device_brand: 'Apple',
      p_reported_problem: 'Screen crack',
      p_quoted_amount: 1200,
    }));
    expect(result.job_number).toBe('REP-001');
  });

  it('5. settingsService.setUserRole invokes private.set_user_role RPC correctly', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await settingsService.setUserRole('usr_02', UserRole.TECHNICIAN);

    expect(supabase.schema).toHaveBeenCalledWith('private');
    expect(mockRpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'usr_02',
      new_role: UserRole.TECHNICIAN,
    });
  });
});
