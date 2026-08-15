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
      .select('id, sale_number, total_amount, payment_method, payment_status, created_at')
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
      payment_method: s.payment_method,
      payment_status: s.payment_status,
      created_at: s.created_at,
    }));
  },

  async getCustomerRepairHistory(customerId: string): Promise<CustomerRepairHistoryItem[]> {
    const { data, error } = await supabase
      .from('repair_jobs')
      .select('id, job_number, device_type, device_brand, reported_problem, status, quoted_amount, total_amount, created_at, technician:profiles!repair_jobs_technician_id_fkey(full_name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer repair history:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      job_number: r.job_number,
      device_type: r.device_type,
      device_brand: r.device_brand,
      reported_problem: r.reported_problem,
      technician_name: r.technician?.full_name || 'Unassigned',
      status: r.status,
      quoted_amount: Number(r.quoted_amount || 0),
      total_amount: Number(r.total_amount || 0),
      created_at: r.created_at,
    }));
  },
};
