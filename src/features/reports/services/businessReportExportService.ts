import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportsService, DateRangeBounds } from './reportsService';

export interface DetailedReportData {
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;

  // 1. SALES PERFORMANCE
  salesSummary: {
    salesCount: number;
    totalProductsSold: number;
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

  // 2. REPAIR SERVICE PERFORMANCE
  repairSummary: {
    newTicketsCount: number;
    completedCount: number;
    deliveredCount: number;
    pendingCount: number;
    totalServiceRevenue: number;
    totalPartsCost: number;
    netRepairProfit: number;
    totalOwnerShare: number;
    totalTechnicianPayout: number;
    amountCollected: number;
    amountPending: number;
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
    amountDue: number;
    status: string;
    financialStatus: string;
  }[];

  // 3. SEPARATED PAYMENT COLLECTIONS
  paymentSummary: {
    salesCash: number;
    salesUpi: number;
    salesCard: number;
    totalSalesCollection: number;
    repairCash: number;
    repairUpi: number;
    repairCard: number;
    totalRepairCollection: number;
    totalCash: number;
    totalUpi: number;
    totalCard: number;
    totalCollected: number;
  };

  // 4. OVERALL BUSINESS TOTAL
  overallSummary: {
    totalBusinessRevenue: number;
    totalBusinessProfit: number;
    totalMoneyCollected: number;
  };

  // 5. WORKER PERFORMANCE
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

  // 6. REPAIR STATUS WORKLOAD (Current active workload across shop)
  repairStatusCounts: Record<string, number>;

  // 7. INVENTORY SNAPSHOT
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

  businessActivity: {
    salesCompleted: number;
    repairsReceived: number;
    repairsCompleted: number;
    repairsPending: number;
    totalProductsSold: number;
    ownerServicesCompleted: number;
    technicianServicesCompleted: number;
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
      endExclusive = endExclusiveStr || (boundsOrStart as string);
      periodLabel = labelStr || 'Report Period';
      startDateStr = new Date(startInclusive).toLocaleDateString('en-IN');
      endDateStr = new Date(endExclusive).toLocaleDateString('en-IN');
    }

    // ----------------------------------------------------------------------
    // 1. REUSE AUTHORITATIVE REPORTS SERVICE DATA DIRECTLY
    // ----------------------------------------------------------------------
    const [salesAnalytics, ownerOverview, repairPerfReport, invAnalytics] = await Promise.all([
      reportsService.getSalesAnalytics(startInclusive, endExclusive),
      reportsService.getOwnerFinancialOverview(startInclusive, endExclusive, 'OWNER'),
      reportsService.getRepairServicePerformanceReport(startInclusive, endExclusive, 'OWNER'),
      reportsService.getInventoryAnalytics(),
    ]);

    // Sales Summary & Items
    const salesCount = salesAnalytics.salesCount;
    const totalSalesRevenue = salesAnalytics.totalRevenue;
    const totalSalesCost = salesAnalytics.productProfitability.totalActualCost;
    const totalSalesProfit = salesAnalytics.productProfitability.totalGrossProfit;
    const totalProductsSold = salesAnalytics.productProfitability.totalQtySold;

    // Map Sales Payments (POS) from sales analytics payment breakdown
    let salesCash = 0, salesUpi = 0, salesCard = 0;
    salesAnalytics.paymentMethodBreakdown.forEach((p) => {
      const amt = Number(p.amount || 0);
      if (p.method === 'CASH') salesCash += amt;
      if (p.method === 'UPI') salesUpi += amt;
      if (p.method === 'CARD') salesCard += amt;
    });
    const totalSalesCollection = salesCash + salesUpi + salesCard;

    // Detailed Product Sales Items from sales list
    const salesItemsDetailed: DetailedReportData['salesItems'] = salesAnalytics.productProfitability.products.map((p) => ({
      date: startDateStr,
      saleNumber: 'POS-SALE',
      customerName: 'POS Customer',
      productName: p.name,
      sku: p.code || 'N/A',
      quantity: p.qtySold,
      unitCost: p.qtySold > 0 ? p.actualCost / p.qtySold : 0,
      unitPrice: p.qtySold > 0 ? p.sellingRevenue / p.qtySold : 0,
      totalCost: p.actualCost,
      totalRevenue: p.sellingRevenue,
      actualProfit: p.grossProfit,
      paymentMethod: 'POS',
    }));

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
    const totalRepairCollection = repairCash + repairUpi + repairCard;

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

    // Fetch ALL Current Repair Jobs (for true Repair Status Workload & Detailed Repair List across shop)
    const { data: currentAllRepairs } = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_brand, device_type, device_model, reported_problem, status, financial_status, payment_status, service_revenue, quoted_amount, created_at, customer:customers(full_name, phone), technician:profiles!repair_jobs_technician_id_fkey(full_name, role)');

    const allRepairsList = currentAllRepairs || [];
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

    allRepairsList.forEach((r: any) => {
      const st = r.status || 'RECEIVED';
      if (repairStatusCounts[st] !== undefined) {
        repairStatusCounts[st] += 1;
      }
    });

    // Itemized Repair Details for Period / Workload
    const repairItemsDetailed: DetailedReportData['repairItems'] = allRepairsList.map((r: any) => {
      const rev = Number(r.service_revenue || r.quoted_amount || 0);
      return {
        repairDate: new Date(r.created_at).toLocaleDateString('en-IN'),
        ticketNumber: r.job_number || 'REP-000',
        customerName: r.customer?.full_name || 'Customer',
        deviceInfo: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || 'Device',
        workerName: r.technician?.full_name || 'Unassigned',
        workerRole: r.technician?.role || 'TECHNICIAN',
        serviceRevenue: rev,
        partsCost: 0,
        netProfit: rev,
        ownerShare: rev,
        technicianShare: 0,
        amountCollected: r.status === 'DELIVERED' ? rev : 0,
        amountDue: r.status === 'DELIVERED' ? 0 : rev,
        status: r.status,
        financialStatus: r.financial_status,
      };
    });

    // Period specific new tickets count & pending count
    const periodNewTickets = allRepairsList.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= new Date(startInclusive).getTime() && t < new Date(endExclusive).getTime();
    }).length;

    const pendingCount = allRepairsList.filter((r) => r.status !== 'DELIVERED' && r.status !== 'CANCELLED').length;
    const deliveredCount = allRepairsList.filter((r) => r.status === 'DELIVERED').length;

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

    return {
      periodLabel,
      startDateStr,
      endDateStr,

      salesSummary: {
        salesCount,
        totalProductsSold,
        totalRevenue: totalSalesRevenue,
        totalCost: totalSalesCost,
        totalProfit: totalSalesProfit,
      },
      salesItems: salesItemsDetailed,

      repairSummary: {
        newTicketsCount: periodNewTickets,
        completedCount,
        deliveredCount,
        pendingCount,
        totalServiceRevenue,
        totalPartsCost,
        netRepairProfit,
        totalOwnerShare,
        totalTechnicianPayout,
        amountCollected: totalRepairCollection,
        amountPending: Math.max(0, totalServiceRevenue - totalRepairCollection),
      },
      repairItems: repairItemsDetailed,

      paymentSummary: {
        salesCash,
        salesUpi,
        salesCard,
        totalSalesCollection,
        repairCash,
        repairUpi,
        repairCard,
        totalRepairCollection,
        totalCash: salesCash + repairCash,
        totalUpi: salesUpi + repairUpi,
        totalCard: salesCard + repairCard,
        totalCollected: totalSalesCollection + totalRepairCollection,
      },

      overallSummary: {
        totalBusinessRevenue: totalSalesRevenue + totalServiceRevenue,
        totalBusinessProfit: totalSalesProfit + netRepairProfit,
        totalMoneyCollected: totalSalesCollection + totalRepairCollection,
      },

      workerPerformance,
      repairStatusCounts,

      businessActivity: {
        salesCompleted: salesCount,
        repairsReceived: periodNewTickets,
        repairsCompleted: completedCount,
        repairsPending: pendingCount,
        totalProductsSold,
        ownerServicesCompleted,
        technicianServicesCompleted,
      },

      inventorySummary: invSummary,
      inventoryItems: inventoryItemsDetailed,
    };
  },

  exportToExcel(data: DetailedReportData): void {
    const wb = XLSX.utils.book_new();

    // Sheet 1: SUMMARY (Raw numbers for formulas)
    const summaryRows = [
      ['FAHAD ERP — BUSINESS REPORT SUMMARY'],
      ['Reporting Period:', data.periodLabel],
      [],
      ['1. SALES PERFORMANCE'],
      ['Total Sales Revenue (INR):', data.salesSummary.totalRevenue],
      ['Total Product Cost (INR):', data.salesSummary.totalCost],
      ['Total Product Profit (INR):', data.salesSummary.totalProfit],
      ['Sales Items Sold:', data.salesSummary.totalProductsSold],
      [],
      ['2. REPAIR SERVICE PERFORMANCE'],
      ['Total Repair Service Revenue (INR):', data.repairSummary.totalServiceRevenue],
      ['Total Repair Parts Cost (INR):', data.repairSummary.totalPartsCost],
      ['Net Repair Profit (INR):', data.repairSummary.netRepairProfit],
      ['Owner Repair Share (INR):', data.repairSummary.totalOwnerShare],
      ['Technician Payout Share (INR):', data.repairSummary.totalTechnicianPayout],
      [],
      ['3. OVERALL BUSINESS TOTALS'],
      ['TOTAL BUSINESS REVENUE (INR):', data.overallSummary.totalBusinessRevenue],
      ['TOTAL BUSINESS PROFIT (INR):', data.overallSummary.totalBusinessProfit],
      ['TOTAL MONEY COLLECTED (INR):', data.overallSummary.totalMoneyCollected],
      [],
      ['4. PAYMENT COLLECTION BY CHANNEL'],
      ['Sales Cash (INR):', data.paymentSummary.salesCash],
      ['Sales UPI (INR):', data.paymentSummary.salesUpi],
      ['Sales Card (INR):', data.paymentSummary.salesCard],
      ['Total Sales Collection (INR):', data.paymentSummary.totalSalesCollection],
      ['Repair Cash (INR):', data.paymentSummary.repairCash],
      ['Repair UPI (INR):', data.paymentSummary.repairUpi],
      ['Repair Card (INR):', data.paymentSummary.repairCard],
      ['Total Repair Collection (INR):', data.paymentSummary.totalRepairCollection],
      ['TOTAL CASH COLLECTED (INR):', data.paymentSummary.totalCash],
      ['TOTAL UPI COLLECTED (INR):', data.paymentSummary.totalUpi],
      ['TOTAL CARD COLLECTED (INR):', data.paymentSummary.totalCard],
      ['TOTAL MONEY COLLECTED (INR):', data.paymentSummary.totalCollected],
      [],
      ['5. REPAIR WORKLOAD STATUS'],
      ['Received:', data.repairStatusCounts['RECEIVED'] || 0],
      ['Diagnosing:', data.repairStatusCounts['DIAGNOSING'] || 0],
      ['Waiting for Parts:', data.repairStatusCounts['WAITING_FOR_PARTS'] || 0],
      ['In Repair:', data.repairStatusCounts['IN_REPAIR'] || 0],
      ['Testing:', data.repairStatusCounts['TESTING'] || 0],
      ['Ready for Pickup:', data.repairStatusCounts['READY_FOR_PICKUP'] || 0],
      ['Delivered:', data.repairStatusCounts['DELIVERED'] || 0],
      ['Cancelled:', data.repairStatusCounts['CANCELLED'] || 0],
      [],
      ['6. CURRENT INVENTORY SNAPSHOT'],
      ['Active Products in Catalog:', data.inventorySummary.totalActiveProducts],
      ['Total Stock Units:', data.inventorySummary.totalStockUnits],
      ['Current Inventory Cost Value (INR):', data.inventorySummary.currentInventoryValue],
      ['Potential Sales Value (INR):', data.inventorySummary.potentialSalesValue],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: SALES DETAILS
    const salesHeader = ['Product Name', 'Quantity', 'Unit Cost (INR)', 'Selling Price (INR)', 'Total Cost (INR)', 'Total Revenue (INR)', 'Profit (INR)', 'Customer', 'Payment Method'];
    const salesDataRows = data.salesItems.map((s) => [
      s.productName,
      s.quantity,
      s.unitCost,
      s.unitPrice,
      s.totalCost,
      s.totalRevenue,
      s.actualProfit,
      s.customerName,
      s.paymentMethod,
    ]);
    const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesDataRows]);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Details');

    // Sheet 3: REPAIR DETAILS
    const repairHeader = ['Customer Name', 'Device Info', 'Worker Name', 'Role', 'Status', 'Service Revenue (INR)', 'Parts Cost (INR)', 'Collected (INR)', 'Due (INR)'];
    const repairDataRows = data.repairItems.map((r) => [
      r.customerName,
      r.deviceInfo,
      r.workerName,
      r.workerRole,
      r.status,
      r.serviceRevenue,
      r.partsCost,
      r.amountCollected,
      r.amountDue,
    ]);
    const wsRepairs = XLSX.utils.aoa_to_sheet([repairHeader, ...repairDataRows]);
    XLSX.utils.book_append_sheet(wb, wsRepairs, 'Repair Details');

    // Sheet 4: WORKER PERFORMANCE
    const workerHeader = ['Worker Name', 'Role', 'Jobs Completed', 'Service Revenue (INR)', 'Parts Cost (INR)', 'Net Profit (INR)', 'Owner Share (INR)', 'Technician Share (INR)'];
    const workerDataRows = data.workerPerformance.map((w) => [
      w.workerName,
      w.workerRole,
      w.completedRepairs,
      w.serviceRevenue,
      w.partsCost,
      w.netProfit,
      w.ownerShare,
      w.technicianShare,
    ]);
    const wsWorker = XLSX.utils.aoa_to_sheet([workerHeader, ...workerDataRows]);
    XLSX.utils.book_append_sheet(wb, wsWorker, 'Worker Performance');

    // Sheet 5: INVENTORY
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginBottom = 15;
    let currentY = 15;

    // Helper to check space & add page dynamically for minimum page count
    const checkAddPage = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - marginBottom) {
        doc.addPage();
        currentY = 15;
      }
    };

    // Strict Rule: Plain numeric formatting only. NO ₹, Rs, ₨, or ¹ characters!
    const fmt = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Document Title & Subtitle Header
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('FAHAD ERP — BUSINESS REPORT', 14, currentY);
    currentY += 6;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${data.periodLabel}`, 14, currentY);
    currentY += 8;

    // ----------------------------------------------------------------------
    // SECTION 1: BUSINESS OVERVIEW (Sales & Repairs Summary)
    // ----------------------------------------------------------------------
    checkAddPage(50);
    autoTable(doc, {
      startY: currentY,
      head: [['1. BUSINESS OVERVIEW', 'Sales (POS)', 'Repair Services', 'Total Business']],
      body: [
        ['Total Revenue (INR)', fmt(data.salesSummary.totalRevenue), fmt(data.repairSummary.totalServiceRevenue), fmt(data.overallSummary.totalBusinessRevenue)],
        ['Direct Cost Basis (INR)', fmt(data.salesSummary.totalCost), fmt(data.repairSummary.totalPartsCost), fmt(data.salesSummary.totalCost + data.repairSummary.totalPartsCost)],
        ['Net Business Profit (INR)', fmt(data.salesSummary.totalProfit), fmt(data.repairSummary.netRepairProfit), fmt(data.overallSummary.totalBusinessProfit)],
        ['Completed Activity Count', `${data.salesSummary.salesCount} Sales (${data.salesSummary.totalProductsSold} items)`, `${data.repairSummary.completedCount} Completed`, '-'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ----------------------------------------------------------------------
    // SECTION 2: PAYMENT COLLECTION (Sales vs Repairs)
    // ----------------------------------------------------------------------
    checkAddPage(45);
    autoTable(doc, {
      startY: currentY,
      head: [['2. PAYMENT COLLECTION BY CHANNEL', 'Sales (POS)', 'Repair Services', 'Total Money Collected']],
      body: [
        ['Cash Collection (INR)', fmt(data.paymentSummary.salesCash), fmt(data.paymentSummary.repairCash), fmt(data.paymentSummary.totalCash)],
        ['UPI Digital Transfer (INR)', fmt(data.paymentSummary.salesUpi), fmt(data.paymentSummary.repairUpi), fmt(data.paymentSummary.totalUpi)],
        ['Card Settlement (INR)', fmt(data.paymentSummary.salesCard), fmt(data.paymentSummary.repairCard), fmt(data.paymentSummary.totalCard)],
        ['TOTAL COLLECTED (INR)', fmt(data.paymentSummary.totalSalesCollection), fmt(data.paymentSummary.totalRepairCollection), fmt(data.paymentSummary.totalCollected)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ----------------------------------------------------------------------
    // SECTION 3: INVENTORY SNAPSHOT
    // ----------------------------------------------------------------------
    checkAddPage(40);
    autoTable(doc, {
      startY: currentY,
      head: [['3. CURRENT INVENTORY SNAPSHOT', 'Value / Amount']],
      body: [
        ['Active Catalog Products', data.inventorySummary.totalActiveProducts.toString()],
        ['Total Stock Units in Shop', data.inventorySummary.totalStockUnits.toString()],
        ['Current Inventory Cost Value (INR)', fmt(data.inventorySummary.currentInventoryValue)],
        ['Potential Sales Value (INR)', fmt(data.inventorySummary.potentialSalesValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ----------------------------------------------------------------------
    // SECTION 4: WORKER PERFORMANCE
    // ----------------------------------------------------------------------
    const workerRows = data.workerPerformance.length > 0
      ? data.workerPerformance.map((w) => [
          w.workerName,
          w.workerRole,
          w.completedRepairs.toString(),
          fmt(w.serviceRevenue),
          fmt(w.netProfit),
          fmt(w.ownerShare),
          fmt(w.technicianShare),
        ])
      : [['No worker activity recorded in period', '-', '0', fmt(0), fmt(0), fmt(0), fmt(0)]];

    workerRows.push([
      'TOTAL REPAIR PERFORMANCE',
      '-',
      data.repairSummary.completedCount.toString(),
      fmt(data.repairSummary.totalServiceRevenue),
      fmt(data.repairSummary.netRepairProfit),
      fmt(data.repairSummary.totalOwnerShare),
      fmt(data.repairSummary.totalTechnicianPayout),
    ]);

    checkAddPage(45);
    autoTable(doc, {
      startY: currentY,
      head: [['4. WORKER PERFORMANCE', 'Role', 'Jobs', 'Revenue (INR)', 'Profit (INR)', 'Owner Share (INR)', 'Tech Share (INR)']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ----------------------------------------------------------------------
    // SECTION 5: REPAIR STATUS WORKLOAD
    // ----------------------------------------------------------------------
    checkAddPage(50);
    autoTable(doc, {
      startY: currentY,
      head: [['5. REPAIR STATUS WORKLOAD (CURRENT SHOP PIPELINE)', 'Repairs Count']],
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

    // ----------------------------------------------------------------------
    // SECTION 6: PRODUCT SALES DETAILS
    // ----------------------------------------------------------------------
    const salesRows = data.salesItems.length > 0
      ? data.salesItems.map((s) => [
          s.productName,
          s.quantity.toString(),
          fmt(s.unitCost),
          fmt(s.unitPrice),
          fmt(s.totalRevenue),
          fmt(s.actualProfit),
          s.paymentMethod,
        ])
      : [['No itemized product sales recorded in period', '0', fmt(0), fmt(0), fmt(0), fmt(0), '-']];

    salesRows.push([
      `TOTAL PRODUCT SALES (${data.salesSummary.totalProductsSold} items)`,
      '-',
      '-',
      '-',
      fmt(data.salesSummary.totalRevenue),
      fmt(data.salesSummary.totalProfit),
      '-',
    ]);

    checkAddPage(50);
    autoTable(doc, {
      startY: currentY,
      head: [['6. PRODUCT SALES DETAILS', 'Qty', 'Cost (INR)', 'Price (INR)', 'Revenue (INR)', 'Profit (INR)', 'Payment']],
      body: salesRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ----------------------------------------------------------------------
    // SECTION 7: REPAIR SERVICE DETAILS
    // ----------------------------------------------------------------------
    const repairDetailRows = data.repairItems.length > 0
      ? data.repairItems.map((r) => [
          r.customerName,
          r.deviceInfo,
          r.workerName,
          r.workerRole,
          r.status,
          fmt(r.serviceRevenue),
          fmt(r.amountCollected),
          fmt(r.amountDue),
        ])
      : [['No repair service tickets logged', '-', '-', '-', '-', fmt(0), fmt(0), fmt(0)]];

    checkAddPage(50);
    autoTable(doc, {
      startY: currentY,
      head: [['7. REPAIR SERVICE DETAILS', 'Device Info', 'Worker Name', 'Role', 'Status', 'Revenue (INR)', 'Collected (INR)', 'Due (INR)']],
      body: repairDetailRows,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5 },
    });

    // Save PDF
    const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FAHAD_ELECTRONICS_Business_Report_${cleanLabel}.pdf`;
    doc.save(filename);
  },
};
