import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';

export interface ReportGenerationParams {
  startDate: string;
  endDate: string;
  periodLabel: string;
  format: 'EXCEL' | 'PDF';
}

export interface DetailedReportData {
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;

  // Sales
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

  // Payments
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

  // Repairs
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

  // Worker Performance Breakdown
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

  // Inventory
  inventorySummary: {
    totalActiveProducts: number;
    totalStockUnits: number;
    currentInventoryValue: number;
    potentialSalesValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  inventoryItems: {
    name: string;
    sku: string;
    category: string;
    brand: string;
    stock: number;
    costPrice: number;
    sellingPrice: number;
    inventoryValue: number;
    threshold: number;
    status: string;
  }[];

  // Purchases
  purchaseSummary: {
    purchasesCount: number;
    totalUnitsPurchased: number;
    totalPurchaseValue: number;
  };
  purchaseItems: {
    date: string;
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

  // Operational / Outstanding
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

    // Fetch sale items
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

    // 2. Fetch Repairs in Date Range
    const { data: repairs } = await supabase
      .from('repair_jobs')
      .select('id, repair_number, device_brand, device_model, status, financial_status, payment_status, service_revenue, quoted_amount, created_at, completed_at, delivered_at, technician_id, customer:customers(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    const repairList = repairs || [];
    const repairIds = repairList.map((r) => r.id);

    // Fetch repair parts cost
    const repairPartsMap = new Map<string, number>();
    if (repairIds.length > 0) {
      const { data: partsData } = await supabase
        .from('repair_parts')
        .select('repair_id, total_cost')
        .in('repair_id', repairIds);

      (partsData || []).forEach((p: any) => {
        const cur = repairPartsMap.get(p.repair_id) || 0;
        repairPartsMap.set(p.repair_id, cur + Number(p.total_cost || 0));
      });
    }

    // Fetch repair payments & channels
    let repairCash = 0, repairUpi = 0, repairCard = 0;
    const repairPaymentsCollectedMap = new Map<string, number>();
    const repairPaymentMethodsMap = new Map<string, string[]>();

    if (repairIds.length > 0) {
      const { data: rPayData } = await supabase
        .from('repair_payments')
        .select('repair_id, payment_method, amount')
        .in('repair_id', repairIds);

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

    // Fetch profit snapshots for finalized repairs
    const snapshotMap = new Map<string, { netProfit: number; ownerShare: number; techShare: number }>();
    if (repairIds.length > 0) {
      const { data: snapData } = await supabase
        .from('repair_profit_snapshots')
        .select('repair_id, net_repair_profit, owner_share, technician_share')
        .in('repair_id', repairIds);

      (snapData || []).forEach((s: any) => {
        snapshotMap.set(s.repair_id, {
          netProfit: Number(s.net_repair_profit || 0),
          ownerShare: Number(s.owner_share || 0),
          techShare: Number(s.technician_share || 0),
        });
      });
    }

    // Process detailed repair items & worker performance
    let repairItemsDetailed: DetailedReportData['repairItems'] = [];
    const workerPerfMap = new Map<string, DetailedReportData['workerPerformance'][0]>();

    let totalServiceRev = 0;
    let totalRepairPartsCost = 0;
    let totalNetRepairProfit = 0;
    let totalOwnerRepairShare = 0;
    let totalTechRepairPayout = 0;
    let newTicketsCount = repairList.length;
    let completedCount = 0;
    let deliveredCount = 0;
    let unpaidRepairsCount = 0;
    let unpaidRepairsAmount = 0;
    let partiallyPaidCount = 0;

    repairList.forEach((r: any) => {
      const sRev = Number(r.service_revenue || r.quoted_amount || 0);
      const pCost = repairPartsMap.get(r.id) || 0;
      const amtCollected = repairPaymentsCollectedMap.get(r.id) || 0;
      const payMethods = (repairPaymentMethodsMap.get(r.id) || []).join(', ') || 'N/A';

      if (r.status === 'READY_FOR_PICKUP' || r.status === 'DELIVERED') completedCount++;
      if (r.status === 'DELIVERED') deliveredCount++;

      if (r.payment_status === 'UNPAID') {
        unpaidRepairsCount++;
        unpaidRepairsAmount += Math.max(0, sRev - amtCollected);
      } else if (r.payment_status === 'PARTIAL') {
        partiallyPaidCount++;
      }

      const snap = snapshotMap.get(r.id);
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
      const workerName = workerInfo?.name || 'Unassigned';
      const workerRole = workerInfo?.role || 'UNASSIGNED';

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
      if (r.technician_id) {
        const key = r.technician_id;
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
        if (r.status === 'READY_FOR_PICKUP' || r.status === 'DELIVERED') {
          wp.completedRepairs++;
        }
        wp.serviceRevenue += sRev;
        wp.partsCost += pCost;
        wp.netProfit += netProf;
        wp.ownerShare += oShare;
        wp.technicianShare += tShare;
      }
    });

    // 3. Fetch Current Inventory Catalog & Valuation
    const { data: products } = await supabase
      .from('products')
      .select('id, name, product_code, stock_quantity, current_cost_price, selling_price, min_stock_threshold, category:categories(name), brand:brands(name)');

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
      const threshold = Number(p.min_stock_threshold || 5);
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
        name: p.name,
        sku: p.product_code || 'N/A',
        category: p.category?.name || 'General',
        brand: p.brand?.name || 'Generic',
        stock,
        costPrice: cCost,
        sellingPrice: sPrice,
        inventoryValue: itemVal,
        threshold,
        status,
      });
    });

