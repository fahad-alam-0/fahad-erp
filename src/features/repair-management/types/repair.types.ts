export type RepairStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'WAITING_FOR_PARTS'
  | 'IN_REPAIR'
  | 'TESTING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED';

export type RepairPaymentStatus = 'UNPAID' | 'PAID';

export type RepairFinancialStatus = 'PENDING' | 'FINALIZED';

export interface RepairPart {
  id: string;
  repair_id: string;
  product_id: string;
  quantity: number;
  unit_cost_price: number;
  total_cost: number;
  created_by: string;
  created_at: string;
  product?: {
    name: string;
    product_code: string | null;
    unit: string;
  } | null;
}

export interface RepairPayment {
  id: string;
  repair_id: string;
  payment_method: 'CASH' | 'UPI' | 'CARD';
  amount: number;
  payment_reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface RepairProfitSnapshot {
  id: string;
  repair_id: string;
  technician_id: string;
  service_revenue: number;
  parts_cost: number;
  net_repair_profit: number;
  owner_percentage: number;
  technician_percentage: number;
  owner_share: number;
  technician_share: number;
  calculated_at: string;
  finalized_by: string;
}

export interface RepairStatusHistory {
  id: string;
  repair_id: string;
  old_status: RepairStatus | null;
  new_status: RepairStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
  changed_by_profile?: {
    full_name: string;
  } | null;
}

export interface RepairJob {
  id: string;
  job_number: string;
  customer_id: string;
  device_type: string;
  device_brand: string;
  device_model: string | null;
  serial_number: string | null;
  reported_problem: string;
  intake_notes: string | null;
  diagnosis: string | null;
  technician_notes: string | null;
  technician_id: string | null;
  received_at: string;
  expected_completion_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  status: RepairStatus;
  quoted_amount: number | null;
  discount: number;
  service_revenue: number;
  payment_status: RepairPaymentStatus;
  financial_status: RepairFinancialStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string;
    phone: string;
    address?: string;
  } | null;
  technician?: {
    full_name: string;
    email: string;
    role: string;
  } | null;
  repair_parts?: RepairPart[];
  repair_payments?: RepairPayment[];
  repair_profit_snapshots?: RepairProfitSnapshot | null;
  repair_status_history?: RepairStatusHistory[];
}

export interface CreateRepairJobInput {
  customer_id: string;
  device_type: string;
  device_brand: string;
  reported_problem: string;
  device_model?: string;
  serial_number?: string;
  intake_notes?: string;
  expected_completion_at?: string;
  quoted_amount?: number;
  discount?: number;
  technician_id?: string;
}
