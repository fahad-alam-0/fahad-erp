export type DateRangeKey = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH';

export interface ProductProfitabilityItem {
  id: string;
  name: string;
  code: string | null;
  qtySold: number;
  actualCost: number;       // Sum of (quantity * sale_items.unit_cost_price)
  sellingRevenue: number;   // Actual selling revenue after proportional discount adjustment
  grossProfit: number;      // sellingRevenue - actualCost
  profitMarginPct: number;  // (grossProfit / sellingRevenue) * 100
}

export interface ProductProfitabilitySummary {
  totalQtySold: number;
  totalActualCost: number;
  totalSellingRevenue: number;
  totalGrossProfit: number;
  overallMarginPct: number;
  products: ProductProfitabilityItem[];
}

export interface SalesAnalytics {
  totalRevenue: number;
  salesCount: number;
  avgSaleValue: number;
  salesTrend: { date: string; revenue: number; count: number }[];
  paymentMethodBreakdown: { method: 'CASH' | 'UPI' | 'CARD'; amount: number; count: number }[];
  topProducts: { id: string; name: string; code: string | null; qtySold: number; revenue: number }[];
  productProfitability: ProductProfitabilitySummary;
}

export interface PurchasingAnalytics {
  totalPurchaseValue: number;
  purchasesCount: number;
  avgPurchaseValue: number;
  purchaseTrend: { date: string; amount: number; count: number }[];
  topSuppliers: { id: string; name: string; purchaseCount: number; totalValue: number }[];
}

export interface InventoryValuationItem {
  id: string;
  name: string;
  code: string | null;
  stockQuantity: number;
  currentCostPrice: number;
  currentSellingPrice: number;
  inventoryCostValue: number;    // stockQuantity * currentCostPrice
  potentialSalesValue: number;   // stockQuantity * currentSellingPrice
  potentialGrossMargin: number;  // potentialSalesValue - inventoryCostValue
}

export interface InventoryValuationSummary {
  totalInventoryUnits: number;
  totalInventoryCostValue: number;
  totalPotentialSalesValue: number;
  totalPotentialGrossMargin: number;
  items: InventoryValuationItem[];
}

export interface InventoryAnalytics {
  totalActiveProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  movementCounts: { type: string; count: number; totalQty: number }[];
  lowStockList: { id: string; name: string; code: string | null; stock: number; threshold: number; unit: string }[];
  inventoryValuation: InventoryValuationSummary;
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
