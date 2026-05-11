/**
 * escalation-notifier.ts
 * Envia notificações quando uma conversa IA é escalada para atendimento humano.
 * Suporta: WhatsApp (via API Meta) e email (via Resend/SMTP).
 */

interface EscalationPayload {
  tenantId: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  flowType: string;
  lastMessage: string;
  reason: string;
  escalatedAt: string;
}

interface NotificationConfig {
  whatsappAlertPhone?: string;   // Número do responsável para receber alerta no WhatsApp
  emailAlert?: string;           // Email do responsável
  businessName?: string;         // Nome da empresa para personalizar a mensagem
}

const FLOW_LABELS: Record<string, string> = {
  detractor: "Detrator (NPS baixo)",
  promoter: "Promotor (NPS alto)",
  passive: "Neutro (NPS médio)",
  pre_sale: "Pré-Venda",
};

/**
 * Envia notificação de escalada via WhatsApp para o responsável
 */
async function notifyViaWhatsApp(
  payload: EscalationPayload,
  config: NotificationConfig
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const alertPhone = config.whatsappAlertPhone;

  if (!phoneNumberId || !token || !alertPhone) {
    console.log("[escalation-notifier] WhatsApp alert skipped: missing config");
    return false;
  }

  const flowLabel = FLOW_LABELS[payload.flowType] || payload.flowType;
  const businessName = config.businessName || "seu negócio";

  const message = `⚠️ *ESCALADA PARA HUMANO*

📋 *${businessName}*
👤 Cliente: ${payload.contactName}
📱 Telefone: ${payload.contactPhone}
🔄 Fluxo: ${flowLabel}

💬 *Última mensagem do cliente:*
"${payload.lastMessage}"

📌 *Motivo da escalada:* ${payload.reason}

🕐 ${new Date(payload.escalatedAt).toLocaleString("pt-BR")}

Acesse o painel para continuar o atendimento:
${process.env.NEXT_PUBLIC_APP_URL || "https://app.hellogrowth.com.br"}#action-inbox`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: alertPhone.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[escalation-notifier] WhatsApp error:", err);
      return false;
    }

    console.log(`[escalation-notifier] WhatsApp alert sent to ${alertPhone}`);
    return true;
  } catch (err) {
    console.error("[escalation-notifier] WhatsApp exception:", err);
    return false;
  }
}

/**
 * Envia notificação de escalada via email usando Resend API
 */
async function notifyViaEmail(
  payload: EscalationPayload,
  config: NotificationConfig
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const emailAlert = config.emailAlert;

  if (!resendKey || !emailAlert) {
    console.log("[escalation-notifier] Email alert skipped: missing config");
    return false;
  }

  const flowLabel = FLOW_LABELS[payload.flowType] || payload.flowType;
  const businessName = config.businessName || "seu negócio";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hellogrowth.com.br";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 4px; color: #dc2626; font-size: 18px;">⚠️ Conversa escalada para humano</h2>
    <p style="margin: 0; color: #7f1d1d; font-size: 14px;">${businessName}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; width: 140px;">Cliente</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px;">${payload.contactName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">Telefone</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px;">${payload.contactPhone}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">Fluxo</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px;">${flowLabel}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">Motivo</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px;">${payload.reason}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">Data/Hora</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px;">${new Date(payload.escalatedAt).toLocaleString("pt-BR")}</td>
    </tr>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Última mensagem do cliente</p>
    <p style="margin: 0; font-size: 14px; color: #1a1a1a; font-style: italic;">"${payload.lastMessage}"</p>
  </div>

  <a href="${appUrl}#action-inbox" style="display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
    Abrir painel de atendimento →
  </a>

  <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
    Esta notificação foi enviada pelo HelloGrowth. ID da conversa: ${payload.conversationId}
  </p>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HelloGrowth <noreply@hellogrowth.com.br>",
        to: [emailAlert],
        subject: `⚠️ Conversa escalada: ${payload.contactName} — ${businessName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[escalation-notifier] Email error:", err);
      return false;
    }

    console.log(`[escalation-notifier] Email alert sent to ${emailAlert}`);
    return true;
  } catch (err) {
    console.error("[escalation-notifier] Email exception:", err);
    return false;
  }
}

/**
 * Função principal: envia notificações de escalada via todos os canais configurados
 */
export async function sendEscalationNotification(
  payload: EscalationPayload,
  config: NotificationConfig
): Promise<{ whatsapp: boolean; email: boolean }> {
  const [whatsapp, email] = await Promise.allSettled([
    notifyViaWhatsApp(payload, config),
    notifyViaEmail(payload, config),
  ]);

  return {
    whatsapp: whatsapp.status === "fulfilled" && whatsapp.value,
    email: email.status === "fulfilled" && email.value,
  };
}
