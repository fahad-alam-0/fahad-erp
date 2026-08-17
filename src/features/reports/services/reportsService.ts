import { supabase } from '@/lib/supabase';
import {
  DateRangeKey,
  SalesAnalytics,
  PurchasingAnalytics,
  InventoryAnalytics,
  RepairAnalytics,
  OwnerFinancialOverview,
  RepairServicePerformanceReport,
  WorkerServicePerformance,
  InventoryValuationSummary,
  InventoryValuationItem,
  ProductProfitabilitySummary,
  ProductProfitabilityItem,
} from '../types/reports.types';

export interface DateRangeBounds {
  startInclusive: string;
  endExclusive: string;
  startDate: string;
  endDate: string;
  displayStart: string;
  displayEnd: string;
  periodLabel: string;
  label: string;
}

function formatDateHuman(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const reportsService = {
  getDateRangeBounds(key: DateRangeKey, customStart?: string, customEnd?: string): DateRangeBounds {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    if (key === 'TODAY') {
      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day + 1, 0, 0, 0, 0);
      const dStr = formatDateHuman(start);
      const label = `Today — ${dStr}`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStr,
        displayEnd: dStr,
        periodLabel: label,
        label,
      };
    }

    if (key === 'YESTERDAY') {
      const start = new Date(year, month, day - 1, 0, 0, 0, 0);
      const end = new Date(year, month, day, 0, 0, 0, 0);
      const dStr = formatDateHuman(start);
      const label = `Yesterday — ${dStr}`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStr,
        displayEnd: dStr,
        periodLabel: label,
        label,
      };
    }

    if (key === 'LAST_7_DAYS') {
      const start = new Date(year, month, day - 7, 0, 0, 0, 0);
      const end = new Date(year, month, day + 1, 0, 0, 0, 0);
      const dStart = formatDateHuman(start);
      const dEnd = formatDateHuman(new Date(year, month, day, 0, 0, 0, 0));
      const label = `Last 7 Days (${dStart} — ${dEnd})`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    if (key === 'LAST_10_DAYS') {
      const start = new Date(year, month, day - 10, 0, 0, 0, 0);
      const end = new Date(year, month, day + 1, 0, 0, 0, 0);
      const dStart = formatDateHuman(start);
      const dEnd = formatDateHuman(new Date(year, month, day, 0, 0, 0, 0));
      const label = `Last 10 Days (${dStart} — ${dEnd})`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    if (key === 'LAST_30_DAYS') {
      const start = new Date(year, month, day - 30, 0, 0, 0, 0);
      const end = new Date(year, month, day + 1, 0, 0, 0, 0);
      const dStart = formatDateHuman(start);
      const dEnd = formatDateHuman(new Date(year, month, day, 0, 0, 0, 0));
      const label = `Last 30 Days (${dStart} — ${dEnd})`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    if (key === 'THIS_MONTH') {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 1, 0, 0, 0, 0);
      const dStart = formatDateHuman(start);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const dEnd = formatDateHuman(lastDayOfMonth);
      const label = `This Month (${dStart} — ${dEnd})`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    if (key === 'LAST_MONTH') {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 1, 0, 0, 0, 0);
      const dStart = formatDateHuman(start);
      const lastDayOfLastMonth = new Date(year, month, 0);
      const dEnd = formatDateHuman(lastDayOfLastMonth);
      const label = `Last Month (${dStart} — ${dEnd})`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    if (key === 'CUSTOM' && customStart && customEnd) {
      const [sYear, sMonth, sDay] = customStart.split('-').map(Number);
      const [eYear, eMonth, eDay] = customEnd.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
      const end = new Date(eYear, eMonth - 1, eDay + 1, 0, 0, 0, 0);

      if (end.getTime() <= start.getTime()) {
        throw new Error('From date cannot be after To date.');
      }

      const dStart = formatDateHuman(start);
      const dEnd = formatDateHuman(new Date(eYear, eMonth - 1, eDay, 0, 0, 0, 0));
      const label = `${dStart} — ${dEnd}`;
      return {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        displayStart: dStart,
        displayEnd: dEnd,
        periodLabel: label,
        label,
      };
    }

    // Default: THIS_MONTH
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 1, 0, 0, 0, 0);
    const dStart = formatDateHuman(start);
    const dEnd = formatDateHuman(new Date(year, month + 1, 0));
    const label = `This Month (${dStart} — ${dEnd})`;
    return {
      startInclusive: start.toISOString(),
      endExclusive: end.toISOString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      displayStart: dStart,
      displayEnd: dEnd,
      periodLabel: label,
      label,
    };
  },

  async getSalesAnalytics(startDate: string, endDate: string): Promise<SalesAnalytics> {
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('id, sale_number, sale_date, subtotal, discount, total_amount, created_at')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true });

    if (salesErr) {
      console.error('Error fetching sales analytics:', salesErr);
      throw new Error(salesErr.message || 'Failed to fetch sales analytics.');
    }

    const salesList = sales || [];
    const salesCount = salesList.length;
    const totalRevenue = salesList.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const avgSaleValue = salesCount > 0 ? totalRevenue / salesCount : 0;

    // Daily trend
    const trendMap: Record<string, { revenue: number; count: number }> = {};
    salesList.forEach((s) => {
      const dateKey = new Date(s.sale_date || s.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
      });
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { revenue: 0, count: 0 };
      }
      trendMap[dateKey].revenue += Number(s.total_amount || 0);
      trendMap[dateKey].count += 1;
    });

    const salesTrend = Object.keys(trendMap).map((date) => ({
      date,
      revenue: trendMap[date].revenue,
      count: trendMap[date].count,
    }));

    // Payment methods breakdown
    const saleIds = salesList.map((s) => s.id);
    let paymentMethodBreakdown: { method: 'CASH' | 'UPI' | 'CARD'; amount: number; count: number }[] = [];

    if (saleIds.length > 0) {
      const { data: payments } = await supabase
        .from('sale_payments')
        .select('payment_method, amount')
        .in('sale_id', saleIds);

      const payMap: Record<string, { amount: number; count: number }> = {
        CASH: { amount: 0, count: 0 },
        UPI: { amount: 0, count: 0 },
        CARD: { amount: 0, count: 0 },
      };

      (payments || []).forEach((p: any) => {
        const m = p.payment_method as 'CASH' | 'UPI' | 'CARD';
        if (payMap[m]) {
          payMap[m].amount += Number(p.amount || 0);
          payMap[m].count += 1;
        }
      });

      paymentMethodBreakdown = Object.keys(payMap).map((method) => ({
        method: method as any,
        amount: payMap[method].amount,
        count: payMap[method].count,
      }));
    }

    // Top products sold & product profitability (historical cost + revenue + margin)
    let topProducts: { id: string; name: string; code: string | null; qtySold: number; revenue: number }[] = [];
    const prodMap: Record<
      string,
      { name: string; code: string | null; qtySold: number; actualCost: number; sellingRevenue: number }
    > = {};

    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, unit_selling_price, unit_cost_price, total_selling_amount, product:products(name, product_code)')
        .in('sale_id', saleIds);

      // Lookup map for parent sale discount factor
      const saleDiscountRatioMap = new Map<string, number>();
      salesList.forEach((s) => {
        const sub = Number(s.subtotal || s.total_amount || 0);
        const tot = Number(s.total_amount || 0);
        const ratio = sub > 0 ? tot / sub : 1;
        saleDiscountRatioMap.set(s.id, ratio);
      });

      (items || []).forEach((item: any) => {
        const pid = item.product_id;
        const qty = Number(item.quantity || 0);
        const unitCost = Number(item.unit_cost_price || 0);
        const unadjustedRev = Number(item.total_selling_amount || qty * Number(item.unit_selling_price || 0));
        const ratio = saleDiscountRatioMap.get(item.sale_id) ?? 1;
        const lineRevenue = unadjustedRev * ratio;
        const lineCost = qty * unitCost;

        if (!prodMap[pid]) {
          prodMap[pid] = {
            name: item.product?.name || 'Product',
            code: item.product?.product_code || null,
            qtySold: 0,
            actualCost: 0,
            sellingRevenue: 0,
          };
        }

        prodMap[pid].qtySold += qty;
        prodMap[pid].actualCost += lineCost;
        prodMap[pid].sellingRevenue += lineRevenue;
      });

      topProducts = Object.keys(prodMap)
        .map((pid) => ({ id: pid, name: prodMap[pid].name, code: prodMap[pid].code, qtySold: prodMap[pid].qtySold, revenue: prodMap[pid].sellingRevenue }))
        .sort((a, b) => b.qtySold - a.qtySold)
        .slice(0, 5);
    }

    const profitabilityProducts: ProductProfitabilityItem[] = Object.keys(prodMap).map((pid) => {
      const p = prodMap[pid];
      const grossProfit = p.sellingRevenue - p.actualCost;
      const profitMarginPct = p.sellingRevenue > 0 ? (grossProfit / p.sellingRevenue) * 100 : 0;
      return {
        id: pid,
        name: p.name,
        code: p.code,
        qtySold: p.qtySold,
        actualCost: p.actualCost,
        sellingRevenue: p.sellingRevenue,
        grossProfit,
        profitMarginPct,
      };
    }).sort((a, b) => b.sellingRevenue - a.sellingRevenue);

    const totalQtySold = profitabilityProducts.reduce((sum, p) => sum + p.qtySold, 0);
    const totalActualCost = profitabilityProducts.reduce((sum, p) => sum + p.actualCost, 0);
    const totalSellingRevenue = profitabilityProducts.reduce((sum, p) => sum + p.sellingRevenue, 0);
    const totalGrossProfit = totalSellingRevenue - totalActualCost;
    const overallMarginPct = totalSellingRevenue > 0 ? (totalGrossProfit / totalSellingRevenue) * 100 : 0;

    const productProfitability: ProductProfitabilitySummary = {
      totalQtySold,
      totalActualCost,
      totalSellingRevenue,
      totalGrossProfit,
      overallMarginPct,
      products: profitabilityProducts,
    };

    return {
      totalRevenue,
      salesCount,
      avgSaleValue,
      salesTrend,
      paymentMethodBreakdown,
      topProducts,
      productProfitability,
    };
  },

  async getPurchasingAnalytics(startDate: string, endDate: string): Promise<PurchasingAnalytics> {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, purchase_number, purchase_date, subtotal, discount, total_amount, created_at, supplier:suppliers(name)')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching purchasing analytics:', error);
      throw new Error(error.message || 'Failed to fetch purchasing analytics.');
    }

    const purList = purchases || [];
    const purchasesCount = purList.length;
    const totalPurchaseValue = purList.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const avgPurchaseValue = purchasesCount > 0 ? totalPurchaseValue / purchasesCount : 0;

    // Trend
    const trendMap: Record<string, { amount: number; count: number }> = {};
    purList.forEach((p) => {
      const dateKey = new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
      });
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { amount: 0, count: 0 };
      }
      trendMap[dateKey].amount += Number(p.total_amount || 0);
      trendMap[dateKey].count += 1;
    });

    const purchaseTrend = Object.keys(trendMap).map((date) => ({
      date,
      amount: trendMap[date].amount,
      count: trendMap[date].count,
    }));

    // Top suppliers
    const supMap: Record<string, { name: string; purchaseCount: number; totalValue: number }> = {};
    purList.forEach((p: any) => {
      const supName = p.supplier?.name || 'Unknown Supplier';
      if (!supMap[supName]) {
        supMap[supName] = { name: supName, purchaseCount: 0, totalValue: 0 };
      }
      supMap[supName].purchaseCount += 1;
      supMap[supName].totalValue += Number(p.total_amount || 0);
    });

    const topSuppliers = Object.keys(supMap)
      .map((name) => ({ id: name, ...supMap[name] }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      totalPurchaseValue,
      purchasesCount,
      avgPurchaseValue,
      purchaseTrend,
      topSuppliers,
    };
  },

  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    const [prodsRes, movesRes] = await Promise.all([
      supabase.from('products').select('id, name, product_code, stock_quantity, low_stock_threshold, unit, current_cost_price, selling_price, is_active').eq('is_active', true),
      supabase.from('inventory_movements').select('movement_type, quantity').limit(300),
    ]);

    const prods = prodsRes.data || [];
    const totalActiveProducts = prods.length;
    const lowStockList: any[] = [];
    let outOfStockCount = 0;

    prods.forEach((p: any) => {
      const stock = Number(p.stock_quantity || 0);
      const threshold = Number(p.low_stock_threshold || 0);
      if (stock <= 0) {
        outOfStockCount++;
        lowStockList.push({
          id: p.id,
          name: p.name,
          code: p.product_code,
          stock,
          threshold,
          unit: p.unit,
        });
      } else if (stock <= threshold) {
        lowStockList.push({
          id: p.id,
          name: p.name,
          code: p.product_code,
          stock,
          threshold,
          unit: p.unit,
        });
      }
    });

    const moveMap: Record<string, { count: number; totalQty: number }> = {};
    (movesRes.data || []).forEach((m: any) => {
      const type = m.movement_type;
      if (!moveMap[type]) {
        moveMap[type] = { count: 0, totalQty: 0 };
      }
      moveMap[type].count += 1;
      moveMap[type].totalQty += Number(m.quantity || 0);
    });

    const movementCounts = Object.keys(moveMap).map((type) => ({
      type,
      count: moveMap[type].count,
      totalQty: moveMap[type].totalQty,
    }));

    // Inventory Valuation Calculation (Current Stock * Current Cost Price)
    const valuationItems: InventoryValuationItem[] = prods.map((p: any) => {
      const stock = Number(p.stock_quantity || 0);
      const costPrice = Number(p.current_cost_price || 0);
      const sellingPrice = Number(p.selling_price || 0);
      const inventoryCostValue = stock * costPrice;
      const potentialSalesValue = stock * sellingPrice;
      const potentialGrossMargin = potentialSalesValue - inventoryCostValue;

      return {
        id: p.id,
        name: p.name,
        code: p.product_code,
        stockQuantity: stock,
        currentCostPrice: costPrice,
        currentSellingPrice: sellingPrice,
        inventoryCostValue,
        potentialSalesValue,
        potentialGrossMargin,
      };
    }).sort((a, b) => b.inventoryCostValue - a.inventoryCostValue);

    const totalInventoryUnits = valuationItems.reduce((sum, i) => sum + i.stockQuantity, 0);
    const totalInventoryCostValue = valuationItems.reduce((sum, i) => sum + i.inventoryCostValue, 0);
    const totalPotentialSalesValue = valuationItems.reduce((sum, i) => sum + i.potentialSalesValue, 0);
    const totalPotentialGrossMargin = totalPotentialSalesValue - totalInventoryCostValue;

    const inventoryValuation: InventoryValuationSummary = {
      totalInventoryUnits,
      totalInventoryCostValue,
      totalPotentialSalesValue,
      totalPotentialGrossMargin,
      items: valuationItems,
    };

    return {
      totalActiveProducts,
      lowStockCount: lowStockList.length - outOfStockCount,
      outOfStockCount,
      movementCounts,
      lowStockList,
      inventoryValuation,
    };
  },

  async getRepairAnalytics(
    startDate: string,
    endDate: string,
    userRole?: string,
    userId?: string
  ): Promise<RepairAnalytics> {
    let req = supabase
      .from('repair_jobs')
      .select('status, service_revenue, financial_status, payment_status, created_at')
      .gte('received_at', startDate)
      .lt('received_at', endDate);

    if (userRole === 'TECHNICIAN' && userId) {
      req = req.eq('technician_id', userId);
    }

    const { data: repairs, error } = await req;
    if (error) {
      console.error('Error fetching repair analytics:', error);
      throw new Error(error.message || 'Failed to fetch repair analytics.');
    }

    const rList = repairs || [];
    const statusCounts: Record<string, number> = {
      RECEIVED: 0,
      DIAGNOSING: 0,
      WAITING_FOR_PARTS: 0,
      IN_REPAIR: 0,
      TESTING: 0,
      READY_FOR_PICKUP: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let activeRepairsCount = 0;
    let readyForPickupCount = 0;
    let pendingFinancialsCount = 0;
    let totalRepairRevenue = 0;

    rList.forEach((r: any) => {
      const st = r.status;
      if (statusCounts[st] !== undefined) {
        statusCounts[st] += 1;
      }
      if (st === 'IN_REPAIR' || st === 'WAITING_FOR_PARTS' || st === 'DIAGNOSING' || st === 'TESTING' || st === 'RECEIVED') {
        activeRepairsCount++;
      }
      if (st === 'READY_FOR_PICKUP') {
        readyForPickupCount++;
      }
      if (r.financial_status === 'PENDING' && st !== 'CANCELLED') {
        pendingFinancialsCount++;
      }
      totalRepairRevenue += Number(r.service_revenue || 0);
    });

    return {
      statusCounts,
      activeRepairsCount,
      readyForPickupCount,
      pendingFinancialsCount,
      totalRepairRevenue,
    };
  },

  async getOwnerFinancialOverview(
    startDate: string,
    endDate: string,
    userRole?: string
  ): Promise<OwnerFinancialOverview | null> {
    // STRICT RULE: ONLY OWNER GETS FINANCIAL OVERVIEW WITH PROFIT SNAPSHOTS!
    if (userRole !== 'OWNER') return null;

    const [salesRes, purRes, snapsRes] = await Promise.all([
      supabase.from('sales').select('total_amount').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('purchases').select('total_amount').gte('created_at', startDate).lt('created_at', endDate),
      (supabase.from('repair_profit_snapshots') as any)
        .select('*, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name)')
        .gte('calculated_at', startDate)
        .lt('calculated_at', endDate),
    ]);

    const salesRevenue = (salesRes.data || []).reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
    const purchaseValue = (purRes.data || []).reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);

    const snaps = snapsRes.data || [];
    const repairRevenue = snaps.reduce((sum: number, sn: any) => sum + Number(sn.service_revenue || 0), 0);
    const repairPartsCost = snaps.reduce((sum: number, sn: any) => sum + Number(sn.parts_cost || 0), 0);
    const netRepairProfit = snaps.reduce((sum: number, sn: any) => sum + Number(sn.net_repair_profit || 0), 0);
    const ownerRepairShare = snaps.reduce((sum: number, sn: any) => sum + Number(sn.owner_share || 0), 0);
    const technicianRepairShare = snaps.reduce((sum: number, sn: any) => sum + Number(sn.technician_share || 0), 0);

    // Group tech shares
    const techMap: Record<string, { techName: string; completedJobs: number; techShare: number }> = {};
    snaps.forEach((sn: any) => {
      const tid = sn.technician_id;
      const tName = sn.technician?.full_name || 'Technician';
      if (!techMap[tid]) {
        techMap[tid] = { techName: tName, completedJobs: 0, techShare: 0 };
      }
      techMap[tid].completedJobs += 1;
      techMap[tid].techShare += Number(sn.technician_share || 0);
    });

    const technicianEarningsSummary = Object.keys(techMap).map((tid) => ({
      techId: tid,
      ...techMap[tid],
    }));

    return {
      salesRevenue,
      purchaseValue,
      repairRevenue,
      repairPartsCost,
      netRepairProfit,
      ownerRepairShare,
      technicianRepairShare,
      technicianEarningsSummary,
    };
  },

  async getRepairServicePerformanceReport(
    startDate: string,
    endDate: string,
    userRole?: string,
    userId?: string
  ): Promise<RepairServicePerformanceReport | null> {
    // STRICT PRIVACY RULE: STAFF MUST NOT ACCESS REPAIR PROFIT SNAPSHOTS!
    if (userRole === 'STAFF') return null;

    let query = (supabase.from('repair_profit_snapshots') as any)
      .select('*, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name, role)')
      .gte('calculated_at', startDate)
      .lt('calculated_at', endDate);

    // If TECHNICIAN, filter by technician_id = userId
    if (userRole === 'TECHNICIAN' && userId) {
      query = query.eq('technician_id', userId);
    }

    const { data: snaps, error } = await query;
    if (error) {
      console.error('Error fetching repair profit snapshots for service performance report:', error);
      throw new Error(error.message || 'Failed to fetch repair service performance data.');
    }

    const snapsList = snaps || [];
    const workerMap = new Map<string, WorkerServicePerformance>();

    let totalServiceRevenue = 0;
    let totalPartsCost = 0;
    let totalNetProfit = 0;
    let totalOwnerShare = 0;
    let totalTechnicianPayout = 0;
    let ownerRepairsCount = 0;
    let technicianRepairsCount = 0;

    snapsList.forEach((sn: any) => {
      const rev = Number(sn.service_revenue || 0);
      const parts = Number(sn.parts_cost || 0);
      const net = Number(sn.net_repair_profit || 0);
      const oShare = Number(sn.owner_share || 0);
      const tShare = Number(sn.technician_share || 0);

      totalServiceRevenue += rev;
      totalPartsCost += parts;
      totalNetProfit += net;
      totalOwnerShare += oShare;
      totalTechnicianPayout += tShare;

      const wId = sn.technician_id;
      const wName = sn.technician?.full_name || 'Worker';
      const wRole: 'OWNER' | 'TECHNICIAN' | 'STAFF' = sn.technician?.role || (Number(sn.technician_percentage) === 0 ? 'OWNER' : 'TECHNICIAN');

      if (wRole === 'OWNER') {
        ownerRepairsCount++;
      } else {
        technicianRepairsCount++;
      }

      const existing = workerMap.get(wId) || {
        workerId: wId,
        workerName: wName,
        workerRole: wRole,
        servicesCompleted: 0,
        serviceRevenue: 0,
        partsCost: 0,
        netProfit: 0,
        ownerShare: 0,
        technicianShare: 0,
      };

      existing.servicesCompleted += 1;
      existing.serviceRevenue += rev;
      existing.partsCost += parts;
      existing.netProfit += net;
      existing.ownerShare += oShare;
      existing.technicianShare += tShare;

      workerMap.set(wId, existing);
    });

    const allWorkersComparison = Array.from(workerMap.values());
    const ownerPerformance = allWorkersComparison.find((w) => w.workerRole === 'OWNER') || null;
    const technicianPerformances = allWorkersComparison.filter((w) => w.workerRole !== 'OWNER');

    return {
      totalRepairsCompleted: snapsList.length,
      ownerRepairsCount,
      technicianRepairsCount,
      totalServiceRevenue,
      totalPartsCost,
      totalNetProfit,
      totalOwnerShare,
      totalTechnicianPayout,
      ownerPerformance,
      technicianPerformances,
      allWorkersComparison,
    };
  },
};
