import { ServiceResult } from '@/types/common.types';
import { ProductItem } from '../types';

export const inventoryService = {
  async fetchProducts(): Promise<ServiceResult<ProductItem[]>> {
    return {
      success: true,
      data: [],
    };
  },
};
