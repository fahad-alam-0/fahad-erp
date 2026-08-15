import { z } from 'zod';

export const phoneSchema = z
  .string()
  .min(7, 'Phone number too short')
  .max(15, 'Phone number too long');

export const idSchema = z.string().uuid('Invalid UUID format');
