export type DateRangeKey = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH';

export interface SalesAnalytics {
  totalRevenue: number;
  salesCount: number;
  avgSaleValue: number;
  salesTrend: { date: string; revenue: number; count: number }[];
  paymentMethodBreakdown: { method: 'CASH' | 'UPI' | 'CARD'; amount: number; count: number }[];
  topProducts: { id: string; name: string; code: string | null; qtySold: number; revenue: number }[];
}

export interface PurchasingAnalytics {
  totalPurchaseValue: number;
  purchasesCount: number;
  avgPurchaseValue: number;
  purchaseTrend: { date: string; amount: number; count: number }[];
  topSuppliers: { id: string; name: string; purchaseCount: number; totalValue: number }[];
}

export interface InventoryAnalytics {
  totalActiveProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  movementCounts: { type: string; count: number; totalQty: number }[];
  lowStockList: { id: string; name: string; code: string | null; stock: number; threshold: number; unit: string }[];
}

export interface RepairAnalytics {
  statusCounts: Record<string, number>;
  activeRepairsCount: number;
  readyForPickupCount: number;
  pendingFinancialsCount: number;
  totalRepairRevenue: number;
}

export interface OwnerFinancialOverview {
  salesRevenue: number;
  purchaseValue: number;
  repairRevenue: number;
  repairPartsCost: number;
  netRepairProfit: number;
  ownerRepairShare: number;
  technicianRepairShare: number;
  technicianEarningsSummary: { techId: string; techName: string; completedJobs: number; techShare: number }[];
}

export interface WorkerServicePerformance {
  workerId: string;
  workerName: string;
  workerRole: 'OWNER' | 'TECHNICIAN' | 'STAFF';
  servicesCompleted: number;
  serviceRevenue: number;
  partsCost: number;
  netProfit: number;
  ownerShare: number;
  technicianShare: number;
}

export interface RepairServicePerformanceReport {
  totalRepairsCompleted: number;
  ownerRepairsCount: number;
  technicianRepairsCount: number;
  totalServiceRevenue: number;
  totalPartsCost: number;
  totalNetProfit: number;
  totalOwnerShare: number;
  totalTechnicianPayout: number;
  ownerPerformance: WorkerServicePerformance | null;
  technicianPerformances: WorkerServicePerformance[];
  allWorkersComparison: WorkerServicePerformance[];
}
