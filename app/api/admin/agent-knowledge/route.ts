/**
 * /api/admin/agent-knowledge
 *
 * GET  — Lista todo o conhecimento de um nicho (por niche_slug + agent_mode)
 * POST — Cria ou atualiza uma seção de conhecimento
 * PUT  — Atualiza uma seção existente
 * DELETE — Remove uma seção
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nicheSlug = searchParams.get('niche_slug');
  const agentMode = searchParams.get('agent_mode') || 'full';

  // Listar todos os nichos disponíveis
  if (searchParams.get('action') === 'niches') {
    const { data, error } = await supabaseAdmin
      .from('client_niches')
      .select('id, name, slug')
      .order('position', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ niches: data || [] });
  }

  if (!nicheSlug) {
    return NextResponse.json({ error: 'niche_slug é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ai_niche_knowledge')
    .select('*')
    .eq('niche_slug', nicheSlug)
    .eq('agent_mode', agentMode)
    .order('position', { ascending: true });

  if (error) {
    // Tabela não existe ainda — retornar vazio
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return NextResponse.json({ sections: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sections: data || [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { niche_slug, agent_mode, section_type, title, content, position } = body;

  if (!niche_slug || !section_type || !title) {
    return NextResponse.json({ error: 'niche_slug, section_type e title são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ai_niche_knowledge')
    .insert({
      niche_slug,
      agent_mode: agent_mode || 'full',
      section_type,
      title,
      content: content || '',
      position: position ?? 50,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

// ── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, title, content, position, is_active, section_type } = body;

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (position !== undefined) updates.position = position;
  if (is_active !== undefined) updates.is_active = is_active;
  if (section_type !== undefined) updates.section_type = section_type;

  const { data, error } = await supabaseAdmin
    .from('ai_niche_knowledge')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('ai_niche_knowledge')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
