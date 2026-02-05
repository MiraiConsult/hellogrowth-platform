import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Pegar userId do query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let ownerId = userId;

    // Se recebeu email ao invés de userId, buscar o ID
    if (!ownerId && email) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar usuário:', userError);
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      ownerId = userData.id;
    }

    if (!ownerId) {
      return NextResponse.json({ error: 'userId ou email não fornecido' }, { status: 400 });
    }

    console.log('Buscando membros para owner_id:', ownerId);

    // Buscar membros da equipe
    const { data: members, error: membersError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Buscar convites pendentes
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Erro ao buscar convites:', invitesError);
      return NextResponse.json({ error: invitesError.message }, { status: 500 });
    }

    console.log('Membros encontrados:', members?.length || 0);
    console.log('Convites encontrados:', invites?.length || 0);

    return NextResponse.json({
      members: members || [],
      invites: invites || [],
      userId: ownerId
    });

  } catch (error: any) {
    console.error('Erro ao buscar membros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
