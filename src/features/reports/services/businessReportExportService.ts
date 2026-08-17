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

    // Primary sales revenue sum directly from sales table
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
    let totalProductsSold = 0;

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
        totalProductsSold += qty;

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

    // Tickets created/received in period & all repair workload status
    const { data: periodRepairs } = await supabase
      .from('repair_jobs')
      .select('id, repair_number, device_brand, device_model, problem_description, status, payment_status, quoted_amount, service_revenue, created_at, customer:customers(name), technician:profiles!repair_jobs_technician_id_fkey(full_name)')
      .gte('created_at', startInclusive)
      .lt('created_at', endExclusive);

    const periodRepairList = periodRepairs || [];
    const newTicketsCount = periodRepairList.length;

    // Workload status breakdown counts
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

    // Fetch repair payments collected in period
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
    let ownerServicesCompleted = 0;
    let technicianServicesCompleted = 0;

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

      if (wRole === 'OWNER') {
        ownerServicesCompleted++;
      } else {
        technicianServicesCompleted++;
      }

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

      repairStatusCounts,
      pendingRepairs: pendingRepairsDetailed,

      businessActivity: {
        salesCompleted: salesList.length,
        repairsReceived: newTicketsCount,
        repairsCompleted: completedCount,
        repairsPending: Math.max(0, newTicketsCount - deliveredCount),
        totalProductsSold,
        ownerServicesCompleted,
        technicianServicesCompleted,
      },

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

    // Sheet 3: Repairs
    const repairHeader = ['Date', 'Ticket #', 'Customer Name', 'Device', 'Assigned Worker', 'Worker Role', 'Revenue (INR)', 'Parts Cost (INR)', 'Net Profit (INR)', 'Owner Share (INR)', 'Worker Share (INR)', 'Collected (INR)', 'Status'];
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

    // Sheet 5: Inventory
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
    doc.text('FAHAD ERP — BUSINESS REPORT', 14, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${data.periodLabel}`, 14, currentY);
    currentY += 8;

    // STRICT RULE: Plain numeric formatting ONLY. NO "₹", "Rs", "INR", or "¹" characters inside data cells!
    const fmt = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // PAGE 1: SECTIONS 1, 2, & 3
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
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

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
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

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
      styles: { fontSize: 8.5 },
    });

    // PAGE 2: 4. PRODUCT SALES
    doc.addPage();
    currentY = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. PRODUCT SALES', 14, currentY);
    currentY += 6;

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
      head: [['Product Name', 'Quantity', 'Selling Price (INR)', 'Total Sale (INR)']],
      body: salesRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    // PAGE 3: 5. REPAIR / WORKER PERFORMANCE & 6. REPAIR STATUS
    doc.addPage();
    currentY = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. REPAIR / WORKER PERFORMANCE', 14, currentY);
    currentY += 6;

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
      head: [['Worker Name', 'Role', 'Jobs Completed', 'Work Value (INR)', 'Worker Share (INR)']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('6. REPAIR STATUS WORKLOAD', 14, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [['Status Category', 'Repairs Count']],
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
      styles: { fontSize: 8.5 },
    });

    // PAGE 4: 7. PENDING REPAIRS & 8. INVENTORY SNAPSHOT
    doc.addPage();
    currentY = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('7. PENDING REPAIRS (ACTIVE WORKLOAD)', 14, currentY);
    currentY += 6;

    const pendingRows = data.pendingRepairs.length > 0
      ? data.pendingRepairs.map((p) => [
          p.customerName,
          p.deviceInfo,
          p.problem,
          p.workerName,
          p.status,
          fmt(p.quotedAmount),
        ])
      : [['No pending repairs currently active', '-', '-', '-', 'ALL_DELIVERED', fmt(0)]];

    autoTable(doc, {
      startY: currentY,
      head: [['Customer', 'Device', 'Problem Description', 'Assigned Worker', 'Status', 'Quoted Amount (INR)']],
      body: pendingRows,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('8. CURRENT INVENTORY SNAPSHOT', 14, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [['Inventory Metric Description', 'Value / Amount (INR)']],
      body: [
        ['Active Products in Catalog', data.inventorySummary.totalActiveProducts.toString()],
        ['Total Stock Units', data.inventorySummary.totalStockUnits.toString()],
        ['Current Inventory Cost Value', fmt(data.inventorySummary.currentInventoryValue)],
        ['Potential Sales Value', fmt(data.inventorySummary.potentialSalesValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
    });

    // Save PDF
    const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FAHAD_ELECTRONICS_Business_Report_${cleanLabel}.pdf`;
    doc.save(filename);
  },
};
