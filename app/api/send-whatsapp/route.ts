import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ ok: false, error: 'phone e message são obrigatórios.' }, { status: 400 });
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Credenciais Evolution API não configuradas no servidor.' }, { status: 500 });
    }

    // Normalize phone: remove non-digits, ensure country code 55
    let normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) {
      normalizedPhone = `55${normalizedPhone}`;
    }

    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: data?.message || data?.error || `Status ${response.status}` }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
