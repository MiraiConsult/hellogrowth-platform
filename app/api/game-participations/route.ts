import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/game-participations?game_id=xxx - Listar participações de um game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nps_game_participations')
      .select('*')
      .eq('game_id', gameId)
      .order('played_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/game-participations - Criar nova participação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      game_id, 
      campaign_id, 
      client_name, 
      client_email, 
      client_phone, 
      prize_won, 
      prize_code 
    } = body;

    if (!game_id || !client_name || !prize_won || !prize_code) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('nps_game_participations')
      .insert({
        game_id,
        campaign_id,
        client_name,
        client_email,
        client_phone,
        prize_won,
        prize_code,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/game-participations - Atualizar status de participação
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status required' }, 
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'redeemed') {
      updateData.redeemed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('nps_game_participations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
