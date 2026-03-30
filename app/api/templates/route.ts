import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/templates — listar templates ativos para clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tipoVenda = searchParams.get('tipoVenda');

    let query = supabase
      .from('campaign_templates')
      .select('id, name, description, category, objective, tone, questions, tags, use_count, pipeline_value_total, created_at, tipo_venda, ramo_negocio, segment')
      .eq('is_active', true)
      .order('use_count', { ascending: false });

    if (category && category !== 'Todos') query = query.eq('category', category);
    if (tipoVenda) query = query.eq('tipo_venda', tipoVenda);

    const { data, error } = await query;
    if (error) throw error;

    const categories = ['Todos', ...new Set((data || []).map((t: any) => t.category).filter(Boolean))];

    return NextResponse.json({ templates: data || [], categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/templates/use — cliente usa template para criar campanha
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, tenantId, campaignName } = body;

    if (!templateId || !tenantId) {
      return NextResponse.json({ error: 'templateId e tenantId são obrigatórios' }, { status: 400 });
    }

    // Buscar template
    const { data: template, error: tErr } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (tErr || !template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    // Criar nova campanha baseada no template
    const newQuestions = template.questions.map((q: any) => ({
      ...q,
      id: String(Date.now() + Math.random()),
    }));

    const { data: campaign, error: cErr } = await supabase
      .from('campaigns')
      .insert({
        name: campaignName || `${template.name} (cópia)`,
        description: template.description,
        status: 'Ativa',
        type: 'Nova',
        questions: newQuestions,
        objective: template.objective,
        tone: template.tone,
        tenant_id: tenantId,
        response_count: 0,
        nps_score: 0,
        enable_redirection: false,
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // Incrementar contador de uso
    await supabase
      .from('campaign_templates')
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq('id', templateId);

    return NextResponse.json({ campaign, templateName: template.name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
