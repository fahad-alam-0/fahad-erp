const { createClient } = require('@supabase/supabase-js');

const key_spy = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweXZmZnhscWNwZGJibm9vaHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzgxODMsImV4cCI6MjEwMTc1NDE4M30._s7wVp4Yi9R3nipVdWbjtevNOeceh_wy0UvAO7RiQjM';
const key_bcq = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA';

const clientSpy = createClient('https://spyvffxlqcpdbbnoohsz.supabase.co', key_spy);
const clientBcq = createClient('https://bcqwbhrivxhhswvpbcwt.supabase.co', key_bcq);

async function checkProject(name, client) {
  console.log(`\n==================================================`);
  console.log(`CHECKING PROJECT: ${name}`);
  console.log(`==================================================`);

  // Query sale invoice SAL-20260818-000002
  const { data: sales, error: sErr } = await client
    .from('sales')
    .select('*, sale_items(*), sale_returns(*)')
    .eq('sale_number', 'SAL-20260818-000002');

  console.log('Sale query status:', sErr ? sErr.message : 'SUCCESS');
  if (sales && sales.length > 0) {
    const sale = sales[0];
    console.log('Sale Invoice:', sale.sale_number, 'ID:', sale.id);
    console.log('Total Amount:', sale.total_amount);
    console.log('Sale Items:', JSON.stringify(sale.sale_items, null, 2));
    console.log('Sale Returns:', JSON.stringify(sale.sale_returns, null, 2));
  } else {
    console.log('Invoice SAL-20260818-000002 not found in this project or RLS restricted.');
  }

  // Fetch count of sale_returns
  const { data: retCount, error: rErr } = await client.from('sale_returns').select('*');
  console.log('Total Sale Returns in database:', rErr ? rErr.message : (retCount ? retCount.length : 0));
}

(async () => {
  await checkProject('spyvffxlqcpdbbnoohsz (USER REAL PROJECT)', clientSpy);
  await checkProject('bcqwbhrivxhhswvpbcwt (MCP STAGING PROJECT)', clientBcq);
})();
