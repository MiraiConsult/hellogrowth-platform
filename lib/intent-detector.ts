/**
 * Intent Detector — Detecta a intenção de mensagens inbound do WhatsApp.
 *
 * Usado pelo processInboundReply para decidir:
 * - opt_out: cliente pediu para parar de receber mensagens
 * - escalate_human: cliente pediu para falar com humano / demonstra urgência/raiva
 * - positive_feedback: cliente está satisfeito / agradecendo
 * - referral_intent: cliente demonstrou interesse em indicar alguém
 * - negative_feedback: cliente está reclamando
 * - question: cliente fez uma pergunta
 * - continue: mensagem genérica, continuar o fluxo normalmente
 */

export type MessageIntent =
  | "opt_out"
  | "escalate_human"
  | "positive_feedback"
  | "referral_intent"
  | "negative_feedback"
  | "question"
  | "continue";

export interface IntentResult {
  intent: MessageIntent;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// ============================================================
// Padrões de opt-out (LGPD compliance)
// ============================================================
const OPT_OUT_PATTERNS = [
  /\b(parar|pare|stop|cancelar|cancel|descadastrar|sair|remover|não\s+quero|nao\s+quero|não\s+desejo|nao\s+desejo)\b/i,
  /\b(não\s+me\s+mande|nao\s+me\s+mande|não\s+envie|nao\s+envie|bloquear|block)\b/i,
  /\b(me\s+tire|tire\s+meu|remova\s+meu|delete\s+meu)\b/i,
  /^(stop|pare|sair|cancel)$/i,
];

// ============================================================
// Padrões de escalada para humano
// ============================================================
const ESCALATE_PATTERNS = [
  /\b(falar\s+com\s+(humano|pessoa|atendente|responsável|gerente|dono|funcionário))\b/i,
  /\b(quero\s+(falar|conversar|atendimento)\s+(com|de)\s+(humano|pessoa|atendente))\b/i,
  /\b(atendimento\s+humano|atendente\s+humano|pessoa\s+real)\b/i,
  /\b(urgente|urgência|emergência|socorro|ajuda\s+urgente)\b/i,
  /\b(absurdo|ridículo|inaceitável|horrível|péssimo|terrível)\b/i,
  /\b(vou\s+(reclamar|processar|denunciar|acionar|publicar))\b/i,
  /\b(procon|reclame\s+aqui|tribunal|advogado)\b/i,
];

// ============================================================
// Padrões de feedback positivo
// ============================================================
const POSITIVE_PATTERNS = [
  /\b(ótimo|excelente|perfeito|maravilhoso|incrível|fantástico|top|show)\b/i,
  /\b(obrigad[ao]|muito\s+obrigad[ao]|grat[ao]|agradec[eo])\b/i,
  /\b(adorei|amei|gostei|curti|aprovei|satisfeit[ao])\b/i,
  /\b(muito\s+bom|muito\s+boa|super\s+bom|super\s+boa)\b/i,
  /^(👍|❤️|😊|🙏|✅|👏)+$/,
];

// ============================================================
// Padrões de intenção de indicação
// ============================================================
const REFERRAL_PATTERNS = [
  /\b(indicar|indicação|recomendar|recomendação|conhec[eo]\s+alguém)\b/i,
  /\b(tenho\s+(amig[ao]|familiar|colega|parente|vizinho))\b/i,
  /\b(vou\s+(indicar|recomendar|falar\s+para))\b/i,
  /\b(quero\s+(indicar|recomendar|participar\s+do\s+programa))\b/i,
];

// ============================================================
// Padrões de feedback negativo
// ============================================================
const NEGATIVE_PATTERNS = [
  /\b(ruim|péssimo|horrível|terrível|decepcionante|frustrante|insatisfeit[ao])\b/i,
  /\b(não\s+(gostei|aprovei|curti|recomendo)|nao\s+(gostei|aprovei|curti|recomendo))\b/i,
  /\b(problema|reclamação|reclamar|queixa|insatisfação)\b/i,
  /\b(demorou|demorou\s+demais|muito\s+tempo|esperei\s+muito)\b/i,
];

// ============================================================
// Padrões de pergunta
// ============================================================
const QUESTION_PATTERNS = [
  /\?/,
  /\b(como|quando|onde|qual|quais|quanto|quem|por\s+que|porque|o\s+que)\b/i,
  /\b(pode\s+(me\s+dizer|explicar|informar)|poderia\s+(me\s+dizer|explicar|informar))\b/i,
];

// ============================================================
// Função principal de detecção
// ============================================================
export function detectIntent(message: string): IntentResult {
  const text = message.trim().toLowerCase();

  // Opt-out tem prioridade máxima (LGPD)
  for (const pattern of OPT_OUT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: "opt_out",
        confidence: "high",
        reason: `Padrão de opt-out detectado: "${message.substring(0, 50)}"`,
      };
    }
  }

  // Escalada para humano
  let escalateScore = 0;
  for (const pattern of ESCALATE_PATTERNS) {
    if (pattern.test(text)) escalateScore++;
  }
  if (escalateScore >= 1) {
    return {
      intent: "escalate_human",
      confidence: escalateScore >= 2 ? "high" : "medium",
      reason: `${escalateScore} padrão(ões) de escalada detectado(s)`,
    };
  }

  // Intenção de indicação
  let referralScore = 0;
  for (const pattern of REFERRAL_PATTERNS) {
    if (pattern.test(text)) referralScore++;
  }
  if (referralScore >= 1) {
    return {
      intent: "referral_intent",
      confidence: referralScore >= 2 ? "high" : "medium",
      reason: `Interesse em indicação detectado`,
    };
  }

  // Feedback positivo
  let positiveScore = 0;
  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(text)) positiveScore++;
  }
  if (positiveScore >= 1) {
    return {
      intent: "positive_feedback",
      confidence: positiveScore >= 2 ? "high" : "medium",
      reason: `Feedback positivo detectado`,
    };
  }

  // Feedback negativo
  let negativeScore = 0;
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(text)) negativeScore++;
  }
  if (negativeScore >= 1) {
    return {
      intent: "negative_feedback",
      confidence: negativeScore >= 2 ? "high" : "medium",
      reason: `Feedback negativo detectado`,
    };
  }

  // Pergunta
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: "question",
        confidence: "medium",
        reason: `Pergunta detectada na mensagem`,
      };
    }
  }

  // Mensagem genérica — continuar fluxo
  return {
    intent: "continue",
    confidence: "low",
    reason: "Nenhum padrão específico detectado — continuando fluxo normal",
  };
}

// ============================================================
// Helper: verificar se deve processar opt-out
// ============================================================
export function isOptOut(message: string): boolean {
  return detectIntent(message).intent === "opt_out";
}

// ============================================================
// Helper: verificar se deve escalar para humano
// ============================================================
export function shouldEscalate(message: string): boolean {
  const result = detectIntent(message);
  return result.intent === "escalate_human" && result.confidence !== "low";
}
