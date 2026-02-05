import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente com Service Role para operações de banco
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cliente com Anon Key para auth (signUp)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// GET - Buscar convite pelo token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    console.log('Buscando convite com token:', token);

    // Buscar convite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      console.error('Convite não encontrado:', inviteError);
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

// POST - Aceitar convite e criar conta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    console.log('Aceitando convite com token:', token);

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

    // 1. Criar usuário usando signUp (método padrão)
    console.log('Criando usuário auth para:', invite.email);
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email: invite.email,
      password: password,
      options: {
        data: {
          name: invite.name,
          role: invite.role
        }
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + authError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário: usuário não retornado' }, { status: 500 });
    }

    const userId = authData.user.id;
    console.log('Usuário auth criado:', userId);

    // 2. Confirmar email automaticamente usando Admin API
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
      console.log('Email confirmado automaticamente');
    } catch (confirmError) {
      console.error('Erro ao confirmar email (não crítico):', confirmError);
    }

    // 3. Criar registro na tabela users (insert simples)
    console.log('Criando registro na tabela users...');
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: invite.email,
        name: invite.name,
        company_name: invite.name
      });

    if (userError) {
      console.error('Erro ao criar registro de usuário:', userError);
      // Se o erro for de duplicata, ignorar
      if (!userError.message.includes('duplicate') && !userError.message.includes('unique')) {
        // Tentar continuar mesmo com erro
        console.log('Continuando apesar do erro na tabela users...');
      }
    } else {
      console.log('Registro na tabela users criado com sucesso');
    }

    // 4. Criar membro da equipe
    console.log('Criando membro da equipe...');
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        owner_id: invite.owner_id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        status: 'active'
      });

    if (memberError) {
      console.error('Erro ao criar membro:', memberError);
    } else {
      console.log('Membro da equipe criado com sucesso');
    }

    // 5. Atualizar status do convite
    console.log('Atualizando status do convite...');
    await supabaseAdmin
      .from('team_invites')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', invite.id);

    console.log('Convite aceito com sucesso!');

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Faça login para acessar a plataforma.',
      email: invite.email
    });

  } catch (error: any) {
    console.error('Erro geral ao aceitar convite:', error);
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
  }
}
