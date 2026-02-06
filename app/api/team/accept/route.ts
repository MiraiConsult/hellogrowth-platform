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

// POST - Aceitar convite e criar conta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Buscar convite com informações do owner (incluindo tenant_id)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*, owner:users!owner_id(id, tenant_id, company_name)')
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

    // Verificar se o email já existe na tabela users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', invite.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está cadastrado. Faça login normalmente.' }, { status: 400 });
    }

    // Obter tenant_id do owner
    const ownerTenantId = invite.owner?.tenant_id;
    const ownerCompanyName = invite.owner?.company_name;

    if (!ownerTenantId) {
      console.error('Owner não tem tenant_id:', invite.owner_id);
      return NextResponse.json({ error: 'Erro ao processar convite: tenant não encontrado' }, { status: 500 });
    }

    // 1. Criar usuário na tabela users vinculado ao tenant do owner
    console.log('Criando usuário vinculado ao tenant:', ownerTenantId);
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: invite.email,
        name: invite.name,
        password: password, // Senha em texto (como o sistema já usa)
        company_name: ownerCompanyName, // Usar nome da empresa do owner
        plan: 'growth', // Herdar plano do tenant
        tenant_id: ownerTenantId, // IMPORTANTE: Vincular ao tenant do owner
        is_owner: false, // Não é dono do tenant
        role: invite.role // IMPORTANTE: Salvar role do convite
      })
      .select()
      .single();

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      return NextResponse.json({ error: 'Erro ao criar conta: ' + userError.message }, { status: 500 });
    }

    console.log('Usuário criado com sucesso:', newUser.id, 'tenant_id:', newUser.tenant_id);

    // 2. Atualizar membro da equipe existente com user_id
    console.log('Atualizando membro da equipe...');
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .update({
        user_id: newUser.id,
        status: 'active',
        accepted_at: new Date().toISOString()
      })
      .eq('email', invite.email)
      .eq('owner_id', invite.owner_id);

    if (memberError) {
      console.error('Erro ao atualizar membro:', memberError);
      // Se não existir, criar novo
      const { error: createMemberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          user_id: newUser.id,
          owner_id: invite.owner_id,
          email: invite.email,
          name: invite.name,
          role: invite.role,
          status: 'active',
          tenant_id: ownerTenantId
        });
      
      if (createMemberError) {
        console.error('Erro ao criar membro:', createMemberError);
      }
    }

    // 3. Atualizar status do convite
    await supabaseAdmin
      .from('team_invites')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', invite.id);

    console.log('Convite aceito com sucesso! Usuário vinculado ao tenant:', ownerTenantId);

    // Retornar dados do usuário para login automático
    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        password: password,
        plan: newUser.plan,
        createdAt: newUser.created_at,
        companyName: newUser.company_name,
        tenantId: newUser.tenant_id,
        isOwner: newUser.is_owner,
        role: invite.role // Incluir role para controle de permissões
      }
    });

  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
  }
}
