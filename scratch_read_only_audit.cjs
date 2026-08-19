const { createClient } = require('@supabase/supabase-js');

const urlSpy = 'https://spyvffxlqcpdbbnoohsz.supabase.co';
const keySpy = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweXZmZnhscWNwZGJibm9vaHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzgxODMsImV4cCI6MjEwMTc1NDE4M30._s7wVp4Yi9R3nipVdWbjtevNOeceh_wy0UvAO7RiQjM';

const urlBcq = 'https://bcqwbhrivxhhswvpbcwt.supabase.co';
const keyBcq = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA';

const clientSpy = createClient(urlSpy, keySpy);
const clientBcq = createClient(urlBcq, keyBcq);

const tables = [
  'profiles',
  'categories',
  'brands',
  'products',
  'suppliers',
  'customers',
  'purchases',
  'purchase_items',
  'inventory_movements',
  'sales',
  'sale_items',
  'sale_payments',
  'repair_jobs',
  'repair_parts',
  'repair_payments',
  'repair_profit_snapshots',
  'repair_status_history',
  'audit_logs',
  'sale_returns',
  'sale_return_items',
  'sales_invoices',
  'sales_items',
  'sales_returns',
  'sales_return_items'
];

async function auditProject(name, client) {
  console.log(`\n==================================================`);
  console.log(`READ-ONLY ROW COUNT AUDIT FOR: ${name}`);
  console.log(`==================================================`);

  const results = {};

  for (const table of tables) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        results[table] = `ERROR: ${error.message}`;
      } else {
        results[table] = count;
      }
    } catch (e) {
      results[table] = `EXCEPT: ${e.message}`;
    }
  }

  console.log(JSON.stringify(results, null, 2));
  return results;
}

(async () => {
  await auditProject('spyvffxlqcpdbbnoohsz (Project A - Link Target)', clientSpy);
  await auditProject('bcqwbhrivxhhswvpbcwt (Project B - MCP Staging)', clientBcq);
})();
