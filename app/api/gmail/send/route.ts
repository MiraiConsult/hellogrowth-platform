import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/services/gmailSender';
import { refreshAccessToken } from '@/lib/services/gmailAuth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, to, subject, body: emailBody } = body;

    if (!userId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Buscar conexão Gmail do usuário
    const { data: connection, error: fetchError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Gmail não conectado. Configure nas Configurações.' },
        { status: 404 }
      );
    }

    let accessToken = connection.access_token;

    // Verificar se o token expirou
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      // Token expirado, renovar
      const newTokens = await refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.access_token!;

      // Atualizar no banco
      const newExpiresAt = new Date(
        Date.now() + (newTokens.expiry_date || 3600 * 1000)
      ).toISOString();

      await supabase
        .from('gmail_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt,
        })
        .eq('user_id', userId);
    }

    // Enviar email
    const result = await sendEmail(accessToken, {
      to,
      subject,
      body: emailBody,
      isHtml: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email enviado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}
