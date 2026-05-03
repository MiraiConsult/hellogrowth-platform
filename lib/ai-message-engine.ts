/**
 * AI Message Engine — Motor de geração de mensagens para os 4 fluxos de ação autônoma.
 * 
 * Roda server-side (Inngest functions). Chama Gemini diretamente via SDK,
 * sem passar pela rota /api/gemini (que é para client-side).
 * 
 * Inclui fallback para GPT-4o-mini via OpenAI-compatible API.
 * 
 * v2: Usa prompts do módulo lib/prompts/ com suporte a versões do banco.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
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
// CHAMADA AO LLM (Gemini + fallback GPT-4o-mini)
// ============================================================

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const contents = [
    ...history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  });

  return result.response.text();
}

async function callFallbackGPT(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada para fallback");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GPT fallback error: ${res.status} ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  try {
    return await callGemini(systemPrompt, userMessage, history);
  } catch (error: any) {
    console.warn(`[AI Engine] Gemini falhou, tentando fallback GPT: ${error.message?.substring(0, 100)}`);
    try {
      return await callFallbackGPT(systemPrompt, userMessage, history);
    } catch (fallbackError: any) {
      console.error(`[AI Engine] Fallback GPT também falhou: ${fallbackError.message}`);
      throw new Error(`Ambos LLMs falharam. Gemini: ${error.message}. GPT: ${fallbackError.message}`);
    }
  }
}

// ============================================================
// PARSE DA RESPOSTA
// ============================================================

function parseResponse(raw: string): GeneratedMessage {
  try {
    // Remove markdown wrappers
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        content: parsed.content || "",
        reasoning: parsed.reasoning || "",
        suggestedNextAction: parsed.suggestedNextAction || "wait_reply",
        sentiment: parsed.sentiment || "neutral",
      };
    }
  } catch (e) {
    // Se não conseguir parsear JSON, usa o texto bruto como conteúdo
    console.warn("[AI Engine] Falha ao parsear JSON, usando texto bruto");
  }

  return {
    content: raw.replace(/```[\s\S]*?```/g, "").trim(),
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
    .eq("status", "connected")
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
