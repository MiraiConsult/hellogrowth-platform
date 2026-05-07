import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET — listar logs com filtros e paginação
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenant_id = searchParams.get('tenant_id') || '';
    const action = searchParams.get('action') || '';
    const entity_type = searchParams.get('entity_type') || '';
    const is_error = searchParams.get('is_error') || '';
    const search = searchParams.get('search') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tenant_id) query = query.eq('tenant_id', tenant_id);
    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (is_error === 'true') query = query.eq('is_error', true);
    if (is_error === 'false') query = query.eq('is_error', false);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59Z');
    if (search) {
      query = query.or(`entity_name.ilike.%${search}%,user_email.ilike.%${search}%,user_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — registrar um log
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      user_email,
      user_name,
      action,
      entity_type,
      entity_id,
      entity_name,
      details = {},
      error_message,
      is_error = false,
    } = body;

    if (!action || !entity_type) {
      return NextResponse.json({ error: 'action e entity_type são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        tenant_id,
        user_email,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        details,
        error_message,
        is_error,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    // Nunca falhar silenciosamente — mas não bloquear a ação do usuário
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
