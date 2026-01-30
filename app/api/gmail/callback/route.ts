import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/services/gmailAuth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId pode ser passado via state

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=no_code', request.url)
      );
    }

    // Trocar código por tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/?error=no_tokens', request.url)
      );
    }

    // Obter informações do usuário
    const userInfo = await getUserInfo(tokens.access_token);

    // Salvar no Supabase
    const expiresAt = new Date(
      Date.now() + (tokens.expiry_date || 3600 * 1000)
    ).toISOString();

    const { error } = await supabase.from('gmail_connections').upsert({
      user_id: state || 'temp', // Usar state se disponível
      email: userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Error saving Gmail connection:', error);
      return NextResponse.redirect(
        new URL('/?error=db_error', request.url)
      );
    }

    // Redirecionar de volta para o app com sucesso
    return NextResponse.redirect(
      new URL('/?gmail_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('Error in Gmail callback:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_error', request.url)
    );
  }
}
