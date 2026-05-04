/**
 * AI Message Engine — Motor de geração de mensagens para os 4 fluxos de ação autônoma.
 * 
 * Usa Google Gemini API diretamente via REST (sem SDK pesado).
 * Modelo: gemini-2.5-flash (atualizado de 2.0-flash que foi descontinuado)
 * 
 * v5: Busca contexto completo do banco (perfil do negócio, produtos, lead, histórico)
 *     + consciência temporal (dia/hora) + regras anti-repetição
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
  aiPersonaRole?: string;
  aiPersonaPersonality?: string;
  aiPersonaCustomInstructions?: string;
  // Perfil do negócio (novo)
  businessDescription?: string;
  businessDifferentials?: string;
  targetAudience?: string;
  mainPainPoints?: string;
  // Produtos/serviços disponíveis (novo)
  productsServices?: Array<{ name: string; value: number; description: string }>;
  // Análise de IA do lead (novo)
  leadAiAnalysis?: {
    salesScript?: string;
    clientInsights?: string[];
    suggestedProduct?: string;
    nextSteps?: string[];
    classification?: string;
  };
  // Contexto temporal (novo)
  currentDateTime?: string;
  currentDayOfWeek?: string;
  // Dados do gatilho
  npsScore?: number;
  npsComment?: string;
  formResponses?: Record<string, string>;
  interestedServices?: string[];
  availableServices?: string[];
  // Dados de indicação (promotor)
  referralRewards?: Array<{ name: string; description: string }>;
  referralReward?: string;
  googleReviewLink?: string;
  // Campanhas de engajamento ativas
  engagementReviewCampaign?: { id: string; reward_description: string; google_review_url: string } | null;
  engagementReferralCampaign?: { id: string; reward_description: string } | null;
  alreadyRequestedReview?: boolean;
  alreadyRequestedReferral?: boolean;
  // Histórico da conversa (multi-turn)
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  // Playbook do fluxo
  playbookObjective?: string;
  playbookOperationMode?: string;
  // Modo
  isFirstMessage: boolean;
  // Prompt customizado (vem do banco se a clínica editou)
  customPrompt?: string;
}

export interface GeneratedMessage {
  content: string;          // Primeira mensagem (compatibilidade)
  messages: string[];       // Array de mensagens para envio sequencial
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
    // Novos campos de contexto enriquecido
    businessDescription: ctx.businessDescription,
    businessDifferentials: ctx.businessDifferentials,
    targetAudience: ctx.targetAudience,
    mainPainPoints: ctx.mainPainPoints,
    productsServices: ctx.productsServices,
    leadAiAnalysis: ctx.leadAiAnalysis,
    currentDateTime: ctx.currentDateTime,
    currentDayOfWeek: ctx.currentDayOfWeek,
    // Persona detalhada
    aiPersonaName: ctx.aiPersonaName,
    aiPersonaRole: ctx.aiPersonaRole,
    aiPersonaTone: ctx.aiPersonaTone,
    aiPersonaPersonality: ctx.aiPersonaPersonality,
    aiPersonaCustomInstructions: ctx.aiPersonaCustomInstructions,
    // Playbook
    playbookObjective: ctx.playbookObjective,
    // Campanhas de engajamento
    engagementReviewCampaign: ctx.engagementReviewCampaign,
    engagementReferralCampaign: ctx.engagementReferralCampaign,
    alreadyRequestedReview: ctx.alreadyRequestedReview,
    alreadyRequestedReferral: ctx.alreadyRequestedReferral,
  });
}

// ============================================================
// CHAMADA AO GEMINI via REST API
// ============================================================

async function callLLM(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Estou pronto para responder como o consultor da empresa, de forma humana e natural." }],
      },
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
    "";

  return text;
}

// ============================================================
// PARSE DA RESPOSTA (JSON ou texto livre)
// ============================================================

function parseResponse(raw: string): GeneratedMessage {
  // Tentar extrair JSON completo da resposta
  // Suporta tanto o novo formato {messages: [...]} quanto o antigo {content: "..."}
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Novo formato: array de mensagens
      if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        const msgs = parsed.messages.map((m: any) => String(m).trim()).filter(Boolean);
        return {
          content: msgs[0],
          messages: msgs,
          reasoning: parsed.reasoning || "",
          suggestedNextAction: parsed.suggestedNextAction || "wait_reply",
          sentiment: parsed.sentiment || "neutral",
        };
      }

      // Formato antigo: content string — converter para array
      if (parsed.content && typeof parsed.content === "string") {
        const content = parsed.content.trim();
        // Quebrar em partes se tiver \n\n ou for muito longa
        const parts = splitIntoMessages(content);
        return {
          content: parts[0],
          messages: parts,
          reasoning: parsed.reasoning || "",
          suggestedNextAction: parsed.suggestedNextAction || "wait_reply",
          sentiment: parsed.sentiment || "neutral",
        };
      }
    } catch {
      // JSON inválido, continuar
    }
  }

  // Tentar extrair array messages de JSON parcial
  const messagesMatch = raw.match(/"messages"\s*:\s*(\[[\s\S]*?\])/);
  if (messagesMatch) {
    try {
      const msgs = JSON.parse(messagesMatch[1]) as string[];
      if (msgs.length > 0) {
        return {
          content: msgs[0],
          messages: msgs,
          reasoning: "",
          suggestedNextAction: "wait_reply",
          sentiment: "neutral",
        };
      }
    } catch { /* continuar */ }
  }

  // Tentar extrair content de JSON parcial/truncado
  const contentMatch = raw.match(/"content"\s*:\s*"([^"]+)"/);
  if (contentMatch) {
    const parts = splitIntoMessages(contentMatch[1].trim());
    return {
      content: parts[0],
      messages: parts,
      reasoning: "",
      suggestedNextAction: "wait_reply",
      sentiment: "neutral",
    };
  }

  // Fallback: usar o texto bruto
  let cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  if (cleaned.startsWith("{") || cleaned.startsWith('"')) {
    const textMatch = cleaned.match(/"([^"]{10,})"/);
    if (textMatch) cleaned = textMatch[1];
  }

  if (!cleaned || cleaned.length < 5) {
    cleaned = raw.replace(/[{}"]/g, "").trim().substring(0, 300);
  }

  const parts = splitIntoMessages(cleaned);
  return {
    content: parts[0],
    messages: parts,
    reasoning: "",
    suggestedNextAction: "wait_reply",
    sentiment: "neutral",
  };
}

// Quebra um texto longo em mensagens curtas (simulando digitação humana)
function splitIntoMessages(text: string): string[] {
  if (!text) return [""];

  // Se já é curto (< 120 chars), retornar como está
  if (text.length <= 120) return [text];

  // Tentar quebrar por \n\n (parágrafos)
  const byParagraph = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (byParagraph.length >= 2) {
    return byParagraph.slice(0, 4);
  }

  // Tentar quebrar por \n
  const byLine = text.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (byLine.length >= 2) {
    return byLine.slice(0, 4);
  }

  // Quebrar por frases (. ! ?)
  const bySentence = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (bySentence.length >= 2) {
    // Agrupar frases em no máximo 4 mensagens
    const result: string[] = [];
    let current = "";
    for (const sentence of bySentence) {
      if (current.length + sentence.length > 120 && current.length > 0) {
        result.push(current.trim());
        current = sentence;
      } else {
        current += (current ? " " : "") + sentence.trim();
      }
      if (result.length >= 3) break;
    }
    if (current.trim()) result.push(current.trim());
    return result.slice(0, 4);
  }

  return [text];
}

// ============================================================
// GERAÇÃO DE MENSAGEM (função principal)
// ============================================================

export async function generateMessage(ctx: ConversationContext): Promise<GeneratedMessage> {
  const systemPrompt = buildSystemPrompt(ctx);

  // Última mensagem do cliente (para multi-turn)
  const lastUserMessage = ctx.conversationHistory && ctx.conversationHistory.length > 0
    ? ctx.conversationHistory[ctx.conversationHistory.length - 1]?.content || ""
    : "";

  const userPrompt = ctx.isFirstMessage
    ? "Gere a primeira mensagem de abordagem para este cliente. Lembre-se: soe como um humano real no WhatsApp."
    : `O cliente respondeu: "${lastUserMessage}"\n\nGere sua próxima resposta. Lembre-se: soe como um humano real no WhatsApp, não repita o que já foi dito.`;

  const rawResponse = await callLLM(
    systemPrompt,
    userPrompt
  );

  return parseResponse(rawResponse);
}

// ============================================================
// CONSTRUTOR DE CONTEXTO COMPLETO (busca tudo do banco)
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

  // ---- Buscar dados do negócio (companies) ----
  const { data: company } = await supabase
    .from("companies")
    .select("name, segment")
    .eq("id", params.tenantId)
    .single();

  // ---- Buscar perfil do negócio (business_profile) ----
  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("company_name, business_description, business_type, brand_tone, differentials, main_pain_points, target_audience")
    .eq("tenant_id", params.tenantId)
    .single();

  // ---- Buscar produtos/serviços ----
  const { data: products } = await supabase
    .from("products_services")
    .select("name, value, ai_description")
    .eq("tenant_id", params.tenantId)
    .is("deleted_at", null);

  // ---- Buscar conexão WhatsApp (persona + google review link) ----
  const { data: waConn } = await supabase
    .from("whatsapp_connections")
    .select("ai_persona_name, ai_persona_tone, google_review_link")
    .eq("tenant_id", params.tenantId)
    .in("status", ["connected", "active"])
    .single();

  // ---- Buscar persona da IA (configuração detalhada) ----
  const { data: personaConfig } = await supabase
    .from("ai_persona_config")
    .select("name, role, tone, personality, custom_instructions")
    .eq("tenant_id", params.tenantId)
    .single();

  // ---- Buscar dados do lead (respostas do formulário + análise IA) ----
  let leadAiAnalysis: ConversationContext["leadAiAnalysis"] = undefined;
  let enrichedFormResponses = params.formResponses;

  // Buscar lead pelo telefone para pegar análise completa
  const phoneVariants = [
    params.contactPhone,
    params.contactPhone.replace(/^55/, ""),
    `55${params.contactPhone}`,
  ];

  const { data: lead } = await supabase
    .from("leads")
    .select("answers, suggested_products, name")
    .in("phone", phoneVariants)
    .eq("tenant_id", params.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lead?.answers) {
    // Extrair análise de IA do lead
    const aiAnalysis = lead.answers._ai_analysis;
    if (aiAnalysis) {
      leadAiAnalysis = {
        salesScript: aiAnalysis.sales_script,
        clientInsights: aiAnalysis.client_insights,
        suggestedProduct: aiAnalysis.suggested_product,
        nextSteps: aiAnalysis.next_steps,
        classification: aiAnalysis.classification,
      };
    }

    // Enriquecer formResponses com as respostas reais do formulário
    if (!enrichedFormResponses || Object.keys(enrichedFormResponses).length === 0) {
      const formAnswers: Record<string, string> = {};
      for (const [key, val] of Object.entries(lead.answers)) {
        if (key.startsWith("_")) continue; // Pular campos internos (_ai_analysis, _analyzing)
        if (typeof val === "object" && val !== null) {
          const v = (val as any).value;
          if (v) {
            formAnswers[key] = Array.isArray(v) ? v.join(", ") : String(v);
          }
        } else if (typeof val === "string") {
          formAnswers[key] = val;
        }
      }
      enrichedFormResponses = formAnswers;
    }
  }

  // ---- Buscar prêmios de indicação (para promotores) ----
  let referralRewards: Array<{ name: string; description: string }> = [];
  if (params.flowType === "promoter") {
    const { data: rewards } = await supabase
      .from("referral_rewards")
      .select("name, description")
      .eq("tenant_id", params.tenantId)
      .eq("is_active", true);
    referralRewards = rewards || [];
  }

  // ---- Buscar campanhas de engajamento ativas (Google Review + Indicação) ----
  let engagementReviewCampaign: any = null;
  let engagementReferralCampaign: any = null;
  let alreadyRequestedReview = false;
  let alreadyRequestedReferral = false;

  if (params.flowType === "promoter") {
    const { data: engCampaigns } = await supabase
      .from("engagement_campaigns")
      .select("id, type, reward_description, google_review_url, ai_enabled, ai_trigger, status")
      .eq("tenant_id", params.tenantId)
      .eq("status", "active")
      .eq("ai_enabled", true)
      .in("type", ["google_review", "referral"]);

    if (engCampaigns) {
      engagementReviewCampaign = engCampaigns.find(c => c.type === "google_review") || null;
      engagementReferralCampaign = engCampaigns.find(c => c.type === "referral") || null;
    }

    // Verificar anti-duplicação: já foi abordado antes?
    const phoneClean = params.contactPhone.replace(/\D/g, "");
    const phoneVariantsCheck = [phoneClean, phoneClean.replace(/^55/, ""), `55${phoneClean}`];

    if (engagementReviewCampaign) {
      const { data: existingReview } = await supabase
        .from("review_requests")
        .select("id")
        .eq("tenant_id", params.tenantId)
        .in("lead_phone", phoneVariantsCheck)
        .limit(1);
      alreadyRequestedReview = (existingReview?.length || 0) > 0;
    }

    if (engagementReferralCampaign) {
      const { data: existingReferral } = await supabase
        .from("referrals")
        .select("id")
        .eq("tenant_id", params.tenantId)
        .in("referrer_phone", phoneVariantsCheck)
        .limit(1);
      alreadyRequestedReferral = (existingReferral?.length || 0) > 0;
    }
  }

  // ---- Buscar playbook do fluxo (objetivo + modo de operação) ----
  const { data: playbook } = await supabase
    .from("ai_flow_playbooks")
    .select("operation_mode, objective, custom_objective_prompt, escalate_on_unknown, escalate_after_turns")
    .eq("tenant_id", params.tenantId)
    .eq("flow_type", params.flowType)
    .single();

  // ---- Buscar prompt customizado ativo no banco (se existir) ----
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

  // Se o playbook tem um prompt de objetivo customizado, usa como customPrompt
  if (!customPrompt && playbook?.custom_objective_prompt) {
    customPrompt = playbook.custom_objective_prompt;
  }

  // ---- Contexto temporal (dia/hora atual no fuso do Brasil) ----
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const daysOfWeek = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const currentDayOfWeek = daysOfWeek[brTime.getDay()];
  const currentDateTime = `${currentDayOfWeek}, ${brTime.getDate()} de ${months[brTime.getMonth()]} de ${brTime.getFullYear()}, ${String(brTime.getHours()).padStart(2, '0')}:${String(brTime.getMinutes()).padStart(2, '0')}`;

  // Gerar calendário dos próximos 7 dias para ajudar com agendamentos
  const calendarDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const futureDate = new Date(brTime.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = daysOfWeek[futureDate.getDay()];
    const label = i === 0 ? "HOJE" : i === 1 ? "amanhã" : i === 2 ? "depois de amanhã" : dayName;
    calendarDays.push(`  ${label} = ${dayName}, ${futureDate.getDate()} de ${months[futureDate.getMonth()]}`);
  }

  // ---- Formatar lista de serviços disponíveis ----
  const availableServices = (products || []).map(p => p.name);

  return {
    flowType: params.flowType,
    tenantId: params.tenantId,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    companyName: businessProfile?.company_name || company?.name || "Empresa",
    companySegment: businessProfile?.business_type || company?.segment || "saúde",
    aiPersonaName: personaConfig?.name || waConn?.ai_persona_name || "Maria",
    aiPersonaTone: personaConfig?.tone || waConn?.ai_persona_tone || businessProfile?.brand_tone || "friendly_professional",
    aiPersonaRole: personaConfig?.role || "Consultora de Atendimento",
    aiPersonaPersonality: personaConfig?.personality || "consultive",
    aiPersonaCustomInstructions: personaConfig?.custom_instructions || "",
    // Perfil do negócio
    businessDescription: businessProfile?.business_description,
    businessDifferentials: businessProfile?.differentials,
    targetAudience: businessProfile?.target_audience,
    mainPainPoints: businessProfile?.main_pain_points,
    // Produtos
    productsServices: (products || []).map(p => ({
      name: p.name,
      value: Number(p.value) || 0,
      description: p.ai_description || "",
    })),
    // Playbook do fluxo
    playbookObjective: playbook?.objective,
    playbookOperationMode: playbook?.operation_mode,
    // Análise do lead
    leadAiAnalysis,
    // Contexto temporal (inclui calendário)
    currentDateTime: currentDateTime + "\n\nCalendário dos próximos dias:\n" + calendarDays.join("\n"),
    currentDayOfWeek,
    // Dados originais
    googleReviewLink: waConn?.google_review_link,
    npsScore: params.npsScore,
    npsComment: params.npsComment,
    formResponses: enrichedFormResponses,
    interestedServices: params.interestedServices,
    availableServices,
    referralRewards,
    // Campanhas de engajamento
    engagementReviewCampaign,
    engagementReferralCampaign,
    alreadyRequestedReview,
    alreadyRequestedReferral,
    conversationHistory: params.conversationHistory || [],
    isFirstMessage: params.isFirstMessage,
    customPrompt,
  };
}
