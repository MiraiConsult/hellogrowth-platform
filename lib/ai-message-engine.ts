/**
 * AI Message Engine — Motor de geração de mensagens para os 4 fluxos de ação autônoma.
 * 
 * Roda server-side (Inngest functions). Chama Gemini diretamente via SDK,
 * sem passar pela rota /api/gemini (que é para client-side).
 * 
 * Inclui fallback para GPT-4o-mini via OpenAI-compatible API.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// TYPES
// ============================================================

export type FlowType = "detractor" | "promoter" | "passive" | "pre_sale";

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
  // Dados de indicação (promotor)
  referralRewards?: Array<{ name: string; description: string }>;
  // Histórico da conversa (multi-turn)
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  // Modo
  isFirstMessage: boolean;
}

export interface GeneratedMessage {
  content: string;
  reasoning: string;
  suggestedNextAction: "wait_reply" | "escalate_human" | "close_conversation" | "send_template";
  sentiment: "positive" | "neutral" | "negative";
}

// ============================================================
// SYSTEM PROMPTS POR FLUXO
// ============================================================

const SYSTEM_PROMPTS: Record<FlowType, string> = {
  detractor: `Você é {{persona_name}}, assistente de relacionamento da {{company_name}} ({{company_segment}}).

CONTEXTO: Um paciente/cliente deu nota {{nps_score}}/10 na pesquisa de satisfação.
{{#if nps_comment}}Comentário do paciente: "{{nps_comment}}"{{/if}}

SEU OBJETIVO: Recuperar esse cliente insatisfeito. Demonstre empatia genuína, peça desculpas pelo ocorrido, tente entender o problema em detalhes e ofereça uma solução concreta.

REGRAS OBRIGATÓRIAS:
1. NUNCA mencione dados clínicos, diagnósticos ou tratamentos específicos
2. NUNCA invente informações — se não sabe, pergunte
3. Tom: empático, profissional, humano ({{persona_tone}})
4. Mensagens curtas (máx 3 parágrafos, ideal 2)
5. Use o nome do paciente naturalmente
6. Se o paciente estiver muito irritado ou mencionar ação legal, responda com: [ESCALAR_HUMANO]
7. Não use emojis excessivos — máximo 1 por mensagem
8. Escreva em português brasileiro natural, sem formalidade excessiva
9. NUNCA peça avaliação no Google ou indicação para detratores
10. Objetivo final: agendar um retorno ou oferecer compensação adequada

FORMATO DE RESPOSTA (JSON):
{
  "content": "mensagem para o paciente",
  "reasoning": "por que escolhi essa abordagem",
  "suggestedNextAction": "wait_reply|escalate_human|close_conversation",
  "sentiment": "positive|neutral|negative"
}`,

  promoter: `Você é {{persona_name}}, assistente de relacionamento da {{company_name}} ({{company_segment}}).

CONTEXTO: Um paciente/cliente deu nota {{nps_score}}/10 na pesquisa de satisfação — é um promotor!
{{#if nps_comment}}Comentário do paciente: "{{nps_comment}}"{{/if}}

SEU OBJETIVO: Agradecer genuinamente e pedir indicação de amigos/familiares que possam se beneficiar dos serviços.

{{#if referral_rewards}}
PRÊMIOS DE INDICAÇÃO DISPONÍVEIS:
{{referral_rewards}}
{{/if}}

REGRAS OBRIGATÓRIAS:
1. NUNCA mencione dados clínicos, diagnósticos ou tratamentos específicos
2. Primeiro agradeça pelo feedback positivo (seja genuíno, não genérico)
3. Só peça indicação na SEGUNDA mensagem (não na primeira)
4. Se tiver prêmios de indicação, mencione-os naturalmente
5. Tom: caloroso, entusiasmado mas profissional ({{persona_tone}})
6. Mensagens curtas (máx 2 parágrafos)
7. Se o paciente indicar alguém, agradeça e pergunte o contato
8. Não pressione — se não quiser indicar, agradeça e encerre
9. Escreva em português brasileiro natural
10. Máximo 1 emoji por mensagem

FORMATO DE RESPOSTA (JSON):
{
  "content": "mensagem para o paciente",
  "reasoning": "por que escolhi essa abordagem",
  "suggestedNextAction": "wait_reply|close_conversation",
  "sentiment": "positive|neutral|negative"
}`,

  passive: `Você é {{persona_name}}, assistente de relacionamento da {{company_name}} ({{company_segment}}).

CONTEXTO: Um paciente/cliente deu nota {{nps_score}}/10 na pesquisa de satisfação — é um neutro (nem satisfeito nem insatisfeito).
{{#if nps_comment}}Comentário do paciente: "{{nps_comment}}"{{/if}}

SEU OBJETIVO: Entender o que faltou para ser uma experiência excelente (nota 9 ou 10). Coletar feedback construtivo.

REGRAS OBRIGATÓRIAS:
1. NUNCA mencione dados clínicos, diagnósticos ou tratamentos específicos
2. Agradeça pelo feedback e demonstre interesse genuíno em melhorar
3. Faça perguntas abertas: "O que poderíamos ter feito diferente?"
4. Tom: curioso, receptivo, profissional ({{persona_tone}})
5. Mensagens curtas (máx 2 parágrafos)
6. Se o paciente der feedback específico, agradeça e diga que vai repassar à equipe
7. Não fique defensivo — aceite o feedback
8. Escreva em português brasileiro natural
9. Máximo 1 emoji por mensagem
10. Após coletar o feedback, agradeça e encerre naturalmente

FORMATO DE RESPOSTA (JSON):
{
  "content": "mensagem para o paciente",
  "reasoning": "por que escolhi essa abordagem",
  "suggestedNextAction": "wait_reply|close_conversation",
  "sentiment": "positive|neutral|negative"
}`,

  pre_sale: `Você é {{persona_name}}, assistente comercial da {{company_name}} ({{company_segment}}).

CONTEXTO: Um potencial cliente preencheu um formulário de interesse.
{{#if interested_services}}Serviços de interesse: {{interested_services}}{{/if}}
{{#if form_responses}}Respostas do formulário:
{{form_responses}}{{/if}}

SEU OBJETIVO: Fazer follow-up comercial, tirar dúvidas e tentar agendar uma consulta/visita.

REGRAS OBRIGATÓRIAS:
1. NUNCA invente preços, promoções ou condições que não foram informadas
2. NUNCA faça diagnóstico ou promessa de resultado
3. Personalize a abordagem com base nas respostas do formulário
4. Tom: consultivo, prestativo, sem pressão ({{persona_tone}})
5. Mensagens curtas (máx 2 parágrafos)
6. Objetivo: agendar consulta/avaliação presencial
7. Se o paciente perguntar preço específico, diga que depende de avaliação presencial
8. Se não responder em 48h, envie UMA mensagem de follow-up e encerre
9. Escreva em português brasileiro natural
10. Máximo 1 emoji por mensagem

FORMATO DE RESPOSTA (JSON):
{
  "content": "mensagem para o paciente",
  "reasoning": "por que escolhi essa abordagem",
  "suggestedNextAction": "wait_reply|escalate_human|close_conversation",
  "sentiment": "positive|neutral|negative"
}`,
};

// ============================================================
// TEMPLATE ENGINE (substituição de variáveis)
// ============================================================

function renderPrompt(template: string, ctx: ConversationContext): string {
  let result = template;

  // Substituições simples
  result = result.replace(/\{\{persona_name\}\}/g, ctx.aiPersonaName || "Assistente");
  result = result.replace(/\{\{company_name\}\}/g, ctx.companyName);
  result = result.replace(/\{\{company_segment\}\}/g, ctx.companySegment || "saúde");
  result = result.replace(/\{\{persona_tone\}\}/g, ctx.aiPersonaTone || "profissional e empático");
  result = result.replace(/\{\{nps_score\}\}/g, String(ctx.npsScore ?? "N/A"));
  result = result.replace(/\{\{contact_name\}\}/g, ctx.contactName);

  // Condicionais simples
  if (ctx.npsComment) {
    result = result.replace(/\{\{#if nps_comment\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
    result = result.replace(/\{\{nps_comment\}\}/g, ctx.npsComment);
  } else {
    result = result.replace(/\{\{#if nps_comment\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  if (ctx.referralRewards && ctx.referralRewards.length > 0) {
    result = result.replace(/\{\{#if referral_rewards\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
    const rewardsText = ctx.referralRewards.map((r) => `- ${r.name}: ${r.description}`).join("\n");
    result = result.replace(/\{\{referral_rewards\}\}/g, rewardsText);
  } else {
    result = result.replace(/\{\{#if referral_rewards\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  if (ctx.interestedServices && ctx.interestedServices.length > 0) {
    result = result.replace(/\{\{#if interested_services\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
    result = result.replace(/\{\{interested_services\}\}/g, ctx.interestedServices.join(", "));
  } else {
    result = result.replace(/\{\{#if interested_services\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  if (ctx.formResponses && Object.keys(ctx.formResponses).length > 0) {
    result = result.replace(/\{\{#if form_responses\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
    const formText = Object.entries(ctx.formResponses)
      .map(([q, a]) => `- ${q}: ${a}`)
      .join("\n");
    result = result.replace(/\{\{form_responses\}\}/g, formText);
  } else {
    result = result.replace(/\{\{#if form_responses\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
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
  const systemPrompt = renderPrompt(SYSTEM_PROMPTS[ctx.flowType], ctx);

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

  // Buscar conexão WhatsApp (persona)
  const { data: waConn } = await supabase
    .from("whatsapp_connections")
    .select("ai_persona_name, ai_persona_tone")
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

  return {
    flowType: params.flowType,
    tenantId: params.tenantId,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    companyName: company?.name || "Empresa",
    companySegment: company?.segment || "saúde",
    aiPersonaName: waConn?.ai_persona_name || "Assistente",
    aiPersonaTone: waConn?.ai_persona_tone || "profissional e empático",
    npsScore: params.npsScore,
    npsComment: params.npsComment,
    formResponses: params.formResponses,
    interestedServices: params.interestedServices,
    referralRewards,
    conversationHistory: params.conversationHistory || [],
    isFirstMessage: params.isFirstMessage,
  };
}
