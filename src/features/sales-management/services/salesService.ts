import { supabase } from '@/lib/supabase';
import { Sale, CreateSaleInput } from '../types/sales.types';
import { Product } from '@/features/inventory-management/types/inventory.types';
import { Customer } from '@/features/customer-management/types/customer.types';

export const salesService = {
  async getSales(params?: { search?: string; customerId?: string }): Promise<Sale[]> {
    let req = supabase
      .from('sales')
      .select('*, customer:customers(full_name, phone), sale_items(*, product:products(name, product_code, unit))')
      .order('created_at', { ascending: false });

    if (params?.customerId && params.customerId !== 'ALL') {
      req = req.eq('customer_id', params.customerId);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching sales log:', error);
      throw new Error(error.message || 'Failed to fetch sales log.');
    }

    let sales = (data || []).map((s: any) => ({
      ...s,
      subtotal: Number(s.subtotal || 0),
      discount: Number(s.discount || 0),
      total_amount: Number(s.total_amount || 0),
      sale_items: (s.sale_items || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_selling_price: Number(item.unit_selling_price || 0),
        unit_cost_price: Number(item.unit_cost_price || 0),
        total_selling_amount: Number(item.total_selling_amount || 0),
        total_cost_amount: Number(item.total_cost_amount || 0),
      })),
    }));

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim().toLowerCase();
      sales = sales.filter((s: Sale) => {
        const matchInvoice = s.sale_number?.toLowerCase().includes(q);
        const matchCustomer = s.customer?.full_name?.toLowerCase().includes(q);
        const matchProduct = (s.sale_items || []).some(
          (item) => item.product?.name?.toLowerCase().includes(q) || item.product?.product_code?.toLowerCase().includes(q)
        );
        return matchInvoice || matchCustomer || matchProduct;
      });
    }

    return sales;
  },

  async getSaleById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(full_name, phone, address), sale_items(*, product:products(name, product_code, unit)), sale_payments(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sale by id:', error);
      throw new Error(error.message || 'Sale invoice not found.');
    }

    return {
      ...data,
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      total_amount: Number(data.total_amount || 0),
      sale_items: (data.sale_items || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_selling_price: Number(item.unit_selling_price || 0),
        unit_cost_price: Number(item.unit_cost_price || 0),
        total_selling_amount: Number(item.total_selling_amount || 0),
        total_cost_amount: Number(item.total_cost_amount || 0),
      })),
      sale_payments: (data.sale_payments || []).map((p: any) => ({
        ...p,
        amount: Number(p.amount || 0),
      })),
    };
  },

  async createSale(input: CreateSaleInput): Promise<{
    sale_id: string;
    sale_number: string;
    subtotal: number;
    discount: number;
    total_amount: number;
    payment_status: string;
    sale_status: string;
  }> {
    // Strictly call secure backend RPC: private.create_sale
    const { data, error } = await supabase.schema('private').rpc('create_sale', {
      p_customer_id: input.customer_id || null,
      p_discount: input.discount ?? 0,
      p_notes: input.notes?.trim() || null,
      p_items: input.items,
      p_payments: input.payments,
    });

    if (error) {
      console.error('Error executing create_sale RPC:', error);
      throw new Error(error.message || 'Failed to complete sale transaction.');
    }

    return data;
  },

  async searchProducts(query?: string): Promise<Product[]> {
    let req = supabase
      .from('products')
      .select('*, category:categories(name), brand:brands(name)')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(30);

    if (query && query.trim().length > 0) {
      const q = query.trim();
      req = req.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error searching products for POS:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      selling_price: Number(p.selling_price || 0),
      current_cost_price: Number(p.current_cost_price || 0),
      stock_quantity: Number(p.stock_quantity || 0),
      low_stock_threshold: Number(p.low_stock_threshold || 0),
    }));
  },

  async searchCustomers(query?: string): Promise<Customer[]> {
    let req = supabase
      .from('customers')
      .select('*')
      .order('full_name', { ascending: true })
      .limit(20);

    if (query && query.trim().length > 0) {
      const q = query.trim();
      req = req.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error searching customers for POS:', error);
      return [];
    }
    return data || [];
  },
};
