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
  if (bc.businessType) parts.push(`Tipo de negocio: ${bc.businessType}`);
  if (bc.businessDescription) parts.push(`Descricao: ${bc.businessDescription}`);
  if (bc.targetAudience) parts.push(`Publico-alvo: ${bc.targetAudience}`);
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
      Crie uma mensagem de agradecimento genuino e caloroso.
      - Agradeca pela nota alta de forma natural e especifica
      - Se houver comentario, CITE uma parte dele mostrando que leu com atencao
      - Demonstre que o feedback impactou a equipe emocionalmente
      - Conecte o elogio a algo concreto que a empresa faz (use os diferenciais)
      - Termine reafirmando o compromisso de manter a qualidade
      - NAO use frases genericas como "sua opiniao e muito importante"
    `,
    fewShotExample: `
      EXEMPLO BOM (clinica odontologica, nota 10, comentario "atendimento excelente"):
      WhatsApp: "Oi Maria! Li sua avaliacao agora e confesso que fiquei emocionada. Quando voce disse que o atendimento foi excelente, mostrei pra toda equipe e todo mundo ficou radiante. A gente se dedica muito pra que cada paciente se sinta acolhido, e saber que voce percebeu isso faz tudo valer a pena. Pode ter certeza que vamos continuar cuidando de voce com o mesmo carinho. Obrigada de coracao!"
      
      EXEMPLO RUIM: "Oi Maria! Obrigado pela sua avaliacao! Sua opiniao e muito importante para nos. Esperamos continuar atendendo suas expectativas."
    `
  },
  {
    id: 'referral',
    title: 'Pedido de Indicacao',
    description: 'Solicite indicacoes de forma natural',
    icon: '👥',
    tone: 'friendly',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem pedindo indicacao de forma sutil e natural.
      - Comece referenciando algo especifico do feedback positivo
      - Faca a transicao para o pedido de indicacao de forma organica
      - Explique POR QUE a indicacao e valiosa (ex: "pessoas como voce costumam ter amigos com necessidades parecidas")
      - Ofereca algo concreto: "vou cuidar da pessoa como cuido de voce"
      - Se a empresa tiver produtos/servicos especificos, mencione qual seria ideal para indicados
      - NAO pareca desesperado por clientes
    `,
    fewShotExample: `
      EXEMPLO BOM (restaurante, nota 10):
      WhatsApp: "Oi Carlos! Que bom que voce curtiu a experiencia no Boteco. Sabe o que eu percebo? Clientes que amam nosso chopp artesanal geralmente tem amigos que tambem curtem uma boa gastronomia. Se voce tiver alguem que ia gostar de conhecer, me manda o contato que eu cuido pessoalmente da reserva e garanto uma experiencia especial. Pode confiar!"
    `
  },
  {
    id: 'google_review',
    title: 'Solicitar Avaliacao Google',
    description: 'Peca avaliacao publica',
    icon: '⭐',
    tone: 'friendly',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem pedindo avaliacao no Google de forma natural.
      - Agradeca pelo feedback positivo de forma especifica
      - Explique que avaliacoes no Google ajudam OUTRAS PESSOAS a encontrar o servico
      - Faca o cliente sentir que esta ajudando outros, nao a empresa
      - Mencione que leva menos de 1 minuto
      - NAO seja insistente ou use "por favor" demais
    `,
    fewShotExample: `
      EXEMPLO BOM (clinica estetica, nota 9):
      WhatsApp: "Oi Ana! Fiquei feliz com sua avaliacao. Sabia que muitas pacientes novas nos encontram pelo Google? Se voce puder deixar uma avaliacaozinha la, vai ajudar outras mulheres que estao procurando um lugar de confianca pra cuidar da pele. E rapido, menos de 1 minuto. Obrigada!"
    `
  },
  {
    id: 'loyalty',
    title: 'Programa de Fidelidade',
    description: 'Ofereca beneficios exclusivos',
    icon: '💎',
    tone: 'professional',
    priority: 3,
    applicableTo: ['nps'],
    npsRange: { min: 9, max: 10 },
    promptInstructions: `
      Crie uma mensagem oferecendo beneficios de fidelidade.
      - Faca o cliente se sentir parte de um grupo seleto
      - Ofereca um beneficio CONCRETO e ESPECIFICO (nao generico)
      - Se a empresa tem produtos, sugira um desconto ou upgrade em algo especifico
      - Crie exclusividade: "preparei algo especial so pra voce"
      - Mantenha tom profissional mas caloroso
    `,
    fewShotExample: `
      EXEMPLO BOM (salao de beleza, nota 10):
      WhatsApp: "Oi Fernanda! Como agradecimento pela sua confianca, preparei algo especial: na sua proxima visita, voce ganha uma hidratacao profunda cortesia da casa. E o nosso jeito de dizer obrigada por ser uma cliente tao especial. Quer agendar?"
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
      - Agradeca pela avaliacao de forma genuina (nota 7-8 e boa, nao ruim)
      - Demonstre curiosidade REAL em saber o que poderia ser melhor
      - Se houver comentario, use-o como ponto de partida
      - Faca UMA pergunta especifica e aberta (nao varias)
      - Mostre vulnerabilidade: "a gente quer muito acertar com voce"
      - NAO seja defensivo ou justifique nada
    `,
    fewShotExample: `
      EXEMPLO BOM (hotel, nota 7, comentario "quarto bom mas cafe da manha fraco"):
      WhatsApp: "Oi Roberto! Obrigado pela avaliacao. Li que o quarto agradou mas o cafe da manha nao foi aquilo tudo. Concordo que a gente pode melhorar nesse ponto. Me conta: o que voce esperava encontrar no cafe e nao encontrou? Quero muito acertar na sua proxima estadia."
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
      - Reconheca que a experiencia foi boa mas nao excelente
      - Demonstre compromisso em SUPERAR expectativas
      - Ofereca algo CONCRETO e ESPECIFICO na proxima interacao
      - Se a empresa tem produtos/servicos, sugira algo que o cliente ainda nao experimentou
      - Convide para dar outra chance com entusiasmo genuino
    `,
    fewShotExample: `
      EXEMPLO BOM (academia, nota 8):
      WhatsApp: "Oi Lucas! Vi que sua experiencia foi boa, mas sei que a gente pode fazer melhor. Que tal experimentar uma aula de funcional com o professor Marcos? Muitos alunos que estavam no mesmo ponto que voce se surpreenderam. Posso agendar uma aula cortesia pra voce essa semana?"
    `
  },
  
  // ── DETRATORES (NPS 0-6) ──
  {
    id: 'apology',
    title: 'Pedido de Desculpas',
    description: 'Demonstre empatia genuina',
    icon: '🙏',
    tone: 'empathetic',
    priority: 5,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem de desculpas genuina e empatica.
      - Reconheca ESPECIFICAMENTE o que deu errado (use o comentario do cliente)
      - Peca desculpas de forma HUMANA, nao corporativa
      - Demonstre que entende o impacto emocional no cliente
      - NAO justifique, NAO de desculpas, NAO culpe ninguem
      - Ofereca conversar pessoalmente (ligacao ou presencial)
      - Use tom de alguem que realmente se importa, como um amigo
      - Se a nota for muito baixa (0-3), demonstre urgencia e preocupacao extra
    `,
    fewShotExample: `
      EXEMPLO BOM (clinica, nota 2, comentario "esperei 2 horas"):
      WhatsApp: "Oi Patricia, li sua avaliacao e confesso que fiquei mal. Esperar 2 horas e inaceitavel, e eu entendo perfeitamente sua frustracao. Voce merecia muito mais. Quero pessoalmente entender o que aconteceu e garantir que isso nunca mais se repita. Posso te ligar amanha de manha? Preciso ouvir voce."
      
      EXEMPLO RUIM: "Oi Patricia, lamentamos o ocorrido. Estamos trabalhando para melhorar nossos processos. Agradecemos seu feedback."
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
      - Demonstre interesse GENUINO em saber o que aconteceu
      - Se houver comentario, aprofunde nele com perguntas especificas
      - Se NAO houver comentario, pergunte de forma aberta e acolhedora
      - Mostre que o feedback vai gerar ACAO CONCRETA
      - NAO seja defensivo, seja curioso e humilde
      - Ofereca ouvir sem julgamento
    `,
    fewShotExample: `
      EXEMPLO BOM (restaurante, nota 4, sem comentario):
      WhatsApp: "Oi Marcos, vi que sua experiencia no restaurante nao foi boa e isso me preocupou. Queria muito entender o que aconteceu pra poder corrigir. Foi algo no atendimento? Na comida? No ambiente? Qualquer detalhe me ajuda a melhorar de verdade. Pode falar abertamente."
    `
  },
  {
    id: 'offer_solution',
    title: 'Oferecer Solucao',
    description: 'Proponha resolver o problema',
    icon: '✅',
    tone: 'professional',
    priority: 4,
    applicableTo: ['nps'],
    npsRange: { min: 0, max: 6 },
    promptInstructions: `
      Crie uma mensagem oferecendo solucao CONCRETA para o problema.
      - Reconheca o problema mencionado de forma especifica
      - Proponha uma solucao TANGIVEL (nao promessas vagas)
      - Demonstre disposicao para ir alem do esperado
      - Se possivel, ofereca algo de cortesia como gesto de boa vontade
      - Pergunte se a solucao proposta seria justa
      - Mostre compromisso PESSOAL em resolver
    `,
    fewShotExample: `
      EXEMPLO BOM (loja, nota 3, comentario "produto veio com defeito"):
      WhatsApp: "Oi Julia, entendo sua frustracao com o produto defeituoso. Ja separei um novo pra voce, sem nenhum custo adicional. Posso enviar amanha ou, se preferir, voce pode trocar na loja e eu mesmo vou conferir antes de entregar. Alem disso, quero te dar um desconto de 20% na proxima compra como pedido de desculpas. O que acha?"
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
      - ANALISE as respostas do formulario e identifique a NECESSIDADE PRINCIPAL do lead
      - Mencione algo ESPECIFICO das respostas mostrando que leu com atencao
      - Conecte a necessidade do lead com um produto/servico da empresa
      - Proponha um proximo passo SIMPLES e de baixo comprometimento
      - Seja breve (3-4 frases no WhatsApp)
      - NAO liste todos os servicos, foque no que o lead precisa
      - Se o lead mencionou urgencia ou dor especifica, demonstre empatia
    `,
    fewShotExample: `
      EXEMPLO BOM (clinica odontologica, lead respondeu que quer clareamento e tem sensibilidade):
      WhatsApp: "Oi Camila! Vi que voce tem interesse em clareamento e mencionou sensibilidade nos dentes. Isso e super comum e a gente tem tecnicas especificas pra quem tem essa questao. Que tal agendar uma avaliacao gratuita? Assim consigo te mostrar as opcoes que funcionam melhor pro seu caso. Pode ser essa semana?"
      
      EXEMPLO RUIM: "Oi Camila! Obrigado pelo interesse! Temos diversos servicos de odontologia. Quando podemos agendar uma consulta?"
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
      - ANALISE as respostas do formulario para entender EXATAMENTE o que o lead precisa
      - Mencione o produto/servico mais adequado pelo nome e preco (se disponivel)
      - Explique POR QUE essa opcao e ideal para o caso especifico do lead
      - Se houver diferenciais da empresa, use-os como argumento
      - Crie senso de oportunidade sem ser agressivo (ex: "essa semana consigo uma condicao especial")
      - Proponha apresentar a proposta em uma conversa rapida
      - Se o lead tem valor estimado, calibre a proposta de acordo
    `,
    fewShotExample: `
      EXEMPLO BOM (academia, lead quer emagrecer, valor R$ 200):
      WhatsApp: "Oi Pedro! Analisei o que voce me contou e acho que o plano Fit Premium seria perfeito pro seu objetivo de emagrecimento. Ele inclui acompanhamento nutricional e treino personalizado, que sao os dois pilares pra resultado rapido. Essa semana consigo uma condicao especial de R$ 179/mes (normalmente R$ 220). Quer que eu te explique os detalhes?"
    `
  },
  {
    id: 'objection_handling',
    title: 'Resolucao de Objecoes',
    description: 'Antecipe e resolva duvidas',
    icon: '💡',
    tone: 'professional',
    priority: 4,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem para resolver objecoes comuns.
      - ANALISE as respostas do formulario para IDENTIFICAR possiveis objecoes
      - Se o lead mencionou preco, aborde valor vs custo
      - Se mencionou tempo, aborde praticidade
      - Se mencionou medo/inseguranca, aborde garantias e casos de sucesso
      - Use os diferenciais da empresa como argumentos
      - Seja consultivo: "entendo sua preocupacao, e por isso..."
      - NAO seja vendedor agressivo, seja um consultor que ajuda
    `,
    fewShotExample: `
      EXEMPLO BOM (escola de idiomas, lead mencionou que nao tem tempo):
      WhatsApp: "Oi Rafael! Entendo que tempo e um desafio. Por isso nosso metodo e focado em aulas de 30 minutos, 3x por semana, com horarios flexiveis. Varios alunos que trabalham em horario comercial como voce conseguem encaixar no almoco ou antes do trabalho. Quer experimentar uma aula gratuita pra ver como funciona na pratica?"
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
      - Mencione o contato anterior de forma natural e especifica
      - Referencie algo das respostas do formulario para mostrar que lembra
      - Pergunte se a necessidade ainda existe
      - Ofereca uma informacao NOVA ou um beneficio que nao foi mencionado antes
      - Se passaram muitos dias, reconheca o tempo ("faz um tempinho que conversamos")
      - NAO seja insistente ou cobrando resposta
      - Deixe a porta aberta
    `,
    fewShotExample: `
      EXEMPLO BOM (consultoria, lead nao respondeu ha 5 dias):
      WhatsApp: "Oi Mariana! Faz uns dias que conversamos sobre a consultoria de marketing digital. Lembrei de voce porque acabamos de publicar um case de um cliente do mesmo segmento que o seu que triplicou as vendas online em 3 meses. Se ainda fizer sentido pra voce, posso te mostrar como fizemos. Sem compromisso!"
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
      - Ofereca flexibilidade de horarios com opcoes concretas
      - Destaque que e sem compromisso
      - Se a empresa tem diferenciais visiveis, mencione-os
    `,
    fewShotExample: `
      EXEMPLO BOM (clinica estetica, lead interessada em botox):
      WhatsApp: "Oi Renata! Que tal conhecer a clinica pessoalmente? Na avaliacao, a Dra. Ana vai analisar seu caso e te mostrar simulacoes do resultado. E gratuito e sem compromisso. Tenho horarios quinta de manha ou sexta a tarde. Qual fica melhor pra voce?"
    `
  },
  {
    id: 'special_offer',
    title: 'Oferta Especial',
    description: 'Apresente condicao exclusiva',
    icon: '🎁',
    tone: 'enthusiastic',
    priority: 3,
    applicableTo: ['lead'],
    promptInstructions: `
      Crie uma mensagem com oferta especial personalizada.
      - Baseie a oferta nas NECESSIDADES identificadas nas respostas
      - Se a empresa tem produtos com preco, mencione o produto especifico com desconto
      - Crie urgencia SUTIL (prazo limitado, vagas limitadas)
      - Destaque o VALOR/BENEFICIO, nao so o desconto
      - Faca o lead sentir que a oferta foi preparada ESPECIALMENTE pra ele
    `,
    fewShotExample: `
      EXEMPLO BOM (escola de musica, lead quer aprender violao):
      WhatsApp: "Oi Thiago! Preparei algo especial pra voce: essa semana estou com 3 vagas pra aula experimental de violao com o professor Ricardo, que e especialista em ensinar iniciantes. A primeira aula e por nossa conta. Se gostar, o pacote mensal sai com 15% de desconto. Quer reservar sua vaga?"
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
      whatsapp: `Oi ${firstName}! Vi sua avaliacao e fiquei muito feliz! Obrigado de coracao pelo feedback positivo. A gente se esforca muito e e muito bom saber que faz diferenca.`,
      emailSubject: `${firstName}, muito obrigado!`,
      emailBody: `Oi ${firstName},\n\nVi sua avaliacao e queria te agradecer pessoalmente. Feedback assim faz o nosso dia!\n\nObrigado por confiar na ${companyName}.\n\nAbraco!`
    },
    referral: {
      whatsapp: `Oi ${firstName}! Que bom que voce gostou do nosso trabalho! Se voce conhecer alguem que tambem poderia gostar, pode indicar. Vou cuidar bem, prometo!`,
      emailSubject: `${firstName}, uma perguntinha`,
      emailBody: `Oi ${firstName},\n\nFiquei feliz com seu feedback! Se voce conhecer alguem que tambem poderia se beneficiar, ficariamos muito gratos pela indicacao.\n\nAbraco!`
    },
    apology: {
      whatsapp: `Oi ${firstName}, vi sua avaliacao e fiquei preocupado. Nao era pra ter sido assim. Queria muito entender o que aconteceu pra gente poder melhorar. Posso te ligar?`,
      emailSubject: `${firstName}, preciso falar com voce`,
      emailBody: `Oi ${firstName},\n\nVi sua avaliacao e confesso que fiquei chateado. A gente se esforca muito e quando nao da certo, doi.\n\nQueria entender o que aconteceu. Pode me contar?\n\nAbraco`
    },
    proposal: {
      whatsapp: `Oi ${firstName}! Preparei uma proposta pensando no seu caso. Quando voce tiver um tempinho, posso te apresentar?`,
      emailSubject: `${firstName}, preparei algo pra voce`,
      emailBody: `Oi ${firstName},\n\nBaseado no que voce me contou, preparei uma proposta especial.\n\nQuando podemos conversar?\n\nAbraco!`
    },
    first_contact: {
      whatsapp: `Oi ${firstName}! Vi que voce demonstrou interesse e queria me apresentar. Posso te ajudar com mais informacoes?`,
      emailSubject: `Oi ${firstName}!`,
      emailBody: `Oi ${firstName},\n\nVi que voce demonstrou interesse e queria me colocar a disposicao.\n\nPosso te ajudar com alguma duvida?\n\nAbraco!`
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
