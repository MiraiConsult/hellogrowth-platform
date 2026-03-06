import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ ok: false, error: 'phone e message são obrigatórios.' }, { status: 400 });
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Credenciais Z-API não configuradas no servidor.' }, { status: 500 });
    }

    // Normalize phone: remove non-digits, ensure country code 55
    let normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) {
      normalizedPhone = `55${normalizedPhone}`;
    }

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_CLIENT_TOKEN
      },
      body: JSON.stringify({ phone: normalizedPhone, message })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: data?.message || `Status ${response.status}` }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
