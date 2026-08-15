export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  brand_id: string | null;
  product_code: string | null;
  description: string | null;
  selling_price: number;
  current_cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
  brand?: { name: string } | null;
}

export interface CreateProductInput {
  name: string;
  category_id: string;
  brand_id?: string | null;
  product_code?: string | null;
  description?: string | null;
  selling_price: number;
  current_cost_price: number;
  stock_quantity?: number;
  low_stock_threshold: number;
  unit: string;
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  category_id?: string;
  brand_id?: string | null;
  product_code?: string | null;
  description?: string | null;
  selling_price?: number;
  current_cost_price?: number;
  low_stock_threshold?: number;
  unit?: string;
  is_active?: boolean;
}

export interface AdjustInventoryInput {
  product_id: string;
  movement_type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  unit_cost?: number;
  notes: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'PURCHASE' | 'SALE' | 'REPAIR_USAGE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN';
  quantity: number;
  unit_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  created_by?: string | null;
}
