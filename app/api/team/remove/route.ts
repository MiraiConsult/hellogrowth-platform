import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest) {
  try {
    // Pegar ID do membro a ser removido do body
    const body = await request.json();
    const { memberId, userId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID do membro não fornecido' }, { status: 400 });
    }

    // Verificar se o usuário que está removendo é admin (opcional, mas recomendado)
    if (userId) {
      const { data: requester } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (requester && requester.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas admins podem remover membros' }, { status: 403 });
      }
    }

    // Remover da tabela users
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', memberId);

    if (deleteUserError) {
      console.error('Erro ao remover usuário:', deleteUserError);
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    // Remover da tabela team_invites se existir
    await supabaseAdmin
      .from('team_invites')
      .delete()
      .eq('email', (await supabaseAdmin.from('users').select('email').eq('id', memberId).single()).data?.email);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
