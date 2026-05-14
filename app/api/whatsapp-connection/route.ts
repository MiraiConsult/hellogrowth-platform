import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar conexão WhatsApp do tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', '360dialog')
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection: data || null });
}

// DELETE - Desconectar WhatsApp
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { tenantId, connectionId } = body;

  if (!tenantId || !connectionId) {
    return NextResponse.json({ error: 'tenantId e connectionId obrigatórios' }, { status: 400 });
  }

  const { error } = await supabase
    .from('whatsapp_connections')
    .update({ status: 'inactive', disconnected_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('tenant_id', tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH - Atualizar configurações (ex: google_review_link)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { tenantId, connectionId, googleReviewLink } = body;

  if (!tenantId || !connectionId) {
    return NextResponse.json({ error: 'tenantId e connectionId obrigatórios' }, { status: 400 });
  }

  const updates: any = {};
  if (googleReviewLink !== undefined) {
    updates.google_review_link = googleReviewLink;
  }

  const { data, error } = await supabase
    .from('whatsapp_connections')
    .update(updates)
    .eq('id', connectionId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection: data });
}
