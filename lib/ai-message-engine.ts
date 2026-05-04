/**
 * AI Message Engine — Motor de geração de mensagens para os 4 fluxos de ação autônoma.
 * 
 * Usa Google Gemini API diretamente via REST (sem SDK pesado).
 * Modelo: gemini-2.5-flash (atualizado de 2.0-flash que foi descontinuado)
 * 
 * v4: Usa GEMINI_API_KEY diretamente via REST API do Google AI.
 */

import { createClient } from "@supabase/supabase-js";
import { buildPrompt, type FlowType } from "./prompts";

// ============================================================
// TYPES
// ============================================================

export type { FlowType };

export interface ConversationContext {
  flowType: FlowType;
  tenantId: string;
  contactName: string;
  contactPhone: string;
  // Dados do negócio
  companyName: string;
  companySegment?: string;
  aiPersonaName?: string;
  aiPersonaTone?: string;
  // Dados do gatilho
  npsScore?: number;
  npsComment?: string;
  formResponses?: Record<string, string>;
  interestedServices?: string[];
  availableServices?: string[];
  // Dados de indicação (promotor)
  referralRewards?: Array<{ name: string; description: string }>;
  referralReward?: string; // Texto formatado do prêmio principal
  googleReviewLink?: string;
  // Histórico da conversa (multi-turn)
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  // Modo
  isFirstMessage: boolean;
  // Prompt customizado (vem do banco se a clínica editou)
  customPrompt?: string;
}

export interface GeneratedMessage {
  content: string;
  reasoning: string;
  suggestedNextAction: "wait_reply" | "escalate_human" | "close_conversation" | "send_template";
  sentiment: "positive" | "neutral" | "negative";
}

// ============================================================
// BUILDER DE SYSTEM PROMPT
// Usa lib/prompts/ com suporte a prompt customizado do banco
// ============================================================

function buildSystemPrompt(ctx: ConversationContext): string {
  // Se a clínica tem um prompt customizado ativo no banco, usa ele
  if (ctx.customPrompt) {
    return ctx.customPrompt;
  }

  // Formata histórico da conversa como string
  const conversationHistoryText = ctx.conversationHistory && ctx.conversationHistory.length > 0
    ? ctx.conversationHistory
        .map((m) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
        .join("\n")
    : undefined;

  // Formata prêmio de indicação como texto
  const referralRewardText = ctx.referralRewards && ctx.referralRewards.length > 0
    ? ctx.referralRewards.map((r) => `${r.name}: ${r.description}`).join("; ")
    : ctx.referralReward;

  // Turno atual baseado no histórico
  const turnNumber = ctx.conversationHistory
    ? Math.floor(ctx.conversationHistory.length / 2) + 1
    : 1;

  return buildPrompt({
    flowType: ctx.flowType,
    companyName: ctx.companyName,
    companySegment: ctx.companySegment || "saúde",
    contactName: ctx.contactName,
    npsScore: ctx.npsScore,
    npsComment: ctx.npsComment,
    referralReward: referralRewardText,
    googleReviewLink: ctx.googleReviewLink,
    interestedServices: ctx.interestedServices || [],
    formResponses: ctx.formResponses || {},
    availableServices: ctx.availableServices,
    conversationHistory: conversationHistoryText,
    turnNumber,
  });
}

// ============================================================
// CHAMADA AO GEMINI via REST API
// ============================================================

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  // Monta o conteúdo no formato Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Adiciona histórico
  for (const msg of history) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Adiciona a mensagem atual do usuário
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  console.log("[AI Engine] Chamando Gemini API...");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[AI Engine] Gemini error: ${res.status} ${errBody.substring(0, 300)}`);
    throw new Error(`Gemini API error: ${res.status} ${errBody.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!content) {
    throw new Error("Resposta vazia do Gemini");
  }

  console.log(`[AI Engine] Resposta gerada com Gemini (${content.length} chars)`);
  return content;
}

// ============================================================
// PARSE DA RESPOSTA
// ============================================================

