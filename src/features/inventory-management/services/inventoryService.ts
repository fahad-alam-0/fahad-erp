import { supabase } from '@/lib/supabase';
import { Product, Category, Brand, CreateProductInput, UpdateProductInput, InventoryMovement } from '../types/inventory.types';

export const inventoryService = {
  async getProducts(params?: {
    categoryId?: string;
    brandId?: string;
    search?: string;
    isActive?: boolean;
    lowStockOnly?: boolean;
    stockStatus?: string;
  }): Promise<Product[]> {
    let req = supabase
      .from('products')
      .select('*, category:categories(name), brand:brands(name)')
      .order('created_at', { ascending: false });

    if (params?.categoryId && params.categoryId !== 'ALL') {
      req = req.eq('category_id', params.categoryId);
    }
    if (params?.brandId && params.brandId !== 'ALL') {
      req = req.eq('brand_id', params.brandId);
    }
    if (params?.isActive !== undefined) {
      req = req.eq('is_active', params.isActive);
    }
    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      req = req.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);
    }

    const { data, error } = await req;

    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(error.message || 'Failed to fetch products catalog.');
    }

    let productsList: Product[] = (data || []).map((p: any) => ({
      ...p,
      selling_price: Number(p.selling_price || 0),
      current_cost_price: Number(p.current_cost_price || 0),
      stock_quantity: Number(p.stock_quantity || 0),
      low_stock_threshold: Number(p.low_stock_threshold || 0),
    }));

    if (params?.lowStockOnly) {
      productsList = productsList.filter((p) => p.stock_quantity <= p.low_stock_threshold);
    }

    if (params?.stockStatus) {
      if (params.stockStatus === 'OUT_OF_STOCK') {
        productsList = productsList.filter((p) => p.stock_quantity <= 0);
      } else if (params.stockStatus === 'LOW_STOCK') {
        productsList = productsList.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
      } else if (params.stockStatus === 'IN_STOCK') {
        productsList = productsList.filter((p) => p.stock_quantity > p.low_stock_threshold);
      }
    }

    return productsList;
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(name), brand:brands(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product by id:', error);
      throw new Error(error.message || 'Product not found.');
    }

    return {
      ...data,
      selling_price: Number(data.selling_price || 0),
      current_cost_price: Number(data.current_cost_price || 0),
      stock_quantity: Number(data.stock_quantity || 0),
      low_stock_threshold: Number(data.low_stock_threshold || 0),
    };
  },

  async getProductMovements(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product inventory movements:', error);
      return [];
    }

    return (data || []).map((m: any) => ({
      ...m,
      quantity: Number(m.quantity || 0),
      unit_cost: Number(m.unit_cost || 0),
    }));
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data || [];
  },

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
    return data || [];
  },

  async createCategory(name: string): Promise<Category> {
    const trimmed = name.trim();
    const query = supabase.from('categories') as any;

    if (typeof query.select === 'function') {
      const { data: existing } = await query
        .select('*')
        .ilike('name', trimmed)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0];
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: trimmed, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message || 'Failed to create category.');
    }
    return data;
  },

  async createBrand(name: string): Promise<Brand> {
    const trimmed = name.trim();
    const query = supabase.from('brands') as any;

    if (typeof query.select === 'function') {
      const { data: existing } = await query
        .select('*')
        .ilike('name', trimmed)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0];
      }
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({ name: trimmed, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Error creating brand:', error);
      throw new Error(error.message || 'Failed to create brand.');
    }
    return data;
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    const payload = {
      name: input.name.trim(),
      category_id: input.category_id,
      brand_id: input.brand_id || null,
      product_code: input.product_code?.trim() || null,
      description: input.description?.trim() || null,
      selling_price: input.selling_price,
      current_cost_price: input.current_cost_price,
      stock_quantity: input.stock_quantity ?? 0,
      low_stock_threshold: input.low_stock_threshold,
      unit: input.unit.trim() || 'pcs',
      is_active: input.is_active ?? true,
    };

    const { data, error } = await supabase.from('products').insert(payload).select().single();

    if (error) {
      console.error('Error creating product:', error);
      throw new Error(error.message || 'Failed to create product.');
    }
    return data;
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const payload: Record<string, any> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.category_id !== undefined) payload.category_id = input.category_id;
    if (input.brand_id !== undefined) payload.brand_id = input.brand_id || null;
    if (input.product_code !== undefined) payload.product_code = input.product_code?.trim() || null;
    if (input.description !== undefined) payload.description = input.description?.trim() || null;
    if (input.selling_price !== undefined) payload.selling_price = input.selling_price;
    if (input.current_cost_price !== undefined) payload.current_cost_price = input.current_cost_price;
    if (input.low_stock_threshold !== undefined) payload.low_stock_threshold = input.low_stock_threshold;
    if (input.unit !== undefined) payload.unit = input.unit.trim();
    if (input.is_active !== undefined) payload.is_active = input.is_active;

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw new Error(error.message || 'Failed to update product details.');
    }
    return data;
  },

  async adjustStock(
    arg1: string | { product_id: string; movement_type: string; quantity: number; unit_cost?: number; notes?: string },
    arg2?: number,
    arg3?: string
  ): Promise<any> {
    if (typeof arg1 === 'object' && arg1 !== null) {
      const { data, error } = await supabase.schema('private').rpc('adjust_inventory', {
        p_product_id: arg1.product_id,
        p_movement_type: arg1.movement_type,
        p_quantity: arg1.quantity,
        p_unit_cost: arg1.unit_cost ?? null,
        p_notes: arg1.notes || null,
      });

      if (error) {
        console.error('Error executing adjust_inventory RPC:', error);
        throw new Error(error.message || 'Failed to adjust inventory.');
      }
      return data;
    }

    const productId = arg1 as string;
    const newQuantity = arg2 || 0;
    const reason = arg3 || '';

    const { data: currentProduct, error: fetchErr } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (fetchErr || !currentProduct) {
      throw new Error('Product not found for stock adjustment.');
    }

    const oldQty = Number(currentProduct.stock_quantity || 0);
    const diff = newQuantity - oldQty;

    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error adjusting stock quantity:', error);
      throw new Error(error.message || 'Failed to adjust stock quantity.');
    }

    if (diff !== 0) {
      await supabase.from('inventory_movements').insert({
        product_id: productId,
        movement_type: diff > 0 ? 'PURCHASE' : 'DAMAGE',
        quantity: Math.abs(diff),
        notes: reason || 'Manual stock adjustment',
      });
    }

    return data;
  },
};
