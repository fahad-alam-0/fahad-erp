const { createClient } = require('@supabase/supabase-js');

const url = 'https://bcqwbhrivxhhswvpbcwt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXdiaHJpdnhoaHN3dnBiY3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDEyNTksImV4cCI6MjEwMjYxNzI1OX0.3LKmJ1n9tf7AFLrQxRytHY1zFCJwW4WVwh_TLMGLZPA';

const supabase = createClient(url, key);

(async () => {
  console.log('=== TEST 1: Calling supabase.schema("private").rpc("process_sale_return") ===');
  const res1 = await supabase.schema('private').rpc('process_sale_return', {
    p_sale_id: '00000000-0000-0000-0000-000000000000',
    p_refund_method: 'CASH',
    p_refund_reference: null,
    p_reason: 'CUSTOMER_CHANGED_MIND',
    p_reason_notes: null,
    p_items: []
  });
  console.log('Res 1:', res1);

  console.log('\n=== TEST 2: Calling supabase.rpc("process_sale_return") ===');
  const res2 = await supabase.rpc('process_sale_return', {
    p_sale_id: '00000000-0000-0000-0000-000000000000',
    p_refund_method: 'CASH',
    p_refund_reference: null,
    p_reason: 'CUSTOMER_CHANGED_MIND',
    p_reason_notes: null,
    p_items: []
  });
  console.log('Res 2:', res2);
})();
