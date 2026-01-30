// ============================================
// MESSAGE SUGGESTION ENGINE
// Sistema inteligente de sugestões de mensagens
// ============================================

export interface MessageSuggestion {
  id: string;
  type: 'recovery' | 'sales' | 'relationship' | 'followup' | 'offer';
  title: string;
  description: string;
  icon: string;
  tone: 'formal' | 'friendly' | 'empathetic' | 'enthusiastic' | 'professional';
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  priority: number; // 1-5, onde 5 é mais prioritário
}

export interface ClientContext {
  name: string;
  email: string;
  phone?: string;
  type: 'lead' | 'nps';
  
  // NPS specific
  score?: number;
  status?: string; // Promotor, Neutro, Detrator
  comment?: string;
  
  // Lead specific
  leadStatus?: string; // Novo, Em Contato, Negociação, etc
  value?: number;
  lastInteraction?: string;
  daysSinceLastContact?: number;
  answers?: any;
  
  // Context
  insightType?: 'risk' | 'opportunity' | 'sales' | 'recovery';
  priority?: 'high' | 'medium' | 'low';
}

// ============================================
// GERADOR DE SUGESTÕES POR CONTEXTO
// ============================================

export class MessageSuggestionEngine {
  
  /**
   * Gera múltiplas sugestões de mensagens baseadas no contexto do cliente
   */
  static generateSuggestions(context: ClientContext): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    
    // Determinar contexto principal
    if (context.type === 'nps') {
      suggestions.push(...this.generateNPSSuggestions(context));
    } else if (context.type === 'lead') {
      suggestions.push(...this.generateLeadSuggestions(context));
    }
    
    // Ordenar por prioridade
    return suggestions.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Sugestões para clientes NPS
   */
  private static generateNPSSuggestions(context: ClientContext): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    const firstName = context.name.split(' ')[0];
    const score = context.score || 0;
    const comment = context.comment || '';
    
