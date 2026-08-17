import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';

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
  async fetchReportData(startDate: string, endDate: string, periodLabel: string): Promise<DetailedReportData> {
    // 1. Fetch Sales in Date Range
    const { data: sales } = await supabase
      .from('sales')
      .select('id, sale_number, sale_date, subtotal, discount, total_amount, created_at, customer:customers(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    const salesList = sales || [];
    const saleIds = salesList.map((s) => s.id);

    // Fetch sale payments
    let salePaymentsMap: Record<string, string[]> = {};
    let posCash = 0, posUpi = 0, posCard = 0;

    if (saleIds.length > 0) {
      const { data: payData } = await supabase
        .from('sale_payments')
        .select('sale_id, payment_method, amount')
        .in('sale_id', saleIds);

      (payData || []).forEach((p: any) => {
        const amt = Number(p.amount || 0);
        if (p.payment_method === 'CASH') posCash += amt;
        if (p.payment_method === 'UPI') posUpi += amt;
        if (p.payment_method === 'CARD') posCard += amt;

        if (!salePaymentsMap[p.sale_id]) salePaymentsMap[p.sale_id] = [];
        salePaymentsMap[p.sale_id].push(p.payment_method);
      });
    }

    // Fetch sale items using historical unit_cost_price
    let salesItemsDetailed: DetailedReportData['salesItems'] = [];
    let totalSalesCost = 0;
    let totalSalesRevenue = 0;

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
        totalSalesRevenue += lineRev;

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

    const totalSalesProfit = totalSalesRevenue - totalSalesCost;

    // 2. Fetch Repairs & Repair Profit Snapshots in Date Range
    // Query 1: Profit snapshots calculated in date range (authoritative source for financial reports)
    const { data: snapData } = await (supabase.from('repair_profit_snapshots') as any)
      .select('*, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name, role)')
      .gte('calculated_at', startDate)
      .lte('calculated_at', endDate);

    const snapsList = snapData || [];

    // Query 2: Repair jobs created or received in date range
    const { data: periodRepairs } = await supabase
      .from('repair_jobs')
      .select('id, repair_number, device_brand, device_model, status, financial_status, payment_status, service_revenue, quoted_amount, created_at, completed_at, delivered_at, technician_id, customer:customers(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const periodRepairList = periodRepairs || [];

    // Gather all unique repair IDs (from profit snapshots AND period repair jobs)
    const allRepairIdsSet = new Set<string>();
    snapsList.forEach((s: any) => { if (s.repair_id) allRepairIdsSet.add(s.repair_id); });
    periodRepairList.forEach((r: any) => { if (r.id) allRepairIdsSet.add(r.id); });

    const allRepairIds = Array.from(allRepairIdsSet);

    // Fetch full repair job records for any snapshot repairs created outside period
    let fullRepairJobsMap = new Map<string, any>();
    periodRepairList.forEach((r: any) => fullRepairJobsMap.set(r.id, r));

    const missingRepairIds = allRepairIds.filter((id) => !fullRepairJobsMap.has(id));
    if (missingRepairIds.length > 0) {
      const { data: extraRepairs } = await supabase
        .from('repair_jobs')
        .select('id, repair_number, device_brand, device_model, status, financial_status, payment_status, service_revenue, quoted_amount, created_at, completed_at, delivered_at, technician_id, customer:customers(name)')
        .in('id', missingRepairIds);

      (extraRepairs || []).forEach((r: any) => fullRepairJobsMap.set(r.id, r));
    }

    // Fetch repair parts cost for all repair IDs
    const repairPartsMap = new Map<string, number>();
    if (allRepairIds.length > 0) {
      const { data: partsData } = await supabase
        .from('repair_parts')
        .select('repair_id, total_cost')
        .in('repair_id', allRepairIds);

      (partsData || []).forEach((p: any) => {
        const cur = repairPartsMap.get(p.repair_id) || 0;
        repairPartsMap.set(p.repair_id, cur + Number(p.total_cost || 0));
      });
    }

    // Fetch repair payments & payment channels
    let repairCash = 0, repairUpi = 0, repairCard = 0;
    const repairPaymentsCollectedMap = new Map<string, number>();
    const repairPaymentMethodsMap = new Map<string, string[]>();

    if (allRepairIds.length > 0) {
      const { data: rPayData } = await supabase
        .from('repair_payments')
        .select('repair_id, payment_method, amount')
        .in('repair_id', allRepairIds);

      (rPayData || []).forEach((p: any) => {
        const amt = Number(p.amount || 0);
        if (p.payment_method === 'CASH') repairCash += amt;
        if (p.payment_method === 'UPI') repairUpi += amt;
        if (p.payment_method === 'CARD') repairCard += amt;

        const curAmt = repairPaymentsCollectedMap.get(p.repair_id) || 0;
        repairPaymentsCollectedMap.set(p.repair_id, curAmt + amt);

        if (!repairPaymentMethodsMap.has(p.repair_id)) repairPaymentMethodsMap.set(p.repair_id, []);
        repairPaymentMethodsMap.get(p.repair_id)!.push(p.payment_method);
      });
    }

    // Fetch profiles to map worker names and roles
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role');
    const profileMap = new Map<string, { name: string; role: string }>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, { name: p.full_name || 'Worker', role: p.role || 'STAFF' });
    });

    // Map profit snapshots by repair_id
    const snapshotMap = new Map<string, { netProfit: number; ownerShare: number; techShare: number; serviceRevenue: number; partsCost: number; technicianId: string; techName: string; techRole: string }>();
    snapsList.forEach((s: any) => {
      snapshotMap.set(s.repair_id, {
        netProfit: Number(s.net_repair_profit || 0),
        ownerShare: Number(s.owner_share || 0),
        techShare: Number(s.technician_share || 0),
        serviceRevenue: Number(s.service_revenue || 0),
        partsCost: Number(s.parts_cost || 0),
        technicianId: s.technician_id,
        techName: s.technician?.full_name || profileMap.get(s.technician_id)?.name || 'Worker',
        techRole: s.technician?.role || profileMap.get(s.technician_id)?.role || 'TECHNICIAN',
      });
    });

    // Process detailed repair items & worker performance
    let repairItemsDetailed: DetailedReportData['repairItems'] = [];
    const workerPerfMap = new Map<string, DetailedReportData['workerPerformance'][0]>();

    let totalServiceRev = 0;
    let totalRepairPartsCost = 0;
    let totalNetRepairProfit = 0;
    let totalOwnerRepairShare = 0;
    let totalTechRepairPayout = 0;
    let newTicketsCount = periodRepairList.length;
    let completedCount = 0;
    let deliveredCount = 0;
    let unpaidRepairsCount = 0;
    let unpaidRepairsAmount = 0;
    let partiallyPaidCount = 0;

    allRepairIds.forEach((id) => {
      const r = fullRepairJobsMap.get(id);
      if (!r) return;

      const snap = snapshotMap.get(id);
      const sRev = snap ? snap.serviceRevenue : Number(r.service_revenue || r.quoted_amount || 0);
      const pCost = snap ? snap.partsCost : (repairPartsMap.get(id) || 0);
      const amtCollected = repairPaymentsCollectedMap.get(id) || 0;
      const payMethods = (repairPaymentMethodsMap.get(id) || []).join(', ') || 'N/A';

      if (r.status === 'READY_FOR_PICKUP' || r.status === 'DELIVERED') completedCount++;
      if (r.status === 'DELIVERED') deliveredCount++;

      if (r.payment_status === 'UNPAID') {
        unpaidRepairsCount++;
        unpaidRepairsAmount += Math.max(0, sRev - amtCollected);
      } else if (r.payment_status === 'PARTIAL') {
        partiallyPaidCount++;
      }

      let netProf = 0, oShare = 0, tShare = 0;

      if (snap) {
        netProf = snap.netProfit;
        oShare = snap.ownerShare;
        tShare = snap.techShare;
      } else {
        netProf = Math.max(0, sRev - pCost);
        const workerInfo = r.technician_id ? profileMap.get(r.technician_id) : null;
        if (workerInfo?.role === 'OWNER') {
          oShare = netProf;
          tShare = 0;
        } else if (workerInfo?.role === 'TECHNICIAN') {
          tShare = Math.round(netProf * 0.70 * 100) / 100;
          oShare = netProf - tShare;
        } else {
          oShare = netProf;
          tShare = 0;
        }
      }

      totalServiceRev += sRev;
      totalRepairPartsCost += pCost;
      totalNetRepairProfit += netProf;
      totalOwnerRepairShare += oShare;
      totalTechRepairPayout += tShare;

      const workerInfo = r.technician_id ? profileMap.get(r.technician_id) : null;
      const workerName = snap?.techName || workerInfo?.name || 'Unassigned';
      const workerRole = snap?.techRole || workerInfo?.role || 'UNASSIGNED';

      repairItemsDetailed.push({
        repairDate: new Date(r.created_at).toLocaleDateString('en-IN'),
        ticketNumber: r.repair_number,
        customerName: r.customer?.name || 'Walk-in Customer',
        deviceInfo: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || 'Device',
        workerName,
        workerRole,
        serviceRevenue: sRev,
        partsCost: pCost,
        netProfit: netProf,
        ownerShare: oShare,
        technicianShare: tShare,
        amountCollected: amtCollected,
        paymentMethods: payMethods,
        status: r.status,
        financialStatus: r.financial_status,
      });

      // Aggregate worker performance
      if (r.technician_id || snap?.technicianId) {
        const key = snap?.technicianId || r.technician_id;
        if (!workerPerfMap.has(key)) {
          workerPerfMap.set(key, {
            workerName,
            workerRole,
            completedRepairs: 0,
            serviceRevenue: 0,
            partsCost: 0,
            netProfit: 0,
            ownerShare: 0,
            technicianShare: 0,
          });
        }
        const wp = workerPerfMap.get(key)!;
        if (r.status === 'READY_FOR_PICKUP' || r.status === 'DELIVERED' || snap) {
          wp.completedRepairs++;
        }
        wp.serviceRevenue += sRev;
        wp.partsCost += pCost;
        wp.netProfit += netProf;
        wp.ownerShare += oShare;
        wp.technicianShare += tShare;
      }
    });

    // 3. Fetch Current Inventory Catalog & Valuation (CURRENT stock value, NOT period-bound)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, product_code, stock_quantity, current_cost_price, selling_price, low_stock_threshold, is_active, category:categories(name), brand:brands(name)')
      .eq('is_active', true);

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

    // 4. Fetch Purchases in Date Range
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, purchase_number, purchase_date, total_amount, discount_amount, final_amount, payment_status, created_at, supplier:suppliers(name), purchase_items(quantity, unit_cost_price, product:products(name))')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

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

    // Pre-Download Validation Check (Requirement 12)
    console.log(`[BusinessReportExport] Fetched Report Data for period '${periodLabel}' (${startDate} to ${endDate}):`, {
      salesCount: salesList.length,
      salesRevenue: totalSalesRevenue,
      salesProfit: totalSalesProfit,
      snapshotCount: snapsList.length,
      repairRevenue: totalServiceRev,
      netRepairProfit: totalNetRepairProfit,
      ownerShare: totalOwnerRepairShare,
      techShare: totalTechRepairPayout,
      inventoryProductsCount: (products || []).length,
      inventoryValue: currentInventoryValue,
    });

    return {
      periodLabel,
      startDateStr: new Date(startDate).toLocaleDateString('en-IN'),
      endDateStr: new Date(endDate).toLocaleDateString('en-IN'),

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

      workerPerformance: Array.from(workerPerfMap.values()),

      inventorySummary: {
        totalActiveProducts: (products || []).length,
        totalStockUnits,
        currentInventoryValue,
        potentialSalesValue,
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
        activeRepairsCount: newTicketsCount - deliveredCount,
        readyForPickupCount: completedCount - deliveredCount,
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
      ['FAHAD ERP — BUSINESS REPORT EXECUTIVE SUMMARY'],
      ['Reporting Period:', `${data.periodLabel} (${data.startDateStr} to ${data.endDateStr})`],
      [],
      ['SALES SUMMARY'],
      ['Total Completed Sales:', data.salesSummary.salesCount],
      ['Total Sales Revenue:', data.salesSummary.totalRevenue],
      ['Total Product Cost:', data.salesSummary.totalCost],
      ['Total Product Gross Profit:', data.salesSummary.totalProfit],
      [],
      ['REPAIR SERVICE SUMMARY'],
      ['New Repair Tickets Intake:', data.repairSummary.newTicketsCount],
      ['Completed / Delivered Repairs:', data.repairSummary.completedCount],
      ['Total Repair Service Revenue:', data.repairSummary.totalServiceRevenue],
      ['Total Repair Parts Cost:', data.repairSummary.totalPartsCost],
      ['Net Repair Profit:', data.repairSummary.netRepairProfit],
      ['Owner Repair Profit Share:', data.repairSummary.totalOwnerShare],
      ['Technician Payout Share:', data.repairSummary.totalTechnicianPayout],
      [],
      ['OVERALL BUSINESS NET PROFIT'],
      ['Combined Business Net Profit:', data.salesSummary.totalProfit + data.repairSummary.netRepairProfit],
      [],
      ['PAYMENT COLLECTION CHANNELS'],
      ['Cash Collected:', data.paymentSummary.totalCash],
      ['UPI Collected:', data.paymentSummary.totalUpi],
      ['Card Collected:', data.paymentSummary.totalCard],
      ['Total Settlement:', data.paymentSummary.totalCollected],
      [],
      ['CURRENT INVENTORY VALUATION'],
      ['Active Products:', data.inventorySummary.totalActiveProducts],
      ['Total Stock Units:', data.inventorySummary.totalStockUnits],
      ['Current Inventory Cost Value:', data.inventorySummary.currentInventoryValue],
      ['Potential Sales Value:', data.inventorySummary.potentialSalesValue],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Itemized Sales
    const salesHeader = ['Date', 'Sale #', 'Customer Name', 'Product Name', 'SKU', 'Qty', 'Unit Cost (₹)', 'Unit Price (₹)', 'Total Cost (₹)', 'Total Revenue (₹)', 'Actual Profit (₹)', 'Payment Method'];
    const salesDataRows = data.salesItems.map((s) => [
      s.date,
      s.saleNumber,
      s.customerName,
      s.productName,
      s.sku,
      s.quantity,
      s.unitCost,
      s.unitPrice,
      s.totalCost,
      s.totalRevenue,
      s.actualProfit,
      s.paymentMethod,
    ]);
    const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesDataRows]);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

    // Sheet 3: Itemized Repairs
    const repairHeader = ['Date', 'Job Ticket #', 'Customer Name', 'Device', 'Assigned Worker', 'Role', 'Service Revenue (₹)', 'Parts Cost (₹)', 'Net Profit (₹)', 'Owner Share (₹)', 'Tech Share (₹)', 'Amount Collected (₹)', 'Status'];
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
    XLSX.utils.book_append_sheet(wb, wsRepairs, 'Repairs');

    // Sheet 4: Worker Performance
    const workerHeader = ['Worker Name', 'Role', 'Completed Repairs', 'Service Revenue (₹)', 'Parts Cost (₹)', 'Net Repair Profit (₹)', 'Owner Share (₹)', 'Technician Payout (₹)'];
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
    const invHeader = ['Product Name', 'SKU', 'Category', 'Brand', 'Stock Qty', 'Cost Price (₹)', 'Selling Price (₹)', 'Total Cost Value (₹)', 'Stock Status'];
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
    const purHeader = ['Purchase Date', 'PO #', 'Supplier Name', 'Product Purchased', 'Qty', 'Unit Cost (₹)', 'Line Cost (₹)', 'PO Discount (₹)', 'Final PO Amount (₹)', 'Payment Status'];
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
    const filename = `FAHAD_ERP_Business_Report_${data.startDateStr.replace(/\//g, '-')}_to_${data.endDateStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  exportToPDF(data: DetailedReportData): void {
    const doc = new jsPDF();
    let currentY = 15;

    // Document Title Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FAHAD ERP — BUSINESS REPORT', 14, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${data.periodLabel} (${data.startDateStr} to ${data.endDateStr})`, 14, currentY);
    currentY += 8;

    // Executive Summary Table
    autoTable(doc, {
      startY: currentY,
      head: [['KPI Category', 'Metric / Summary Description', 'Amount (INR)']],
      body: [
        ['Sales Revenue', `${data.salesSummary.salesCount} Completed Sales`, formatCurrency(data.salesSummary.totalRevenue, 'INR')],
        ['Product Cost Basis', 'Historical unit cost at sale time', formatCurrency(data.salesSummary.totalCost, 'INR')],
        ['Product Gross Profit', 'Sales Revenue - Product Cost', formatCurrency(data.salesSummary.totalProfit, 'INR')],
        ['Repair Service Revenue', `${data.repairSummary.deliveredCount} Delivered Repairs`, formatCurrency(data.repairSummary.totalServiceRevenue, 'INR')],
        ['Repair Parts Cost', 'Component replacement cost', formatCurrency(data.repairSummary.totalPartsCost, 'INR')],
        ['Net Repair Profit', 'Service Revenue - Parts Cost', formatCurrency(data.repairSummary.netRepairProfit, 'INR')],
        ['Owner Repair Share', 'Owner profit allocation', formatCurrency(data.repairSummary.totalOwnerShare, 'INR')],
        ['Technician Payout', 'Technician 70% share allocation', formatCurrency(data.repairSummary.totalTechnicianPayout, 'INR')],
        ['TOTAL BUSINESS NET PROFIT', 'Sales Profit + Net Repair Profit', formatCurrency(data.salesSummary.totalProfit + data.repairSummary.netRepairProfit, 'INR')],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Payment Collection Channels
    autoTable(doc, {
      startY: currentY,
      head: [['Payment Channel', 'POS Sales (₹)', 'Repair Payments (₹)', 'Total Collected (₹)']],
      body: [
        ['Cash Settlement', formatCurrency(data.paymentSummary.posCash, 'INR'), formatCurrency(data.paymentSummary.repairCash, 'INR'), formatCurrency(data.paymentSummary.totalCash, 'INR')],
        ['UPI Digital Transfer', formatCurrency(data.paymentSummary.posUpi, 'INR'), formatCurrency(data.paymentSummary.repairUpi, 'INR'), formatCurrency(data.paymentSummary.totalUpi, 'INR')],
        ['Card / POS Machine', formatCurrency(data.paymentSummary.posCard, 'INR'), formatCurrency(data.paymentSummary.repairCard, 'INR'), formatCurrency(data.paymentSummary.totalCard, 'INR')],
        ['TOTAL COLLECTION', formatCurrency(data.salesSummary.totalRevenue, 'INR'), formatCurrency(data.repairSummary.totalServiceRevenue, 'INR'), formatCurrency(data.paymentSummary.totalCollected, 'INR')],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Worker Performance Table
    if (data.workerPerformance.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Worker Name', 'Role', 'Completed', 'Revenue (₹)', 'Net Profit (₹)', 'Owner Share (₹)', 'Tech Share (₹)']],
        body: data.workerPerformance.map((w) => [
          w.workerName,
          w.workerRole,
          w.completedRepairs.toString(),
          formatCurrency(w.serviceRevenue, 'INR'),
          formatCurrency(w.netProfit, 'INR'),
          formatCurrency(w.ownerShare, 'INR'),
          formatCurrency(w.technicianShare, 'INR'),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Inventory Valuation Summary
    autoTable(doc, {
      startY: currentY,
      head: [['Inventory Valuation Metric', 'Value']],
      body: [
        ['Active Products in Catalog', data.inventorySummary.totalActiveProducts.toString()],
        ['Total Stock Units', data.inventorySummary.totalStockUnits.toString()],
        ['Current Inventory Cost Value', formatCurrency(data.inventorySummary.currentInventoryValue, 'INR')],
        ['Potential Sales Value', formatCurrency(data.inventorySummary.potentialSalesValue, 'INR')],
        ['Low Stock Alerts', data.inventorySummary.lowStockCount.toString()],
        ['Out of Stock Items', data.inventorySummary.outOfStockCount.toString()],
      ],
      theme: 'plain',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    // Save PDF
    const filename = `FAHAD_ERP_Business_Report_${data.startDateStr.replace(/\//g, '-')}_to_${data.endDateStr.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
  },
};
