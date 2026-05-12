import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Test with anon key (same as frontend)
  const supabaseAnon = createClient(url, anonKey);
  const { data: anonSigs, error: anonError } = await supabaseAnon
    .from('health_signatures')
    .select('id, patient_name, tenant_id')
    .limit(5);
  
  // Test with service key
  const supabaseService = createClient(url, serviceKey || anonKey);
  const { data: serviceSigs, error: serviceError } = await supabaseService
    .from('health_signatures')
    .select('id, patient_name, tenant_id')
    .limit(5);

  return NextResponse.json({
    supabase_url: url,
    anon_key_full: anonKey,
    anon_query: { data: anonSigs, error: anonError?.message },
    service_query: { data: serviceSigs, error: serviceError?.message },
  });
}
