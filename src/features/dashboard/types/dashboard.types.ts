export interface RecentSaleItem {
  id: string;
  sale_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export interface RecentRepairItem {
  id: string;
  job_number: string;
  customer_name: string;
  device_type: string;
  device_brand: string;
  reported_problem: string;
  technician_name?: string;
  status: string;
  quoted_amount: number;
  total_amount: number;
  created_at: string;
}

export interface RecentPurchaseItem {
  id: string;
  purchase_number: string;
  supplier_name: string;
  total_amount: number;
  created_at: string;
}

export interface LowStockProductItem {
  id: string;
  name: string;
  product_code: string;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  selling_price: number;
}

export interface TechnicianEarningSummary {
  technician_id: string;
  technician_name: string;
  total_jobs_completed: number;
  total_technician_share: number;
}

export interface OwnerDashboardMetrics {
  todaySalesTotal: number;
  todayPurchasesTotal: number;
  activeRepairsCount: number;
  readyRepairsCount: number;
  lowStockProductsCount: number;
  recentSales: RecentSaleItem[];
  recentRepairs: RecentRepairItem[];
  lowStockProducts: LowStockProductItem[];
  technicianEarnings: TechnicianEarningSummary[];
}

export interface TechnicianDashboardMetrics {
  activeRepairsCount: number;
  readyRepairsCount: number;
  completedRepairsCount: number;
  myEarningsTotal: number;
  myRecentRepairs: RecentRepairItem[];
}

export interface StaffDashboardMetrics {
  todaySalesTotal: number;
  todayPurchasesTotal: number;
  activeRepairsCount: number;
  readyRepairsCount: number;
  lowStockProductsCount: number;
  recentSales: RecentSaleItem[];
  recentRepairs: RecentRepairItem[];
  recentPurchases: RecentPurchaseItem[];
  lowStockProducts: LowStockProductItem[];
}

export type DashboardData =
  | { role: 'OWNER'; metrics: OwnerDashboardMetrics }
  | { role: 'TECHNICIAN'; metrics: TechnicianDashboardMetrics }
  | { role: 'STAFF'; metrics: StaffDashboardMetrics };
