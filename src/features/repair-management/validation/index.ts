import { z } from 'zod';

export const jobCardSchema = z.object({
  customerId: z.string().uuid(),
  deviceBrand: z.string().min(1, 'Brand required'),
  deviceModel: z.string().min(1, 'Model required'),
  serialNumber: z.string().optional(),
  problemDescription: z.string().min(5, 'Provide problem details'),
  estimatedCost: z.number().nonnegative(),
});

export type JobCardInput = z.infer<typeof jobCardSchema>;
