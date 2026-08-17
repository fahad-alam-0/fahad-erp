import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://spyvffxlqcpdbbnoohsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweXZmZnhscWNwZGJibm9vaHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzgxODMsImV4cCI6MjEwMTc1NDE4M30._s7wVp4Yi9R3nipVdWbjtevNOeceh_wy0UvAO7RiQjM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRemoteRPC() {
  console.log('--- SUPABASE PROJECT VERIFICATION ---');
  console.log('SUPABASE URL:', SUPABASE_URL);
  console.log('PROJECT REF: spyvffxlqcpdbbnoohsz');

  const { data, error } = await supabase.schema('private').rpc('update_repair_status', {
    p_repair_id: '00000000-0000-0000-0000-000000000000',
    p_new_status: 'DIAGNOSING',
    p_notes: 'Live verification'
  });

  console.log('RPC Output Data:', data);
  console.log('RPC Output Error Message:', error?.message);
  console.log('RPC Output Error Code:', error?.code);
}

checkRemoteRPC();
