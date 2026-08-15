import { supabase } from '@/lib/supabase';
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  Purchase,
  CreatePurchaseInput,
} from '../types/purchasing.types';

export const purchasingService = {
  async getSuppliers(query?: string): Promise<Supplier[]> {
    let req = supabase.from('suppliers').select('*').order('name', { ascending: true });

    if (query && query.trim().length > 0) {
      const q = query.trim();
      req = req.or(`name.ilike.%${q}%,phone.ilike.%${q}%,alternate_phone.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(error.message || 'Failed to fetch suppliers.');
    }
    return data || [];
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching supplier by id:', error);
      throw new Error(error.message || 'Supplier not found.');
    }
    return data;
  },

  async createSupplier(input: CreateSupplierInput): Promise<Supplier> {
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      alternate_phone: input.alternate_phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      is_active: input.is_active ?? true,
    };

    const { data, error } = await supabase.from('suppliers').insert(payload).select().single();

    if (error) {
      console.error('Error creating supplier:', error);
      throw new Error(error.message || 'Failed to create supplier.');
    }
    return data;
  },

  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    const payload: Record<string, any> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
    if (input.alternate_phone !== undefined) payload.alternate_phone = input.alternate_phone?.trim() || null;
    if (input.address !== undefined) payload.address = input.address?.trim() || null;
    if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
    if (input.is_active !== undefined) payload.is_active = input.is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      throw new Error(error.message || 'Failed to update supplier.');
    }
    return data;
  },

  async getPurchases(params?: {
    search?: string;
    supplierId?: string;
    paymentStatus?: 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID';
  }): Promise<Purchase[]> {
    let req = supabase
      .from('purchases')
      .select('*, supplier:suppliers(name, phone)')
      .order('created_at', { ascending: false });

    if (params?.supplierId && params.supplierId !== 'ALL') {
      req = req.eq('supplier_id', params.supplierId);
    }

    if (params?.paymentStatus && params.paymentStatus !== 'ALL') {
      req = req.eq('payment_status', params.paymentStatus);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      req = req.or(`purchase_number.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching purchases:', error);
      throw new Error(error.message || 'Failed to fetch purchases.');
    }

    return (data || []).map((p: any) => ({
      ...p,
      subtotal: Number(p.subtotal || 0),
      discount: Number(p.discount || 0),
      total_amount: Number(p.total_amount || 0),
    }));
  },

  async getPurchaseById(id: string): Promise<Purchase | null> {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, supplier:suppliers(name, phone, address), purchase_items(*, product:products(name, product_code, unit))')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching purchase by id:', error);
      throw new Error(error.message || 'Purchase order not found.');
    }

    return {
      ...data,
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      total_amount: Number(data.total_amount || 0),
      purchase_items: (data.purchase_items || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        total_cost: Number(item.total_cost || 0),
      })),
    };
  },

  async createPurchase(input: CreatePurchaseInput): Promise<{ purchase_id: string; purchase_number: string; total_amount: number }> {
    // Strictly call secure backend RPC: private.create_purchase
    const { data, error } = await supabase.schema('private').rpc('create_purchase', {
      p_supplier_id: input.supplier_id,
      p_purchase_date: input.purchase_date || new Date().toISOString().split('T')[0],
      p_discount: input.discount ?? 0,
      p_payment_status: input.payment_status || 'UNPAID',
      p_notes: input.notes?.trim() || null,
      p_items: input.items,
    });

    if (error) {
      console.error('Error calling create_purchase RPC:', error);
      throw new Error(error.message || 'Failed to execute purchase creation transaction.');
    }

    return data;
  },

  async getSupplierPurchaseHistory(supplierId: string): Promise<Purchase[]> {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supplier purchase history:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      subtotal: Number(p.subtotal || 0),
      discount: Number(p.discount || 0),
      total_amount: Number(p.total_amount || 0),
    }));
  },
};
