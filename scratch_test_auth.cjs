const { createClient } = require('@supabase/supabase-js');

const url = 'https://bcqwbhrivxhhswvpbcwt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA';

const supabase = createClient(url, key);

(async () => {
  console.log('=== LOGGING IN AUTHENTICATED USER ===');
  // 1. Authenticate with an existing staff/admin user or test session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@fahaderp.com',
    password: 'password123'
  });

  let sessionUser = authData?.user;
  if (authError || !sessionUser) {
    console.log('Auth login failed or admin user not found:', authError?.message);
    console.log('Attempting to fetch existing user profile or sign up test user...');
  } else {
    console.log('Logged in user ID:', sessionUser.id);
  }

  // Fetch sales list to test returning an actual sale invoice
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .limit(1);

  if (salesError || !sales || sales.length === 0) {
    console.log('No existing sales found to test return:', salesError);
    return;
  }

  const testSale = sales[0];
  console.log('Found Sale Invoice:', testSale.sale_number, 'ID:', testSale.id);
  console.log('Items:', testSale.sale_items);

  if (!testSale.sale_items || testSale.sale_items.length === 0) {
    console.log('Sale has no items to return.');
    return;
  }

  const firstItem = testSale.sale_items[0];

  console.log('\n=== EXECUTING FRONTEND RPC CALL FOR RETURN ===');
  const input = {
    p_sale_id: testSale.id,
    p_refund_method: 'CASH',
    p_refund_reference: 'REFUND-TEST-001',
    p_reason: 'CUSTOMER_CHANGED_MIND',
    p_reason_notes: 'Tested via automated integration script',
    p_items: [
      {
        sale_item_id: firstItem.id,
        quantity: 1
      }
    ]
  };

  let res = await supabase.schema('private').rpc('process_sale_return', input);

  if (res.error && res.error.message.toLowerCase().includes('schema')) {
    console.log('private schema rejected by PostgREST header. Falling back to default public RPC...');
    res = await supabase.rpc('process_sale_return', input);
  }

  console.log('RPC Response:', JSON.stringify(res, null, 2));

  if (res.error) {
    console.error('FAILED TO PROCESS RETURN:', res.error);
  } else {
    console.log('✅ PRODUCT RETURN PROCESSED SUCCESSFULLY VIA FRONTEND RPC CLIENT!');
  }
})();
