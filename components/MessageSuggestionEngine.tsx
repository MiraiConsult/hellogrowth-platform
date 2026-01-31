// ============================================
// MESSAGE SUGGESTION ENGINE
// Sistema inteligente de sugestões de mensagens
// USANDO GEMINI IA - Mensagens personalizadas como Coach de Vendas
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface MessageSuggestion {
  id: string;
  type: 'recovery' | 'sales' | 'relationship' | 'followup' | 'offer' | 'apology' | 'gratitude' | 'referral' | 'review';
  title: string;
  description: string;
  icon: string;
  tone: 'formal' | 'friendly' | 'empathetic' | 'enthusiastic' | 'professional';
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  priority: number;
  isLoading?: boolean;
}

export interface ClientContext {
  name: string;
  email: string;
  phone?: string;
  type: 'lead' | 'nps';
  score?: number;
  status?: string;
  comment?: string;
  leadStatus?: string;
  value?: number;
  lastInteraction?: string;
  daysSinceLastContact?: number;
  answers?: any;
  insightType?: 'risk' | 'opportunity' | 'sales' | 'recovery';
  priority?: 'high' | 'medium' | 'low';
}

// ============================================
// HELPER: Formatar respostas do formulário para o prompt
// ============================================

function formatAnswersForPrompt(answers: any): string {
  if (!answers || typeof answers !== 'object') return 'Sem respostas disponíveis';
  
  const formatted: string[] = [];
  
  Object.entries(answers).forEach(([key, value]: [string, any]) => {
    let question = key;
    let answer = '';
    
    if (typeof value === 'object' && value !== null) {
      question = value.question || value.pergunta || key;
      answer = value.value || value.answer || value.resposta || value.text || '';
    } else if (typeof value === 'string') {
      answer = value;
    } else if (Array.isArray(value)) {
      answer = value.map(v => v?.text || v?.value || v).join(', ');
    }
    
    if (answer && answer !== 'undefined' && answer !== 'null' && !key.startsWith('_')) {
      formatted.push(`• ${question}: ${answer}`);
    }
  });
  
  return formatted.length > 0 ? formatted.join('\n') : 'Sem respostas disponíveis';
}

// ============================================
// TIPOS DE MENSAGEM DISPONÍVEIS
// ============================================

interface MessageType {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: 'formal' | 'friendly' | 'empathetic' | 'enthusiastic' | 'professional';
  priority: number;
  applicableTo: ('lead' | 'nps' | 'both')[];
  npsRange?: { min: number; max: number };
  promptInstructions: string;
}

