import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
);

export async function GET(request: NextRequest) {
  try {
    // Generate the OAuth URL
    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'select_account',
    });

    // Redirect to Google's OAuth page
    return NextResponse.redirect(authorizeUrl);
  } catch (err: any) {
    console.error('OAuth initiation error:', err);
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação com Google' },
      { status: 500 }
    );
  }
}
