import { supabase } from '@/lib/supabase';
import {
  Product,
  Category,
  Brand,
  CreateProductInput,
  UpdateProductInput,
  AdjustInventoryInput,
  InventoryMovement,
} from '../types/inventory.types';

export const inventoryService = {
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    isActive?: boolean;
  }): Promise<Product[]> {
    let req = supabase
      .from('products')
      .select('*, category:categories(name), brand:brands(name)')
      .order('name', { ascending: true });

    if (params?.isActive !== undefined) {
      req = req.eq('is_active', params.isActive);
    }

    if (params?.categoryId && params.categoryId !== 'ALL') {
      req = req.eq('category_id', params.categoryId);
    }

    if (params?.brandId && params.brandId !== 'ALL') {
      req = req.eq('brand_id', params.brandId);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      req = req.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(error.message || 'Failed to fetch products.');
    }

    let products: Product[] = (data || []).map((p: any) => ({
      ...p,
      selling_price: Number(p.selling_price || 0),
      current_cost_price: Number(p.current_cost_price || 0),
      stock_quantity: Number(p.stock_quantity || 0),
      low_stock_threshold: Number(p.low_stock_threshold || 0),
    }));

    if (params?.stockStatus && params.stockStatus !== 'ALL') {
      switch (params.stockStatus) {
        case 'OUT_OF_STOCK':
          products = products.filter((p) => p.stock_quantity === 0);
          break;
        case 'LOW_STOCK':
          products = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
          break;
        case 'IN_STOCK':
          products = products.filter((p) => p.stock_quantity > p.low_stock_threshold);
          break;
      }
    }

    return products;
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
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message || 'Failed to create category.');
    }
    return data;
  },

  async createBrand(name: string): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .insert({ name: name.trim(), is_active: true })
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

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('*, category:categories(name), brand:brands(name)')
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw new Error(error.message || 'Failed to create product.');
    }
    return {
      ...data,
      selling_price: Number(data.selling_price || 0),
      current_cost_price: Number(data.current_cost_price || 0),
      stock_quantity: Number(data.stock_quantity || 0),
      low_stock_threshold: Number(data.low_stock_threshold || 0),
    };
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
      .select('*, category:categories(name), brand:brands(name)')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw new Error(error.message || 'Failed to update product.');
    }
    return {
      ...data,
      selling_price: Number(data.selling_price || 0),
      current_cost_price: Number(data.current_cost_price || 0),
      stock_quantity: Number(data.stock_quantity || 0),
      low_stock_threshold: Number(data.low_stock_threshold || 0),
    };
  },

  async adjustStock(input: AdjustInventoryInput): Promise<{ product_id: string; new_stock_quantity: number; movement_id: string }> {
    // Strictly call secure backend RPC: adjust_inventory via PostgREST extra_search_path
    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_product_id: input.product_id,
      p_movement_type: input.movement_type,
      p_quantity: input.quantity,
      p_unit_cost: input.unit_cost !== undefined ? input.unit_cost : null,
      p_notes: input.notes.trim(),
    });

    if (error) {
      console.error('Error calling adjust_inventory RPC:', error);
      throw new Error(error.message || 'Failed to adjust inventory stock.');
    }
    return data;
  },

  async getProductMovements(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product movements:', error);
      return [];
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      product_id: m.product_id,
      movement_type: m.movement_type,
      quantity: Number(m.quantity || 0),
      unit_cost: Number(m.unit_cost || 0),
      reference_type: m.reference_type,
      reference_id: m.reference_id,
      notes: m.notes,
      created_at: m.created_at,
      created_by: m.created_by,
    }));
  },
};
