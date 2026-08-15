import { supabase } from '@/lib/supabase';

export const getSupabaseClient = () => {
  return supabase;
};
