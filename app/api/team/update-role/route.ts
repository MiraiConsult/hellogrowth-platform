import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, newRole, userId } = body;

    if (!memberId || !newRole) {
      return NextResponse.json({ error: 'ID do membro e novo role são obrigatórios' }, { status: 400 });
    }

    // Verificar se o usuário que está alterando é admin
    if (userId) {
      const { data: requester } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (requester && requester.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas admins podem alterar permissões' }, { status: 403 });
      }
    }

    // Atualizar role na tabela users
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Atualizar role na tabela team_invites se existir
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', memberId)
      .single();

    if (userData?.email) {
      await supabaseAdmin
        .from('team_invites')
        .update({ role: newRole })
        .eq('email', userData.email);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao atualizar role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
