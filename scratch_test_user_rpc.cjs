const { createClient } = require('@supabase/supabase-js');

const url = 'https://bcqwbhrivxhhswvpbcwt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA';

const supabase = createClient(url, key);

(async () => {
  const email = `teststaff_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  console.log('=== CREATING & AUTHENTICATING TEST USER ===', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test Staff User',
        role: 'STAFF'
      }
    }
  });

  let session = signUpData?.session;

  if (!session) {
    console.log('User signed up, attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    session = signInData?.session;
  }

  if (!session) {
    console.log('Could not obtain user session directly. Testing RPC fallback handling...');
  } else {
    console.log('Session obtained for user:', session.user.id);
  }

  console.log('\n=== TESTING RPC CALL process_sale_return WITH SUPABASE JS CLIENT ===');
  
  const res = await supabase.rpc('process_sale_return', {
    p_sale_id: '00000000-0000-0000-0000-000000000000',
    p_refund_method: 'CASH',
    p_refund_reference: null,
    p_reason: 'CUSTOMER_CHANGED_MIND',
    p_reason_notes: 'Automated live RPC test',
    p_items: []
  });

  console.log('RPC Response with Auth Session:');
  console.log(JSON.stringify(res, null, 2));

  if (res.error) {
    console.log('RPC Message:', res.error.message);
    if (res.error.message.includes('Original sale record not found')) {
      console.log('✅ PROOF: PL/pgSQL executed step 2 (Original sale record not found)! ZERO Number(numeric) error!');
    } else {
      console.log('RPC result:', res.error.message);
    }
  }
})();
