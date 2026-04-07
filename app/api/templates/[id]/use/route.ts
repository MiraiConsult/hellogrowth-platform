import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/templates/[id]/use — incrementa o contador de uso do template
// Usado pelo FormBuilder ao criar formulário de pré-venda a partir de template
// NÃO cria campanha na tabela campaigns (evita duplicação na pós-venda)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    // Buscar use_count atual
    const { data: template, error: fetchErr } = await supabase
      .from('campaign_templates')
      .select('use_count')
      .eq('id', templateId)
      .single();

    if (fetchErr || !template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    // Incrementar contador
    const { error: updateErr } = await supabase
      .from('campaign_templates')
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq('id', templateId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
