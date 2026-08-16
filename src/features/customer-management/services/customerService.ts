import { supabase } from '@/lib/supabase';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerPurchaseHistoryItem,
  CustomerRepairHistoryItem,
} from '../types/customer.types';

export const customerService = {
  async getCustomers(query?: string): Promise<Customer[]> {
    let req = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (query && query.trim().length > 0) {
      const q = query.trim();
      req = req.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,alternate_phone.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error(error.message || 'Failed to fetch customers.');
    }
    return data || [];
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching customer by id:', error);
      throw new Error(error.message || 'Customer not found.');
    }
    return data;
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const payload = {
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      alternate_phone: input.alternate_phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await supabase.from('customers').insert(payload).select().single();

    if (error) {
      console.error('Error creating customer:', error);
      throw new Error(error.message || 'Failed to create customer.');
    }
    return data;
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const payload: Record<string, any> = {};
    if (input.full_name !== undefined) payload.full_name = input.full_name.trim();
    if (input.phone !== undefined) payload.phone = input.phone.trim();
    if (input.alternate_phone !== undefined) payload.alternate_phone = input.alternate_phone?.trim() || null;
    if (input.address !== undefined) payload.address = input.address?.trim() || null;
    if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw new Error(error.message || 'Failed to update customer.');
    }
    return data;
  },

  async getCustomerPurchaseHistory(customerId: string): Promise<CustomerPurchaseHistoryItem[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('id, sale_number, total_amount, payment_status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer purchase history:', error);
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number,
      total_amount: Number(s.total_amount || 0),
      payment_method: s.payment_status || 'PAID',
      payment_status: s.payment_status || 'PAID',
      created_at: s.created_at,
    }));
  },

  async getCustomerRepairHistory(customerId: string): Promise<CustomerRepairHistoryItem[]> {
    // Outer left join on technician profile to include UNASSIGNED repairs (technician_id IS NULL)
    const { data: jobs, error: jobsErr } = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_type, device_brand, device_model, reported_problem, status, payment_status, quoted_amount, service_revenue, created_at, updated_at, technician:profiles!left(full_name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (jobsErr) {
      console.error('Error fetching customer repair history:', jobsErr);
      return [];
    }

    if (!jobs || jobs.length === 0) {
      return [];
    }

    const jobIds = (jobs as any[]).map((j) => j.id);

    // Fetch payments for calculation of collected amount and remaining due
    const { data: payments } = await supabase
      .from('repair_payments')
      .select('repair_id, amount')
      .in('repair_id', jobIds);

    const paymentMap = new Map<string, number>();
    (payments || []).forEach((p: any) => {
      const existing = paymentMap.get(p.repair_id) || 0;
      paymentMap.set(p.repair_id, existing + Number(p.amount || 0));
    });

    return (jobs as any[]).map((r: any) => {
      const revenue = Number(r.service_revenue || r.quoted_amount || 0);
      const collected = paymentMap.get(r.id) || 0;
      const remaining = Math.max(0, revenue - collected);

      return {
        id: r.id,
        job_number: r.job_number,
        device_type: r.device_type,
        device_brand: r.device_brand,
        device_model: r.device_model || null,
        reported_problem: r.reported_problem,
        technician_name: r.technician?.full_name || 'Unassigned',
        status: r.status,
        payment_status: r.payment_status || 'UNPAID',
        quoted_amount: Number(r.quoted_amount || 0),
        service_revenue: revenue,
        collected_amount: collected,
        remaining_due: remaining,
        created_at: r.created_at,
        updated_at: r.updated_at || r.created_at,
      };
    });
  },
};
