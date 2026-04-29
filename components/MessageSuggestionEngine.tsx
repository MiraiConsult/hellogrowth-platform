// ============================================
// MESSAGE SUGGESTION ENGINE
// Sistema inteligente de sugestões de mensagens
// USANDO GEMINI IA - Mensagens personalizadas como Coach de Vendas
// ============================================

import { callGeminiAPI } from '@/lib/gemini-client';

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

export interface BusinessContext {
  companyName?: string;
  businessType?: string;
  businessDescription?: string;
  targetAudience?: string;
  brandTone?: string;
  differentials?: string;
  mainPainPoints?: string;
  products?: Array<{ name: string; price?: number; description?: string }>;
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
  businessContext?: BusinessContext;
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
      formatted.push(`- ${question}: ${answer}`);
    }
  });
  
  return formatted.length > 0 ? formatted.join('\n') : 'Sem respostas disponíveis';
}

function formatBusinessContext(bc?: BusinessContext): string {
  if (!bc) return '';
  
  const parts: string[] = [];
  if (bc.companyName) parts.push(`Nome da empresa: ${bc.companyName}`);
  if (bc.businessType) parts.push(`Tipo de negócio: ${bc.businessType}`);
  if (bc.businessDescription) parts.push(`Descrição: ${bc.businessDescription}`);
  if (bc.targetAudience) parts.push(`Público-alvo: ${bc.targetAudience}`);
  if (bc.brandTone) parts.push(`Tom da marca: ${bc.brandTone}`);
  if (bc.differentials) parts.push(`Diferenciais: ${bc.differentials}`);
  if (bc.mainPainPoints) parts.push(`Principais dores dos clientes: ${bc.mainPainPoints}`);
  if (bc.products && bc.products.length > 0) {
    const prodList = bc.products.slice(0, 10).map(p => 
      `  - ${p.name}${p.price ? ` (R$ ${p.price.toLocaleString('pt-BR')})` : ''}${p.description ? `: ${p.description}` : ''}`
    ).join('\n');
    parts.push(`Produtos/Servicos oferecidos:\n${prodList}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : '';
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
  fewShotExample: string;
}

const MESSAGE_TYPES: MessageType[] = [
  // ── PROMOTORES (NPS 9-10) ──
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
      - Agradeça pela nota alta de forma natural e específica
      - Se houver comentário, CITE uma parte dele mostrando que leu com atenção
      - Demonstre que o feedback impactou a equipe emocionalmente
      - Conecte o elogio a algo concreto que a empresa faz (use os diferenciais)
      - Termine reafirmando o compromisso de manter a qualidade
      - NÃO use frases genéricas como "sua opinião é muito importante"
    `,
    fewShotExample: `
      EXEMPLO BOM (clínica odontológica, nota 10, comentário "atendimento excelente"):
      WhatsApp: "Oi Maria! Li sua avaliação agora e confesso que fiquei emocionada. Quando você disse que o atendimento foi excelente, mostrei pra toda equipe e todo mundo ficou radiante. A gente se dedica muito pra que cada paciente se sinta acolhido, e saber que você percebeu isso faz tudo valer a pena. Pode ter certeza que vamos continuar cuidando de você com o mesmo carinho. Obrigada de coração!"
      
      EXEMPLO RUIM: "Oi Maria! Obrigado pela sua avaliação! Sua opinião é muito importante para nós. Esperamos continuar atendendo suas expectativas."
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
      - Comece referenciando algo específico do feedback positivo
      - Faça a transição para o pedido de indicação de forma orgânica
      - Explique POR QUE a indicação é valiosa (ex: "pessoas como você costumam ter amigos com necessidades parecidas")
      - Ofereça algo concreto: "vou cuidar da pessoa como cuido de você"
      - Se a empresa tiver produtos/serviços específicos, mencione qual seria ideal para indicados
      - NÃO pareça desesperado por clientes
    `,
    fewShotExample: `
      EXEMPLO BOM (restaurante, nota 10):
      WhatsApp: "Oi Carlos! Que bom que você curtiu a experiência no Boteco. Sabe o que eu percebo? Clientes que amam nosso chopp artesanal geralmente têm amigos que também curtem uma boa gastronomia. Se você tiver alguém que ia gostar de conhecer, me manda o contato que eu cuido pessoalmente da reserva e garanto uma experiência especial. Pode confiar!"
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
      - Agradeça pelo feedback positivo de forma específica
      - Explique que avaliações no Google ajudam OUTRAS PESSOAS a encontrar o serviço
      - Faça o cliente sentir que está ajudando outros, não a empresa
      - Mencione que leva menos de 1 minuto
      - NÃO seja insistente ou use "por favor" demais
    `,
    fewShotExample: `
      EXEMPLO BOM (clínica estética, nota 9):
      WhatsApp: "Oi Ana! Fiquei feliz com sua avaliação. Sabia que muitas pacientes novas nos encontram pelo Google? Se você puder deixar uma avaliacaozinha lá, vai ajudar outras mulheres que estão procurando um lugar de confiança pra cuidar da pele. É rápido, menos de 1 minuto. Obrigada!"
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
      - Faça o cliente se sentir parte de um grupo seleto
      - Ofereça um benefício CONCRETO e ESPECÍFICO (não genérico)
      - Se a empresa tem produtos, sugira um desconto ou upgrade em algo específico
      - Crie exclusividade: "preparei algo especial só pra você"
      - Mantenha tom profissional mas caloroso
    `,
    fewShotExample: `
      EXEMPLO BOM (salão de beleza, nota 10):
      WhatsApp: "Oi Fernanda! Como agradecimento pela sua confiança, preparei algo especial: na sua próxima visita, você ganha uma hidratação profunda cortesia da casa. É o nosso jeito de dizer obrigada por ser uma cliente tão especial. Quer agendar?"
    `
  },
  
  // ── NEUTROS (NPS 7-8) ──
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
      - Agradeça pela avaliação de forma genuína (nota 7-8 é boa, não ruim)
      - Demonstre curiosidade REAL em saber o que poderia ser melhor
      - Se houver comentário, use-o como ponto de partida
      - Faça UMA pergunta específica e aberta (não várias)
      - Mostre vulnerabilidade: "a gente quer muito acertar com você"
      - NÃO seja defensivo ou justifique nada
    `,
    fewShotExample: `
      EXEMPLO BOM (hotel, nota 7, comentário "quarto bom mas café da manhã fraco"):
      WhatsApp: "Oi Roberto! Obrigado pela avaliação. Li que o quarto agradou mas o café da manhã não foi aquilo tudo. Concordo que a gente pode melhorar nesse ponto. Me conta: o que você esperava encontrar no café e não encontrou? Quero muito acertar na sua próxima estadia."
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
      - Demonstre compromisso em SUPERAR expectativas
      - Ofereça algo CONCRETO e ESPECÍFICO na próxima interação
      - Se a empresa tem produtos/serviços, sugira algo que o cliente ainda não experimentou
      - Convide para dar outra chance com entusiasmo genuíno
    `,
    fewShotExample: `
      EXEMPLO BOM (academia, nota 8):
      WhatsApp: "Oi Lucas! Vi que sua experiência foi boa, mas sei que a gente pode fazer melhor. Que tal experimentar uma aula de funcional com o professor Marcos? Muitos alunos que estavam no mesmo ponto que você se surpreenderam. Posso agendar uma aula cortesia pra você essa semana?"
    `
  },
  
  // ── DETRATORES (NPS 0-6) ──
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
      - Reconheça ESPECIFICAMENTE o que deu errado (use o comentário do cliente)
      - Peça desculpas de forma HUMANA, não corporativa
      - Demonstre que entende o impacto emocional no cliente
      - NÃO justifique, NÃO dê desculpas genéricas, NÃO culpe ninguém
      - Ofereça conversar pessoalmente (ligação ou presencial)
      - Use tom de alguém que realmente se importa, como um amigo
      - Se a nota for muito baixa (0-3), demonstre urgência e preocupação extra
    `,
    fewShotExample: `
      EXEMPLO BOM (clínica, nota 2, comentário "esperei 2 horas"):
      WhatsApp: "Oi Patrícia, li sua avaliação e confesso que fiquei mal. Esperar 2 horas é inaceitável, e eu entendo perfeitamente sua frustração. Você merecia muito mais. Quero pessoalmente entender o que aconteceu e garantir que isso nunca mais se repita. Posso te ligar amanhã de manhã? Preciso ouvir você."
      
      EXEMPLO RUIM: "Oi Patrícia, lamentamos o ocorrido. Estamos trabalhando para melhorar nossos processos. Agradecemos seu feedback."
    `
  },
  {
    id: 'understand_problem',
    title: 'Entender o Problema',
    description: 'Investigue com interesse genuino',
    icon: '🔍',
    tone: 'empathetic',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem para entender o problema do cliente.
      - Demonstre interesse GENUÍNO em saber o que aconteceu
      - Se houver comentário, aprofunde nele com perguntas específicas
      - Se NÃO houver comentário, pergunte de forma aberta e acolhedora
      - Mostre que o feedback vai gerar AÇÃO CONCRETA
      - NÃO seja defensivo, seja curioso e humilde
      - Ofereça ouvir sem julgamento
    `,
    fewShotExample: `
      EXEMPLO BOM (restaurante, nota 4, sem comentário):
      WhatsApp: "Oi Marcos, vi que sua experiência no restaurante não foi boa e isso me preocupou. Queria muito entender o que aconteceu pra poder corrigir. Foi algo no atendimento? Na comida? No ambiente? Qualquer detalhe me ajuda a melhorar de verdade. Pode falar abertamente."
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
      Crie uma mensagem oferecendo solução CONCRETA para o problema.
      - Reconheça o problema mencionado de forma específica
      - Proponha uma solução TANGÍVEL (não promessas vagas)
      - Demonstre disposição para ir além do esperado
      - Se possível, ofereça algo de cortesia como gesto de boa vontade
      - Pergunte se a solução proposta seria justa
      - Mostre compromisso PESSOAL em resolver
    `,
    fewShotExample: `
      EXEMPLO BOM (loja, nota 3, comentário "produto veio com defeito"):
      WhatsApp: "Oi Júlia, entendo sua frustração com o produto defeituoso. Já separei um novo pra você, sem nenhum custo adicional. Posso enviar amanhã ou, se preferir, você pode trocar na loja e eu mesmo vou conferir antes de entregar. Além disso, quero te dar um desconto de 20% na próxima compra como pedido de desculpas. O que acha?"
    `
  },
  
  // ── LEADS ──
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
      - Cumprimente de forma calorosa e PESSOAL (use o nome)
      - ANALISE as respostas do formulário e identifique a NECESSIDADE PRINCIPAL do lead
      - Mencione algo ESPECÍFICO das respostas mostrando que leu com atenção
      - Conecte a necessidade do lead com um produto/serviço da empresa
      - Proponha um próximo passo SIMPLES e de baixo comprometimento
      - Seja breve (3-4 frases no WhatsApp)
      - NÃO liste todos os serviços, foque no que o lead precisa
      - Se o lead mencionou urgência ou dor específica, demonstre empatia
    `,
    fewShotExample: `
      EXEMPLO BOM (clínica odontológica, lead respondeu que quer clareamento e tem sensibilidade):
      WhatsApp: "Oi Camila! Vi que você tem interesse em clareamento e mencionou sensibilidade nos dentes. Isso é super comum e a gente tem técnicas específicas pra quem tem essa questão. Que tal agendar uma avaliação gratuita? Assim consigo te mostrar as opções que funcionam melhor pro seu caso. Pode ser essa semana?"
      
      EXEMPLO RUIM: "Oi Camila! Obrigado pelo interesse! Temos diversos serviços de odontologia. Quando podemos agendar uma consulta?"
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
      Crie uma mensagem apresentando proposta comercial personalizada.
      - ANALISE as respostas do formulário para entender EXATAMENTE o que o lead precisa
      - Mencione o produto/serviço mais adequado pelo nome e preço (se disponível)
      - Explique POR QUE essa opção é ideal para o caso específico do lead
      - Se houver diferenciais da empresa, use-os como argumento
      - Crie senso de oportunidade sem ser agressivo (ex: "essa semana consigo uma condição especial")
      - Proponha apresentar a proposta em uma conversa rápida
      - Se o lead tem valor estimado, calibre a proposta de acordo
    `,
    fewShotExample: `
      EXEMPLO BOM (academia, lead quer emagrecer, valor R$ 200):
      WhatsApp: "Oi Pedro! Analisei o que você me contou e acho que o plano Fit Premium seria perfeito pro seu objetivo de emagrecimento. Ele inclui acompanhamento nutricional e treino personalizado, que são os dois pilares pra resultado rápido. Essa semana consigo uma condição especial de R$ 179/mês (normalmente R$ 220). Quer que eu te explique os detalhes?"
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
      - ANALISE as respostas do formulário para IDENTIFICAR possíveis objeções
      - Se o lead mencionou preço, aborde valor vs custo
      - Se mencionou tempo, aborde praticidade
      - Se mencionou medo/insegurança, aborde garantias e casos de sucesso
      - Use os diferenciais da empresa como argumentos
      - Seja consultivo: "entendo sua preocupação, e por isso..."
      - NÃO seja vendedor agressivo, seja um consultor que ajuda
    `,
    fewShotExample: `
      EXEMPLO BOM (escola de idiomas, lead mencionou que não tem tempo):
      WhatsApp: "Oi Rafael! Entendo que tempo é um desafio. Por isso nosso método é focado em aulas de 30 minutos, 3x por semana, com horários flexíveis. Vários alunos que trabalham em horário comercial como você conseguem encaixar no almoço ou antes do trabalho. Quer experimentar uma aula gratuita pra ver como funciona na prática?"
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
      - Mencione o contato anterior de forma natural e específica
      - Referencie algo das respostas do formulário para mostrar que lembra
      - Pergunte se a necessidade ainda existe
      - Ofereça uma informação NOVA ou um benefício que não foi mencionado antes
      - Se passaram muitos dias, reconheça o tempo ("faz um tempinho que conversamos")
      - NÃO seja insistente ou cobrando resposta
      - Deixe a porta aberta
    `,
    fewShotExample: `
      EXEMPLO BOM (consultoria, lead não respondeu há 5 dias):
      WhatsApp: "Oi Mariana! Faz uns dias que conversamos sobre a consultoria de marketing digital. Lembrei de você porque acabamos de publicar um case de um cliente do mesmo segmento que o seu que triplicou as vendas online em 3 meses. Se ainda fizer sentido pra você, posso te mostrar como fizemos. Sem compromisso!"
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
      Crie uma mensagem convidando o lead para uma visita/consulta.
      - Mencione o interesse demonstrado nas respostas
      - Explique O QUE o lead vai ver/experimentar na visita
      - Ofereça flexibilidade de horários com opções concretas
      - Destaque que é sem compromisso
      - Se a empresa tem diferenciais visíveis, mencione-os
    `,
    fewShotExample: `
      EXEMPLO BOM (clínica estética, lead interessada em botox):
      WhatsApp: "Oi Renata! Que tal conhecer a clínica pessoalmente? Na avaliação, a Dra. Ana vai analisar seu caso e te mostrar simulações do resultado. É gratuito e sem compromisso. Tenho horários quinta de manhã ou sexta à tarde. Qual fica melhor pra você?"
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
      Crie uma mensagem com oferta especial personalizada.
      - Baseie a oferta nas NECESSIDADES identificadas nas respostas
      - Se a empresa tem produtos com preço, mencione o produto específico com desconto
      - Crie urgência SUTIL (prazo limitado, vagas limitadas)
      - Destaque o VALOR/BENEFÍCIO, não só o desconto
      - Faça o lead sentir que a oferta foi preparada ESPECIALMENTE pra ele
    `,
    fewShotExample: `
      EXEMPLO BOM (escola de música, lead quer aprender violão):
      WhatsApp: "Oi Thiago! Preparei algo especial pra você: essa semana estou com 3 vagas pra aula experimental de violão com o professor Ricardo, que é especialista em ensinar iniciantes. A primeira aula é por nossa conta. Se gostar, o pacote mensal sai com 15% de desconto. Quer reservar sua vaga?"
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
  try {
    
    const firstName = context.name.split(' ')[0];
    const formattedAnswers = formatAnswersForPrompt(context.answers);
    const businessInfo = formatBusinessContext(context.businessContext);
    
    const prompt = `Voce e um especialista em comunicacao e vendas consultivas. Sua missao e escrever mensagens EXCEPCIONAIS que geram resultado real.

REGRAS FUNDAMENTAIS:
1. As mensagens DEVEM parecer escritas por um HUMANO REAL - nunca por IA ou sistema
2. ANALISE profundamente as respostas do formulario para personalizar cada detalhe
3. Use linguagem natural brasileira (coloquial mas profissional)
4. Seja ESPECIFICO - mencione detalhes concretos das respostas e da empresa
5. NAO use emojis de nenhum tipo (problemas de encoding no wa.me)
6. NAO use frases genericas corporativas ("sua opiniao e importante", "agradecemos o contato")
7. Seja BREVE no WhatsApp (maximo 4 frases curtas) e mais detalhado no email
8. Cada mensagem deve ter um OBJETIVO CLARO e um CALL-TO-ACTION especifico
9. Adapte o tom ao tipo de negocio (clinica = mais cuidadoso, restaurante = mais descontraido, etc)

${businessInfo ? `SOBRE A EMPRESA QUE ESTA ENVIANDO A MENSAGEM:
${businessInfo}

IMPORTANTE: Use essas informacoes para adaptar o tom, mencionar produtos/servicos relevantes e demonstrar conhecimento do negocio. A mensagem deve soar como se fosse escrita por alguem dessa empresa.
` : ''}
DADOS DO CLIENTE/LEAD:
- Nome completo: ${context.name} (primeiro nome: ${firstName})
- Tipo: ${context.type === 'nps' ? 'Cliente que respondeu pesquisa de satisfacao (NPS)' : 'Lead interessado que preencheu formulario'}
${context.score !== undefined ? `- Nota NPS: ${context.score}/10 (${context.score >= 9 ? 'PROMOTOR - muito satisfeito' : context.score >= 7 ? 'NEUTRO - satisfeito mas nao encantado' : context.score >= 4 ? 'DETRATOR - insatisfeito' : 'DETRATOR CRITICO - muito insatisfeito'})` : ''}
${context.status ? `- Status atual: ${context.status}` : ''}
${context.leadStatus ? `- Status do lead no funil: ${context.leadStatus}` : ''}
${context.value ? `- Valor estimado da oportunidade: R$ ${context.value.toLocaleString('pt-BR')}` : ''}
${context.comment ? `- Comentario/feedback do cliente: "${context.comment}"` : '- Sem comentario adicional'}
${context.daysSinceLastContact ? `- Dias desde ultimo contato: ${context.daysSinceLastContact} dias` : ''}

RESPOSTAS DO FORMULARIO (ANALISE COM ATENCAO - cada resposta revela uma necessidade ou preferencia):
${formattedAnswers}

TIPO DE MENSAGEM SOLICITADA: ${messageType.title}
OBJETIVO: ${messageType.description}

INSTRUCOES ESPECIFICAS PARA ESTE TIPO:
${messageType.promptInstructions}

EXEMPLOS DE REFERENCIA (adapte ao contexto real, NAO copie):
${messageType.fewShotExample}

FORMATO DE RESPOSTA (responda EXATAMENTE neste formato, sem markdown):
---WHATSAPP---
[Mensagem para WhatsApp - maximo 4 frases curtas, tom conversacional, direto ao ponto]
---EMAIL_ASSUNTO---
[Assunto do email - curto, pessoal, que gere curiosidade - maximo 8 palavras]
---EMAIL_CORPO---
[Corpo do email - mais detalhado que WhatsApp, mas ainda pessoal e humanizado. Inclua saudacao, corpo e despedida. 3-4 paragrafos curtos.]

LEMBRE-SE: ${firstName} deve sentir que esta recebendo uma mensagem de uma pessoa real que REALMENTE leu suas respostas, entende suas necessidades e se importa em ajudar.`;

    const response = await callGeminiAPI(prompt);
    
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
  const companyName = context.businessContext?.companyName || 'nossa empresa';
  
  const templates: Record<string, { whatsapp: string; emailSubject: string; emailBody: string }> = {
    gratitude: {
      whatsapp: `Oi ${firstName}! Vi sua avaliação e fiquei muito feliz! Obrigado de coração pelo feedback positivo. A gente se esforça muito e é muito bom saber que faz diferença.`,
      emailSubject: `${firstName}, muito obrigado!`,
      emailBody: `Oi ${firstName},\n\nVi sua avaliação e queria te agradecer pessoalmente. Feedback assim faz o nosso dia!\n\nObrigado por confiar na ${companyName}.\n\nAbraço!`
    },
    referral: {
      whatsapp: `Oi ${firstName}! Que bom que você gostou do nosso trabalho! Se você conhecer alguém que também poderia gostar, pode indicar. Vou cuidar bem, prometo!`,
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
    if (!type.applicableTo.includes(context.type) && !type.applicableTo.includes('both')) {
      return;
    }
    
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
    console.error('Tipo de mensagem nao encontrado:', messageTypeId);
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