const MESSAGE_TYPES: MessageType[] = [
  // Para Promotores (NPS 9-10)
  {
    id: 'gratitude',
    title: 'Agradecimento Caloroso',
    description: 'Celebre o feedback positivo',
    icon: '🎉',
    tone: 'enthusiastic',
    priority: 5,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem de agradecimento genuíno e caloroso.
      - Agradeça pela nota alta de forma natural
      - Mencione especificamente o que o cliente elogiou (se houver)
      - Demonstre que o feedback fez diferença para a equipe
      - Use tom animado mas não exagerado
      - Termine com algo positivo sobre continuar atendendo bem
    `
  },
  {
    id: 'referral',
    title: 'Pedido de Indicação',
    description: 'Solicite indicações de forma natural',
    icon: '👥',
    tone: 'friendly',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem pedindo indicação de forma sutil e natural.
      - Comece agradecendo pela avaliação positiva
      - Mencione que clientes satisfeitos costumam conhecer pessoas com necessidades similares
      - Peça a indicação de forma gentil, sem pressão
      - Ofereça cuidar bem de quem for indicado
      - Mantenha tom amigável e não comercial
    `
  },
  {
    id: 'google_review',
    title: 'Solicitar Avaliação Google',
    description: 'Peça avaliação pública',
    icon: '⭐',
    tone: 'friendly',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem pedindo avaliação no Google de forma natural.
      - Agradeça pelo feedback positivo
      - Explique que avaliações no Google ajudam outras pessoas a encontrar o serviço
      - Peça gentilmente para deixar uma avaliação
      - Mencione que é rápido e simples
      - Não seja insistente
    `
  },
  {
    id: 'loyalty',
    title: 'Programa de Fidelidade',
    description: 'Ofereça benefícios exclusivos',
    icon: '💎',
    tone: 'professional',
    priority: 3,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem oferecendo benefícios de fidelidade.
      - Agradeça pela confiança demonstrada
      - Mencione que clientes especiais merecem tratamento especial
      - Ofereça um benefício exclusivo (desconto, prioridade, brinde)
      - Faça o cliente se sentir valorizado
      - Mantenha tom profissional mas caloroso
    `
  },
  
  // Para Neutros (NPS 7-8)
  {
    id: 'improve_feedback',
    title: 'Entender o que Faltou',
    description: 'Descubra como melhorar',
    icon: '💬',
    tone: 'friendly',
    priority: 5,
    applicableTo: ['nps'],
    npsRange: { min: 7, max: 8 },
    promptInstructions: `
      Crie uma mensagem para entender o que faltou para ser nota 10.
      - Agradeça pela avaliação de forma genuína
      - Demonstre interesse real em melhorar
      - Pergunte de forma aberta o que poderia ser diferente
      - Mostre que a opinião do cliente é valorizada
      - Não seja defensivo, seja curioso
    `
  },
  {
    id: 'win_back',
    title: 'Reconquistar',
    description: 'Transforme em promotor',
    icon: '🎯',
    tone: 'professional',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 7, max: 8 },
    promptInstructions: `
      Crie uma mensagem para reconquistar o cliente neutro.
      - Reconheça que a experiência foi boa mas não excelente
      - Demonstre compromisso em superar expectativas
      - Ofereça algo especial na próxima visita/compra
      - Mostre que está disposto a ir além
      - Convide para dar outra chance
    `
  },
  
  // Para Detratores (NPS 0-6)
  {
    id: 'apology',
    title: 'Pedido de Desculpas',
    description: 'Demonstre empatia genuína',
    icon: '🙏',
    tone: 'empathetic',
    priority: 5,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem de desculpas genuína e empática.
      - Reconheça que a experiência não foi boa
      - Se houver reclamação específica, mencione-a
      - Peça desculpas de forma sincera, não corporativa
      - Demonstre preocupação real com o que aconteceu
      - Ofereça conversar para entender e resolver
      - Use tom humano, como se fosse um amigo pedindo desculpas
    `
  },
  {
    id: 'understand_problem',
    title: 'Entender o Problema',
    description: 'Investigue com interesse genuíno',
    icon: '🔍',
    tone: 'empathetic',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem para entender o problema do cliente.
      - Demonstre interesse genuíno em saber o que aconteceu
      - Não seja defensivo
      - Faça perguntas abertas
      - Mostre que o feedback é importante para melhorar
      - Ofereça ouvir sem julgamento
    `
  },
  {
    id: 'offer_solution',
    title: 'Oferecer Solução',
    description: 'Proponha resolver o problema',
    icon: '✅',
    tone: 'professional',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem oferecendo solução para o problema.
      - Reconheça o problema mencionado
      - Proponha uma solução concreta
      - Demonstre disposição para fazer o que for preciso
      - Peça para o cliente dizer o que seria justo
      - Mostre compromisso em resolver
    `
  },
  
  // Para Leads
  {
    id: 'first_contact',
    title: 'Primeiro Contato',
    description: 'Inicie a conversa de forma natural',
    icon: '👋',
    tone: 'friendly',
    priority: 5,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem de primeiro contato para um lead.
      - Cumprimente de forma calorosa e natural
      - Mencione o interesse que o lead demonstrou (baseado nas respostas)
      - Mostre entusiasmo em poder ajudar
      - Proponha um próximo passo simples (conversa, agendamento)
      - Seja breve e direto, mas amigável
    `
  },
  {
    id: 'proposal',
    title: 'Proposta Final',
    description: 'Apresente a melhor oferta',
    icon: '🎯',
    tone: 'professional',
    priority: 5,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem apresentando proposta comercial.
      - Mencione que preparou algo especial baseado no que o cliente precisa
      - Referencie as necessidades específicas (das respostas do formulário)
      - Crie senso de oportunidade sem ser agressivo
      - Proponha apresentar a proposta em uma conversa
      - Mantenha tom profissional mas pessoal
    `
  },
  {
    id: 'objection_handling',
    title: 'Resolução de Objeções',
    description: 'Antecipe e resolva dúvidas',
    icon: '💡',
    tone: 'professional',
    priority: 4,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem para resolver objeções comuns.
      - Baseie-se nas respostas do formulário para identificar possíveis objeções
      - Antecipe dúvidas sobre preço, prazo ou qualidade
      - Ofereça informações que tranquilizem
      - Proponha esclarecer qualquer dúvida
      - Seja consultivo, não vendedor
    `
  },
  {
    id: 'followup',
    title: 'Follow-up',
    description: 'Retome o contato',
    icon: '📞',
    tone: 'friendly',
    priority: 4,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem de follow-up para retomar contato.
      - Mencione o contato anterior de forma natural
      - Pergunte se ainda há interesse
      - Ofereça ajuda ou informações adicionais
      - Não seja insistente ou cobrando
      - Deixe a porta aberta para quando o cliente estiver pronto
    `
  },
  {
    id: 'schedule_visit',
    title: 'Agendar Visita',
    description: 'Convide para conhecer pessoalmente',
    icon: '📅',
    tone: 'friendly',
    priority: 3,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem convidando o lead para uma visita.
      - Mencione o interesse demonstrado
      - Convide para conhecer o espaço/serviço pessoalmente
      - Ofereça flexibilidade de horários
      - Destaque o que o cliente vai ver/experimentar
      - Seja acolhedor e não pressione
    `
  },
  {
    id: 'special_offer',
    title: 'Oferta Especial',
    description: 'Apresente condição exclusiva',
    icon: '🎁',
    tone: 'enthusiastic',
    priority: 3,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem com oferta especial.
      - Mencione que preparou algo especial para o cliente
      - Baseie a oferta nas necessidades identificadas
      - Crie urgência de forma sutil (prazo limitado)
      - Destaque o valor/benefício da oferta
      - Convide para aproveitar
    `
  }
];

// ============================================
// GERADOR DE MENSAGENS COM GEMINI
// ============================================

async function generateMessageWithAI(
  context: ClientContext,
  messageType: MessageType
): Promise<{ whatsapp: string; emailSubject: string; emailBody: string }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback para mensagem básica se não tiver API key
    return generateFallbackMessage(context, messageType);
  }
  
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const firstName = context.name.split(' ')[0];
    const formattedAnswers = formatAnswersForPrompt(context.answers);
    
    const prompt = `
Você é um funcionário simpático e profissional de uma empresa. Sua tarefa é escrever mensagens personalizadas para clientes.

IMPORTANTE: As mensagens devem parecer escritas por um HUMANO REAL, não por um robô ou IA.
- Use linguagem natural e coloquial (mas profissional)
- Seja específico, mencione detalhes das respostas do cliente
- Não use frases genéricas ou corporativas
- Escreva como se estivesse conversando com um amigo
- Use emojis com moderação (1-2 no máximo)
- Seja breve e direto

DADOS DO CLIENTE:
- Nome: ${context.name}
- Tipo: ${context.type === 'nps' ? 'Cliente que respondeu pesquisa NPS' : 'Lead interessado'}
${context.score !== undefined ? `- Nota NPS: ${context.score}/10` : ''}
${context.status ? `- Status: ${context.status}` : ''}
${context.leadStatus ? `- Status do Lead: ${context.leadStatus}` : ''}
${context.value ? `- Valor Estimado: R$ ${context.value.toLocaleString('pt-BR')}` : ''}
${context.comment ? `- Comentário do cliente: "${context.comment}"` : ''}
${context.daysSinceLastContact ? `- Dias desde último contato: ${context.daysSinceLastContact}` : ''}

RESPOSTAS DO FORMULÁRIO:
${formattedAnswers}

TIPO DE MENSAGEM: ${messageType.title}
OBJETIVO: ${messageType.description}

INSTRUÇÕES ESPECÍFICAS:
${messageType.promptInstructions}

FORMATO DE RESPOSTA (responda EXATAMENTE neste formato):
---WHATSAPP---
[Mensagem para WhatsApp - máximo 3 parágrafos curtos, informal mas profissional]
---EMAIL_ASSUNTO---
[Assunto do email - curto e pessoal, não corporativo]
---EMAIL_CORPO---
[Corpo do email - mais detalhado que WhatsApp, mas ainda pessoal e humanizado]

Lembre-se: O cliente ${firstName} deve sentir que está recebendo uma mensagem de uma pessoa real que se importa, não de um sistema automatizado.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse da resposta
    const whatsappMatch = response.match(/---WHATSAPP---\s*([\s\S]*?)(?=---EMAIL_ASSUNTO---|$)/);
    const subjectMatch = response.match(/---EMAIL_ASSUNTO---\s*([\s\S]*?)(?=---EMAIL_CORPO---|$)/);
    const bodyMatch = response.match(/---EMAIL_CORPO---\s*([\s\S]*?)$/);
    
    return {
      whatsapp: whatsappMatch ? whatsappMatch[1].trim() : generateFallbackMessage(context, messageType).whatsapp,
      emailSubject: subjectMatch ? subjectMatch[1].trim() : generateFallbackMessage(context, messageType).emailSubject,
      emailBody: bodyMatch ? bodyMatch[1].trim() : generateFallbackMessage(context, messageType).emailBody
    };
  } catch (error) {
    console.error('Erro ao gerar mensagem com IA:', error);
    return generateFallbackMessage(context, messageType);
  }
}