    if (score <= 6) {
      // DETRATOR - Foco em recuperação
      
      // 1. Pedido de desculpas empático
      suggestions.push({
        id: 'detractor_apology',
        type: 'recovery',
        title: 'Pedido de Desculpas Empático',
        description: 'Demonstre empatia e assuma responsabilidade',
        icon: '🙏',
        tone: 'empathetic',
        priority: 5,
        whatsappMessage: `${firstName}, lamento muito que sua experiência conosco não tenha sido positiva. Isso não reflete o padrão que buscamos. Gostaria de entender melhor o que aconteceu para que possamos corrigir. Podemos conversar?`,
        emailSubject: `${firstName}, pedimos desculpas pela experiência`,
        emailBody: `Olá ${context.name},\n\nLamento profundamente que sua experiência conosco não tenha atendido suas expectativas (nota ${score}).\n\n${comment ? `Li seu comentário: "${comment}"\n\n` : ''}Assumo total responsabilidade e gostaria muito de entender em detalhes o que aconteceu. Sua satisfação é nossa prioridade máxima.\n\nPodemos agendar uma conversa para resolvermos isso?\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Investigação do problema
      suggestions.push({
        id: 'detractor_investigation',
        type: 'recovery',
        title: 'Investigação Detalhada',
        description: 'Entenda profundamente o problema específico',
        icon: '🔍',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, vi que você avaliou sua experiência com nota ${score}. Para melhorarmos, preciso entender exatamente o que não funcionou. Você pode me contar mais sobre o que aconteceu?`,
        emailSubject: `${firstName}, queremos entender o que aconteceu`,
        emailBody: `Olá ${context.name},\n\nNotei sua avaliação (nota ${score}) e gostaria de entender melhor os pontos específicos que causaram insatisfação.\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Poderia me ajudar respondendo:\n\n• Qual foi o principal problema?\n• Em que momento isso aconteceu?\n• Como esperava que fosse?\n• O que podemos fazer para corrigir?\n\nSeu feedback detalhado é essencial para melhorarmos.\n\nAtenciosamente,\nEquipe`
      });
      
      // 3. Oferta de compensação
      suggestions.push({
        id: 'detractor_compensation',
        type: 'offer',
        title: 'Oferta de Compensação',
        description: 'Ofereça algo concreto para recuperar a confiança',
        icon: '🎁',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, lamento pela experiência negativa (nota ${score}). Como forma de compensação e para reconquistar sua confiança, gostaria de oferecer [BENEFÍCIO ESPECÍFICO]. Podemos conversar sobre isso?`,
        emailSubject: `${firstName}, queremos reconquistar sua confiança`,
        emailBody: `Olá ${context.name},\n\nLamento profundamente pela experiência que resultou na nota ${score}.\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Como forma de compensação e para demonstrar nosso compromisso, gostaria de oferecer:\n\n• [DESCREVA O BENEFÍCIO/COMPENSAÇÃO]\n• [PRAZO DE VALIDADE]\n• [CONDIÇÕES, SE HOUVER]\n\nAlém disso, implementamos melhorias para que isso não se repita.\n\nPodemos conversar?\n\nAtenciosamente,\nEquipe`
      });
      
      // 4. Convite para nova experiência
      suggestions.push({
        id: 'detractor_retry',
        type: 'recovery',
        title: 'Convite para Nova Experiência',
        description: 'Ofereça uma segunda chance com garantias',
        icon: '🔄',
        tone: 'enthusiastic',
        priority: 3,
        whatsappMessage: `${firstName}, sei que sua experiência não foi boa (nota ${score}), mas gostaria de te oferecer uma nova oportunidade. Fizemos melhorias e quero pessoalmente garantir que desta vez seja excepcional. Topas?`,
        emailSubject: `${firstName}, uma nova oportunidade`,
        emailBody: `Olá ${context.name},\n\nSei que sua experiência anterior não foi satisfatória (nota ${score}).\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Desde então, implementamos várias melhorias e gostaria de te oferecer uma nova experiência, desta vez com:\n\n• Acompanhamento personalizado\n• Garantia de satisfação\n• Atenção prioritária\n\nQuero pessoalmente garantir que você tenha uma experiência excepcional.\n\nPodemos tentar novamente?\n\nAtenciosamente,\nEquipe`
      });
      
    } else if (score >= 7 && score <= 8) {
      // NEUTRO/PASSIVO - Foco em melhorar experiência
      
      // 1. Buscar feedback específico
      suggestions.push({
        id: 'passive_feedback',
        type: 'followup',
        title: 'Buscar Feedback Específico',
        description: 'Entenda o que falta para ser excelente',
        icon: '💬',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: `Oi ${firstName}! Obrigado pela nota ${score}! Queremos ir além e tornar sua experiência perfeita. O que poderíamos fazer para merecer um 10?`,
        emailSubject: `${firstName}, como podemos chegar ao 10?`,
        emailBody: `Olá ${context.name},\n\nAgradecemos sua avaliação (nota ${score})!\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Queremos transformar sua experiência em algo excepcional. Poderia nos ajudar respondendo:\n\n• O que mais te agradou?\n• O que faltou para ser perfeito?\n• Há algo específico que gostaria de ver?\n\nSeu feedback nos ajuda a evoluir!\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Oferta de upgrade
      suggestions.push({
        id: 'passive_upgrade',
        type: 'offer',
        title: 'Oferta de Upgrade',
        description: 'Surpreenda com algo a mais',
        icon: '⭐',
        tone: 'enthusiastic',
        priority: 3,
        whatsappMessage: `${firstName}, vi sua nota ${score} e quero te surpreender! Preparei uma oferta especial para você experimentar [RECURSO/BENEFÍCIO PREMIUM]. Posso te contar mais?`,
        emailSubject: `${firstName}, uma surpresa especial para você!`,
        emailBody: `Olá ${context.name},\n\nObrigado pela nota ${score}! Queremos superar suas expectativas.\n\n${comment ? `Considerando: "${comment}"\n\n` : ''}Preparei algo especial:\n\n• [DESCREVA O UPGRADE/BENEFÍCIO]\n• [PRAZO/CONDIÇÕES]\n• [VALOR AGREGADO]\n\nQueremos que você experimente o melhor que temos a oferecer!\n\nInteresse?\n\nAtenciosamente,\nEquipe`
      });
      
      // 3. Construção de relacionamento
      suggestions.push({
        id: 'passive_relationship',
        type: 'relationship',
        title: 'Construção de Relacionamento',
        description: 'Aproxime-se e crie vínculo',
        icon: '🤝',
        tone: 'friendly',
        priority: 3,
        whatsappMessage: `${firstName}, obrigado pela nota ${score}! Gostaria de manter contato e compartilhar novidades e dicas exclusivas. Você se interessa?`,
        emailSubject: `${firstName}, vamos nos conectar!`,
        emailBody: `Olá ${context.name},\n\nAgradecemos sua avaliação (nota ${score})!\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Gostaríamos de manter você informado sobre:\n\n• Novidades e lançamentos\n• Dicas exclusivas\n• Ofertas especiais\n• Conteúdo relevante\n\nPodemos nos conectar?\n\nAtenciosamente,\nEquipe`
      });
      
    } else {
      // PROMOTOR - Foco em fidelização e indicações
      
      // 1. Agradecimento caloroso
      suggestions.push({
        id: 'promoter_thanks',
        type: 'relationship',
        title: 'Agradecimento Caloroso',
        description: 'Celebre o feedback positivo',
        icon: '🎉',
        tone: 'enthusiastic',
        priority: 5,
        whatsappMessage: `${firstName}, muito obrigado pela nota ${score}! 🎉 Ficamos extremamente felizes em saber que você está satisfeito! Clientes como você são a razão do nosso trabalho!`,
        emailSubject: `${firstName}, você é incrível! 🎉`,
        emailBody: `Olá ${context.name},\n\nQue alegria receber sua nota ${score}! 🎉\n\n${comment ? `Adoramos ler: "${comment}"\n\n` : ''}Clientes como você são a razão pela qual fazemos o que fazemos. Seu feedback nos motiva a continuar melhorando cada dia.\n\nMuito obrigado por confiar em nós!\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Pedido de indicação
      suggestions.push({
        id: 'promoter_referral',
        type: 'sales',
        title: 'Pedido de Indicação',
        description: 'Solicite indicações de forma natural',
        icon: '👥',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: `${firstName}, muito obrigado pela nota ${score}! 😊 Você conhece alguém que também poderia se beneficiar dos nossos serviços? Ficaríamos gratos por uma indicação!`,
        emailSubject: `${firstName}, compartilhe a experiência!`,
        emailBody: `Olá ${context.name},\n\nMuito obrigado pela nota ${score}!\n\n${comment ? `Adoramos: "${comment}"\n\n` : ''}Se você conhece alguém que também poderia se beneficiar dos nossos serviços, ficaríamos muito gratos por uma indicação.\n\nComo agradecimento, oferecemos [BENEFÍCIO PARA INDICADOR E INDICADO].\n\nCompartilhe a experiência!\n\nAtenciosamente,\nEquipe`
      });
      
      // 3. Avaliação no Google
      suggestions.push({
        id: 'promoter_google_review',
        type: 'relationship',
        title: 'Solicitar Avaliação Google',
        description: 'Peça avaliação pública',
        icon: '⭐',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: `${firstName}, muito obrigado pela nota ${score}! 😊 Você poderia nos ajudar deixando uma avaliação no Google? Isso ajuda outras pessoas a nos conhecerem! [LINK]`,
        emailSubject: `${firstName}, compartilhe no Google!`,
        emailBody: `Olá ${context.name},\n\nFicamos muito felizes com sua nota ${score}!\n\n${comment ? `Adoramos: "${comment}"\n\n` : ''}Você poderia nos ajudar compartilhando sua experiência no Google? Sua avaliação ajuda outras pessoas a nos conhecerem.\n\nClique aqui: [LINK DO GOOGLE BUSINESS]\n\nMuito obrigado!\n\nAtenciosamente,\nEquipe`
      });
      
      // 4. Programa de fidelidade
      suggestions.push({
        id: 'promoter_loyalty',
        type: 'offer',
        title: 'Programa de Fidelidade',
        description: 'Ofereça benefícios exclusivos',
        icon: '💎',
        tone: 'professional',
        priority: 3,
        whatsappMessage: `${firstName}, obrigado pela nota ${score}! Como cliente especial, gostaria de te convidar para nosso programa de benefícios exclusivos. Interesse?`,
        emailSubject: `${firstName}, benefícios exclusivos para você!`,
        emailBody: `Olá ${context.name},\n\nObrigado pela nota ${score}! Clientes como você merecem o melhor.\n\n${comment ? `Sobre: "${comment}"\n\n` : ''}Gostaríamos de te convidar para nosso programa de benefícios exclusivos:\n\n• [BENEFÍCIO 1]\n• [BENEFÍCIO 2]\n• [BENEFÍCIO 3]\n• Atendimento prioritário\n\nQuer fazer parte?\n\nAtenciosamente,\nEquipe`
      });
    }
    
    return suggestions;
  }
  
  /**
   * Sugestões para leads
   */
  private static generateLeadSuggestions(context: ClientContext): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    const firstName = context.name.split(' ')[0];
    const value = context.value || 0;
    const days = context.daysSinceLastContact || 0;
    const status = context.leadStatus || '';
    
    // Determinar contexto do lead
    const isHighValue = value >= 1000;
    const isStale = days > 7;
    const isNegotiating = status === 'Negociação';
    const isNew = status === 'Novo';
    
    if (context.insightType === 'sales' || isNew) {
      // VENDAS - Foco em conversão
      
      // 1. Apresentação de proposta
      suggestions.push({
        id: 'sales_proposal',
        type: 'sales',
        title: 'Apresentação de Proposta',
        description: 'Apresente solução personalizada',
        icon: '📊',
        tone: 'professional',
        priority: 5,
        whatsappMessage: `Olá ${firstName}! Analisei suas necessidades e preparei uma proposta personalizada ${isHighValue ? `para o projeto de R$ ${value.toLocaleString('pt-BR')}` : ''}. Podemos agendar uma apresentação?`,
        emailSubject: `${firstName}, proposta personalizada pronta!`,
        emailBody: `Olá ${context.name},\n\nAnalisei cuidadosamente suas necessidades e preparei uma proposta personalizada.\n\n${isHighValue ? `Para o projeto estimado em R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ` : ''}A solução inclui:\n\n• [BENEFÍCIO 1]\n• [BENEFÍCIO 2]\n• [BENEFÍCIO 3]\n• ROI estimado: [VALOR]\n\nPodemos agendar uma apresentação?\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Cases de sucesso
      suggestions.push({
        id: 'sales_case_study',
        type: 'sales',
        title: 'Compartilhar Cases de Sucesso',
        description: 'Mostre resultados reais',
        icon: '🏆',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, gostaria de compartilhar alguns cases de clientes similares que tiveram ótimos resultados. Posso te enviar?`,
        emailSubject: `${firstName}, veja resultados reais`,
        emailBody: `Olá ${context.name},\n\nPensei que você gostaria de conhecer casos de sucesso de clientes similares:\n\n**Case 1: [Cliente/Setor]**\n• Desafio: [Problema]\n• Solução: [O que fizemos]\n• Resultado: [Números]\n\n**Case 2: [Cliente/Setor]**\n• Desafio: [Problema]\n• Solução: [O que fizemos]\n• Resultado: [Números]\n\nPodemos conversar sobre como replicar esses resultados?\n\nAtenciosamente,\nEquipe`
      });
      
      // 3. Senso de urgência
      suggestions.push({
        id: 'sales_urgency',
        type: 'sales',
        title: 'Criar Senso de Urgência',
        description: 'Oferta com prazo limitado',
        icon: '⏰',
        tone: 'enthusiastic',
        priority: 4,
        whatsappMessage: `${firstName}, tenho uma oportunidade especial com condições diferenciadas, mas válida apenas até [DATA]. ${isHighValue ? `Para o projeto de R$ ${value.toLocaleString('pt-BR')}, ` : ''}Podemos conversar hoje?`,
        emailSubject: `${firstName}, oportunidade por tempo limitado!`,
        emailBody: `Olá ${context.name},\n\nTenho uma oportunidade especial para você:\n\n${isHighValue ? `Para o projeto de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ` : ''}Condições especiais:\n\n• [BENEFÍCIO/DESCONTO 1]\n• [BENEFÍCIO/DESCONTO 2]\n• [BENEFÍCIO/DESCONTO 3]\n\n⏰ Válido até: [DATA]\n\nVamos aproveitar?\n\nAtenciosamente,\nEquipe`
      });
      
      // 4. Demonstração/Trial
      suggestions.push({
        id: 'sales_demo',
        type: 'sales',
        title: 'Oferecer Demonstração',
        description: 'Deixe o cliente experimentar',
        icon: '🎯',
        tone: 'friendly',
        priority: 3,
        whatsappMessage: `${firstName}, que tal experimentar antes de decidir? Posso te oferecer uma demonstração/período de teste gratuito. Quando você tem disponibilidade?`,
        emailSubject: `${firstName}, experimente gratuitamente!`,
        emailBody: `Olá ${context.name},\n\nQue tal experimentar nossa solução antes de tomar a decisão?\n\nOfereço:\n\n• Demonstração personalizada (30min)\n• OU Período de teste gratuito ([X] dias)\n• Suporte completo durante o teste\n• Sem compromisso\n\nQuando você tem disponibilidade?\n\nAtenciosamente,\nEquipe`
      });
      
    } else if (context.insightType === 'opportunity' || isNegotiating) {
      // OPORTUNIDADE - Foco em fechar negócio
      
      // 1. Proposta final
      suggestions.push({
        id: 'opportunity_final_proposal',
        type: 'sales',
        title: 'Proposta Final',
        description: 'Apresente a melhor oferta',
        icon: '🎯',
        tone: 'professional',
        priority: 5,
        whatsappMessage: `${firstName}, preparei uma proposta final ${isHighValue ? `para o projeto de R$ ${value.toLocaleString('pt-BR')}` : ''} com as melhores condições possíveis. Podemos fechar hoje?`,
        emailSubject: `${firstName}, proposta final - melhores condições`,
        emailBody: `Olá ${context.name},\n\nPreparei uma proposta final com as melhores condições:\n\n${isHighValue ? `**Valor do Projeto:** R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` : ''}**Condições:**\n• [CONDIÇÃO DE PAGAMENTO]\n• [BENEFÍCIOS INCLUSOS]\n• [GARANTIAS]\n• [PRAZO DE ENTREGA]\n\n**Bônus se fecharmos hoje:**\n• [BÔNUS 1]\n• [BÔNUS 2]\n\nVamos fechar?\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Resolução de objeções
      suggestions.push({
        id: 'opportunity_objections',
        type: 'sales',
        title: 'Resolução de Objeções',
        description: 'Antecipe e resolva dúvidas',
        icon: '💡',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, imagino que você possa ter algumas dúvidas antes de decidir. Posso esclarecer qualquer ponto? Estou aqui para ajudar!`,
        emailSubject: `${firstName}, vamos esclarecer suas dúvidas?`,
        emailBody: `Olá ${context.name},\n\nEntendo que uma decisão como essa requer análise cuidadosa.\n\nAs dúvidas mais comuns que nossos clientes têm:\n\n**1. Sobre o investimento:**\n[RESPOSTA]\n\n**2. Sobre o prazo:**\n[RESPOSTA]\n\n**3. Sobre os resultados:**\n[RESPOSTA]\n\n**4. Sobre o suporte:**\n[RESPOSTA]\n\nQue outras dúvidas você tem?\n\nAtenciosamente,\nEquipe`
      });
      
    } else if (context.insightType === 'risk' || isStale) {
      // RISCO - Foco em reativação
      
      // 1. Reativação amigável
      suggestions.push({
        id: 'risk_reactivation',
        type: 'followup',
        title: 'Reativação Amigável',
        description: 'Retome o contato de forma leve',
        icon: '👋',
        tone: 'friendly',
        priority: 5,
        whatsappMessage: `Oi ${firstName}! Faz ${days} dias que conversamos. Ainda tem interesse ${isHighValue ? `no projeto de R$ ${value.toLocaleString('pt-BR')}` : 'na nossa solução'}? Como posso ajudar?`,
        emailSubject: `${firstName}, vamos retomar?`,
        emailBody: `Olá ${context.name},\n\nNotei que faz ${days} dias desde nossa última conversa.\n\n${isHighValue ? `Sobre o projeto de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ` : ''}Gostaria de saber:\n\n• Ainda tem interesse?\n• Surgiu alguma dúvida?\n• Posso ajudar de alguma forma?\n• Prefere que eu entre em contato em outro momento?\n\nEstou à disposição!\n\nAtenciosamente,\nEquipe`
      });
      
      // 2. Oferta especial de reativação
      suggestions.push({
        id: 'risk_special_offer',
        type: 'offer',
        title: 'Oferta Especial de Reativação',
        description: 'Incentive a retomada com benefício',
        icon: '🎁',
        tone: 'enthusiastic',
        priority: 4,
        whatsappMessage: `${firstName}, preparei uma condição especial para você! ${isHighValue ? `Para o projeto de R$ ${value.toLocaleString('pt-BR')}, ` : ''}Gostaria de retomar nossa conversa?`,
        emailSubject: `${firstName}, condição especial para você!`,
        emailBody: `Olá ${context.name},\n\nPensando em você, preparei uma condição especial:\n\n${isHighValue ? `**Projeto:** R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` : ''}**Oferta Especial:**\n• [BENEFÍCIO/DESCONTO 1]\n• [BENEFÍCIO/DESCONTO 2]\n• [PRAZO DIFERENCIADO]\n\n⏰ Válido até: [DATA]\n\nVamos retomar?\n\nAtenciosamente,\nEquipe`
      });
    }
    
    return suggestions;
  }
}

// ============================================
// HELPER: Obter sugestões formatadas
// ============================================

export function getMessageSuggestions(context: ClientContext): MessageSuggestion[] {
  return MessageSuggestionEngine.generateSuggestions(context);
}