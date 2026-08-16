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
    return process.process ? process.env : {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTrace() {
  console.log('--- STARTING TRACE OF LIVE SUPABASE REPAIR PROFIT SNAPSHOTS ---');

  const testEmail = 'qastaff1786908685471@gmail.com';
  const testPassword = 'TestPassword123!';

  console.log(`1. Signing in as existing user: ${testEmail}`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authErr) {
    console.error('Sign in failed:', authErr);
    return;
  }

  const userId = authData.user?.id;
  console.log(`✓ Authenticated as user ID: ${userId}`);

  // Create a repair ticket via private RPC
  const { data: repairRes, error: rErr } = await supabase.schema('private').rpc('create_repair_job', {
    p_customer_id: null,
    p_device_type: 'Television',
    p_device_brand: 'LG',
    p_device_model: 'OLED55C1',
    p_serial_number: 'SN-2026-QA',
    p_reported_problem: 'Display flickering on HDMI 1',
    p_quoted_amount: 1000,
    p_notes: 'QA Financial Attribution Test Ticket'
  });

  if (rErr) {
    console.error('Error creating repair job via RPC:', rErr);
    return;
  }

  const repairId = repairRes.repair_id;
  const jobNumber = repairRes.job_number;
  console.log(`✓ Created repair job: ${jobNumber} (ID: ${repairId})`);

  // Claim the repair job
  const { error: claimErr } = await supabase.schema('private').rpc('claim_repair', {
    p_repair_id: repairId,
  });

  if (claimErr) {
    console.error('Error claiming repair job:', claimErr);
  } else {
    console.log(`✓ Claimed repair job ${jobNumber} by user ${userId}`);
  }

  // Advance status to READY_FOR_PICKUP
  await supabase.schema('private').rpc('update_repair_status', {
    p_repair_id: repairId,
    p_new_status: 'DIAGNOSING',
    p_notes: 'Intake diagnosis started',
  });

  await supabase.schema('private').rpc('update_repair_status', {
    p_repair_id: repairId,
    p_new_status: 'READY_FOR_PICKUP',
    p_notes: 'Repair complete, ready for customer',
  });

  console.log(`✓ Advanced status of ${jobNumber} to READY_FOR_PICKUP`);

  // Collect full payment (₹1000)
  const { data: payRes, error: payErr } = await supabase.schema('private').rpc('add_repair_payment', {
    p_repair_id: repairId,
    p_payment_method: 'CASH',
    p_amount: 1000,
    p_notes: 'Full cash payment collected',
  });

  if (payErr) {
    console.error('Error adding payment:', payErr);
  } else {
    console.log(`✓ Added ₹1000 payment for ${jobNumber}. Auto-finalized: ${payRes?.auto_finalized}`);
  }

  // Mark status DELIVERED
  const { data: statusRes, error: statusErr } = await supabase.schema('private').rpc('update_repair_status', {
    p_repair_id: repairId,
    p_new_status: 'DELIVERED',
    p_notes: 'Device handed over to customer',
  });

  if (statusErr) {
    console.error('Error marking status DELIVERED:', statusErr);
  } else {
    console.log(`✓ Marked status DELIVERED for ${jobNumber}. Auto-finalized: ${statusRes?.auto_finalized}`);
  }

  // Query repair_jobs directly to verify status & financial_status
  const { data: finalJob } = await supabase
    .from('repair_jobs')
    .select('id, job_number, status, payment_status, financial_status, service_revenue')
    .eq('id', repairId)
    .single();

  console.log('✓ Final repair job state in DB:', finalJob);

  // Query repair_profit_snapshots directly for this repair job
  const { data: snap, error: snapErr } = await supabase
    .from('repair_profit_snapshots')
    .select('id, repair_id, technician_id, service_revenue, parts_cost, net_repair_profit, owner_share, technician_share, calculated_at')
    .eq('repair_id', repairId)
    .single();

  if (snapErr) {
    console.error('Snapshot query result error:', snapErr.message);
  } else {
    console.log('✓ Profit snapshot created in DB:', snap);
  }
}

runTrace().catch((err) => {
  console.error('TRACE FAILED:', err);
  process.exit(1);
});
