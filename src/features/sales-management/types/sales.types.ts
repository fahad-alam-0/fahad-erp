export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_selling_price: number;
  unit_cost_price: number;
  total_selling_amount: number;
  total_cost_amount: number;
  created_at: string;
  product?: {
    name: string;
    product_code: string | null;
    unit: string;
  } | null;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: 'CASH' | 'UPI' | 'CARD';
  amount: number;
  payment_reference: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_status: string;
  sale_status: 'COMPLETED' | 'VOIDED';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string;
    phone: string;
  } | null;
  sale_items?: SaleItem[];
  sale_payments?: SalePayment[];
}

export interface CartItem {
  product_id: string;
  product_name: string;
  product_code: string | null;
  unit: string;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  quantity: number;
}

export interface CreateSaleItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateSalePaymentInput {
  payment_method: 'CASH' | 'UPI' | 'CARD';
  amount: number;
  payment_reference?: string;
}

export interface CreateSaleInput {
  customer_id?: string | null;
  discount?: number;
  notes?: string;
  items: CreateSaleItemInput[];
  payments: CreateSalePaymentInput[];
}
