/**
 * Shared Calculation Utilities
 * 
 * Generic mathematical and financial helpers reusable across features.
 * Note: Feature-specific domain calculations (e.g. Repair Profit Sharing)
 * belong inside their respective feature modules (e.g. src/features/repair-management/).
 */

export function calculateSaleTotal(
  subtotal: number,
  taxRatePercentage: number,
  discountAmount = 0
): {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
} {
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = (discountedSubtotal * taxRatePercentage) / 100;
  const grandTotal = discountedSubtotal + taxAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    grandTotal,
  };
}