    // 4. Fetch Purchases in Date Range
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, purchase_number, purchase_date, subtotal, discount, total_amount, payment_status, created_at, supplier:suppliers(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    const purchaseList = purchases || [];
    const purchaseIds = purchaseList.map((p) => p.id);

    let purchaseItemsDetailed: DetailedReportData['purchaseItems'] = [];
    let totalUnitsPurchased = 0;
    let totalPurchaseValue = 0;

    if (purchaseIds.length > 0) {
      const { data: pItems } = await supabase
        .from('purchase_items')
        .select('purchase_id, quantity, unit_cost_price, total_cost, product:products(name)')
        .in('purchase_id', purchaseIds);

      const pMetaMap = new Map<string, { number: string; date: string; supplier: string; discount: number; finalAmt: number; status: string }>();
      purchaseList.forEach((p: any) => {
        pMetaMap.set(p.id, {
          number: p.purchase_number,
          date: new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN'),
          supplier: p.supplier?.name || 'Supplier',
          discount: Number(p.discount || 0),
          finalAmt: Number(p.total_amount || 0),
          status: p.payment_status || 'PAID',
        });
      });

      (pItems || []).forEach((pi: any) => {
        const meta = pMetaMap.get(pi.purchase_id);
        const qty = Number(pi.quantity || 0);
        const uCost = Number(pi.unit_cost_price || 0);
        const totCost = Number(pi.total_cost || qty * uCost);

        totalUnitsPurchased += qty;
        totalPurchaseValue += totCost;

        purchaseItemsDetailed.push({
          date: meta?.date || '',
          purchaseNumber: meta?.number || '',
          supplierName: meta?.supplier || 'Supplier',
          productName: pi.product?.name || 'Product',
          quantity: qty,
          unitCost: uCost,
          totalCost: totCost,
          discount: meta?.discount || 0,
          finalAmount: meta?.finalAmt || totCost,
          paymentStatus: meta?.status || 'PAID',
        });
      });
    }

    const totalCash = posCash + repairCash;
    const totalUpi = posUpi + repairUpi;
    const totalCard = posCard + repairCard;
    const totalCollected = totalCash + totalUpi + totalCard;

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
        totalCash,
        totalUpi,
        totalCard,
        totalCollected,
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
        activeRepairsCount: newTicketsCount - (completedCount + deliveredCount),
        readyForPickupCount: completedCount - deliveredCount,
        unpaidRepairsCount,
        unpaidRepairsAmount,
        partiallyPaidRepairsCount: partiallyPaidCount,
      },
    };
  },

  exportToExcel(data: DetailedReportData) {
    const wb = XLSX.utils.book_new();

    // SHEET 1: SUMMARY
    const summaryRows = [
      ['FAHAD ELECTRONICS — BUSINESS PERFORMANCE SUMMARY'],
      ['Reporting Period:', data.periodLabel, `(${data.startDateStr} to ${data.endDateStr})`],
      ['Generated Date:', new Date().toLocaleString('en-IN')],
      [],
      ['1. SALES SUMMARY'],
      ['Completed Sales Invoices', data.salesSummary.salesCount],
      ['Total Sales Revenue (₹)', data.salesSummary.totalRevenue],
      ['Total Product Cost (₹)', data.salesSummary.totalCost],
      ['Total Product Profit (₹)', data.salesSummary.totalProfit],
      ['Product Profit Margin', data.salesSummary.totalRevenue > 0 ? `${((data.salesSummary.totalProfit / data.salesSummary.totalRevenue) * 100).toFixed(2)}%` : '0%'],
      [],
      ['2. REPAIR SERVICE SUMMARY'],
      ['New Repair Tickets Intake', data.repairSummary.newTicketsCount],
      ['Repairs Completed', data.repairSummary.completedCount],
      ['Repairs Delivered', data.repairSummary.deliveredCount],
      ['Repair Service Revenue (₹)', data.repairSummary.totalServiceRevenue],
      ['Repair Parts Cost (₹)', data.repairSummary.totalPartsCost],
      ['Net Repair Profit (₹)', data.repairSummary.netRepairProfit],
      ['Owner Repair Share (₹)', data.repairSummary.totalOwnerShare],
      ['Technician Payout Share (₹)', data.repairSummary.totalTechnicianPayout],
      [],
      ['3. PAYMENT COLLECTION SUMMARY'],
      ['POS Cash (₹)', data.paymentSummary.posCash],
      ['POS UPI (₹)', data.paymentSummary.posUpi],
      ['POS Card (₹)', data.paymentSummary.posCard],
      ['Repair Cash (₹)', data.paymentSummary.repairCash],
      ['Repair UPI (₹)', data.paymentSummary.repairUpi],
      ['Repair Card (₹)', data.paymentSummary.repairCard],
      ['TOTAL CASH COLLECTED (₹)', data.paymentSummary.totalCash],
      ['TOTAL UPI COLLECTED (₹)', data.paymentSummary.totalUpi],
      ['TOTAL CARD COLLECTED (₹)', data.paymentSummary.totalCard],
      ['GRAND TOTAL PAYMENTS COLLECTED (₹)', data.paymentSummary.totalCollected],
      [],
      ['4. INVENTORY VALUATION SNAPSHOT'],
      ['Active Products Catalog', data.inventorySummary.totalActiveProducts],
      ['Total Inventory Units', data.inventorySummary.totalStockUnits],
      ['Current Inventory Cost Value (₹)', data.inventorySummary.currentInventoryValue],
      ['Potential Sales Value (₹)', data.inventorySummary.potentialSalesValue],
      ['Low Stock Items Count', data.inventorySummary.lowStockCount],
      ['Out of Stock Items Count', data.inventorySummary.outOfStockCount],
      [],
      ['5. OVERALL BUSINESS TOTALS'],
      ['Total Sales Revenue (₹)', data.salesSummary.totalRevenue],
      ['Total Repair Revenue (₹)', data.repairSummary.totalServiceRevenue],
      ['TOTAL BUSINESS REVENUE (₹)', data.salesSummary.totalRevenue + data.repairSummary.totalServiceRevenue],
      ['Total Product Profit (₹)', data.salesSummary.totalProfit],
      ['Total Net Repair Profit (₹)', data.repairSummary.netRepairProfit],
      ['TOTAL BUSINESS NET PROFIT (₹)', data.salesSummary.totalProfit + data.repairSummary.netRepairProfit],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // SHEET 2: SALES
    const salesRows = [
      ['Date', 'Sale #', 'Customer Name', 'Product Name', 'SKU', 'Qty', 'Unit Cost (₹)', 'Unit Price (₹)', 'Total Cost (₹)', 'Total Revenue (₹)', 'Actual Profit (₹)', 'Payment Method'],
      ...data.salesItems.map((item) => [
        item.date,
        item.saleNumber,
        item.customerName,
        item.productName,
        item.sku,
        item.quantity,
        item.unitCost,
        item.unitPrice,
        item.totalCost,
        item.totalRevenue,
        item.actualProfit,
        item.paymentMethod,
      ]),
      [],
      [
        'TOTALS',
        '',
        '',
        '',
        '',
        data.salesItems.reduce((s, i) => s + i.quantity, 0),
        '',
        '',
        data.salesSummary.totalCost,
        data.salesSummary.totalRevenue,
        data.salesSummary.totalProfit,
        '',
      ],
    ];
    const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

    // SHEET 3: REPAIRS
    const repairRows = [
      ['Repair Date', 'Ticket #', 'Customer Name', 'Device', 'Worker Name', 'Role', 'Service Revenue (₹)', 'Parts Cost (₹)', 'Net Profit (₹)', 'Owner Share (₹)', 'Tech Share (₹)', 'Amount Collected (₹)', 'Payment Method', 'Status'],
      ...data.repairItems.map((item) => [
        item.repairDate,
        item.ticketNumber,
        item.customerName,
        item.deviceInfo,
        item.workerName,
        item.workerRole,
        item.serviceRevenue,
        item.partsCost,
        item.netProfit,
        item.ownerShare,
        item.technicianShare,
        item.amountCollected,
        item.paymentMethods,
        item.status,
      ]),
      [],
      [
        'TOTALS',
        '',
        '',
        '',
        '',
        '',
        data.repairSummary.totalServiceRevenue,
        data.repairSummary.totalPartsCost,
        data.repairSummary.netRepairProfit,
        data.repairSummary.totalOwnerShare,
        data.repairSummary.totalTechnicianPayout,
        data.paymentSummary.repairCash + data.paymentSummary.repairUpi + data.paymentSummary.repairCard,
        '',
        '',
      ],
    ];
    const wsRepairs = XLSX.utils.aoa_to_sheet(repairRows);
    XLSX.utils.book_append_sheet(wb, wsRepairs, 'Repairs');

    // SHEET 4: WORKER PERFORMANCE
    const workerRows = [
      ['Worker Name', 'Role', 'Completed Repairs', 'Service Revenue (₹)', 'Parts Cost (₹)', 'Net Repair Profit (₹)', 'Owner Share (₹)', 'Technician Share (₹)'],
      ...data.workerPerformance.map((wp) => [
        wp.workerName,
        wp.workerRole,
        wp.completedRepairs,
        wp.serviceRevenue,
        wp.partsCost,
        wp.netProfit,
        wp.ownerShare,
        wp.technicianShare,
      ]),
    ];
    const wsWorkers = XLSX.utils.aoa_to_sheet(workerRows);
    XLSX.utils.book_append_sheet(wb, wsWorkers, 'Worker Performance');

    // SHEET 5: INVENTORY
    const inventoryRows = [
      ['Product Name', 'SKU', 'Category', 'Brand', 'Current Stock', 'Cost Price (₹)', 'Selling Price (₹)', 'Inventory Cost Value (₹)', 'Low Stock Threshold', 'Status'],
      ...data.inventoryItems.map((item) => [
        item.name,
        item.sku,
        item.category,
        item.brand,
        item.stock,
        item.costPrice,
        item.sellingPrice,
        item.inventoryValue,
        item.threshold,
        item.status,
      ]),
      [],
      [
        'TOTALS',
        '',
        '',
        '',
        data.inventorySummary.totalStockUnits,
        '',
        '',
        data.inventorySummary.currentInventoryValue,
        '',
        '',
      ],
    ];
    const wsInventory = XLSX.utils.aoa_to_sheet(inventoryRows);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory Catalog');

    // SHEET 6: PURCHASES
    const purchaseRows = [
      ['Date', 'Purchase #', 'Supplier', 'Product', 'Qty', 'Unit Cost (₹)', 'Total Cost (₹)', 'Discount (₹)', 'Final Amount (₹)', 'Payment Status'],
      ...data.purchaseItems.map((item) => [
        item.date,
        item.purchaseNumber,
        item.supplierName,
        item.productName,
        item.quantity,
        item.unitCost,
        item.totalCost,
        item.discount,
        item.finalAmount,
        item.paymentStatus,
      ]),
      [],
      [
        'TOTALS',
        '',
        '',
        '',
        data.purchaseSummary.totalUnitsPurchased,
        '',
        data.purchaseSummary.totalPurchaseValue,
        '',
        '',
        '',
      ],
    ];
    const wsPurchases = XLSX.utils.aoa_to_sheet(purchaseRows);
    XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchases');

    // Generate Excel File
    const fileName = `FAHAD_ERP_Business_Report_${data.startDateStr.replace(/\//g, '-')}_to_${data.endDateStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  exportToPDF(data: DetailedReportData) {
    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('FAHAD ELECTRONICS — BUSINESS PERFORMANCE REPORT', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Reporting Period: ${data.periodLabel} (${data.startDateStr} to ${data.endDateStr})`, 14, 22);
    doc.text(`Generated Date: ${new Date().toLocaleString('en-IN')}`, 14, 27);

    // Section 1: Executive Summary Table
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Executive Financial Summary', 14, 36);

    const execData = [
      ['Total Sales Revenue', formatCurrency(data.salesSummary.totalRevenue, 'INR')],
      ['Total Product Cost', formatCurrency(data.salesSummary.totalCost, 'INR')],
      ['Total Product Profit', formatCurrency(data.salesSummary.totalProfit, 'INR')],
      ['Total Repair Service Revenue', formatCurrency(data.repairSummary.totalServiceRevenue, 'INR')],
      ['Total Repair Parts Cost', formatCurrency(data.repairSummary.totalPartsCost, 'INR')],
      ['Net Repair Profit', formatCurrency(data.repairSummary.netRepairProfit, 'INR')],
      ['Owner Repair Profit Share', formatCurrency(data.repairSummary.totalOwnerShare, 'INR')],
      ['Technician Payout Share', formatCurrency(data.repairSummary.totalTechnicianPayout, 'INR')],
      ['Total Business Revenue', formatCurrency(data.salesSummary.totalRevenue + data.repairSummary.totalServiceRevenue, 'INR')],
      ['TOTAL BUSINESS NET PROFIT', formatCurrency(data.salesSummary.totalProfit + data.repairSummary.netRepairProfit, 'INR')],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['KPI Financial Metric', 'Value (INR)']],
      body: execData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    let lastY = (doc as any).lastAutoTable.finalY + 10;

    // Section 2: Payment Collection
    doc.text('2. Payment Collection Channels Summary', 14, lastY);

    const paymentRows = [
      ['POS Sales', formatCurrency(data.paymentSummary.posCash, 'INR'), formatCurrency(data.paymentSummary.posUpi, 'INR'), formatCurrency(data.paymentSummary.posCard, 'INR'), formatCurrency(data.paymentSummary.posCash + data.paymentSummary.posUpi + data.paymentSummary.posCard, 'INR')],
      ['Repair Services', formatCurrency(data.paymentSummary.repairCash, 'INR'), formatCurrency(data.paymentSummary.repairUpi, 'INR'), formatCurrency(data.paymentSummary.repairCard, 'INR'), formatCurrency(data.paymentSummary.repairCash + data.paymentSummary.repairUpi + data.paymentSummary.repairCard, 'INR')],
      ['TOTAL COLLECTED', formatCurrency(data.paymentSummary.totalCash, 'INR'), formatCurrency(data.paymentSummary.totalUpi, 'INR'), formatCurrency(data.paymentSummary.totalCard, 'INR'), formatCurrency(data.paymentSummary.totalCollected, 'INR')],
    ];

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Channel', 'Cash (₹)', 'UPI (₹)', 'Card (₹)', 'Total Collected (₹)']],
      body: paymentRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
    });

    lastY = (doc as any).lastAutoTable.finalY + 10;

    // Section 3: Worker Performance Table
    if (lastY > 230) {
      doc.addPage();
      lastY = 15;
    }

    doc.text('3. Worker Repair Performance & Share', 14, lastY);

    const workerRows = data.workerPerformance.map((wp) => [
      wp.workerName,
      wp.workerRole,
      wp.completedRepairs.toString(),
      formatCurrency(wp.serviceRevenue, 'INR'),
      formatCurrency(wp.netProfit, 'INR'),
      formatCurrency(wp.ownerShare, 'INR'),
      formatCurrency(wp.technicianShare, 'INR'),
    ]);

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Worker', 'Role', 'Completed', 'Revenue', 'Net Profit', 'Owner Share', 'Tech Share']],
      body: workerRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
    });

    lastY = (doc as any).lastAutoTable.finalY + 10;

    // Section 4: Inventory Snapshot
    if (lastY > 230) {
      doc.addPage();
      lastY = 15;
    }

    doc.text('4. Current Inventory Valuation Summary', 14, lastY);

    const invData = [
      ['Active Catalog Items', data.inventorySummary.totalActiveProducts.toString()],
      ['Total Stock Units', data.inventorySummary.totalStockUnits.toString()],
      ['Current Inventory Cost Value', formatCurrency(data.inventorySummary.currentInventoryValue, 'INR')],
      ['Potential Sales Value', formatCurrency(data.inventorySummary.potentialSalesValue, 'INR')],
      ['Low Stock Items', data.inventorySummary.lowStockCount.toString()],
      ['Out of Stock Items', data.inventorySummary.outOfStockCount.toString()],
    ];

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Inventory Metric', 'Value']],
      body: invData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
    });

    // Save PDF
    const fileName = `FAHAD_ERP_Business_Report_${data.startDateStr.replace(/\//g, '-')}_to_${data.endDateStr.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  },
};
