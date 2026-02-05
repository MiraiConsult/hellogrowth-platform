import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Pegar email do query parameter
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email não fornecido' }, { status: 400 });
    }

    // Buscar ID do usuário na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userId = userData.id;

    // Buscar membros da equipe
    const { data: members, error: membersError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Buscar convites pendentes
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Erro ao buscar convites:', invitesError);
      return NextResponse.json({ error: invitesError.message }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      invites: invites || [],
      userId
    });

  } catch (error: any) {
    console.error('Erro ao buscar membros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
