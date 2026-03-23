import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// Escopos necessários para o Google Business Profile
const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'email',
  'profile',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'tenantId e userId são obrigatórios' }, { status: 400 });
    }

    // Derivar a URL base da própria requisição para funcionar em qualquer ambiente
    // (production, staging, pre-production) sem depender de variável de ambiente
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const redirectUri = `${baseUrl}/api/gbp/callback`;

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: GBP_SCOPES,
      prompt: 'consent', // Forçar consent para garantir refresh_token
      state: JSON.stringify({ tenantId, userId }), // Passar contexto pelo state
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (err: any) {
    console.error('GBP OAuth initiation error:', err);
    return NextResponse.json({ error: 'Erro ao iniciar conexão com Google Business Profile' }, { status: 500 });
  }
}
