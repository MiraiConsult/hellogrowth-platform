import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Pegar token de autenticação do header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Criar cliente com token do usuário
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Buscar ID do usuário na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
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