// ============================================
// FALLBACK: Mensagem básica sem IA
// ============================================

function generateFallbackMessage(
  context: ClientContext,
  messageType: MessageType
): { whatsapp: string; emailSubject: string; emailBody: string } {
  const firstName = context.name.split(' ')[0];
  
  const templates: Record<string, { whatsapp: string; emailSubject: string; emailBody: string }> = {
    gratitude: {
      whatsapp: `Oi ${firstName}! Vi sua avaliação e fiquei muito feliz! Obrigado de coração pelo feedback positivo. A gente se esforça muito e é muito bom saber que faz diferença. 💚`,
      emailSubject: `${firstName}, muito obrigado!`,
      emailBody: `Oi ${firstName},\n\nVi sua avaliação e queria te agradecer pessoalmente. Feedback assim faz o nosso dia!\n\nObrigado por confiar na gente.\n\nAbraço!`
    },
    referral: {
      whatsapp: `Oi ${firstName}! Que bom que você gostou do nosso trabalho! Se você conhecer alguém que também poderia gostar, pode indicar. Vou cuidar bem, prometo! 😊`,
      emailSubject: `${firstName}, uma perguntinha`,
      emailBody: `Oi ${firstName},\n\nFiquei feliz com seu feedback! Se você conhecer alguém que também poderia se beneficiar, ficaríamos muito gratos pela indicação.\n\nAbraço!`
    },
    apology: {
      whatsapp: `Oi ${firstName}, vi sua avaliação e fiquei preocupado. Não era pra ter sido assim. Queria muito entender o que aconteceu pra gente poder melhorar. Posso te ligar?`,
      emailSubject: `${firstName}, preciso falar com você`,
      emailBody: `Oi ${firstName},\n\nVi sua avaliação e confesso que fiquei chateado. A gente se esforça muito e quando não dá certo, dói.\n\nQueria entender o que aconteceu. Pode me contar?\n\nAbraço`
    },
    proposal: {
      whatsapp: `Oi ${firstName}! Preparei uma proposta pensando no seu caso. Quando você tiver um tempinho, posso te apresentar?`,
      emailSubject: `${firstName}, preparei algo pra você`,
      emailBody: `Oi ${firstName},\n\nBaseado no que você me contou, preparei uma proposta especial.\n\nQuando podemos conversar?\n\nAbraço!`
    },
    first_contact: {
      whatsapp: `Oi ${firstName}! Vi que você demonstrou interesse e queria me apresentar. Posso te ajudar com mais informações?`,
      emailSubject: `Oi ${firstName}!`,
      emailBody: `Oi ${firstName},\n\nVi que você demonstrou interesse e queria me colocar à disposição.\n\nPosso te ajudar com alguma dúvida?\n\nAbraço!`
    }
  };
  
  return templates[messageType.id] || templates.first_contact;
}

