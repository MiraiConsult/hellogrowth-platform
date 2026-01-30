import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/services/gmailAuth';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar URL de autenticação' },
      { status: 500 }
    );
  }
}
