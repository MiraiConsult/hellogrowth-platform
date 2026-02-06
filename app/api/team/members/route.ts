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

    let currentUserId = userId;

    // Se recebeu email ao invés de userId, buscar o ID
    if (!currentUserId && email) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar usuário:', userError);
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      currentUserId = userData.id;
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'userId ou email não fornecido' }, { status: 400 });
    }

    console.log('Buscando membros para userId:', currentUserId);

    // Buscar tenant_id do usuário atual
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, is_owner')
      .eq('id', currentUserId)
      .single();

    if (userError || !currentUser) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const tenantId = currentUser.tenant_id;

    if (!tenantId) {
      console.error('Usuário não possui tenant_id:', currentUserId);
      return NextResponse.json({ error: 'Usuário não possui tenant configurado' }, { status: 400 });
    }

    console.log('Buscando membros do tenant:', tenantId);

    // Buscar todos os usuários do mesmo tenant (exceto o usuário atual)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, is_owner, created_at')
      .eq('tenant_id', tenantId)
      .neq('id', currentUserId)
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Buscar convites pendentes do tenant
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('tenant_id', tenantId)
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
      userId: currentUserId,
      tenantId: tenantId
    });

  } catch (error: any) {
    console.error('Erro ao buscar membros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
