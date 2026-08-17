import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportsService, DateRangeBounds } from './reportsService';

export interface DetailedReportData {
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;

  salesSummary: {
    salesCount: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
  salesItems: {
    date: string;
    saleNumber: string;
    customerName: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    totalCost: number;
    totalRevenue: number;
    actualProfit: number;
    paymentMethod: string;
  }[];

  paymentSummary: {
    posCash: number;
    posUpi: number;
    posCard: number;
    repairCash: number;
    repairUpi: number;
    repairCard: number;
    totalCash: number;
    totalUpi: number;
    totalCard: number;
    totalCollected: number;
  };

  repairSummary: {
    newTicketsCount: number;
    completedCount: number;
    deliveredCount: number;
    totalServiceRevenue: number;
    totalPartsCost: number;
    netRepairProfit: number;
    totalOwnerShare: number;
    totalTechnicianPayout: number;
  };
  repairItems: {
    repairDate: string;
    ticketNumber: string;
    customerName: string;
    deviceInfo: string;
    workerName: string;
    workerRole: string;
    serviceRevenue: number;
    partsCost: number;
    netProfit: number;
    ownerShare: number;
    technicianShare: number;
    amountCollected: number;
    paymentMethods: string;
    status: string;
    financialStatus: string;
  }[];

  workerPerformance: {
    workerName: string;
    workerRole: string;
    completedRepairs: number;
    serviceRevenue: number;
    partsCost: number;
    netProfit: number;
    ownerShare: number;
    technicianShare: number;
  }[];

  repairStatusCounts: Record<string, number>;

  pendingRepairs: {
    customerName: string;
    deviceInfo: string;
    problem: string;
    workerName: string;
    status: string;
    quotedAmount: number;
  }[];

  businessActivity: {
    salesCompleted: number;
    repairsReceived: number;
    repairsCompleted: number;
    repairsPending: number;
    totalProductsSold: number;
    ownerServicesCompleted: number;
    technicianServicesCompleted: number;
  };

  inventorySummary: {
    totalActiveProducts: number;
    totalStockUnits: number;
    currentInventoryValue: number;
    potentialSalesValue: number;
    potentialGrossMargin: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  inventoryItems: {
    productName: string;
    sku: string;
    categoryName: string;
    brandName: string;
    stockQuantity: number;
    costPrice: number;
    sellingPrice: number;
    inventoryValue: number;
    status: string;
  }[];

  purchaseSummary: {
    purchasesCount: number;
    totalUnitsPurchased: number;
    totalPurchaseValue: number;
  };
  purchaseItems: {
    purchaseDate: string;
    purchaseNumber: string;
    supplierName: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    discount: number;
    finalAmount: number;
    paymentStatus: string;
  }[];

  operationalSummary: {
    activeRepairsCount: number;
    readyForPickupCount: number;
    unpaidRepairsCount: number;
    unpaidRepairsAmount: number;
    partiallyPaidRepairsCount: number;
  };
}

export const businessReportExportService = {
  async fetchReportData(boundsOrStart: DateRangeBounds | string, endExclusiveStr?: string, labelStr?: string): Promise<DetailedReportData> {
    let startInclusive: string;
    let endExclusive: string;
    let periodLabel: string;
    let startDateStr: string;
    let endDateStr: string;

    if (typeof boundsOrStart === 'object' && boundsOrStart.startInclusive) {
      startInclusive = boundsOrStart.startInclusive;
      endExclusive = boundsOrStart.endExclusive;
      periodLabel = boundsOrStart.periodLabel;
      startDateStr = boundsOrStart.displayStart;
      endDateStr = boundsOrStart.displayEnd;
    } else {
      startInclusive = boundsOrStart as string;
      endExclusive = endExclusiveStr || boundsOrStart as string;
      periodLabel = labelStr || 'Report Period';
      startDateStr = new Date(startInclusive).toLocaleDateString('en-IN');
      endDateStr = new Date(endExclusive).toLocaleDateString('en-IN');
    }

    // ----------------------------------------------------------------------
    // 1. REUSE AUTHORITATIVE REPORTS SERVICE DATA DIRECTLY
    // ----------------------------------------------------------------------
    const [salesAnalytics, ownerOverview, repairPerfReport, invAnalytics, repairAnalytics] = await Promise.all([
      reportsService.getSalesAnalytics(startInclusive, endExclusive),
      reportsService.getOwnerFinancialOverview(startInclusive, endExclusive, 'OWNER'),
      reportsService.getRepairServicePerformanceReport(startInclusive, endExclusive, 'OWNER'),
      reportsService.getInventoryAnalytics(),
      reportsService.getRepairAnalytics(startInclusive, endExclusive, 'OWNER'),
    ]);

    // Sales Summary & Items
    const salesCount = salesAnalytics.salesCount;
    const totalSalesRevenue = salesAnalytics.totalRevenue;
    const totalSalesCost = salesAnalytics.productProfitability.totalActualCost;
    const totalSalesProfit = salesAnalytics.productProfitability.totalGrossProfit;

    // Map POS Payments from sales analytics payment breakdown
    let posCash = 0, posUpi = 0, posCard = 0;
    salesAnalytics.paymentMethodBreakdown.forEach((p) => {
      const amt = Number(p.amount || 0);
      if (p.method === 'CASH') posCash += amt;
      if (p.method === 'UPI') posUpi += amt;
      if (p.method === 'CARD') posCard += amt;
    });

    // Detailed Product Sales Items from sales list
    let salesItemsDetailed: DetailedReportData['salesItems'] = [];
    let totalProductsSold = salesAnalytics.productProfitability.totalQtySold;

    salesAnalytics.productProfitability.products.forEach((p) => {
      salesItemsDetailed.push({
        date: startDateStr,
        saleNumber: 'POS-SALE',
        customerName: 'Customer',
        productName: p.name,
        sku: p.code || 'N/A',
        quantity: p.qtySold,
        unitCost: p.qtySold > 0 ? p.actualCost / p.qtySold : 0,
        unitPrice: p.qtySold > 0 ? p.sellingRevenue / p.qtySold : 0,
        totalCost: p.actualCost,
        totalRevenue: p.sellingRevenue,
        actualProfit: p.grossProfit,
        paymentMethod: 'POS',
      });
    });

    // Repair Summary & Worker Shares from Authoritative Snapshot Overview
    const totalServiceRevenue = ownerOverview?.repairRevenue || repairPerfReport?.totalServiceRevenue || 0;
    const totalPartsCost = ownerOverview?.repairPartsCost || repairPerfReport?.totalPartsCost || 0;
    const netRepairProfit = ownerOverview?.netRepairProfit || repairPerfReport?.totalNetProfit || 0;
    const totalOwnerShare = ownerOverview?.ownerRepairShare || repairPerfReport?.totalOwnerShare || 0;
    const totalTechnicianPayout = ownerOverview?.technicianRepairShare || repairPerfReport?.totalTechnicianPayout || 0;

    const completedCount = repairPerfReport?.totalRepairsCompleted || 0;
    const ownerServicesCompleted = repairPerfReport?.ownerRepairsCount || 0;
    const technicianServicesCompleted = repairPerfReport?.technicianRepairsCount || 0;

    // Fetch Repair Payments collected in period
    let repairCash = 0, repairUpi = 0, repairCard = 0;
    const { data: rPayData } = await supabase
      .from('repair_payments')
      .select('payment_method, amount, created_at')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    (rPayData || []).forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if (p.payment_method === 'CASH') repairCash += amt;
      if (p.payment_method === 'UPI') repairUpi += amt;
      if (p.payment_method === 'CARD') repairCard += amt;
    });

    // Worker Performance list directly from repairPerfReport
    const workerPerformance: DetailedReportData['workerPerformance'] = (repairPerfReport?.allWorkersComparison || []).map((w) => ({
      workerName: w.workerName,
      workerRole: w.workerRole,
      completedRepairs: w.servicesCompleted,
      serviceRevenue: w.serviceRevenue,
      partsCost: w.partsCost,
      netProfit: w.netProfit,
      ownerShare: w.ownerShare,
      technicianShare: w.technicianShare,
    }));

    // Fetch Repair Workload & Pending Repairs
    const { data: periodRepairs } = await supabase
      .from('repair_jobs')
      .select('id, repair_number, device_brand, device_model, problem_description, status, payment_status, quoted_amount, service_revenue, created_at, customer:customers(name), technician:profiles!repair_jobs_technician_id_fkey(full_name)')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    const periodRepairList = periodRepairs || [];
    const newTicketsCount = periodRepairList.length;

    const repairStatusCounts: Record<string, number> = {
      RECEIVED: 0,
      DIAGNOSING: 0,
      WAITING_FOR_PARTS: 0,
      IN_REPAIR: 0,
      TESTING: 0,
      READY_FOR_PICKUP: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let pendingRepairsDetailed: DetailedReportData['pendingRepairs'] = [];

    periodRepairList.forEach((r: any) => {
      const st = r.status || 'RECEIVED';
      if (repairStatusCounts[st] !== undefined) {
        repairStatusCounts[st] += 1;
      } else {
        repairStatusCounts[st] = 1;
      }

      if (st !== 'DELIVERED' && st !== 'CANCELLED') {
        pendingRepairsDetailed.push({
          customerName: r.customer?.name || 'Walk-in Customer',
          deviceInfo: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || 'Device',
          problem: r.problem_description || 'Service Request',
          workerName: r.technician?.full_name || 'Unassigned',
          status: st,
          quotedAmount: Number(r.quoted_amount || r.service_revenue || 0),
        });
      }
    });

    // Inventory Summary from Authoritative invAnalytics
    const invSummary = {
      totalActiveProducts: invAnalytics.totalActiveProducts,
      totalStockUnits: invAnalytics.inventoryValuation.totalInventoryUnits,
      currentInventoryValue: invAnalytics.inventoryValuation.totalInventoryCostValue,
      potentialSalesValue: invAnalytics.inventoryValuation.totalPotentialSalesValue,
      potentialGrossMargin: invAnalytics.inventoryValuation.totalPotentialGrossMargin,
      lowStockCount: invAnalytics.lowStockCount,
      outOfStockCount: invAnalytics.outOfStockCount,
    };

    const inventoryItemsDetailed: DetailedReportData['inventoryItems'] = invAnalytics.inventoryValuation.items.map((i) => ({
      productName: i.name,
      sku: i.code || 'N/A',
      categoryName: 'Electronics',
      brandName: 'Generic',
      stockQuantity: i.stockQuantity,
      costPrice: i.currentCostPrice,
      sellingPrice: i.currentSellingPrice,
      inventoryValue: i.inventoryCostValue,
      status: i.stockQuantity === 0 ? 'OUT_OF_STOCK' : i.stockQuantity <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
    }));

    // Diagnostic Log Trace
    console.log(`========== BUSINESS REPORT EXPORT DEBUG ==========
REPORT RANGE: ${periodLabel}
startInclusive: ${startInclusive}
endExclusive: ${endExclusive}

SALES: count=${salesCount}, revenue=${totalSalesRevenue}, cost=${totalSalesCost}, profit=${totalSalesProfit}
REPAIRS: count=${completedCount}, revenue=${totalServiceRevenue}, partsCost=${totalPartsCost}, netProfit=${netRepairProfit}
PROFIT SHARES: ownerShare=${totalOwnerShare}, techShare=${totalTechnicianPayout}
WORKERS: count=${workerPerformance.length}
PAYMENTS: posCash=${posCash}, posUpi=${posUpi}, posCard=${posCard}, repairCash=${repairCash}, repairUpi=${repairUpi}, repairCard=${repairCard}, total=${posCash + repairCash + posUpi + repairUpi + posCard + repairCard}
INVENTORY: activeProds=${invSummary.totalActiveProducts}, stockUnits=${invSummary.totalStockUnits}, costVal=${invSummary.currentInventoryValue}, salesVal=${invSummary.potentialSalesValue}
==================================================`);

    return {
      periodLabel,
      startDateStr,
      endDateStr,

      salesSummary: {
        salesCount,
        totalRevenue: totalSalesRevenue,
        totalCost: totalSalesCost,
        totalProfit: totalSalesProfit,
      },
      salesItems: salesItemsDetailed,

      paymentSummary: {
        posCash,
        posUpi,
        posCard,
        repairCash,
        repairUpi,
        repairCard,
        totalCash: posCash + repairCash,
        totalUpi: posUpi + repairUpi,
        totalCard: posCard + repairCard,
        totalCollected: posCash + repairCash + posUpi + repairUpi + posCard + repairCard,
      },

      repairSummary: {
        newTicketsCount,
        completedCount,
        deliveredCount: completedCount,
        totalServiceRevenue,
        totalPartsCost,
        netRepairProfit,
        totalOwnerShare,
        totalTechnicianPayout,
      },
      repairItems: [],

      workerPerformance,

      repairStatusCounts,
      pendingRepairs: pendingRepairsDetailed,

      businessActivity: {
        salesCompleted: salesCount,
        repairsReceived: newTicketsCount,
        repairsCompleted: completedCount,
        repairsPending: Math.max(0, newTicketsCount - completedCount),
        totalProductsSold,
        ownerServicesCompleted,
        technicianServicesCompleted,
      },

      inventorySummary: invSummary,
      inventoryItems: inventoryItemsDetailed,

      purchaseSummary: {
        purchasesCount: 0,
        totalUnitsPurchased: 0,
        totalPurchaseValue: 0,
      },
      purchaseItems: [],

      operationalSummary: {
        activeRepairsCount: Math.max(0, newTicketsCount - completedCount),
        readyForPickupCount: repairAnalytics.readyForPickupCount,
        unpaidRepairsCount: 0,
        unpaidRepairsAmount: 0,
        partiallyPaidRepairsCount: 0,
      },
    };
  },

  exportToExcel(data: DetailedReportData): void {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Owner Summary (RAW NUMERIC VALUES for cell formulas =SUM(...))
    const summaryRows = [
      ['FAHAD ERP — BUSINESS REPORT SUMMARY'],
      ['Reporting Period:', data.periodLabel],
      [],
      ['1. BUSINESS SUMMARY'],
      ['Total Sales (INR):', data.salesSummary.totalRevenue],
      ['Total Product Profit (INR):', data.salesSummary.totalProfit],
      ['Total Repair Revenue (INR):', data.repairSummary.totalServiceRevenue],
      ['Total Repair Profit (INR):', data.repairSummary.netRepairProfit],
      ['TOTAL BUSINESS PROFIT (INR):', data.salesSummary.totalProfit + data.repairSummary.netRepairProfit],
      ['TOTAL MONEY COLLECTED (INR):', data.paymentSummary.totalCollected],
      [],
      ['2. BUSINESS ACTIVITY COUNTS'],
      ['Sales Completed:', data.businessActivity.salesCompleted],
      ['Repairs Received:', data.businessActivity.repairsReceived],
      ['Repairs Completed:', data.businessActivity.repairsCompleted],
      ['Repairs Pending:', data.businessActivity.repairsPending],
      ['Products Sold:', data.businessActivity.totalProductsSold],
      ['Owner Services Completed:', data.businessActivity.ownerServicesCompleted],
      ['Technician Services Completed:', data.businessActivity.technicianServicesCompleted],
      [],
      ['3. MONEY COLLECTED BY CHANNEL'],
      ['Cash (INR):', data.paymentSummary.totalCash],
      ['UPI (INR):', data.paymentSummary.totalUpi],
      ['Card (INR):', data.paymentSummary.totalCard],
      ['TOTAL COLLECTED (INR):', data.paymentSummary.totalCollected],
      [],
      ['4. REPAIR WORKLOAD STATUS'],
      ['Received:', data.repairStatusCounts['RECEIVED'] || 0],
      ['Diagnosing:', data.repairStatusCounts['DIAGNOSING'] || 0],
      ['Waiting for Parts:', data.repairStatusCounts['WAITING_FOR_PARTS'] || 0],
      ['In Repair:', data.repairStatusCounts['IN_REPAIR'] || 0],
      ['Testing:', data.repairStatusCounts['TESTING'] || 0],
      ['Ready for Pickup:', data.repairStatusCounts['READY_FOR_PICKUP'] || 0],
      ['Delivered:', data.repairStatusCounts['DELIVERED'] || 0],
      ['Cancelled:', data.repairStatusCounts['CANCELLED'] || 0],
      [],
      ['5. INVENTORY SNAPSHOT'],
      ['Active Products in Catalog:', data.inventorySummary.totalActiveProducts],
      ['Total Stock Units:', data.inventorySummary.totalStockUnits],
      ['Current Inventory Cost (INR):', data.inventorySummary.currentInventoryValue],
      ['Potential Sales Value (INR):', data.inventorySummary.potentialSalesValue],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Product Sales
    const salesHeader = ['Product Name', 'Quantity', 'Selling Price (INR)', 'Total Sale (INR)', 'Product Profit (INR)', 'Date', 'Customer', 'Payment Method'];
    const salesDataRows = data.salesItems.map((s) => [
      s.productName,
      s.quantity,
      s.unitPrice,
      s.totalRevenue,
      s.actualProfit,
      s.date,
      s.customerName,
      s.paymentMethod,
    ]);
    const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesDataRows]);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Product Sales');

    // Sheet 3: Worker Performance
    const workerHeader = ['Worker Name', 'Role', 'Jobs Completed', 'Work Value (INR)', 'Worker Share (INR)', 'Owner Share (INR)'];
    const workerDataRows = data.workerPerformance.map((w) => [
      w.workerName,
      w.workerRole,
      w.completedRepairs,
      w.serviceRevenue,
      w.technicianShare,
      w.ownerShare,
    ]);
    const wsWorker = XLSX.utils.aoa_to_sheet([workerHeader, ...workerDataRows]);
    XLSX.utils.book_append_sheet(wb, wsWorker, 'Worker Performance');

    // Sheet 4: Inventory
    const invHeader = ['Product Name', 'SKU', 'Category', 'Brand', 'Stock Qty', 'Cost Price (INR)', 'Selling Price (INR)', 'Inventory Value (INR)', 'Stock Status'];
    const invDataRows = data.inventoryItems.map((i) => [
      i.productName,
      i.sku,
      i.categoryName,
      i.brandName,
      i.stockQuantity,
      i.costPrice,
      i.sellingPrice,
      i.inventoryValue,
      i.status,
    ]);
    const wsInv = XLSX.utils.aoa_to_sheet([invHeader, ...invDataRows]);
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory');

    // Save Workbook
    const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FAHAD_ELECTRONICS_Business_Report_${cleanLabel}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  exportToPDF(data: DetailedReportData): void {
    const doc = new jsPDF();
    let currentY = 15;

    // Document Title & Subtitle Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FAHAD ERP — BUSINESS REPORT', 14, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${data.periodLabel}`, 14, currentY);
    currentY += 8;

    // STRICT RULE: Plain numeric formatting ONLY. NO "₹", "Rs", "INR", or "¹" characters inside data cells!
    const fmt = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // PAGE 1: SECTIONS 1, 2, 3, & 4
    // 1. BUSINESS SUMMARY
    autoTable(doc, {
      startY: currentY,
      head: [['1. BUSINESS SUMMARY', 'Amount (INR)']],
      body: [
        ['Total Sales', fmt(data.salesSummary.totalRevenue)],
        ['Total Product Profit', fmt(data.salesSummary.totalProfit)],
        ['Total Repair Revenue', fmt(data.repairSummary.totalServiceRevenue)],
        ['Total Repair Profit', fmt(data.repairSummary.netRepairProfit)],
        ['TOTAL BUSINESS PROFIT', fmt(data.salesSummary.totalProfit + data.repairSummary.netRepairProfit)],
        ['TOTAL MONEY COLLECTED', fmt(data.paymentSummary.totalCollected)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 2. BUSINESS ACTIVITY
    autoTable(doc, {
      startY: currentY,
      head: [['2. BUSINESS ACTIVITY', 'Count / Total']],
      body: [
        ['Sales Completed', data.businessActivity.salesCompleted.toString()],
        ['Repairs Received', data.businessActivity.repairsReceived.toString()],
        ['Repairs Completed', data.businessActivity.repairsCompleted.toString()],
        ['Repairs Pending', data.businessActivity.repairsPending.toString()],
        ['Total Products Sold', data.businessActivity.totalProductsSold.toString()],
        ['Owner Services Completed', data.businessActivity.ownerServicesCompleted.toString()],
        ['Technician Services Completed', data.businessActivity.technicianServicesCompleted.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 3. MONEY COLLECTED
    autoTable(doc, {
      startY: currentY,
      head: [['3. MONEY COLLECTED', 'Amount (INR)']],
      body: [
        ['Cash', fmt(data.paymentSummary.totalCash)],
        ['UPI', fmt(data.paymentSummary.totalUpi)],
        ['Card', fmt(data.paymentSummary.totalCard)],
        ['TOTAL', fmt(data.paymentSummary.totalCollected)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 4. PRODUCT SALES
    const salesRows = data.salesItems.length > 0
      ? data.salesItems.map((s) => [
          s.productName,
          s.quantity.toString(),
          fmt(s.unitPrice),
          fmt(s.totalRevenue),
        ])
      : [['No product sales recorded in period', '0', fmt(0), fmt(0)]];

    salesRows.push([
      `Total Products Sold: ${data.businessActivity.totalProductsSold}`,
      '-',
      `Total Sales: ${fmt(data.salesSummary.totalRevenue)}`,
      `Total Product Profit: ${fmt(data.salesSummary.totalProfit)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['4. PRODUCT SALES', 'Quantity', 'Selling Price (INR)', 'Total Sale (INR)']],
      body: salesRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    // PAGE 2: SECTIONS 5, 6, 7, & 8
    doc.addPage();
    currentY = 15;

    // 5. REPAIR / WORKER PERFORMANCE
    const workerRows = data.workerPerformance.length > 0
      ? data.workerPerformance.map((w) => [
          w.workerName,
          w.workerRole,
          w.completedRepairs.toString(),
          fmt(w.serviceRevenue),
          fmt(w.technicianShare),
        ])
      : [['No repair worker activity for this period', '-', '0', fmt(0), fmt(0)]];

    workerRows.push([
      `Total Repairs Completed: ${data.repairSummary.completedCount}`,
      '-',
      '-',
      `Total Owner Share: ${fmt(data.repairSummary.totalOwnerShare)}`,
      `Total Tech Payout: ${fmt(data.repairSummary.totalTechnicianPayout)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['5. REPAIR / WORKER PERFORMANCE', 'Role', 'Jobs Completed', 'Work Value (INR)', 'Worker Share (INR)']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 6. REPAIR STATUS WORKLOAD
    autoTable(doc, {
      startY: currentY,
      head: [['6. REPAIR STATUS WORKLOAD', 'Repairs Count']],
      body: [
        ['Received', (data.repairStatusCounts['RECEIVED'] || 0).toString()],
        ['Diagnosing', (data.repairStatusCounts['DIAGNOSING'] || 0).toString()],
        ['Waiting for Parts', (data.repairStatusCounts['WAITING_FOR_PARTS'] || 0).toString()],
        ['In Repair', (data.repairStatusCounts['IN_REPAIR'] || 0).toString()],
        ['Testing', (data.repairStatusCounts['TESTING'] || 0).toString()],
        ['Ready for Pickup', (data.repairStatusCounts['READY_FOR_PICKUP'] || 0).toString()],
        ['Delivered', (data.repairStatusCounts['DELIVERED'] || 0).toString()],
        ['Cancelled', (data.repairStatusCounts['CANCELLED'] || 0).toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 7. PENDING REPAIRS
    const pendingRows = data.pendingRepairs.length > 0
      ? data.pendingRepairs.map((p) => [
          p.customerName,
          p.deviceInfo,
          p.problem,
          p.workerName,
          p.status,
          fmt(p.quotedAmount),
        ])
      : [['No active pending repairs for this period', '-', '-', '-', 'ALL_DELIVERED', fmt(0)]];

    autoTable(doc, {
      startY: currentY,
      head: [['7. PENDING REPAIRS (ACTIVE WORKLOAD)', 'Device', 'Problem Description', 'Assigned Worker', 'Status', 'Quoted Amount (INR)']],
      body: pendingRows,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 8. CURRENT INVENTORY SNAPSHOT
    autoTable(doc, {
      startY: currentY,
      head: [['8. CURRENT INVENTORY SNAPSHOT', 'Value / Amount (INR)']],
      body: [
        ['Active Products in Catalog', data.inventorySummary.totalActiveProducts.toString()],
        ['Total Stock Units', data.inventorySummary.totalStockUnits.toString()],
        ['Current Inventory Cost Value', fmt(data.inventorySummary.currentInventoryValue)],
        ['Potential Sales Value', fmt(data.inventorySummary.potentialSalesValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    // Save PDF
    const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FAHAD_ELECTRONICS_Business_Report_${cleanLabel}.pdf`;
    doc.save(filename);
  },
};
