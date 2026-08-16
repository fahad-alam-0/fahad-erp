export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  full_name: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  full_name?: string;
  phone?: string;
  alternate_phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerPurchaseHistoryItem {
  id: string;
  sale_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export interface CustomerRepairHistoryItem {
  id: string;
  job_number: string;
  device_type: string;
  device_brand: string;
  device_model?: string | null;
  reported_problem: string;
  technician_name?: string;
  status: string;
  payment_status: string;
  quoted_amount: number;
  service_revenue: number;
  collected_amount: number;
  remaining_due: number;
  created_at: string;
  updated_at: string;
}
