import { supabase } from '@/lib/supabase';
import {
  OwnerDashboardMetrics,
  TechnicianDashboardMetrics,
  StaffDashboardMetrics,
  RecentSaleItem,
  RecentRepairItem,
  RecentPurchaseItem,
  LowStockProductItem,
  TechnicianEarningSummary,
} from '../types/dashboard.types';

export const getTodayStartISO = (): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

export const dashboardService = {
  async getOwnerMetrics(): Promise<OwnerDashboardMetrics> {
    const todayStart = getTodayStartISO();

    // 1. Today Sales
    const salesRes = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', todayStart);

    if (salesRes.error) {
      console.error('Error fetching today sales metrics:', salesRes.error);
      throw new Error(`Failed to fetch today sales metrics: ${salesRes.error.message}`);
    }

    const todaySalesTotal = (salesRes.data || []).reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    // 2. Today Purchases
    const purchasesRes = await supabase
      .from('purchases')
      .select('total_amount')
      .gte('created_at', todayStart);

    if (purchasesRes.error) {
      console.error('Error fetching today purchases metrics:', purchasesRes.error);
      throw new Error(`Failed to fetch today purchases metrics: ${purchasesRes.error.message}`);
    }

    const todayPurchasesTotal = (purchasesRes.data || []).reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    // 3. Active Repairs Count
    const activeRepairsRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("DELIVERED","CANCELLED")');

    if (activeRepairsRes.error) {
      console.error('Error fetching active repairs count:', activeRepairsRes.error);
      throw new Error(`Failed to fetch active repairs count: ${activeRepairsRes.error.message}`);
    }

    // 4. Ready Repairs Count
    const readyRepairsRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'READY_FOR_PICKUP');

    if (readyRepairsRes.error) {
      console.error('Error fetching ready repairs count:', readyRepairsRes.error);
      throw new Error(`Failed to fetch ready repairs count: ${readyRepairsRes.error.message}`);
    }

    // 5. Low Stock Products
    const lowStockRes = await supabase
      .from('products')
      .select('id, name, product_code, stock_quantity, low_stock_threshold, unit, selling_price')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true })
      .limit(100);

    if (lowStockRes.error) {
      console.error('Error fetching low stock products:', lowStockRes.error);
      throw new Error(`Failed to fetch low stock products: ${lowStockRes.error.message}`);
    }

    const lowStockProducts: LowStockProductItem[] = (lowStockRes.data || [])
      .filter((p: any) => Number(p.stock_quantity || 0) <= Number(p.low_stock_threshold || 0))
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        product_code: p.product_code,
        stock_quantity: Number(p.stock_quantity || 0),
        low_stock_threshold: Number(p.low_stock_threshold || 0),
        unit: p.unit,
        selling_price: Number(p.selling_price || 0),
      }));

    // 6. Recent Sales (Corrected: query payment_status instead of non-existent sales.payment_method, with !left join on customers for walk-in sales)
    const recentSalesRes = await supabase
      .from('sales')
      .select('id, sale_number, total_amount, payment_status, created_at, customer:customers!left(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentSalesRes.error) {
      console.error('Error fetching recent sales:', recentSalesRes.error);
      throw new Error(`Failed to fetch recent sales list: ${recentSalesRes.error.message}`);
    }

    const recentSales: RecentSaleItem[] = (recentSalesRes.data || []).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number,
      customer_name: s.customer?.full_name || 'Walk-in Customer',
      total_amount: Number(s.total_amount || 0),
      payment_method: s.payment_status || 'PAID',
      created_at: s.created_at,
    }));

    // 7. Recent Repairs (Explicit !left joins on customers and profiles to preserve unassigned repairs)
    const recentRepairsRes = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_type, device_brand, reported_problem, status, quoted_amount, service_revenue, created_at, customer:customers!left(full_name), technician:profiles!repair_jobs_technician_id_fkey!left(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRepairsRes.error) {
      console.error('Error fetching recent repair jobs:', recentRepairsRes.error);
      throw new Error(`Failed to fetch recent repair jobs list: ${recentRepairsRes.error.message}`);
    }

    const recentRepairs: RecentRepairItem[] = (recentRepairsRes.data || []).map((r: any) => ({
      id: r.id,
      job_number: r.job_number,
      customer_name: r.customer?.full_name || 'Customer',
      device_type: r.device_type,
      device_brand: r.device_brand,
      reported_problem: r.reported_problem,
      technician_name: r.technician?.full_name || 'Unassigned',
      status: r.status,
      quoted_amount: Number(r.quoted_amount || 0),
      total_amount: Number(r.service_revenue || r.quoted_amount || 0),
      created_at: r.created_at,
    }));

    // 8. Technician Earnings Summary
    const snapshotsRes = await supabase
      .from('repair_profit_snapshots')
      .select('technician_id, technician_share, technician:profiles!repair_profit_snapshots_technician_id_fkey!left(full_name)');

    if (snapshotsRes.error) {
      console.error('Error fetching technician profit snapshots:', snapshotsRes.error);
      throw new Error(`Failed to fetch technician profit snapshots: ${snapshotsRes.error.message}`);
    }

    const techMap = new Map<string, { name: string; jobs: number; total: number }>();
    (snapshotsRes.data || []).forEach((snap: any) => {
      const techId = snap.technician_id;
      const techName = snap.technician?.full_name || 'Technician';
      const share = Number(snap.technician_share || 0);

      const existing = techMap.get(techId) || { name: techName, jobs: 0, total: 0 };
      existing.jobs += 1;
      existing.total += share;
      techMap.set(techId, existing);
    });

    const technicianEarnings: TechnicianEarningSummary[] = Array.from(techMap.entries()).map(([id, val]) => ({
      technician_id: id,
      technician_name: val.name,
      total_jobs_completed: val.jobs,
      total_technician_share: val.total,
    }));

    return {
      todaySalesTotal,
      todayPurchasesTotal,
      activeRepairsCount: activeRepairsRes.count || 0,
      readyRepairsCount: readyRepairsRes.count || 0,
      lowStockProductsCount: lowStockProducts.length,
      recentSales,
      recentRepairs,
      lowStockProducts,
      technicianEarnings,
    };
  },

  async getTechnicianMetrics(userId: string): Promise<TechnicianDashboardMetrics> {
    // 1. My Active Repairs
    const activeRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', userId)
      .not('status', 'in', '("DELIVERED","CANCELLED")');

    if (activeRes.error) {
      throw new Error(`Failed to fetch technician active repairs count: ${activeRes.error.message}`);
    }

    // 2. My Ready Repairs
    const readyRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', userId)
      .eq('status', 'READY_FOR_PICKUP');

    if (readyRes.error) {
      throw new Error(`Failed to fetch technician ready repairs count: ${readyRes.error.message}`);
    }

    // 3. My Completed Repairs
    const completedRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', userId)
      .eq('status', 'DELIVERED');

    if (completedRes.error) {
      throw new Error(`Failed to fetch technician completed repairs count: ${completedRes.error.message}`);
    }

    // 4. My Earnings
    const earningsRes = await supabase
      .from('repair_profit_snapshots')
      .select('technician_share')
      .eq('technician_id', userId);

    if (earningsRes.error) {
      throw new Error(`Failed to fetch technician profit share: ${earningsRes.error.message}`);
    }

    const myEarningsTotal = (earningsRes.data || []).reduce(
      (sum, item) => sum + Number(item.technician_share || 0),
      0
    );

    // 5. My Recent Repairs
    const recentRepairsRes = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_type, device_brand, reported_problem, status, quoted_amount, service_revenue, created_at, customer:customers!left(full_name)')
      .eq('technician_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRepairsRes.error) {
      throw new Error(`Failed to fetch technician recent repairs: ${recentRepairsRes.error.message}`);
    }

    const myRecentRepairs: RecentRepairItem[] = (recentRepairsRes.data || []).map((r: any) => ({
      id: r.id,
      job_number: r.job_number,
      customer_name: r.customer?.full_name || 'Customer',
      device_type: r.device_type,
      device_brand: r.device_brand,
      reported_problem: r.reported_problem,
      status: r.status,
      quoted_amount: Number(r.quoted_amount || 0),
      total_amount: Number(r.service_revenue || r.quoted_amount || 0),
      created_at: r.created_at,
    }));

    return {
      activeRepairsCount: activeRes.count || 0,
      readyRepairsCount: readyRes.count || 0,
      completedRepairsCount: completedRes.count || 0,
      myEarningsTotal,
      myRecentRepairs,
    };
  },

  async getStaffMetrics(): Promise<StaffDashboardMetrics> {
    const todayStart = getTodayStartISO();

    // 1. Today Sales
    const salesRes = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', todayStart);

    if (salesRes.error) {
      throw new Error(`Failed to fetch staff today sales: ${salesRes.error.message}`);
    }

    const todaySalesTotal = (salesRes.data || []).reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    // 2. Today Purchases
    const purchasesRes = await supabase
      .from('purchases')
      .select('total_amount')
      .gte('created_at', todayStart);

    if (purchasesRes.error) {
      throw new Error(`Failed to fetch staff today purchases: ${purchasesRes.error.message}`);
    }

    const todayPurchasesTotal = (purchasesRes.data || []).reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    // 3. Active Repairs Count
    const activeRepairsRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("DELIVERED","CANCELLED")');

    if (activeRepairsRes.error) {
      throw new Error(`Failed to fetch staff active repairs count: ${activeRepairsRes.error.message}`);
    }

    // 4. Ready Repairs Count
    const readyRepairsRes = await supabase
      .from('repair_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'READY_FOR_PICKUP');

    if (readyRepairsRes.error) {
      throw new Error(`Failed to fetch staff ready repairs count: ${readyRepairsRes.error.message}`);
    }

    // 5. Low Stock Products
    const lowStockRes = await supabase
      .from('products')
      .select('id, name, product_code, stock_quantity, low_stock_threshold, unit, selling_price')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true })
      .limit(100);

    if (lowStockRes.error) {
      throw new Error(`Failed to fetch staff low stock products: ${lowStockRes.error.message}`);
    }

    const lowStockProducts: LowStockProductItem[] = (lowStockRes.data || [])
      .filter((p: any) => Number(p.stock_quantity || 0) <= Number(p.low_stock_threshold || 0))
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        product_code: p.product_code,
        stock_quantity: Number(p.stock_quantity || 0),
        low_stock_threshold: Number(p.low_stock_threshold || 0),
        unit: p.unit,
        selling_price: Number(p.selling_price || 0),
      }));

    // 6. Recent Sales
    const recentSalesRes = await supabase
      .from('sales')
      .select('id, sale_number, total_amount, payment_status, created_at, customer:customers!left(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentSalesRes.error) {
      throw new Error(`Failed to fetch staff recent sales: ${recentSalesRes.error.message}`);
    }

    const recentSales: RecentSaleItem[] = (recentSalesRes.data || []).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number,
      customer_name: s.customer?.full_name || 'Walk-in Customer',
      total_amount: Number(s.total_amount || 0),
      payment_method: s.payment_status || 'PAID',
      created_at: s.created_at,
    }));

    // 7. Recent Repairs
    const recentRepairsRes = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_type, device_brand, reported_problem, status, quoted_amount, service_revenue, created_at, customer:customers!left(full_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRepairsRes.error) {
      throw new Error(`Failed to fetch staff recent repairs: ${recentRepairsRes.error.message}`);
    }

    const recentRepairs: RecentRepairItem[] = (recentRepairsRes.data || []).map((r: any) => ({
      id: r.id,
      job_number: r.job_number,
      customer_name: r.customer?.full_name || 'Customer',
      device_type: r.device_type,
      device_brand: r.device_brand,
      reported_problem: r.reported_problem,
      status: r.status,
      quoted_amount: Number(r.quoted_amount || 0),
      total_amount: Number(r.service_revenue || r.quoted_amount || 0),
      created_at: r.created_at,
    }));

    // 8. Recent Purchases
    const recentPurchasesRes = await supabase
      .from('purchases')
      .select('id, purchase_number, total_amount, created_at, supplier:suppliers!left(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentPurchasesRes.error) {
      throw new Error(`Failed to fetch staff recent purchases: ${recentPurchasesRes.error.message}`);
    }

    const recentPurchases: RecentPurchaseItem[] = (recentPurchasesRes.data || []).map((p: any) => ({
      id: p.id,
      purchase_number: p.purchase_number,
      supplier_name: p.supplier?.name || 'Supplier',
      total_amount: Number(p.total_amount || 0),
      created_at: p.created_at,
    }));

    return {
      todaySalesTotal,
      todayPurchasesTotal,
      activeRepairsCount: activeRepairsRes.count || 0,
      readyRepairsCount: readyRepairsRes.count || 0,
      lowStockProductsCount: lowStockProducts.length,
      recentSales,
      recentRepairs,
      recentPurchases,
      lowStockProducts,
    };
  },
};
