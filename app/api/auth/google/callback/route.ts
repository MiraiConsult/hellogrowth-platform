import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '@/lib/supabase';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Erro ao autenticar com o Google')}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Código de autenticação não recebido')}`, request.url)
      );
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Não foi possível obter o email da conta Google')}`, request.url)
      );
    }

    const googleEmail = payload.email;

    // Check if user exists in our database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleEmail)
      .maybeSingle();

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Erro ao verificar sua conta')}`, request.url)
      );
    }

    if (!userData) {
      // User not found - not registered
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Conta não encontrada. O login com Google está disponível apenas para usuários já cadastrados')}`, request.url)
      );
    }

    // User found! Build the user object
    const user = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      password: userData.password || '',
      plan: userData.plan,
      createdAt: userData.created_at,
      companyName: userData.company_name,
      tenantId: userData.tenant_id,
      isOwner: userData.is_owner || false,
      role: userData.role || (userData.is_owner ? 'admin' : 'viewer'),
    };

    // Create a response that redirects to home with user data in URL params
    // The client will read this and save to localStorage
    const userParam = encodeURIComponent(JSON.stringify(user));
    return NextResponse.redirect(
      new URL(`/?google_login=success&user=${userParam}`, request.url)
    );

  } catch (err: any) {
    console.error('Callback error:', err);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Ocorreu um erro inesperado')}`, request.url)
    );
  }
}
