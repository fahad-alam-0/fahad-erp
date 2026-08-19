import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_TITLE: z.string().default('Fahad ERP'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_SUPABASE_URL: z.string().url().default('https://bcqwbhrivxhhswvpbcwt.supabase.co'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA'),
  VITE_ENABLE_MULTI_STORE: z.string().transform((val) => val === 'true').default('false'),
  VITE_DEFAULT_STORE_ID: z.string().default('store_fahad_01'),
});

const parseEnv = () => {
  const env = {
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    VITE_ENV: import.meta.env.VITE_ENV,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_ENABLE_MULTI_STORE: import.meta.env.VITE_ENABLE_MULTI_STORE,
    VITE_DEFAULT_STORE_ID: import.meta.env.VITE_DEFAULT_STORE_ID,
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    return {
      VITE_APP_TITLE: 'Fahad ERP',
      VITE_APP_VERSION: '1.0.0',
      VITE_ENV: 'development' as const,
      VITE_SUPABASE_URL: 'https://bcqwbhrivxhhswvpbcwt.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA',
      VITE_ENABLE_MULTI_STORE: false,
      VITE_DEFAULT_STORE_ID: 'store_fahad_01',
    };
  }

  return parsed.data;
};

export const env = parseEnv();
