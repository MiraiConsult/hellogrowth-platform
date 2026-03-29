import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/templates — listar todos os templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = supabase
      .from('campaign_templates')
      .select('*')
      .order('use_count', { ascending: false });

    if (activeOnly) query = query.eq('is_active', true);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    // Estatísticas
    const categories = [...new Set((data || []).map((t: any) => t.category).filter(Boolean))];
    const totalUses = (data || []).reduce((s: number, t: any) => s + (t.use_count || 0), 0);

    return NextResponse.json({
      templates: data || [],
      stats: {
        total: (data || []).length,
        totalUses,
        categories,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/templates — criar novo template (a partir de campanha ou do zero)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, objective, tone, questions, tags, sourceCampaignId, sourceTenantName } = body;

    if (!name || !questions?.length) {
      return NextResponse.json({ error: 'Nome e perguntas são obrigatórios' }, { status: 400 });
    }

    // Normalizar perguntas (remover IDs específicos do cliente)
    const normalizedQuestions = questions.map((q: any, i: number) => ({
      id: String(Date.now() + i),
      text: q.text,
      type: q.type,
      required: q.required ?? true,
      options: q.options || q.choices || [],
    }));

    const { data, error } = await supabase
      .from('campaign_templates')
      .insert({
        name,
        description,
        category: category || 'Geral',
        objective,
        tone,
        questions: normalizedQuestions,
        tags: tags || [],
        source_campaign_id: sourceCampaignId || null,
        source_tenant_name: sourceTenantName || null,
        is_active: true,
        use_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/templates — atualizar template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('campaign_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/templates — desativar (soft delete) ou deletar template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    if (hard) {
      const { error } = await supabase.from('campaign_templates').delete().eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('campaign_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
