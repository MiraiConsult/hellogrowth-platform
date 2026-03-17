import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// =====================================================================
// Cron Job: Verificar trials expirados
// Executado diariamente às 00:00 UTC
// Atualiza o status das empresas com trial_model = 'model_b' que
// passaram da data de expiração para 'trial_expired'
// =====================================================================
export async function GET(request: NextRequest) {
  try {
    // Verificar autorização (Vercel Cron envia um header de autorização)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Em desenvolvimento, permitir sem autenticação
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date().toISOString();

    // Buscar empresas com trial_model = 'model_b' e trial_end_at no passado
    // que ainda estão com status 'trialing'
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, trial_end_at, subscription_status, trial_model')
      .eq('trial_model', 'model_b')
      .eq('subscription_status', 'trialing')
      .lt('trial_end_at', now);

    if (fetchError) {
      console.error('Error fetching expired trials:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log('No expired trials found');
      return NextResponse.json({ 
        success: true, 
        expired: 0,
        message: 'Nenhum trial expirado encontrado.' 
      });
    }

    // Atualizar status para 'trial_expired'
    const expiredIds = expiredTrials.map(c => c.id);
    const { error: updateError } = await supabase
      .from('companies')
      .update({ subscription_status: 'trial_expired' })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Error updating expired trials:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`Updated ${expiredTrials.length} expired trials:`, expiredTrials.map(c => c.name));

    return NextResponse.json({ 
      success: true, 
      expired: expiredTrials.length,
      companies: expiredTrials.map(c => ({ id: c.id, name: c.name, trial_end_at: c.trial_end_at })),
      message: `${expiredTrials.length} trial(s) expirado(s) atualizado(s).` 
    });
  } catch (error: any) {
    console.error('Cron check-trials error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
