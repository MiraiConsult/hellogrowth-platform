const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/home/ubuntu/hellogrowth-platform/.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  // Check form_responses
  const fr = await sb.from('form_responses').select('*').limit(2);
  console.log('form_responses sample:', JSON.stringify(fr.data?.slice(0,1), null, 2));
  console.log('form_responses error:', fr.error?.message);

  // Check nps_responses
  const nps = await sb.from('nps_responses').select('*').limit(2);
  console.log('nps_responses sample:', JSON.stringify(nps.data?.slice(0,1), null, 2));
  console.log('nps_responses error:', nps.error?.message);

  // Check dispatch_flow_configs for presale
  const dfc = await sb.from('dispatch_flow_configs').select('id, name, flow_type').limit(5);
  console.log('dispatch_flow_configs:', JSON.stringify(dfc.data, null, 2));
  console.log('dispatch_flow_configs error:', dfc.error?.message);

  // Check kanban_cards pipeline info
  const kc = await sb.from('kanban_cards').select('id, client_name, fup_date').limit(3);
  console.log('kanban_cards sample:', JSON.stringify(kc.data, null, 2));
  console.log('kanban_cards error:', kc.error?.message);
}

main().catch(console.error);
