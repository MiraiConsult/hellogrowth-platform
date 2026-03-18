import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/game-participations/check?game_id=xxx&phone=5511999999999
// Verifica se um telefone já participou dentro do período da política configurada
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');
    const phone = searchParams.get('phone');

    if (!gameId || !phone) {
      return NextResponse.json({ error: 'game_id e phone são obrigatórios' }, { status: 400 });
    }

    // Buscar configurações do game (política de participação e validade)
    const { data: game, error: gameError } = await supabase
      .from('nps_games')
      .select('participation_policy, prize_validity_days, name')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 });
    }

    const policy = game.participation_policy || 'unlimited';

    // Se ilimitado, sempre pode participar
    if (policy === 'unlimited') {
      return NextResponse.json({ can_play: true, policy });
    }

    // Calcular a data de início do período baseado na política
    let periodStart: Date | null = null;
    const now = new Date();

    if (policy === 'once_per_day') {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
    } else if (policy === 'once_per_week') {
      periodStart = new Date(now);
      const dayOfWeek = periodStart.getDay();
      periodStart.setDate(periodStart.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
    } else if (policy === 'once_per_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (policy === 'once_forever') {
      periodStart = new Date(0); // Desde o início dos tempos
    }

    // Buscar participação existente dentro do período
    let query = supabase
      .from('nps_game_participations')
      .select('id, prize_won, prize_code, played_at, expires_at, status')
      .eq('game_id', gameId)
      .eq('client_phone', phone)
      .order('played_at', { ascending: false })
      .limit(1);

    if (periodStart) {
      query = query.gte('played_at', periodStart.toISOString());
    }

    const { data: existing, error: checkError } = await query;

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      const participation = existing[0];

      // Calcular quando pode jogar de novo
      let next_available: string | null = null;
      if (policy === 'once_per_day') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        next_available = tomorrow.toISOString();
      } else if (policy === 'once_per_week') {
        const nextWeek = new Date(now);
        const daysUntilNextMonday = 7 - now.getDay() + 1;
        nextWeek.setDate(nextWeek.getDate() + (now.getDay() === 0 ? 1 : daysUntilNextMonday));
        nextWeek.setHours(0, 0, 0, 0);
        next_available = nextWeek.toISOString();
      } else if (policy === 'once_per_month') {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        next_available = nextMonth.toISOString();
      }

      return NextResponse.json({
        can_play: false,
        policy,
        previous_participation: {
          prize_won: participation.prize_won,
          prize_code: participation.prize_code,
          played_at: participation.played_at,
          expires_at: participation.expires_at,
          status: participation.status,
        },
        next_available,
      });
    }

    return NextResponse.json({ can_play: true, policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
