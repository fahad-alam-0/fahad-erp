import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRangeBounds } from './reportsService';

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

    // --------------------------------------------------
    // 1. FETCH SALES (gte startInclusive AND lt endExclusive)
    // --------------------------------------------------
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('id, sale_number, sale_date, subtotal, discount, total_amount, created_at, customer:customers(name)')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive)
      .order('created_at', { ascending: true });

    if (salesErr) {
      console.error('Error fetching sales for export:', salesErr);
    }

    const salesList = sales || [];
    const saleIds = salesList.map((s) => s.id);

    // Primary sales revenue sum directly from sales table for 100% reconciliation with Dashboard & Reports
    const totalSalesRevenueFromSalesTable = salesList.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    // Fetch sale payments for period
    let posCash = 0, posUpi = 0, posCard = 0;
    const { data: posPayments } = await supabase
      .from('sale_payments')
      .select('sale_id, payment_method, amount, created_at')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    const salePaymentsMap: Record<string, string[]> = {};
    (posPayments || []).forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if (p.payment_method === 'CASH') posCash += amt;
      if (p.payment_method === 'UPI') posUpi += amt;
      if (p.payment_method === 'CARD') posCard += amt;

      if (!salePaymentsMap[p.sale_id]) salePaymentsMap[p.sale_id] = [];
      salePaymentsMap[p.sale_id].push(p.payment_method);
    });

    // Fetch sale items using historical unit_cost_price
    let salesItemsDetailed: DetailedReportData['salesItems'] = [];
    let totalSalesCost = 0;
    let totalSalesRevenueFromItems = 0;

    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, quantity, unit_selling_price, unit_cost_price, total_selling_amount, product:products(name, product_code)')
        .in('sale_id', saleIds);

      const saleMetaMap = new Map<string, { saleNumber: string; date: string; customerName: string; ratio: number; payMethods: string }>();
      salesList.forEach((s: any) => {
        const sub = Number(s.subtotal || s.total_amount || 0);
        const tot = Number(s.total_amount || 0);
        const ratio = sub > 0 ? tot / sub : 1;
        const custName = s.customer?.name || 'Walk-in Customer';
        const pMethods = (salePaymentsMap[s.id] || ['CASH']).join(', ');
        const dt = new Date(s.sale_date || s.created_at).toLocaleDateString('en-IN');
        saleMetaMap.set(s.id, { saleNumber: s.sale_number, date: dt, customerName: custName, ratio, payMethods: pMethods });
      });

      (items || []).forEach((item: any) => {
        const meta = saleMetaMap.get(item.sale_id);
        const qty = Number(item.quantity || 0);
        const uCost = Number(item.unit_cost_price || 0);
        const uPrice = Number(item.unit_selling_price || 0);
        const unadjRev = Number(item.total_selling_amount || qty * uPrice);
        const lineRev = unadjRev * (meta?.ratio ?? 1);
        const lineCost = qty * uCost;
        const lineProfit = lineRev - lineCost;

        totalSalesCost += lineCost;
        totalSalesRevenueFromItems += lineRev;

        salesItemsDetailed.push({
          date: meta?.date || '',
          saleNumber: meta?.saleNumber || '',
          customerName: meta?.customerName || 'Walk-in Customer',
          productName: item.product?.name || 'Product',
          sku: item.product?.product_code || 'N/A',
          quantity: qty,
          unitCost: uCost,
          unitPrice: uPrice,
          totalCost: lineCost,
          totalRevenue: lineRev,
          actualProfit: lineProfit,
          paymentMethod: meta?.payMethods || 'CASH',
        });
      });
    }

    const totalSalesRevenue = totalSalesRevenueFromSalesTable > 0 ? totalSalesRevenueFromSalesTable : totalSalesRevenueFromItems;
    const totalSalesProfit = totalSalesRevenue - totalSalesCost;

    // --------------------------------------------------
    // 2. FETCH REPAIRS & PROFIT SNAPSHOTS (gte startInclusive AND lt endExclusive)
    // --------------------------------------------------
    const { data: snapData, error: snapErr } = await (supabase.from('repair_profit_snapshots') as any)
      .select('*, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name, role), repair_job:repair_jobs!left(repair_number, device_brand, device_model, status, payment_status, created_at, customer:customers(name))')
      .gte('calculated_at', startInclusive)
      .lt('calculated_at', endExclusive);

    if (snapErr) {
      console.error('Error fetching repair profit snapshots for export:', snapErr);
    }

    const snapsList = snapData || [];

    // Tickets created/received in period
    const { data: periodRepairs } = await supabase
      .from('repair_jobs')
      .select('id, repair_number, status, payment_status, created_at')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    const periodRepairList = periodRepairs || [];
    const newTicketsCount = periodRepairList.length;

    // Fetch repair parts for snapshot repairs
    const snapshotRepairIds = snapsList.map((s: any) => s.repair_id).filter(Boolean);
    const repairPartsMap = new Map<string, number>();
    if (snapshotRepairIds.length > 0) {
      const { data: partsData } = await supabase
        .from('repair_parts')
        .select('repair_id, total_cost')
        .in('repair_id', snapshotRepairIds);

      (partsData || []).forEach((p: any) => {
        const cur = repairPartsMap.get(p.repair_id) || 0;
        repairPartsMap.set(p.repair_id, cur + Number(p.total_cost || 0));
      });
    }

    // Fetch repair payments collected in period (gte startInclusive AND lt endExclusive)
    let repairCash = 0, repairUpi = 0, repairCard = 0;
    const repairPaymentsCollectedMap = new Map<string, number>();
    const repairPaymentMethodsMap = new Map<string, string[]>();

    const { data: rPayData } = await supabase
      .from('repair_payments')
      .select('repair_id, payment_method, amount, created_at')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    (rPayData || []).forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if (p.payment_method === 'CASH') repairCash += amt;
      if (p.payment_method === 'UPI') repairUpi += amt;
      if (p.payment_method === 'CARD') repairCard += amt;

      if (p.repair_id) {
        const curAmt = repairPaymentsCollectedMap.get(p.repair_id) || 0;
        repairPaymentsCollectedMap.set(p.repair_id, curAmt + amt);

        if (!repairPaymentMethodsMap.has(p.repair_id)) repairPaymentMethodsMap.set(p.repair_id, []);
        repairPaymentMethodsMap.get(p.repair_id)!.push(p.payment_method);
      }
    });

    // Process repair summary, items, and worker performance directly from profit snapshots
    let totalServiceRev = 0;
    let totalRepairPartsCost = 0;
    let totalNetRepairProfit = 0;
    let totalOwnerRepairShare = 0;
    let totalTechRepairPayout = 0;
    let completedCount = 0;
    let deliveredCount = 0;
    let unpaidRepairsCount = 0;
    let unpaidRepairsAmount = 0;
    let partiallyPaidCount = 0;

    let repairItemsDetailed: DetailedReportData['repairItems'] = [];
    const workerPerfMap = new Map<string, DetailedReportData['workerPerformance'][0]>();

    snapsList.forEach((sn: any) => {
      const rev = Number(sn.service_revenue || 0);
      const parts = Number(sn.parts_cost || repairPartsMap.get(sn.repair_id) || 0);
      const net = Number(sn.net_repair_profit || 0);
      const oShare = Number(sn.owner_share || 0);
      const tShare = Number(sn.technician_share || 0);

      totalServiceRev += rev;
      totalRepairPartsCost += parts;
      totalNetRepairProfit += net;
      totalOwnerRepairShare += oShare;
      totalTechRepairPayout += tShare;

      const job = sn.repair_job;
      const st = job?.status || 'DELIVERED';
      const paySt = job?.payment_status || 'PAID';
      const amtCollected = repairPaymentsCollectedMap.get(sn.repair_id) || rev;
      const payMethods = (repairPaymentMethodsMap.get(sn.repair_id) || []).join(', ') || 'CASH';

      if (st === 'READY_FOR_PICKUP' || st === 'DELIVERED') completedCount++;
      if (st === 'DELIVERED') deliveredCount++;

      if (paySt === 'UNPAID') {
        unpaidRepairsCount++;
        unpaidRepairsAmount += Math.max(0, rev - amtCollected);
      } else if (paySt === 'PARTIAL') {
        partiallyPaidCount++;
      }

      const wId = sn.technician_id || 'unassigned';
      const wName = sn.technician?.full_name || 'Worker';
      const wRole = sn.technician?.role || (Number(sn.technician_percentage) === 0 ? 'OWNER' : 'TECHNICIAN');

      repairItemsDetailed.push({
        repairDate: new Date(sn.calculated_at || sn.created_at).toLocaleDateString('en-IN'),
        ticketNumber: job?.repair_number || 'REP-JOB',
        customerName: job?.customer?.name || 'Walk-in Customer',
        deviceInfo: `${job?.device_brand || ''} ${job?.device_model || ''}`.trim() || 'Device',
        workerName: wName,
        workerRole: wRole,
        serviceRevenue: rev,
        partsCost: parts,
        netProfit: net,
        ownerShare: oShare,
        technicianShare: tShare,
        amountCollected: amtCollected,
        paymentMethods: payMethods,
        status: st,
        financialStatus: 'FINALIZED',
      });

      // Aggregate Worker Performance directly from snapshots
      if (!workerPerfMap.has(wId)) {
        workerPerfMap.set(wId, {
          workerName: wName,
          workerRole: wRole,
          completedRepairs: 0,
          serviceRevenue: 0,
          partsCost: 0,
          netProfit: 0,
          ownerShare: 0,
          technicianShare: 0,
        });
      }

      const wp = workerPerfMap.get(wId)!;
      wp.completedRepairs += 1;
      wp.serviceRevenue += rev;
      wp.partsCost += parts;
      wp.netProfit += net;
      wp.ownerShare += oShare;
      wp.technicianShare += tShare;
    });

    const workerPerfList = Array.from(workerPerfMap.values());

    // --------------------------------------------------
    // 3. FETCH CURRENT INVENTORY (Always Current Stock Value)
    // --------------------------------------------------
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, product_code, stock_quantity, low_stock_threshold, is_active, current_cost_price, selling_price, category:categories(name), brand:brands(name)')
      .eq('is_active', true);

    if (prodErr) {
      console.error('Error fetching inventory products for export:', prodErr);
    }

    let inventoryItemsDetailed: DetailedReportData['inventoryItems'] = [];
    let totalStockUnits = 0;
    let currentInventoryValue = 0;
    let potentialSalesValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    (products || []).forEach((p: any) => {
      const stock = Number(p.stock_quantity || 0);
      const cCost = Number(p.current_cost_price || 0);
      const sPrice = Number(p.selling_price || 0);
      const threshold = Number(p.low_stock_threshold || 5);
      const itemVal = stock * cCost;
      const potVal = stock * sPrice;

      totalStockUnits += stock;
      currentInventoryValue += itemVal;
      potentialSalesValue += potVal;

      let status = 'IN_STOCK';
      if (stock === 0) {
        status = 'OUT_OF_STOCK';
        outOfStockCount++;
      } else if (stock <= threshold) {
        status = 'LOW_STOCK';
        lowStockCount++;
      }

      inventoryItemsDetailed.push({
        productName: p.name,
        sku: p.product_code || 'N/A',
        categoryName: p.category?.name || 'Uncategorized',
        brandName: p.brand?.name || 'Generic',
        stockQuantity: stock,
        costPrice: cCost,
        sellingPrice: sPrice,
        inventoryValue: itemVal,
        status,
      });
    });

    const potentialGrossMargin = potentialSalesValue - currentInventoryValue;

    // --------------------------------------------------
    // 4. FETCH PURCHASES (gte startInclusive AND lt endExclusive)
    // --------------------------------------------------
    const { data: purchases, error: purErr } = await supabase
      .from('purchases')
      .select('id, purchase_number, purchase_date, total_amount, discount_amount, final_amount, payment_status, created_at, supplier:suppliers(name), purchase_items(quantity, unit_cost_price, product:products(name))')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive)
      .order('created_at', { ascending: true });

    if (purErr) {
      console.error('Error fetching purchases for export:', purErr);
    }

    const purchaseList = purchases || [];
    let purchaseItemsDetailed: DetailedReportData['purchaseItems'] = [];
    let totalPurchaseValue = 0;
    let totalUnitsPurchased = 0;

    purchaseList.forEach((p: any) => {
      const pVal = Number(p.final_amount || p.total_amount || 0);
      totalPurchaseValue += pVal;
      const dt = new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN');
      const supName = p.supplier?.name || 'Unknown Supplier';

      (p.purchase_items || []).forEach((pi: any) => {
        const qty = Number(pi.quantity || 0);
        const uCost = Number(pi.unit_cost_price || 0);
        totalUnitsPurchased += qty;

        purchaseItemsDetailed.push({
          purchaseDate: dt,
          purchaseNumber: p.purchase_number,
          supplierName: supName,
          productName: pi.product?.name || 'Purchased Item',
          quantity: qty,
          unitCost: uCost,
          totalCost: qty * uCost,
          discount: Number(p.discount_amount || 0),
          finalAmount: pVal,
          paymentStatus: p.payment_status || 'PAID',
        });
      });
    });

    // Debug Log Trace
    console.log(`========== BUSINESS REPORT EXPORT DEBUG ==========
REPORT RANGE: ${periodLabel}
startInclusive: ${startInclusive}
endExclusive: ${endExclusive}
TIMEZONE: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

SALES: rowCount=${salesList.length}, revenue=${totalSalesRevenue}, cost=${totalSalesCost}, profit=${totalSalesProfit}
REPAIRS: rowCount=${snapsList.length}, revenue=${totalServiceRev}, partsCost=${totalRepairPartsCost}, profit=${totalNetRepairProfit}
PROFIT SNAPSHOTS: rowCount=${snapsList.length}, ownerShare=${totalOwnerRepairShare}, techShare=${totalTechRepairPayout}
PAYMENTS: posCash=${posCash}, posUpi=${posUpi}, posCard=${posCard}, repairCash=${repairCash}, repairUpi=${repairUpi}, repairCard=${repairCard}, total=${posCash + repairCash + posUpi + repairUpi + posCard + repairCard}
WORKERS: rowCount=${workerPerfList.length}
INVENTORY: productCount=${(products || []).length}, stockUnits=${totalStockUnits}, inventoryValue=${currentInventoryValue}, potentialSalesValue=${potentialSalesValue}
==================================================`);

    return {
      periodLabel,
      startDateStr,
      endDateStr,

      salesSummary: {
        salesCount: salesList.length,
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
        deliveredCount,
        totalServiceRevenue: totalServiceRev,
        totalPartsCost: totalRepairPartsCost,
        netRepairProfit: totalNetRepairProfit,
        totalOwnerShare: totalOwnerRepairShare,
        totalTechnicianPayout: totalTechRepairPayout,
      },
      repairItems: repairItemsDetailed,

      workerPerformance: workerPerfList,

      inventorySummary: {
        totalActiveProducts: (products || []).length,
        totalStockUnits,
        currentInventoryValue,
        potentialSalesValue,
        potentialGrossMargin,
        lowStockCount,
        outOfStockCount,
      },
      inventoryItems: inventoryItemsDetailed,

      purchaseSummary: {
        purchasesCount: purchaseList.length,
        totalUnitsPurchased,
        totalPurchaseValue,
      },
      purchaseItems: purchaseItemsDetailed,

      operationalSummary: {
        activeRepairsCount: Math.max(0, newTicketsCount - deliveredCount),
        readyForPickupCount: Math.max(0, completedCount - deliveredCount),
        unpaidRepairsCount,
        unpaidRepairsAmount,
        partiallyPaidRepairsCount: partiallyPaidCount,
      },
    };
  },

  exportToExcel(data: DetailedReportData): void {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    const summaryRows = [
      ['FAHAD ELECTRONICS — BUSINESS PERFORMANCE REPORT SUMMARY'],
      ['Reporting Period:', data.periodLabel],
      [],
      ['1. SALES SUMMARY'],
      ['Total Completed Sales:', data.salesSummary.salesCount],
      ['Total Sales Revenue (INR):', data.salesSummary.totalRevenue],
      ['Total Product Cost (INR):', data.salesSummary.totalCost],
      ['Total Product Gross Profit (INR):', data.salesSummary.totalProfit],
      [],
      ['2. REPAIR SERVICE SUMMARY'],
      ['New Repair Tickets Intake:', data.repairSummary.newTicketsCount],
      ['Completed / Delivered Repairs:', data.repairSummary.completedCount],
      ['Total Repair Service Revenue (INR):', data.repairSummary.totalServiceRevenue],
      ['Total Repair Parts Cost (INR):', data.repairSummary.totalPartsCost],
      ['Net Repair Profit (INR):', data.repairSummary.netRepairProfit],
      ['Owner Repair Profit Share (INR):', data.repairSummary.totalOwnerShare],
      ['Technician Payout Share (INR):', data.repairSummary.totalTechnicianPayout],
      [],
      ['3. PAYMENT COLLECTION CHANNELS'],
      ['POS Cash Collected (INR):', data.paymentSummary.posCash],
      ['POS UPI Collected (INR):', data.paymentSummary.posUpi],
      ['POS Card Collected (INR):', data.paymentSummary.posCard],
      ['Repair Cash Collected (INR):', data.paymentSummary.repairCash],
      ['Repair UPI Collected (INR):', data.paymentSummary.repairUpi],
      ['Repair Card Collected (INR):', data.paymentSummary.repairCard],
      ['TOTAL CASH SETTLEMENT (INR):', data.paymentSummary.totalCash],
      ['TOTAL UPI SETTLEMENT (INR):', data.paymentSummary.totalUpi],
      ['TOTAL CARD SETTLEMENT (INR):', data.paymentSummary.totalCard],
      ['TOTAL BUSINESS COLLECTION (INR):', data.paymentSummary.totalCollected],
      [],
      ['4. OVERALL BUSINESS NET PROFIT'],
      ['Product Gross Profit (INR):', data.salesSummary.totalProfit],
      ['Net Repair Profit (INR):', data.repairSummary.netRepairProfit],
      ['TOTAL BUSINESS NET PROFIT (INR):', data.salesSummary.totalProfit + data.repairSummary.netRepairProfit],
      ['OWNER RETAINED PROFIT SHARE (INR):', data.salesSummary.totalProfit + data.repairSummary.totalOwnerShare],
      ['TECHNICIAN PAYOUT SHARE (INR):', data.repairSummary.totalTechnicianPayout],
      [],
      ['5. CURRENT INVENTORY VALUATION'],
      ['Active Products:', data.inventorySummary.totalActiveProducts],
      ['Total Stock Units:', data.inventorySummary.totalStockUnits],
      ['Current Inventory Cost Value (INR):', data.inventorySummary.currentInventoryValue],
      ['Potential Sales Value (INR):', data.inventorySummary.potentialSalesValue],
      ['Potential Gross Margin (INR):', data.inventorySummary.potentialGrossMargin],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Itemized Sales (Shows Product Name prominently)
    const salesHeader = ['Date', 'Product Name', 'SKU', 'Qty', 'Unit Cost (INR)', 'Unit Price (INR)', 'Total Cost (INR)', 'Total Revenue (INR)', 'Actual Profit (INR)', 'Customer Name', 'Payment Method'];
    const salesDataRows = data.salesItems.map((s) => [
      s.date,
      s.productName,
      s.sku,
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
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Performance');

    // Sheet 3: Itemized Repairs
    const repairHeader = ['Date', 'Job Ticket #', 'Customer Name', 'Device', 'Assigned Worker', 'Role', 'Service Revenue (INR)', 'Parts Cost (INR)', 'Net Profit (INR)', 'Owner Share (INR)', 'Tech Share (INR)', 'Amount Collected (INR)', 'Status'];
    const repairDataRows = data.repairItems.map((r) => [
      r.repairDate,
      r.ticketNumber,
      r.customerName,
      r.deviceInfo,
      r.workerName,
      r.workerRole,
      r.serviceRevenue,
      r.partsCost,
      r.netProfit,
      r.ownerShare,
      r.technicianShare,
      r.amountCollected,
      r.status,
    ]);
    const wsRepairs = XLSX.utils.aoa_to_sheet([repairHeader, ...repairDataRows]);
    XLSX.utils.book_append_sheet(wb, wsRepairs, 'Repair Service');

    // Sheet 4: Worker Performance
    const workerHeader = ['Worker Name', 'Role', 'Completed Repairs', 'Service Revenue (INR)', 'Parts Cost (INR)', 'Net Repair Profit (INR)', 'Owner Share (INR)', 'Technician Payout (INR)'];
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

    // Sheet 5: Inventory Catalog
    const invHeader = ['Product Name', 'SKU', 'Category', 'Brand', 'Stock Qty', 'Cost Price (INR)', 'Selling Price (INR)', 'Total Cost Value (INR)', 'Stock Status'];
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
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory Catalog');

    // Sheet 6: Purchases
    const purHeader = ['Purchase Date', 'PO #', 'Supplier Name', 'Product Purchased', 'Qty', 'Unit Cost (INR)', 'Line Cost (INR)', 'PO Discount (INR)', 'Final PO Amount (INR)', 'Payment Status'];
    const purDataRows = data.purchaseItems.map((p) => [
      p.purchaseDate,
      p.purchaseNumber,
      p.supplierName,
      p.productName,
      p.quantity,
      p.unitCost,
      p.totalCost,
      p.discount,
      p.finalAmount,
      p.paymentStatus,
    ]);
    const wsPur = XLSX.utils.aoa_to_sheet([purHeader, ...purDataRows]);
    XLSX.utils.book_append_sheet(wb, wsPur, 'Purchases');

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
    doc.text('FAHAD ELECTRONICS', 14, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.text('BUSINESS PERFORMANCE REPORT', 14, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${data.periodLabel}`, 14, currentY);
    currentY += 8;

    // Helper for safe PDF currency formatting using "INR" to prevent font encoding corruption (e.g. ¹)
    const fmt = (num: number) => `INR ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 1. EXECUTIVE BUSINESS SUMMARY
    autoTable(doc, {
      startY: currentY,
      head: [['1. EXECUTIVE BUSINESS SUMMARY', 'Metric / Count Description', 'Amount (INR)']],
      body: [
        ['Sales Revenue', `${data.salesSummary.salesCount} Completed POS Sales`, fmt(data.salesSummary.totalRevenue)],
        ['Product Cost Basis', 'Historical unit cost at sale time', fmt(data.salesSummary.totalCost)],
        ['Product Gross Profit', 'Sales Revenue - Product Cost', fmt(data.salesSummary.totalProfit)],
        ['Repair Service Revenue', `${data.repairSummary.deliveredCount} Delivered Repairs`, fmt(data.repairSummary.totalServiceRevenue)],
        ['Repair Parts Cost', 'Component replacement cost', fmt(data.repairSummary.totalPartsCost)],
        ['Net Repair Profit', 'Service Revenue - Parts Cost', fmt(data.repairSummary.netRepairProfit)],
        ['Owner Repair Share', 'Owner profit allocation', fmt(data.repairSummary.totalOwnerShare)],
        ['Technician Payout', 'Technician 70% share allocation', fmt(data.repairSummary.totalTechnicianPayout)],
        ['TOTAL BUSINESS NET PROFIT', 'Sales Profit + Net Repair Profit', fmt(data.salesSummary.totalProfit + data.repairSummary.netRepairProfit)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 2. PAYMENT COLLECTION CHANNELS
    autoTable(doc, {
      startY: currentY,
      head: [['2. PAYMENT COLLECTION CHANNELS', 'POS Sales Collection', 'Repair Collection', 'Total Collected']],
      body: [
        ['Cash Settlement', fmt(data.paymentSummary.posCash), fmt(data.paymentSummary.repairCash), fmt(data.paymentSummary.totalCash)],
        ['UPI Digital Transfer', fmt(data.paymentSummary.posUpi), fmt(data.paymentSummary.repairUpi), fmt(data.paymentSummary.totalUpi)],
        ['Card / POS Machine', fmt(data.paymentSummary.posCard), fmt(data.paymentSummary.repairCard), fmt(data.paymentSummary.totalCard)],
        ['TOTAL COLLECTION', fmt(data.salesSummary.totalRevenue), fmt(data.repairSummary.totalServiceRevenue), fmt(data.paymentSummary.totalCollected)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. WORKER REPAIR PERFORMANCE & SHARE
    const workerRows = data.workerPerformance.length > 0
      ? data.workerPerformance.map((w) => [
          w.workerName,
          w.workerRole,
          w.completedRepairs.toString(),
          fmt(w.serviceRevenue),
          fmt(w.partsCost),
          fmt(w.netProfit),
          fmt(w.ownerShare),
          fmt(w.technicianShare),
        ])
      : [['No finalized repair worker activity for this period', '-', '0', fmt(0), fmt(0), fmt(0), fmt(0), fmt(0)]];

    autoTable(doc, {
      startY: currentY,
      head: [['3. WORKER REPAIR PERFORMANCE', 'Role', 'Completed', 'Revenue', 'Parts Cost', 'Net Profit', 'Owner Share', 'Tech Share']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 4. CURRENT INVENTORY VALUATION
    autoTable(doc, {
      startY: currentY,
      head: [['4. CURRENT INVENTORY VALUATION', 'Value / Metric']],
      body: [
        ['Active Products in Catalog', data.inventorySummary.totalActiveProducts.toString()],
        ['Total Stock Units', data.inventorySummary.totalStockUnits.toString()],
        ['Current Inventory Cost Value', fmt(data.inventorySummary.currentInventoryValue)],
        ['Potential Sales Value', fmt(data.inventorySummary.potentialSalesValue)],
        ['Potential Inventory Gross Profit', fmt(data.inventorySummary.potentialGrossMargin)],
        ['Low Stock Alerts', data.inventorySummary.lowStockCount.toString()],
        ['Out of Stock Items', data.inventorySummary.outOfStockCount.toString()],
      ],
      theme: 'plain',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 5. FINAL BUSINESS PROFIT SUMMARY
    autoTable(doc, {
      startY: currentY,
      head: [['5. FINAL BUSINESS PROFIT SUMMARY', 'Amount (INR)']],
      body: [
        ['Product Gross Profit', fmt(data.salesSummary.totalProfit)],
        ['Net Repair Profit', fmt(data.repairSummary.netRepairProfit)],
        ['TOTAL BUSINESS NET PROFIT', fmt(data.salesSummary.totalProfit + data.repairSummary.netRepairProfit)],
        ['OWNER RETAINED PROFIT SHARE', fmt(data.salesSummary.totalProfit + data.repairSummary.totalOwnerShare)],
        ['TECHNICIAN PAYOUT SHARE', fmt(data.repairSummary.totalTechnicianPayout)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    // Save PDF
    const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FAHAD_ELECTRONICS_Business_Report_${cleanLabel}.pdf`;
    doc.save(filename);
  },
};