function parseResponse(raw: string): GeneratedMessage {
  try {
    // Remove todos os markdown wrappers (pode ter múltiplos níveis)
    let cleaned = raw.trim();
    // Remove blocos de código markdown: ```json ... ``` ou ``` ... ```
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

    // Tenta encontrar o JSON mais externo
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.content) {
        return {
          content: parsed.content.trim(),
          reasoning: parsed.reasoning || "",
          suggestedNextAction: parsed.suggestedNextAction || "wait_reply",
          sentiment: parsed.sentiment || "neutral",
        };
      }
    }
  } catch (e) {
    // Se não conseguir parsear JSON completo, tentar extrair campo "content" parcialmente
    console.warn("[AI Engine] Falha ao parsear JSON, tentando extração parcial", (e as Error).message?.substring(0, 100));
    
    // Tentar extrair o valor do campo "content" mesmo de JSON truncado
    const contentMatch = raw.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
    if (contentMatch && contentMatch[1] && contentMatch[1].length > 20) {
      // Unescape o conteúdo
      const extracted = contentMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .trim();
      if (extracted.length > 20) {
        return {
          content: extracted,
          reasoning: "Extraído de JSON truncado",
          suggestedNextAction: "wait_reply",
          sentiment: "neutral",
        };
      }
    }
  }

  // Fallback: limpa o texto bruto removendo qualquer JSON ou markdown
  let fallbackContent = raw.trim();
  
  // Se começa com { ou ```, tentar extrair só o texto útil
  if (fallbackContent.startsWith("{") || fallbackContent.startsWith("`")) {
    // Tentar extrair texto após "content":
    const contentMatch = fallbackContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
    if (contentMatch && contentMatch[1]) {
      fallbackContent = contentMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .trim();
    } else {
      // Remover JSON wrapper
      fallbackContent = fallbackContent
        .replace(/```(?:json)?[\s\S]*?```/g, "")
        .replace(/^\{[\s\S]*$/, "")
        .trim();
    }
  }

  // Se ainda está vazio ou é JSON, usar o raw sem os wrappers
  if (!fallbackContent || fallbackContent.startsWith("{")) {
    fallbackContent = raw
      .replace(/```(?:json)?/g, "")
      .replace(/```/g, "")
      .replace(/\{[\s\S]*\}/g, "")
      .trim() || "Desculpe, não consegui gerar uma resposta adequada. Posso ajudar de outra forma?";
  }

  return {
    content: fallbackContent,
    reasoning: "Resposta não estruturada — usando texto bruto",
    suggestedNextAction: "wait_reply",
    sentiment: "neutral",
  };
}

// ============================================================
// FUNÇÃO PRINCIPAL — GERAR MENSAGEM
// ============================================================

export async function generateMessage(ctx: ConversationContext): Promise<GeneratedMessage> {
  const systemPrompt = buildSystemPrompt(ctx);

  let userMessage: string;

  if (ctx.isFirstMessage) {
    // Primeira mensagem: a IA inicia a conversa
    userMessage = `Gere a primeira mensagem para ${ctx.contactName}. Seja natural e direto.`;
  } else if (ctx.conversationHistory && ctx.conversationHistory.length > 0) {
    // Continuação: última mensagem do paciente
    const lastUserMsg = [...ctx.conversationHistory].reverse().find((m) => m.role === "user");
    userMessage = lastUserMsg?.content || "O paciente não respondeu ainda.";
  } else {
    userMessage = "Gere uma mensagem de follow-up.";
  }

  const rawResponse = await callLLM(
    systemPrompt,
    userMessage,
    ctx.conversationHistory || []
  );

  const parsed = parseResponse(rawResponse);

  // Verificar se precisa escalar para humano
  if (parsed.content.includes("[ESCALAR_HUMANO]")) {
    parsed.content = parsed.content.replace("[ESCALAR_HUMANO]", "").trim();
    parsed.suggestedNextAction = "escalate_human";
  }

  return parsed;
}

// ============================================================
// HELPER: BUSCAR CONTEXTO COMPLETO DO TENANT
// Inclui busca do prompt customizado ativo no banco
// ============================================================

export async function buildConversationContext(params: {
  tenantId: string;
  flowType: FlowType;
  contactName: string;
  contactPhone: string;
  npsScore?: number;
  npsComment?: string;
  formResponses?: Record<string, string>;
  interestedServices?: string[];
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  isFirstMessage: boolean;
}): Promise<ConversationContext> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar dados do negócio
  const { data: company } = await supabase
    .from("companies")
    .select("name, segment")
    .eq("id", params.tenantId)
    .single();

  // Buscar conexão WhatsApp (persona + google review link)
  const { data: waConn } = await supabase
    .from("whatsapp_connections")
    .select("ai_persona_name, ai_persona_tone, google_review_link")
    .eq("tenant_id", params.tenantId)
    .in("status", ["connected", "active"])
    .single();

  // Buscar prêmios de indicação (para promotores)
  let referralRewards: Array<{ name: string; description: string }> = [];
  if (params.flowType === "promoter") {
    const { data: rewards } = await supabase
      .from("referral_rewards")
      .select("name, description")
      .eq("tenant_id", params.tenantId)
      .eq("is_active", true);
    referralRewards = rewards || [];
  }

  // Buscar prompt customizado ativo no banco (se existir)
  let customPrompt: string | undefined;
  const { data: promptVersion } = await supabase
    .from("prompt_versions")
    .select("prompt_content")
    .eq("tenant_id", params.tenantId)
    .eq("flow_type", params.flowType)
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (promptVersion?.prompt_content) {
    customPrompt = promptVersion.prompt_content;
  }

  return {
    flowType: params.flowType,
    tenantId: params.tenantId,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    companyName: company?.name || "Empresa",
    companySegment: company?.segment || "saúde",
    aiPersonaName: waConn?.ai_persona_name || "Assistente",
    aiPersonaTone: waConn?.ai_persona_tone || "profissional e empático",
    googleReviewLink: waConn?.google_review_link,
    npsScore: params.npsScore,
    npsComment: params.npsComment,
    formResponses: params.formResponses,
    interestedServices: params.interestedServices,
    referralRewards,
    conversationHistory: params.conversationHistory || [],
    isFirstMessage: params.isFirstMessage,
    customPrompt,
  };
}
