import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('form_id');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }
    
    // Use ANON key (same as frontend) to test RLS
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    // Use service role to verify
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    if (!formId) {
      return NextResponse.json({ error: 'Provide ?form_id=xxx' }, { status: 400 });
    }
    
    // Read before with admin
    const { data: before } = await supabaseAdmin
      .from('forms')
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .eq('id', formId)
      .single();
    
    // Try update with ANON key (simulating frontend)
    const { data: updateResult, error: updateError } = await supabaseAnon
      .from('forms')
      .update({
        signature_auto_email: true,
        signature_auto_whatsapp: true,
        term_color: '#ff0000'
      })
      .eq('id', formId)
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .single();
    
    // Read after with admin to verify
    const { data: after } = await supabaseAdmin
      .from('forms')
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .eq('id', formId)
      .single();
    
    // Revert with admin
    await supabaseAdmin
      .from('forms')
      .update({
        signature_auto_email: before?.signature_auto_email || false,
        signature_auto_whatsapp: before?.signature_auto_whatsapp || false,
        term_color: before?.term_color || '#10b981'
      })
      .eq('id', formId);
    
    const rls_blocks = updateError ? true : (after?.signature_auto_email === before?.signature_auto_email);
    
    return NextResponse.json({
      test: 'UPDATE with ANON KEY (RLS enabled)',
      before,
      anon_update_result: updateResult,
      anon_update_error: updateError?.message || null,
      after_update_admin_read: after,
      rls_blocks_update: rls_blocks,
      conclusion: rls_blocks 
        ? 'RLS IS BLOCKING the update with anon key! Need to fix RLS policies.'
        : 'Anon key update works fine. Problem is elsewhere in frontend.'
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
