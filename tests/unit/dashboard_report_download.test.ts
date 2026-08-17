import { describe, it, expect, beforeEach, vi } from 'vitest';
import { businessReportExportService } from '@/features/reports/services/businessReportExportService';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Owner Dashboard Report Download Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Verifies businessReportExportService is called with fresh database data on demand', async () => {
    const fetchSpy = vi.spyOn(businessReportExportService, 'fetchReportData').mockResolvedValue({
      periodLabel: 'Today',
      startDateStr: '17/08/2026',
      endDateStr: '17/08/2026',
      salesSummary: { salesCount: 1, totalRevenue: 1000, totalCost: 600, totalProfit: 400 },
      salesItems: [],
      paymentSummary: { posCash: 1000, posUpi: 0, posCard: 0, repairCash: 0, repairUpi: 0, repairCard: 0, totalCash: 1000, totalUpi: 0, totalCard: 0, totalCollected: 1000 },
      repairSummary: { newTicketsCount: 0, completedCount: 0, deliveredCount: 0, totalServiceRevenue: 0, totalPartsCost: 0, netRepairProfit: 0, totalOwnerShare: 0, totalTechnicianPayout: 0 },
      repairItems: [],
      workerPerformance: [],
      inventorySummary: { totalActiveProducts: 5, totalStockUnits: 50, currentInventoryValue: 15000, potentialSalesValue: 25000, lowStockCount: 0, outOfStockCount: 0 },
      inventoryItems: [],
      purchaseSummary: { purchasesCount: 0, totalUnitsPurchased: 0, totalPurchaseValue: 0 },
      purchaseItems: [],
      operationalSummary: { activeRepairsCount: 0, readyForPickupCount: 0, unpaidRepairsCount: 0, unpaidRepairsAmount: 0, partiallyPaidRepairsCount: 0 },
    });

    const excelSpy = vi.spyOn(businessReportExportService, 'exportToExcel').mockImplementation(() => {});

    const data = await businessReportExportService.fetchReportData('2026-08-17T00:00:00Z', '2026-08-17T23:59:59Z', 'Today');
    businessReportExportService.exportToExcel(data);

    expect(fetchSpy).toHaveBeenCalledWith('2026-08-17T00:00:00Z', '2026-08-17T23:59:59Z', 'Today');
    expect(excelSpy).toHaveBeenCalledWith(data);
  });
});
