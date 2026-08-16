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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDatabaseState() {
  console.log('====================================================');
  console.log('1. QUERYING LIVE SUPABASE REPAIR_JOBS TABLE');
  console.log('====================================================');
  
  const { data: jobs, error: jErr } = await supabase
    .from('repair_jobs')
    .select('id, job_number, device_brand, device_type, status, payment_status, financial_status, technician_id, quoted_amount, service_revenue, created_at')
    .order('created_at', { ascending: false });

  if (jErr) {
    console.error('Error querying repair_jobs:', jErr);
  } else {
    console.log(`Found ${jobs.length} repair jobs in database:`);
    console.table(jobs);
  }

  console.log('\n====================================================');
  console.log('2. QUERYING LIVE SUPABASE REPAIR_PROFIT_SNAPSHOTS TABLE');
  console.log('====================================================');

  const { data: snapshots, error: sErr } = await supabase
    .from('repair_profit_snapshots')
    .select('*')
    .order('calculated_at', { ascending: false });

  if (sErr) {
    console.error('Error querying repair_profit_snapshots:', sErr);
  } else {
    console.log(`Found ${snapshots.length} profit snapshots in database:`);
    console.table(snapshots);
  }

  console.log('\n====================================================');
  console.log('3. QUERYING LIVE SUPABASE REPAIR_PAYMENTS TABLE');
  console.log('====================================================');

  const { data: payments, error: pErr } = await supabase
    .from('repair_payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (pErr) {
    console.error('Error querying repair_payments:', pErr);
  } else {
    console.log(`Found ${payments.length} repair payments in database:`);
    console.table(payments);
  }
}

inspectDatabaseState().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
