import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com Service Role para bypass de RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Pegar dados do body
    const body = await request.json();
    const { ownerId, ownerEmail, name, email, role } = body;

    let userId = ownerId;

    // Se recebeu email ao invés de ownerId, buscar o ID
    if (!userId && ownerEmail) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', ownerEmail)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar usuário:', userError);
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      userId = userData.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'ownerId ou ownerEmail não fornecido' }, { status: 400 });
    }

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log('Criando convite para owner_id:', userId);

    // Buscar tenant_id do owner
    const { data: ownerData, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (ownerError || !ownerData) {
      console.error('Erro ao buscar tenant_id do owner:', ownerError);
      return NextResponse.json({ error: 'Owner não encontrado' }, { status: 404 });
    }

    const ownerTenantId = ownerData.tenant_id;

    if (!ownerTenantId) {
      console.error('Owner não possui tenant_id:', userId);
      return NextResponse.json({ error: 'Owner não possui tenant configurado' }, { status: 400 });
    }

    // Gerar token único
    const inviteToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Criar convite no banco com tenant_id
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .insert({
        owner_id: userId,
        email: email,
        name: name,
        role: role,
        token: inviteToken,
        status: 'pending',
        tenant_id: ownerTenantId, // Incluir tenant_id do owner
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Erro ao criar convite:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Gerar link de convite
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://hellogrowth.online';
    const inviteLink = `${baseUrl}/accept-invite?token=${inviteToken}`;

    console.log('Convite criado com sucesso:', invite.id);

    return NextResponse.json({
      success: true,
      invite,
      inviteLink
    });

  } catch (error: any) {
    console.error('Erro ao criar convite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId não fornecido' }, { status: 400 });
    }

    console.log('Deletando convite:', inviteId);

    const { error } = await supabaseAdmin
      .from('team_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      console.error('Erro ao deletar convite:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao deletar convite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
