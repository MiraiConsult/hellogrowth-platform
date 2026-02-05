import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para operações de banco
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET - Buscar convite pelo token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite não encontrado ou já foi aceito' }, { status: 404 });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este convite expirou' }, { status: 400 });
    }

    // Buscar nome da empresa do owner
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('company_name')
      .eq('id', invite.owner_id)
      .single();

    return NextResponse.json({
      invite: {
        ...invite,
        owner_company_name: owner?.company_name || 'Empresa'
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar convite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Aceitar convite (apenas criar membro da equipe, sem criar usuário auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite não encontrado ou já foi aceito' }, { status: 404 });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este convite expirou' }, { status: 400 });
    }

    // Criar membro da equipe com status 'pending' (será ativado quando o usuário fizer login)
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        owner_id: invite.owner_id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        status: 'pending' // Será ativado quando o usuário fizer login
      });

    if (memberError && !memberError.message.includes('duplicate')) {
      console.error('Erro ao criar membro:', memberError);
      return NextResponse.json({ error: 'Erro ao registrar membro da equipe' }, { status: 500 });
    }

    // Atualizar status do convite
    await supabaseAdmin
      .from('team_invites')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      message: 'Convite aceito! Agora faça seu cadastro para acessar a plataforma.',
      email: invite.email,
      redirectToSignup: true
    });

  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
  }
}
