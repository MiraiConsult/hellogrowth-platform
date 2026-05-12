import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createClient(url, key);
  
  // Verificar assinaturas
  const { data: sigs, error: sigError } = await supabase
    .from('health_signatures')
    .select('id, tenant_id, patient_name, signed_at, form_id, lead_id')
    .order('signed_at', { ascending: false })
    .limit(10);
  
  // Verificar formulários com signature_enabled
  const { data: forms, error: formError } = await supabase
    .from('forms')
    .select('id, name, signature_enabled, tenant_id')
    .eq('signature_enabled', true)
    .limit(10);
    
  // Verificar tenant Diego
  const { data: diegoForms, error: diegoError } = await supabase
    .from('forms')
    .select('id, name, signature_enabled, tenant_id')
    .eq('tenant_id', 'dfba9d09-5bea-4f8d-a9d9-d95de4c8d8c2')
    .limit(10);

  return NextResponse.json({
    supabase_url: url,
    signatures: { data: sigs, error: sigError?.message },
    forms_with_signature: { data: forms, error: formError?.message },
    diego_forms: { data: diegoForms, error: diegoError?.message },
  });
}
