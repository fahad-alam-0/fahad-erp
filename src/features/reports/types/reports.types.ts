export type DateRangeKey =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_10_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

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

export interface SalesByRoleItem {
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'TECHNICIAN';
  amount: number;
  count: number;
}

export interface SalesByUserItem {
  userId: string;
  userName: string;
  userRole: 'OWNER' | 'ADMIN' | 'STAFF' | 'TECHNICIAN';
  amount: number;
  count: number;
}

export interface SalesAnalytics {
  totalRevenue: number;
  salesCount: number;
  avgSaleValue: number;
  salesTrend: { date: string; revenue: number; count: number }[];
  paymentMethodBreakdown: { method: 'CASH' | 'UPI' | 'CARD'; amount: number; count: number }[];
  salesByRoleBreakdown: SalesByRoleItem[];
  salesByUserBreakdown: SalesByUserItem[];
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
  completedCount: number;
  readyForPickupCount: number;
  pendingFinancialsCount: number;
  totalRevenue: number;
  totalRepairRevenue: number;
  partsCost: number;
  netProfit: number;
  technicianPayout: number;
  ownerShare: number;
  amountCollected: number;
  amountPending: number;
}

export interface OwnerFinancialOverview {
  totalRevenue: number;
  salesRevenue: number;
  salesCostOfGoods: number;
  grossSalesProfit: number;
  repairRevenue: number;
  repairPartsCost: number;
  netRepairProfit: number;
  technicianRepairShare: number;
  ownerRepairShare: number;
  totalExpenses: number;
  netBusinessProfit: number;
  purchaseValue: number;
  technicianEarningsSummary: any[];
}

export interface WorkerServicePerformance {
  workerId: string;
  workerName: string;
  workerRole: 'OWNER' | 'ADMIN' | 'TECHNICIAN' | 'STAFF';
  servicesCompleted: number;
  serviceRevenue: number;
  partsCost: number;
  netProfit: number;
  ownerShare: number;
  technicianShare: number;
  financialStatus?: 'SETTLED' | 'UNSETTLED';
}

export interface RepairServicePerformanceReport {
  totalRepairsCompleted: number;
  totalServiceRevenue: number;
  totalPartsCost: number;
  totalNetProfit: number;
  totalOwnerShare: number;
  totalTechnicianPayout: number;
  ownerRepairsCount: number;
  technicianRepairsCount: number;
  ownerPerformance?: WorkerServicePerformance | null;
  technicianPerformances: WorkerServicePerformance[];
  allWorkersComparison: WorkerServicePerformance[];
}
