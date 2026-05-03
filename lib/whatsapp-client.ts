import crypto from "crypto";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

// ============================================================
// Tipos
// ============================================================

export interface WhatsAppTextMessage {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}

export interface WhatsAppTemplateMessage {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode?: string;
  components?: object[];
}

export interface WhatsAppTemplateSubmit {
  wabaId: string;
  accessToken: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  components: object[];
}

// ============================================================
// Envio de mensagem de texto (dentro da janela de 24h)
// ============================================================

export async function sendTextMessage({
  phoneNumberId,
  accessToken,
  to,
  text,
}: WhatsAppTextMessage) {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.messages?.[0]?.id as string;
}

// ============================================================
// Envio de Template Message (fora da janela de 24h ou primeiro contato)
// ============================================================

export async function sendTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode = "pt_BR",
  components = [],
}: WhatsAppTemplateMessage) {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`WhatsApp Template API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.messages?.[0]?.id as string;
}

// ============================================================
// Submissão de Template para aprovação da Meta
// ============================================================

export async function submitTemplate({
  wabaId,
  accessToken,
  name,
  category,
  language,
  components,
}: WhatsAppTemplateSubmit) {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates`;

  const body = { name, category, language, components };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Template submit error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return { id: data.id as string, status: data.status as string };
}

// ============================================================
// Verificação de status de template
// ============================================================

export async function getTemplateStatus(
  wabaId: string,
  templateName: string,
  accessToken: string
) {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?name=${templateName}&fields=name,status,rejected_reason`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Template status error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.data?.[0] ?? null;
}

// ============================================================
// Verificação de Quality Rating
// ============================================================

export async function getQualityRating(
  phoneNumberId: string,
  accessToken: string
) {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}?fields=quality_rating,messaging_limit_tier`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Quality rating error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return {
    qualityRating: data.quality_rating as string,
    messagingLimitTier: data.messaging_limit_tier as string,
  };
}

// ============================================================
// HMAC Verification para webhooks do 360dialog/Meta
// ============================================================

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  // Meta usa X-Hub-Signature-256: sha256=<hash>
  const expectedSig = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  // Comparação segura contra timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

// ============================================================
// Definições dos 6 templates padrão do Hello Growth
// ============================================================

export const HG_TEMPLATES = [
  {
    name: "hg_detractor_recovery",
    category: "UTILITY" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Vimos que sua experiência recente conosco não foi como esperávamos. Gostaríamos muito de entender o que aconteceu e como podemos melhorar. Pode nos contar um pouco mais?",
        example: { body_text: [["João"]] },
      },
    ],
  },
  {
    name: "hg_promoter_referral",
    category: "MARKETING" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Ficamos muito felizes que você teve uma ótima experiência conosco! 😊 Você conhece alguém que também poderia se beneficiar dos nossos serviços? Temos uma surpresa especial para quem indicar um amigo!",
        example: { body_text: [["Maria"]] },
      },
    ],
  },
  {
    name: "hg_passive_feedback",
    category: "UTILITY" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Obrigado pela sua avaliação. Queremos entender melhor o que podemos melhorar para que sua próxima experiência seja ainda melhor. O que faltou para ser um 10?",
        example: { body_text: [["Carlos"]] },
      },
    ],
  },
  {
    name: "hg_pre_sale_followup",
    category: "MARKETING" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Vi que você demonstrou interesse em {{2}}. Adoraria conversar sobre como podemos te ajudar. Tem um momento para bater um papo rápido?",
        example: { body_text: [["Ana", "clareamento dental"]] },
      },
    ],
  },
  {
    name: "hg_resume_conversation",
    category: "UTILITY" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Continuando nossa conversa anterior — ainda estamos aqui para te ajudar. Há algo em que possamos te auxiliar?",
        example: { body_text: [["Pedro"]] },
      },
    ],
  },
  {
    name: "hg_google_review_request",
    category: "MARKETING" as const,
    language: "pt_BR",
    components: [
      {
        type: "BODY",
        text: "Olá {{1}}! Sua opinião é muito importante para nós. Você poderia deixar uma avaliação no Google? Leva menos de 1 minuto e ajuda muito outras pessoas a nos conhecerem! 🌟",
        example: { body_text: [["Lucia"]] },
      },
    ],
  },
];
