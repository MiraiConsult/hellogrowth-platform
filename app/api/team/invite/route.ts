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
    const { ownerEmail, name, email, role } = body;

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Email do proprietário não fornecido' }, { status: 400 });
    }

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar ID do usuário na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', ownerEmail)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userId = userData.id;

    // Gerar token único
    const inviteToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Criar convite no banco
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .insert({
        owner_id: userId,
        email: email,
        name: name,
        role: role,
        token: inviteToken,
        status: 'pending',
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
