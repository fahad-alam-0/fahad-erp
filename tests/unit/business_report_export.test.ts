import { describe, it, expect, beforeEach, vi } from 'vitest';
import { businessReportExportService } from '@/features/reports/services/businessReportExportService';
import { reportsService } from '@/features/reports/services/reportsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Business Report Generator & Export Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Calculates DateRangeBounds for all supported period keys correctly', () => {
    const today = reportsService.getDateRangeBounds('TODAY');
    expect(today.label).toBe('Today');

    const yesterday = reportsService.getDateRangeBounds('YESTERDAY');
    expect(yesterday.label).toBe('Yesterday');

    const l7 = reportsService.getDateRangeBounds('LAST_7_DAYS');
    expect(l7.label).toBe('Last 7 Days');

    const l10 = reportsService.getDateRangeBounds('LAST_10_DAYS');
    expect(l10.label).toBe('Last 10 Days');

    const l30 = reportsService.getDateRangeBounds('LAST_30_DAYS');
    expect(l30.label).toBe('Last 30 Days');

    const tm = reportsService.getDateRangeBounds('THIS_MONTH');
    expect(tm.label).toBe('This Month');

    const lm = reportsService.getDateRangeBounds('LAST_MONTH');
    expect(lm.label).toBe('Last Month');

    const custom = reportsService.getDateRangeBounds('CUSTOM', '2026-08-01', '2026-08-15');
    expect(custom.label).toBe('2026-08-01 to 2026-08-15');
    expect(new Date(custom.startDate).toLocaleDateString('en-IN')).toMatch(/1\/8\/2026/);
    expect(new Date(custom.endDate).toLocaleDateString('en-IN')).toMatch(/15\/8\/2026/);
  });

  it('2. Reconciles sales, product costs, repair profits, worker shares, and payment channels', async () => {
    const mockSales = [
      { id: 'sal_01', sale_number: 'SAL-001', sale_date: '2026-08-17', subtotal: 1000, discount: 0, total_amount: 1000, created_at: '2026-08-17T10:00:00Z', customer: { name: 'Fahad' } }
    ];

    const mockSaleItems = [
      { sale_id: 'sal_01', quantity: 2, unit_selling_price: 500, unit_cost_price: 300, total_selling_amount: 1000, product: { name: 'Remote Control', product_code: 'REM-01' } }
    ];

    const mockSalePayments = [
      { sale_id: 'sal_01', payment_method: 'UPI', amount: 1000 }
    ];

    const mockRepairs = [
      {
        id: 'rep_01',
        repair_number: 'REP-001',
        device_brand: 'Samsung',
        device_model: 'Galaxy S21',
        status: 'DELIVERED',
        financial_status: 'FINALIZED',
        payment_status: 'PAID',
        service_revenue: 1500,
        quoted_amount: 1500,
        created_at: '2026-08-17T09:00:00Z',
        completed_at: '2026-08-17T11:00:00Z',
        delivered_at: '2026-08-17T12:00:00Z',
        technician_id: 'usr_tech_01',
        customer: { name: 'Firoz' }
      }
    ];

    const mockRepairParts = [
      { repair_id: 'rep_01', total_cost: 500 }
    ];

    const mockRepairPayments = [
      { repair_id: 'rep_01', payment_method: 'CASH', amount: 1500 }
    ];

    const mockProfiles = [
      { id: 'usr_tech_01', full_name: 'Firoz Technician', role: 'TECHNICIAN' }
    ];

    const mockSnapshots = [
      {
        repair_id: 'rep_01',
        service_revenue: 1500,
        parts_cost: 500,
        net_repair_profit: 1000,
        owner_share: 300,
        technician_share: 700,
        technician_id: 'usr_tech_01',
        calculated_at: '2026-08-17T11:00:00Z',
        technician: { full_name: 'Firoz Technician', role: 'TECHNICIAN' },
        repair_job: mockRepairs[0]
      }
    ];

    const mockProducts = [
      { id: 'prod_01', name: 'Remote Control', product_code: 'REM-01', stock_quantity: 10, current_cost_price: 300, selling_price: 500, low_stock_threshold: 3, is_active: true, category: { name: 'Electronics' }, brand: { name: 'Samsung' } }
    ];

    const mockPurchases = [
      { id: 'pur_01', purchase_number: 'PUR-001', purchase_date: '2026-08-17', subtotal: 3000, discount: 0, total_amount: 3000, payment_status: 'PAID', created_at: '2026-08-17T08:00:00Z', supplier: { name: 'Vendor A' } }
    ];

    const mockPurchaseItems = [
      { purchase_id: 'pur_01', quantity: 10, unit_cost_price: 300, total_cost: 3000, product: { name: 'Remote Control' } }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') {
        const order = vi.fn().mockResolvedValue({ data: mockSales, error: null });
        const lte = vi.fn().mockReturnValue({ order });
        const gte = vi.fn().mockReturnValue({ lte });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'sale_items') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockSaleItems, error: null }) }) } as any;
      }
      if (table === 'sale_payments') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockSalePayments, error: null }) }) } as any;
      }
      if (table === 'repair_jobs') {
        const lte = vi.fn().mockResolvedValue({ data: mockRepairs, error: null });
        const gte = vi.fn().mockReturnValue({ lte });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'repair_parts') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockRepairParts, error: null }) }) } as any;
      }
      if (table === 'repair_payments') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockRepairPayments, error: null }) }) } as any;
      }
      if (table === 'profiles') {
        return { select: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) } as any;
      }
      if (table === 'repair_profit_snapshots') {
        const lte = vi.fn().mockResolvedValue({ data: mockSnapshots, error: null });
        const gte = vi.fn().mockReturnValue({ lte });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'products') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProducts, error: null }) }) } as any;
      }
      if (table === 'purchases') {
        const order = vi.fn().mockResolvedValue({ data: mockPurchases, error: null });
        const lte = vi.fn().mockReturnValue({ order });
        const gte = vi.fn().mockReturnValue({ lte });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'purchase_items') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockPurchaseItems, error: null }) }) } as any;
      }
      return {} as any;
    });

    const report = await businessReportExportService.fetchReportData('2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', 'This Month');

    // Sales reconciliation
    expect(report.salesSummary.salesCount).toBe(1);
    expect(report.salesSummary.totalRevenue).toBe(1000);
    expect(report.salesSummary.totalCost).toBe(600); // 2 * 300
    expect(report.salesSummary.totalProfit).toBe(400); // 1000 - 600

    // Repair reconciliation
    expect(report.repairSummary.totalServiceRevenue).toBe(1500);
    expect(report.repairSummary.totalPartsCost).toBe(500);
    expect(report.repairSummary.netRepairProfit).toBe(1000);
    expect(report.repairSummary.totalOwnerShare).toBe(300);
    expect(report.repairSummary.totalTechnicianPayout).toBe(700);

    // Payment channel reconciliation
    expect(report.paymentSummary.posUpi).toBe(1000);
    expect(report.paymentSummary.repairCash).toBe(1500);
    expect(report.paymentSummary.totalCollected).toBe(2500);

    // Inventory reconciliation
    expect(report.inventorySummary.totalStockUnits).toBe(10);
    expect(report.inventorySummary.currentInventoryValue).toBe(3000); // 10 * 300

    // Worker performance breakdown
    expect(report.workerPerformance).toHaveLength(1);
    expect(report.workerPerformance[0].workerName).toBe('Firoz Technician');
    expect(report.workerPerformance[0].technicianShare).toBe(700);
    expect(report.workerPerformance[0].ownerShare).toBe(300);
  });
});
