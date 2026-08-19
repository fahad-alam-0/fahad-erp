import { supabase } from '@/lib/supabase';
import { Sale, CreateSaleInput, SaleReturn, ProcessReturnInput } from '../types/sales.types';
import { Product } from '@/features/inventory-management/types/inventory.types';
import { Customer } from '@/features/customer-management/types/customer.types';

export const salesService = {
  async getSales(params?: { search?: string; customerId?: string }): Promise<Sale[]> {
    let req = supabase
      .from('sales')
      .select(`
        *,
        customer:customers(full_name, phone),
        sale_items(*, product:products(name, product_code, unit)),
        sale_returns(*, sale_return_items(*))
      `)
      .order('created_at', { ascending: false });

    if (params?.customerId && params.customerId !== 'ALL') {
      req = req.eq('customer_id', params.customerId);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching sales log:', error);
      throw new Error(error.message || 'Failed to fetch sales log.');
    }

    let sales = (data || []).map((s: any) => {
      const subtotal = Number(s.subtotal || 0);
      const discount = Number(s.discount || 0);
      const totalAmount = Number(s.total_amount || 0);

      const returnsList: any[] = s.sale_returns || [];
      const returnedAmount = returnsList.reduce(
        (sum, ret) => sum + Number(ret.total_refund_amount || 0),
        0
      );
      const netAmount = Math.max(0, totalAmount - returnedAmount);

      let returnStatus: 'NO_RETURN' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' = 'NO_RETURN';
      if (returnedAmount > 0) {
        if (netAmount === 0 || returnedAmount >= totalAmount) {
          returnStatus = 'FULLY_RETURNED';
        } else {
          returnStatus = 'PARTIALLY_RETURNED';
        }
      }

      // Collect all return items across returns for this sale
      const allReturnItems: any[] = returnsList.flatMap((ret) => ret.sale_return_items || []);

      const saleItems = (s.sale_items || []).map((item: any) => {
        const itemQty = Number(item.quantity || 0);
        // Sum returned quantity for this sale item
        const itemReturnedQty = allReturnItems
          .filter((ri) => ri.sale_item_id === item.id)
          .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);

        const itemRemainingQty = Math.max(0, itemQty - itemReturnedQty);

        return {
          ...item,
          quantity: itemQty,
          unit_selling_price: Number(item.unit_selling_price || 0),
          unit_cost_price: Number(item.unit_cost_price || 0),
          total_selling_amount: Number(item.total_selling_amount || 0),
          total_cost_amount: Number(item.total_cost_amount || 0),
          returned_quantity: itemReturnedQty,
          remaining_returnable_quantity: itemRemainingQty,
        };
      });

      return {
        ...s,
        subtotal,
        discount,
        total_amount: totalAmount,
        returned_amount: returnedAmount,
        net_amount: netAmount,
        return_status: returnStatus,
        sale_items: saleItems,
      };
    });

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
      .select(`
        *,
        customer:customers(full_name, phone, address),
        sale_items(*, product:products(name, product_code, unit)),
        sale_payments(*),
        sale_returns(*, sale_return_items(*, product:products(name, product_code, unit)))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sale by id:', error);
      throw new Error(error.message || 'Sale invoice not found.');
    }

    const subtotal = Number(data.subtotal || 0);
    const discount = Number(data.discount || 0);
    const totalAmount = Number(data.total_amount || 0);

    const returnsList: any[] = data.sale_returns || [];
    const returnedAmount = returnsList.reduce(
      (sum, ret) => sum + Number(ret.total_refund_amount || 0),
      0
    );
    const netAmount = Math.max(0, totalAmount - returnedAmount);

    let returnStatus: 'NO_RETURN' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' = 'NO_RETURN';
    if (returnedAmount > 0) {
      if (netAmount === 0 || returnedAmount >= totalAmount) {
        returnStatus = 'FULLY_RETURNED';
      } else {
        returnStatus = 'PARTIALLY_RETURNED';
      }
    }

    const allReturnItems: any[] = returnsList.flatMap((ret) => ret.sale_return_items || []);

    const saleItems = (data.sale_items || []).map((item: any) => {
      const itemQty = Number(item.quantity || 0);
      const itemReturnedQty = allReturnItems
        .filter((ri) => ri.sale_item_id === item.id)
        .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);

      const itemRemainingQty = Math.max(0, itemQty - itemReturnedQty);

      return {
        ...item,
        quantity: itemQty,
        unit_selling_price: Number(item.unit_selling_price || 0),
        unit_cost_price: Number(item.unit_cost_price || 0),
        total_selling_amount: Number(item.total_selling_amount || 0),
        total_cost_amount: Number(item.total_cost_amount || 0),
        returned_quantity: itemReturnedQty,
        remaining_returnable_quantity: itemRemainingQty,
      };
    });

    return {
      ...data,
      subtotal,
      discount,
      total_amount: totalAmount,
      returned_amount: returnedAmount,
      net_amount: netAmount,
      return_status: returnStatus,
      sale_items: saleItems,
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

  async processSaleReturn(input: ProcessReturnInput): Promise<{
    return_id: string;
    return_number: string;
    total_refund_amount: number;
  }> {
    let res = await supabase.schema('private').rpc('process_sale_return', {
      p_sale_id: input.sale_id,
      p_refund_method: input.refund_method,
      p_refund_reference: input.refund_reference || null,
      p_reason: input.reason,
      p_reason_notes: input.reason_notes || null,
      p_items: input.items,
    });

    if (res.error && res.error.message.toLowerCase().includes('schema')) {
      res = await supabase.rpc('process_sale_return', {
        p_sale_id: input.sale_id,
        p_refund_method: input.refund_method,
        p_refund_reference: input.refund_reference || null,
        p_reason: input.reason,
        p_reason_notes: input.reason_notes || null,
        p_items: input.items,
      });
    }

    if (res.error) {
      console.error('Error executing process_sale_return RPC:', res.error);
      throw new Error(res.error.message || 'Failed to process sale return.');
    }

    return res.data;
  },

  async getSaleReturns(params?: { search?: string }): Promise<SaleReturn[]> {
    let req = supabase
      .from('sale_returns')
      .select(`
        *,
        sale:sales(sale_number, sale_date),
        customer:customers(full_name, phone),
        processor:profiles!sale_returns_processed_by_fkey(full_name),
        items:sale_return_items(*, product:products(name, product_code, unit))
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching sale returns:', error);
      return [];
    }

    let returns = (data || []).map((ret: any) => ({
      ...ret,
      total_refund_amount: Number(ret.total_refund_amount || 0),
      items: (ret.items || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_selling_price: Number(item.unit_selling_price || 0),
        unit_cost_price: Number(item.unit_cost_price || 0),
        refund_amount: Number(item.refund_amount || 0),
      })),
    }));

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim().toLowerCase();
      returns = returns.filter((r: SaleReturn) => {
        const matchReturnNum = r.return_number?.toLowerCase().includes(q);
        const matchSaleNum = r.sale?.sale_number?.toLowerCase().includes(q);
        const matchCustomer = r.customer?.full_name?.toLowerCase().includes(q);
        const matchProduct = (r.items || []).some((item) =>
          item.product?.name?.toLowerCase().includes(q)
        );
        return matchReturnNum || matchSaleNum || matchCustomer || matchProduct;
      });
    }

    return returns;
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
