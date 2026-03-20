import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendWhatsApp(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
    return { ok: false, error: 'Credenciais Z-API não configuradas.' };
  }
  let normalizedPhone = phone.replace(/\D/g, '');
  if (!normalizedPhone.startsWith('55')) normalizedPhone = `55${normalizedPhone}`;
  try {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
      body: JSON.stringify({ phone: normalizedPhone, message }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `Status ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendEmail(to: string, subject: string, message: string, senderName: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY não configurada.' };
  }
  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">HelloGrowth</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Mensagem enviada pela equipe HelloGrowth
          </p>
        </div>
      </div>
    `;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `HelloGrowth <noreply@hellogrowth.com.br>`,
        to: [to],
        subject,
        html: htmlBody,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message || `Status ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// POST /api/admin/broadcast
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipients, message, subject, channels } = body;
    // recipients: Array<{ id: string; name: string; email?: string; phone?: string }>
    // channels: Array<'whatsapp' | 'email'>

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Nenhum destinatário selecionado.' }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Mensagem não pode estar vazia.' }, { status: 400 });
    }
    if (!channels || channels.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos um canal.' }, { status: 400 });
    }

    const results: Array<{
      recipientId: string;
      recipientName: string;
      channel: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const recipient of recipients) {
      // Personalizar mensagem com nome
      const personalizedMessage = message
        .replace(/\{nome\}/gi, recipient.name || '')
        .replace(/\{empresa\}/gi, recipient.companyName || '');

      if (channels.includes('whatsapp') && recipient.phone) {
        const result = await sendWhatsApp(recipient.phone, personalizedMessage);
        results.push({
          recipientId: recipient.id,
          recipientName: recipient.name,
          channel: 'whatsapp',
          ok: result.ok,
          error: result.error,
        });
        // Delay entre envios para evitar bloqueio
        await new Promise(r => setTimeout(r, 800));
      }

      if (channels.includes('email') && recipient.email) {
        const emailSubject = subject || 'Mensagem da equipe HelloGrowth';
        const result = await sendEmail(recipient.email, emailSubject, personalizedMessage, 'HelloGrowth');
        results.push({
          recipientId: recipient.id,
          recipientName: recipient.name,
          channel: 'email',
          ok: result.ok,
          error: result.error,
        });
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.filter(r => !r.ok).length;

    return NextResponse.json({ success: true, results, successCount, failCount });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
