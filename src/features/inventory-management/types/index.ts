export interface ProductItem {
  id: string;
  sku: string;
  title: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  categoryId: string;
  brandId: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  quantityChange: number;
  reason: string;
}
