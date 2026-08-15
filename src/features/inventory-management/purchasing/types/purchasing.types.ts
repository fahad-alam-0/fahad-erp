export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
  alternate_phone?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  product?: {
    name: string;
    product_code: string | null;
    unit: string;
  } | null;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  purchase_number: string;
  purchase_date: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    name: string;
    phone: string | null;
  } | null;
  purchase_items?: PurchaseItem[];
}

export interface CreatePurchaseItemInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

export interface CreatePurchaseInput {
  supplier_id: string;
  purchase_date?: string;
  discount?: number;
  payment_status?: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes?: string;
  items: CreatePurchaseItemInput[];
}
