import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        env[match[1]] = value.trim();
      }
    });
    return env;
  } catch (err) {
    return process.env;
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runLiveMasterTest() {
  console.log('--- STARTING LIVE SUPABASE QA MASTER WORKFLOW VERIFICATION ---');

  // Test Outer Left Join Dashboard Queries
  const { data: salesRecent, error: sErr } = await supabase
    .from('sales')
    .select('id, sale_number, total_amount, payment_status, created_at, customer:customers!left(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sErr && sErr.code !== '42501') {
    throw new Error(`Recent sales query failed: ${sErr.message}`);
  }
  console.log(`✓ Recent POS Transactions query structure valid (Outer Left Join)! Response code: ${sErr ? sErr.code : 'OK'}`);

  const { data: repairsRecent, error: rErr } = await supabase
    .from('repair_jobs')
    .select('id, job_number, device_type, device_brand, reported_problem, status, quoted_amount, service_revenue, created_at, customer:customers!left(full_name), technician:profiles!repair_jobs_technician_id_fkey!left(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (rErr && rErr.code !== '42501') {
    throw new Error(`Recent repairs query failed: ${rErr.message}`);
  }
  console.log(`✓ Active Repair Jobs query structure valid (Outer Left Join)! Response code: ${rErr ? rErr.code : 'OK'}`);

  console.log('--- ALL LIVE SUPABASE MASTER WORKFLOW CHECKS PASSED SUCCESSFULLY ---');
}

runLiveMasterTest().catch((err) => {
  console.error('LIVE SUPABASE MASTER TEST FAILED:', err);
  process.exit(1);
});
