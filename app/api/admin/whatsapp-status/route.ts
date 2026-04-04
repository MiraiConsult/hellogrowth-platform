import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

// GET — verifica o status da instância
export async function GET() {
  try {
    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ connected: false, error: 'EVOLUTION_API_KEY não configurada no servidor.' });
    }

    const url = `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': EVOLUTION_API_KEY },
      cache: 'no-store'
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ connected: false, error: `Erro ${res.status}: ${err}` });
    }

    const data = await res.json();
    // Evolution API v2: { instance: { instanceName, state } }
    // state pode ser: 'open' (conectado), 'close' (desconectado), 'connecting'
    const state = data?.instance?.state || data?.state || 'unknown';
    const connected = state === 'open';
    const phone = data?.instance?.profileName || data?.profileName || null;

    return NextResponse.json({
      connected,
      state,
      phone,
      instanceName: EVOLUTION_INSTANCE,
      apiUrl: EVOLUTION_API_URL
    });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message });
  }
}

// POST — envia mensagem de teste
export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json();

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ ok: false, error: 'EVOLUTION_API_KEY não configurada no servidor.' });
    }

    let normalizedPhone = (phone || '').replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) normalizedPhone = `55${normalizedPhone}`;

    const testMessage = message || `✅ *HelloGrowth — Teste de Conexão*\n\nSua integração com WhatsApp via Evolution API está funcionando corretamente! 🎉\n\nInstância: *${EVOLUTION_INSTANCE}*\n\n_HelloGrowth — Plataforma de Gestão Comercial_`;

    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({ number: normalizedPhone, text: testMessage })
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.message || data?.error || `Status ${res.status}` });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
