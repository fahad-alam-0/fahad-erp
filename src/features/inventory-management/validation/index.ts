import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  title: z.string().min(2, 'Product title required'),
  costPrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  stockQty: z.number().int().nonnegative(),
});

export type ProductFormInput = z.infer<typeof productSchema>;
