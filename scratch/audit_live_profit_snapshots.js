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

async function runAudit() {
  console.log('====================================================');
  console.log('FAHAD ERP — LIVE REPAIR PROFIT SNAPSHOT AUDIT');
  console.log('====================================================\n');

  const { data, error } = await supabase.schema('private').rpc('audit_repair_financials');
  if (error) {
    console.error('RPC audit execution error:', error);
    return;
  }

  const profiles = data.profiles || [];
  const jobs = data.repair_jobs || [];
  const parts = data.repair_parts || [];
  const payments = data.repair_payments || [];
  const snapshots = data.repair_profit_snapshots || [];

  const profileMap = new Map();
  profiles.forEach(p => profileMap.set(p.id, p));

  console.log('--- PROFILES TABLE ---');
  console.table(profiles);

  console.log('\n--- REPAIR JOBS TABLE ---');
  const formattedJobs = jobs.map(j => ({
    id: j.id,
    job_number: j.job_number,
    device: j.device,
    status: j.status,
    payment_status: j.payment_status,
    financial_status: j.financial_status,
    technician: profileMap.get(j.technician_id)?.full_name || j.technician_id || 'UNASSIGNED',
    tech_role: profileMap.get(j.technician_id)?.role || 'N/A',
    revenue: j.service_revenue || j.quoted_amount || 0,
  }));
  console.table(formattedJobs);

  console.log('\n--- REPAIR PARTS TABLE ---');
  console.table(parts);

  console.log('\n--- REPAIR PAYMENTS TABLE ---');
  console.table(payments);

  console.log('\n--- REPAIR PROFIT SNAPSHOTS TABLE ---');
  const formattedSnaps = snapshots.map(s => {
    const job = jobs.find(j => j.id === s.repair_id);
    const tech = profileMap.get(s.technician_id);
    const finalizer = profileMap.get(s.finalized_by);
    return {
      snapshot_id: s.id,
      job_number: job?.job_number || s.repair_id,
      worker: tech?.full_name || s.technician_id,
      worker_role: tech?.role || 'UNKNOWN',
      service_revenue: Number(s.service_revenue),
      parts_cost: Number(s.parts_cost),
      net_profit: Number(s.net_repair_profit),
      owner_pct: `${s.owner_percentage}%`,
      tech_pct: `${s.technician_percentage}%`,
      owner_share: Number(s.owner_share),
      technician_share: Number(s.technician_share),
      finalized_by: finalizer?.full_name || s.finalized_by,
    };
  });
  console.table(formattedSnaps);

  console.log('\n====================================================');
  console.log('RECONCILIATION SUMMARY BY WORKER PROFILE');
  console.log('====================================================');
  
  const workerTotals = new Map();
  snapshots.forEach(s => {
    const tech = profileMap.get(s.technician_id);
    const workerName = tech?.full_name || s.technician_id;
    const workerRole = tech?.role || 'UNKNOWN';
    
    const existing = workerTotals.get(s.technician_id) || {
      name: workerName,
      role: workerRole,
      completed_jobs: 0,
      total_revenue: 0,
      total_parts: 0,
      total_net_profit: 0,
      total_owner_share: 0,
      total_technician_share: 0,
    };

    existing.completed_jobs += 1;
    existing.total_revenue += Number(s.service_revenue);
    existing.total_parts += Number(s.parts_cost);
    existing.total_net_profit += Number(s.net_repair_profit);
    existing.total_owner_share += Number(s.owner_share);
    existing.total_technician_share += Number(s.technician_share);

    workerTotals.set(s.technician_id, existing);
  });

  console.table(Array.from(workerTotals.values()));
}

runAudit().catch(err => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
