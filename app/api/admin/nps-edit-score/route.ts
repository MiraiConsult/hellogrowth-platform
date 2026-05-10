import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getNewStatus(score: number): string {
  if (score >= 9) return 'Promotor';
  if (score >= 7) return 'Neutro';
  return 'Detrator';
}

export async function PATCH(req: NextRequest) {
  try {
    const { responseId, newScore, reason, editedBy } = await req.json();

    if (!responseId || newScore === undefined || newScore === null) {
      return NextResponse.json({ error: 'responseId e newScore são obrigatórios' }, { status: 400 });
    }

    if (typeof newScore !== 'number' || newScore < 0 || newScore > 10) {
      return NextResponse.json({ error: 'Nota deve ser um número entre 0 e 10' }, { status: 400 });
    }

    // Buscar a resposta atual
    const { data: current, error: fetchError } = await supabase
      .from('nps_responses')
      .select('id, score, status, answers, tenant_id')
      .eq('id', responseId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 });
    }

    const oldScore = current.score;
    const oldStatus = current.status;
    const newStatus = getNewStatus(newScore);

    // Construir registro de auditoria
    const editRecord = {
      _type: 'score_edit',
      old_score: oldScore,
      new_score: newScore,
      old_status: oldStatus,
      new_status: newStatus,
      edited_by: editedBy || 'admin',
      reason: reason || null,
      edited_at: new Date().toISOString(),
    };

    // Adicionar ao array answers existente (campo especial _internal_notes)
    const currentAnswers: any[] = Array.isArray(current.answers) ? current.answers : [];
    const updatedAnswers = [...currentAnswers, editRecord];

    // Atualizar score, status e answers (com histórico)
    const { error: updateError } = await supabase
      .from('nps_responses')
      .update({
        score: newScore,
        status: newStatus,
        answers: updatedAnswers,
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('Erro ao atualizar nota NPS:', updateError);
      return NextResponse.json({ error: 'Erro ao salvar alteração' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oldScore,
      newScore,
      oldStatus,
      newStatus,
      editedAt: editRecord.edited_at,
    });
  } catch (err) {
    console.error('Erro no endpoint nps-edit-score:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET: buscar histórico de edições de uma resposta
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json({ error: 'responseId é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nps_responses')
      .select('id, score, status, answers')
      .eq('id', responseId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 });
    }

    const answers = Array.isArray(data.answers) ? data.answers : [];
    const editHistory = answers.filter((a: any) => a._type === 'score_edit');

    return NextResponse.json({
      currentScore: data.score,
      currentStatus: data.status,
      editHistory,
    });
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
