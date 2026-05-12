import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('form_id');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    if (!formId) {
      // List all forms with their current values
      const { data, error } = await supabase
        .from('forms')
        .select('id, name, signature_enabled, signature_auto_email, signature_auto_whatsapp, term_color, consent_text')
        .limit(10);
      
      return NextResponse.json({ 
        action: 'list',
        forms: data,
        error: error?.message 
      });
    }
    
    // Test update on specific form
    const { data: before } = await supabase
      .from('forms')
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .eq('id', formId)
      .single();
    
    const { data: updated, error: updateError } = await supabase
      .from('forms')
      .update({
        signature_auto_email: true,
        signature_auto_whatsapp: true,
        term_color: '#ff0000'
      })
      .eq('id', formId)
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .single();
    
    const { data: after } = await supabase
      .from('forms')
      .select('id, name, signature_auto_email, signature_auto_whatsapp, term_color')
      .eq('id', formId)
      .single();
    
    // Revert back
    await supabase
      .from('forms')
      .update({
        signature_auto_email: before?.signature_auto_email || false,
        signature_auto_whatsapp: before?.signature_auto_whatsapp || false,
        term_color: before?.term_color || '#10b981'
      })
      .eq('id', formId);
    
    return NextResponse.json({
      action: 'test_update',
      before,
      updateResult: updated,
      updateError: updateError?.message,
      after,
      reverted: true,
      conclusion: updateError ? 'UPDATE FAILED - RLS or permission issue' : 'UPDATE WORKS - problem is in frontend code'
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
