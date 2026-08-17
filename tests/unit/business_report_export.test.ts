import { describe, it, expect, beforeEach, vi } from 'vitest';
import { businessReportExportService } from '@/features/reports/services/businessReportExportService';
import { reportsService } from '@/features/reports/services/reportsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Business Report Generator & Comprehensive Regression Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Calculates DateRangeBounds for Today, Yesterday, and Custom same-day ranges without zero-length drops', () => {
    // 1. Today date range
    const today = reportsService.getDateRangeBounds('TODAY');
    expect(today.periodLabel).toContain('Today');
    expect(today.startInclusive).toBeDefined();
    expect(today.endExclusive).toBeDefined();

    // 2. Yesterday date range
    const yesterday = reportsService.getDateRangeBounds('YESTERDAY');
    expect(yesterday.periodLabel).toContain('Yesterday');

    // 3. Custom same-day range (From 17 Aug To 17 Aug)
    const customSameDay = reportsService.getDateRangeBounds('CUSTOM', '2026-08-17', '2026-08-17');
    expect(customSameDay.displayStart).toContain('17 August 2026');
    expect(customSameDay.displayEnd).toContain('17 August 2026');
    expect(customSameDay.periodLabel).toContain('17 August 2026 — 17 August 2026');
  });

  it('2. Fully reconciles Sales, Repair Profit, Worker Shares, Payments, and Inventory Valuation', async () => {
    const mockSales = [
      { id: 'sal_01', sale_number: 'SAL-001', sale_date: '2026-08-17', subtotal: 1500, discount: 0, total_amount: 1500, created_at: '2026-08-17T10:00:00Z', customer: { name: 'Fahad' } }
    ];

    const mockSaleItems = [
      { sale_id: 'sal_01', quantity: 2, unit_selling_price: 750, unit_cost_price: 500, total_selling_amount: 1500, product: { name: 'Remote Control', product_code: 'REM-01' } }
    ];

    const mockSalePayments = [
      { sale_id: 'sal_01', payment_method: 'UPI', amount: 1500 }
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
        service_revenue: 5100,
        quoted_amount: 5100,
        created_at: '2026-08-17T09:00:00Z',
        completed_at: '2026-08-17T11:00:00Z',
        delivered_at: '2026-08-17T12:00:00Z',
        technician_id: 'usr_tech_01',
        customer: { name: 'Firoz' }
      }
    ];

    const mockRepairParts = [
      { repair_id: 'rep_01', total_cost: 0 }
    ];

    const mockRepairPayments = [
      { repair_id: 'rep_01', payment_method: 'CASH', amount: 4100 },
      { repair_id: 'rep_01', payment_method: 'UPI', amount: 1000 }
    ];

    const mockProfiles = [
      { id: 'usr_tech_01', full_name: 'Munnu Technician', role: 'TECHNICIAN' }
    ];

    const mockSnapshots = [
      {
        repair_id: 'rep_01',
        service_revenue: 5100,
        parts_cost: 0,
        net_repair_profit: 5100,
        owner_share: 1530,
        technician_share: 3570,
        technician_id: 'usr_tech_01',
        calculated_at: '2026-08-17T11:00:00Z',
        technician: { full_name: 'Munnu Technician', role: 'TECHNICIAN' },
        repair_job: mockRepairs[0]
      }
    ];

    const mockProducts = [
      { id: 'prod_01', name: 'Remote Control', product_code: 'REM-01', stock_quantity: 60, current_cost_price: 89.33, selling_price: 123.33, low_stock_threshold: 5, is_active: true, category: { name: 'Electronics' }, brand: { name: 'Samsung' } }
    ];

    const mockPurchases: any[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sales') {
        const order = vi.fn().mockResolvedValue({ data: mockSales, error: null });
        const lt = vi.fn().mockReturnValue({ order });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'sale_items') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockSaleItems, error: null }) }) } as any;
      }
      if (table === 'sale_payments') {
        const lt = vi.fn().mockResolvedValue({ data: mockSalePayments, error: null });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'repair_jobs') {
        const lt = vi.fn().mockResolvedValue({ data: mockRepairs, error: null });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'repair_parts') {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mockRepairParts, error: null }) }) } as any;
      }
      if (table === 'repair_payments') {
        const lt = vi.fn().mockResolvedValue({ data: mockRepairPayments, error: null });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'profiles') {
        return { select: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) } as any;
      }
      if (table === 'repair_profit_snapshots') {
        const lt = vi.fn().mockResolvedValue({ data: mockSnapshots, error: null });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      if (table === 'products') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProducts, error: null }) }) } as any;
      }
      if (table === 'purchases') {
        const order = vi.fn().mockResolvedValue({ data: mockPurchases, error: null });
        const lt = vi.fn().mockReturnValue({ order });
        const gte = vi.fn().mockReturnValue({ lt });
        return { select: vi.fn().mockReturnValue({ gte }) } as any;
      }
      return {} as any;
    });

    const bounds = reportsService.getDateRangeBounds('TODAY');
    const report = await businessReportExportService.fetchReportData(bounds);

    // 4. Sales aggregation
    expect(report.salesSummary.salesCount).toBe(1);
    expect(report.salesSummary.totalRevenue).toBe(1500);

    // 5. Historical product cost & 6. Product profit
    expect(report.salesSummary.totalCost).toBe(1000); // 2 * 500
    expect(report.salesSummary.totalProfit).toBe(500); // 1500 - 1000

    // 7. Repair revenue & 8. Parts cost & 9. Repair profit
    expect(report.repairSummary.totalServiceRevenue).toBe(5100);
    expect(report.repairSummary.totalPartsCost).toBe(0);
    expect(report.repairSummary.netRepairProfit).toBe(5100);

    // 10. Owner share & 11. Technician share
    expect(report.repairSummary.totalOwnerShare).toBe(1530);
    expect(report.repairSummary.totalTechnicianPayout).toBe(3570);

    // 12. Worker performance
    expect(report.workerPerformance).toHaveLength(1);
    expect(report.workerPerformance[0].workerName).toBe('Munnu Technician');
    expect(report.workerPerformance[0].technicianShare).toBe(3570);

    // 13. Cash/UPI/Card totals
    expect(report.paymentSummary.posUpi).toBe(1500);
    expect(report.paymentSummary.repairCash).toBe(4100);
    expect(report.paymentSummary.repairUpi).toBe(1000);
    expect(report.paymentSummary.totalCash).toBe(4100);
    expect(report.paymentSummary.totalUpi).toBe(2500);
    expect(report.paymentSummary.totalCollected).toBe(6600);

    // 14. Inventory valuation
    expect(report.inventorySummary.totalStockUnits).toBe(60);
    expect(report.inventorySummary.currentInventoryValue).toBe(5359.8);
    expect(report.inventorySummary.potentialSalesValue).toBe(7399.8);
  });
});
