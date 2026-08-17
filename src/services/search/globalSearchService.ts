import { supabase } from '@/lib/supabase';

export interface GlobalSearchResultItem {
  id: string;
  type: 'CUSTOMER' | 'PRODUCT' | 'SALE' | 'REPAIR';
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

export const globalSearchService = {
  async search(query: string, userRole: 'OWNER' | 'TECHNICIAN' | 'STAFF', userId?: string): Promise<GlobalSearchResultItem[]> {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    const results: GlobalSearchResultItem[] = [];

    // Parallel fetch across searchable entities
    const [customersRes, productsRes, salesRes, repairsRes] = await Promise.all([
      // 1. Customers
      supabase
        .from('customers')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(5),

      // 2. Products
      supabase
        .from('products')
        .select('id, name, product_code, stock_quantity, selling_price')
        .or(`name.ilike.%${q}%,product_code.ilike.%${q}%`)
        .eq('is_active', true)
        .limit(5),

      // 3. Sales (OWNER & STAFF only, Technicians excluded if non-permitted)
      userRole !== 'TECHNICIAN'
        ? supabase
            .from('sales')
            .select('id, sale_number, total_amount, payment_status, customer:customers(full_name)')
            .or(`sale_number.ilike.%${q}%`)
            .limit(5)
        : Promise.resolve({ data: null, error: null }),

      // 4. Repairs (Technicians only search assigned repairs)
      (() => {
        let req = supabase
          .from('repair_jobs')
          .select('id, job_number, device_brand, device_type, status, customer:customers(full_name)')
          .or(`job_number.ilike.%${q}%,device_brand.ilike.%${q}%,device_type.ilike.%${q}%`);

        if (userRole === 'TECHNICIAN' && userId) {
          req = req.eq('technician_id', userId);
        }
        return req.limit(5);
      })(),
    ]);

    // Format Customers
    if (customersRes.data) {
      customersRes.data.forEach((c: any) => {
        results.push({
          id: c.id,
          type: 'CUSTOMER',
          title: c.full_name,
          subtitle: c.phone ? `Phone: ${c.phone}` : 'Customer Record',
          badge: 'CUSTOMER',
          link: `/customers?id=${c.id}&search=${encodeURIComponent(c.full_name)}`,
        });
      });
    }

    // Format Products
    if (productsRes.data) {
      productsRes.data.forEach((p: any) => {
        results.push({
          id: p.id,
          type: 'PRODUCT',
          title: p.name,
          subtitle: `Code: ${p.product_code || 'N/A'} • Stock: ${p.stock_quantity}`,
          badge: 'PRODUCT',
          link: `/inventory/products?search=${encodeURIComponent(p.name)}`,
        });
      });
    }

    // Format Sales
    if (salesRes.data) {
      salesRes.data.forEach((s: any) => {
        results.push({
          id: s.id,
          type: 'SALE',
          title: s.sale_number,
          subtitle: `Customer: ${s.customer?.full_name || 'Walk-in'} • Amount: ${Number(s.total_amount || 0)}`,
          badge: s.payment_status,
          link: `/sales?search=${encodeURIComponent(s.sale_number)}`,
        });
      });
    }

    // Format Repairs
    if (repairsRes.data) {
      repairsRes.data.forEach((r: any) => {
        results.push({
          id: r.id,
          type: 'REPAIR',
          title: `${r.job_number} — ${r.device_brand} ${r.device_type}`,
          subtitle: `Customer: ${r.customer?.full_name || 'N/A'}`,
          badge: r.status,
          link: `/repairs?id=${r.id}`,
        });
      });
    }

    return results;
  },
};
