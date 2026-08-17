export type ReturnReason = 'WRONG_PRODUCT' | 'CUSTOMER_CHANGED_MIND' | 'NOT_SUITABLE' | 'OTHER';

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
  returned_quantity?: number;
  remaining_returnable_quantity?: number;
  product?: {
    name: string;
    product_code: string | null;
    unit: string;
  } | null;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  amount: number;
  payment_reference: string | null;
  created_at: string;
}

export interface SaleReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_selling_price: number;
  unit_cost_price: number;
  refund_amount: number;
  created_at: string;
  product?: {
    name: string;
    product_code: string | null;
    unit: string;
  } | null;
}

export interface SaleReturn {
  id: string;
  return_number: string;
  sale_id: string;
  customer_id: string | null;
  total_refund_amount: number;
  refund_method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  refund_reference: string | null;
  reason: ReturnReason;
  reason_notes: string | null;
  processed_by: string;
  created_at: string;
  sale?: {
    sale_number: string;
    sale_date: string;
  } | null;
  customer?: {
    full_name: string;
    phone: string;
  } | null;
  processor?: {
    full_name: string;
  } | null;
  items?: SaleReturnItem[];
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
  returned_amount?: number;
  net_amount?: number;
  return_status?: 'NO_RETURN' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED';
  customer?: {
    full_name: string;
    phone: string;
  } | null;
  sale_items?: SaleItem[];
  sale_payments?: SalePayment[];
  sale_returns?: SaleReturn[];
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
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
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

export interface ProcessReturnItemInput {
  sale_item_id: string;
  quantity: number;
}

export interface ProcessReturnInput {
  sale_id: string;
  refund_method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  refund_reference?: string;
  reason: ReturnReason;
  reason_notes?: string;
  items: ProcessReturnItemInput[];
}
