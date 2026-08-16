import { supabase } from '@/lib/supabase';
import {
  DateRangeKey,
  SalesAnalytics,
  PurchasingAnalytics,
  InventoryAnalytics,
  RepairAnalytics,
  OwnerFinancialOverview,
} from '../types/reports.types';

export const reportsService = {
  getDateRangeBounds(key: DateRangeKey): { startDate: string; endDate: string; label: string } {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (key === 'TODAY') {
      return {
        startDate: `${todayStr}T00:00:00.000Z`,
        endDate: `${todayStr}T23:59:59.999Z`,
        label: 'Today',
      };
    }

    if (key === 'LAST_7_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return {
        startDate: d.toISOString(),
        endDate: now.toISOString(),
        label: 'Last 7 Days',
      };
    }

    if (key === 'LAST_30_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return {
        startDate: d.toISOString(),
        endDate: now.toISOString(),
        label: 'Last 30 Days',
      };
    }

    if (key === 'LAST_MONTH') {
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: startLastMonth.toISOString(),
        endDate: endLastMonth.toISOString(),
        label: 'Last Month',
      };
    }

    // Default: THIS_MONTH
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: startThisMonth.toISOString(),
      endDate: now.toISOString(),
      label: 'This Month',
    };
  },

  async getSalesAnalytics(startDate: string, endDate: string): Promise<SalesAnalytics> {
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('id, sale_number, sale_date, subtotal, discount, total_amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
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

    // Top products sold
    let topProducts: { id: string; name: string; code: string | null; qtySold: number; revenue: number }[] = [];
    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_id, quantity, total_selling_amount, product:products(name, product_code)')
        .in('sale_id', saleIds);

      const prodMap: Record<string, { name: string; code: string | null; qtySold: number; revenue: number }> = {};
      (items || []).forEach((item: any) => {
        const pid = item.product_id;
        if (!prodMap[pid]) {
          prodMap[pid] = {
            name: item.product?.name || 'Product',
            code: item.product?.product_code || null,
            qtySold: 0,
            revenue: 0,
          };
        }
        prodMap[pid].qtySold += Number(item.quantity || 0);
        prodMap[pid].revenue += Number(item.total_selling_amount || 0);
      });

      topProducts = Object.keys(prodMap)
        .map((pid) => ({ id: pid, ...prodMap[pid] }))
        .sort((a, b) => b.qtySold - a.qtySold)
        .slice(0, 5);
    }

    return {
      totalRevenue,
      salesCount,
      avgSaleValue,
      salesTrend,
      paymentMethodBreakdown,
      topProducts,
    };
  },

  async getPurchasingAnalytics(startDate: string, endDate: string): Promise<PurchasingAnalytics> {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, purchase_number, purchase_date, subtotal, discount, total_amount, created_at, supplier:suppliers(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
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
      supabase.from('products').select('*').eq('is_active', true),
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

    return {
      totalActiveProducts,
      lowStockCount: lowStockList.length - outOfStockCount,
      outOfStockCount,
      movementCounts,
      lowStockList,
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
      .lte('received_at', endDate);

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
      supabase.from('sales').select('total_amount').gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('purchases').select('total_amount').gte('created_at', startDate).lte('created_at', endDate),
      (supabase.from('repair_profit_snapshots') as any)
        .select('*, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name)')
        .gte('calculated_at', startDate)
        .lte('calculated_at', endDate),
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
};