// ============================================
// FUNÇÃO PRINCIPAL: Obter tipos de mensagem disponíveis
// ============================================

export function getAvailableMessageTypes(context: ClientContext): MessageType[] {
  const availableTypes: MessageType[] = [];
  
  MESSAGE_TYPES.forEach(type => {
    // Verificar se aplica ao tipo de cliente
    if (!type.applicableTo.includes(context.type) && !type.applicableTo.includes('both')) {
      return;
    }
    
    // Para NPS, verificar range de nota
    if (context.type === 'nps' && type.npsRange) {
      const score = context.score || 0;
      if (score < type.npsRange.min || score > type.npsRange.max) {
        return;
      }
    }
    
    availableTypes.push(type);
  });
  
  return availableTypes.sort((a, b) => b.priority - a.priority);
}

// ============================================
// FUNÇÃO PRINCIPAL: Gerar sugestão de mensagem
// ============================================

export async function generateMessageSuggestion(
  context: ClientContext,
  messageTypeId: string
): Promise<MessageSuggestion | null> {
  const messageType = MESSAGE_TYPES.find(t => t.id === messageTypeId);
  
  if (!messageType) {
    console.error('Tipo de mensagem não encontrado:', messageTypeId);
    return null;
  }
  
  const generated = await generateMessageWithAI(context, messageType);
  
  return {
    id: messageType.id,
    type: messageType.id as any,
    title: messageType.title,
    description: messageType.description,
    icon: messageType.icon,
    tone: messageType.tone,
    priority: messageType.priority,
    whatsappMessage: generated.whatsapp,
    emailSubject: generated.emailSubject,
    emailBody: generated.emailBody
  };
}

// ============================================
// FUNÇÃO LEGACY: Manter compatibilidade
// ============================================

export function getMessageSuggestions(context: ClientContext): MessageSuggestion[] {
  // Retorna sugestões básicas para manter compatibilidade
  // O novo sistema usa generateMessageSuggestion de forma assíncrona
  const availableTypes = getAvailableMessageTypes(context);
  const firstName = context.name.split(' ')[0];
  
  return availableTypes.map(type => {
    const fallback = generateFallbackMessage(context, type);
    return {
      id: type.id,
      type: type.id as any,
      title: type.title,
      description: type.description,
      icon: type.icon,
      tone: type.tone,
      priority: type.priority,
      whatsappMessage: fallback.whatsapp,
      emailSubject: fallback.emailSubject,
      emailBody: fallback.emailBody
    };
  });
}

// ============================================
// CLASSE LEGACY: Manter compatibilidade
// ============================================

export class MessageSuggestionEngine {
  static generateSuggestions(context: ClientContext): MessageSuggestion[] {
    return getMessageSuggestions(context);
  }
}

export default MessageSuggestionEngine;
