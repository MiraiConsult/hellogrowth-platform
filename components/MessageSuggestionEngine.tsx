// ============================================
// MESSAGE SUGGESTION ENGINE
// Sistema inteligente de sugestões de mensagens
// HUMANIZADO - Mensagens como se fossem de um funcionário real
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
  priority: number;
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
// HELPER: Extrair respostas do formulário
// ============================================

interface ExtractedAnswers {
  mainInterest?: string;
  painPoints?: string[];
  expectations?: string;
  positivePoints?: string[];
  negativePoints?: string[];
  suggestions?: string;
  budget?: string;
  timeline?: string;
  allAnswers: { question: string; answer: string }[];
}

function extractAnswersFromData(answers: any): ExtractedAnswers {
  const extracted: ExtractedAnswers = { allAnswers: [] };
  
  if (!answers || typeof answers !== 'object') return extracted;
  
  Object.entries(answers).forEach(([key, value]: [string, any]) => {
    const question = value?.question || key;
    let answer = '';
    
    if (typeof value === 'string') {
      answer = value;
    } else if (value?.value) {
      answer = String(value.value);
    } else if (value?.text) {
      answer = String(value.text);
    } else if (Array.isArray(value)) {
      answer = value.map(v => v?.text || v?.value || v).join(', ');
    } else if (typeof value === 'object' && value !== null) {
      answer = value.answer || value.response || '';
    }
    
    if (answer && answer !== 'undefined' && answer !== 'null') {
      extracted.allAnswers.push({ question: String(question), answer });
      
      const questionLower = String(question).toLowerCase();
      
      if (questionLower.includes('interesse') || questionLower.includes('serviço') || 
          questionLower.includes('produto') || questionLower.includes('procura')) {
        extracted.mainInterest = answer;
      }
      
      if (questionLower.includes('gostou') || questionLower.includes('positivo') ||
          questionLower.includes('melhor') || questionLower.includes('destaque')) {
        if (!extracted.positivePoints) extracted.positivePoints = [];
        extracted.positivePoints.push(answer);
      }
      
      if (questionLower.includes('problema') || questionLower.includes('negativo') ||
          questionLower.includes('melhorar') || questionLower.includes('ruim')) {
        if (!extracted.negativePoints) extracted.negativePoints = [];
        extracted.negativePoints.push(answer);
      }
      
      if (questionLower.includes('sugestão') || questionLower.includes('sugestao')) {
        extracted.suggestions = answer;
      }
      
      if (questionLower.includes('expectativa') || questionLower.includes('espera')) {
        extracted.expectations = answer;
      }
      
      if (questionLower.includes('orçamento') || questionLower.includes('valor')) {
        extracted.budget = answer;
      }
      
      if (questionLower.includes('prazo') || questionLower.includes('quando')) {
        extracted.timeline = answer;
      }
    }
  });
  
  return extracted;
}

// ============================================
// GERADOR DE SUGESTÕES - MENSAGENS HUMANIZADAS
// ============================================

export class MessageSuggestionEngine {
  
  static generateSuggestions(context: ClientContext): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    const extractedAnswers = extractAnswersFromData(context.answers);
    
    if (context.type === 'nps') {
      suggestions.push(...this.generateNPSSuggestions(context, extractedAnswers));
    } else if (context.type === 'lead') {
      suggestions.push(...this.generateLeadSuggestions(context, extractedAnswers));
    }
    
    return suggestions.sort((a, b) => b.priority - a.priority);
  }
  
  // ============================================
  // SUGESTÕES PARA NPS - HUMANIZADAS
  // ============================================
  
  private static generateNPSSuggestions(context: ClientContext, answers: ExtractedAnswers): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    const firstName = context.name.split(' ')[0];
    const score = context.score || 0;
    const comment = context.comment || '';
    
    const hasPositive = answers.positivePoints && answers.positivePoints.length > 0;
    const hasNegative = answers.negativePoints && answers.negativePoints.length > 0;
    const hasSuggestion = !!answers.suggestions;
    
    const positiveText = hasPositive ? answers.positivePoints![0] : '';
    const negativeText = hasNegative ? answers.negativePoints![0] : '';
    
    // ============================================
    // DETRATOR (NPS 0-6)
    // ============================================
    if (score <= 6) {
      
      // 1. Pedido de desculpas genuíno
      suggestions.push({
        id: 'detractor_apology',
        type: 'recovery',
        title: 'Pedido de Desculpas',
        description: hasNegative ? `Sobre: ${negativeText.substring(0, 40)}...` : 'Demonstre empatia genuína',
        icon: '🙏',
        tone: 'empathetic',
        priority: 5,
        whatsappMessage: hasNegative 
          ? `Oi ${firstName}, tudo bem? Vi sua avaliação e fiquei preocupado com o que você passou. Você comentou sobre "${negativeText.substring(0, 40)}..." e isso não deveria ter acontecido. Queria muito entender melhor e ver como posso resolver isso pra você. Posso te ligar?`
          : `Oi ${firstName}, vi sua avaliação e percebi que a gente não conseguiu te atender como deveria. Fico chateado com isso porque a gente se esforça muito pra fazer um bom trabalho. Queria entender o que aconteceu pra gente poder melhorar. Pode me contar?`,
        emailSubject: `${firstName}, preciso falar com você`,
        emailBody: hasNegative
          ? `Oi ${firstName},\n\nVi sua avaliação e confesso que fiquei preocupado. Você mencionou "${negativeText}" e isso me incomodou bastante.\n\n${comment ? `Li também seu comentário: "${comment}"\n\n` : ''}Não era pra ter sido assim. A gente trabalha todo dia pra oferecer o melhor e quando não consegue, dói.\n\nQueria muito conversar com você pra entender melhor o que aconteceu e ver como posso resolver. Você topa uma ligação rápida?\n\nAguardo seu retorno.\n\nAbraço`
          : `Oi ${firstName},\n\nVi sua avaliação e percebi que não conseguimos te atender como você merecia.\n\n${comment ? `Seu comentário: "${comment}"\n\n` : ''}Fico chateado porque a gente se dedica muito e quando não dá certo, a gente quer entender o porquê.\n\nPosso te ligar pra gente conversar? Quero muito ouvir você e ver o que posso fazer.\n\nAbraço`
      });
      
      // 2. Entender o problema
      suggestions.push({
        id: 'detractor_understand',
        type: 'recovery',
        title: 'Entender o Problema',
        description: 'Pergunte com interesse genuíno',
        icon: '💬',
        tone: 'empathetic',
        priority: 4,
        whatsappMessage: `${firstName}, sei que sua experiência não foi boa e queria muito entender o que aconteceu. Às vezes a gente erra sem perceber e seu feedback ajuda demais. O que foi que deu errado?`,
        emailSubject: `${firstName}, me ajuda a entender?`,
        emailBody: `Oi ${firstName},\n\nVi que sua experiência não foi das melhores e isso me preocupa.\n\n${hasNegative ? `Você mencionou: "${negativeText}"\n\n` : ''}Queria entender melhor o que aconteceu. Às vezes a gente comete erros sem perceber e o feedback de vocês é o que nos ajuda a melhorar.\n\nPode me contar mais detalhes? O que você esperava que fosse diferente?\n\nAgradeço demais se puder me ajudar com isso.\n\nAbraço`
      });
      
      // 3. Oferecer solução
      suggestions.push({
        id: 'detractor_solution',
        type: 'recovery',
        title: 'Oferecer Solução',
        description: 'Proponha resolver o problema',
        icon: '✅',
        tone: 'professional',
        priority: 4,
        whatsappMessage: hasNegative
          ? `${firstName}, sobre o que você passou com "${negativeText.substring(0, 30)}...", quero propor uma solução. Posso [DESCREVER SOLUÇÃO]? Quero muito resolver isso pra você.`
          : `${firstName}, quero resolver essa situação pra você. Posso oferecer [DESCREVER SOLUÇÃO]. O que você acha? Me diz o que seria justo.`,
        emailSubject: `${firstName}, quero resolver isso`,
        emailBody: `Oi ${firstName},\n\nPensei bastante no que aconteceu e quero propor uma solução.\n\n${hasNegative ? `Sobre "${negativeText}", ` : ''}o que acha de:\n\n• [SOLUÇÃO 1]\n• [SOLUÇÃO 2]\n\nSei que não vai apagar o que aconteceu, mas quero fazer o possível pra reconquistar sua confiança.\n\nMe diz o que você acha. Se tiver outra sugestão, estou aberto.\n\nAbraço`
      });
      
      // 4. Se tiver sugestão do cliente
      if (hasSuggestion) {
        suggestions.push({
          id: 'detractor_suggestion_action',
          type: 'recovery',
          title: 'Agir na Sugestão',
          description: `Sugestão: ${answers.suggestions!.substring(0, 40)}...`,
          icon: '💡',
          tone: 'professional',
          priority: 5,
          whatsappMessage: `${firstName}, li sua sugestão sobre "${answers.suggestions!.substring(0, 35)}..." e achei muito válida. Já passei pro time e vamos trabalhar nisso. Obrigado por nos ajudar a melhorar!`,
          emailSubject: `${firstName}, sua sugestão foi ouvida`,
          emailBody: `Oi ${firstName},\n\nLi sua sugestão:\n\n"${answers.suggestions}"\n\nAchei muito pertinente e já compartilhei com o time. É esse tipo de feedback que nos ajuda a evoluir.\n\nVamos trabalhar nisso e te mantenho informado do que mudar.\n\nMuito obrigado por dedicar seu tempo pra nos ajudar.\n\nAbraço`
        });
      }
      
    // ============================================
    // NEUTRO (NPS 7-8)
    // ============================================
    } else if (score >= 7 && score <= 8) {
      
      // 1. Agradecer e perguntar o que faltou
      suggestions.push({
        id: 'passive_what_missing',
        type: 'followup',
        title: 'O que Faltou?',
        description: hasPositive ? `Gostou de: ${positiveText.substring(0, 40)}...` : 'Descubra o que falta pro 10',
        icon: '💬',
        tone: 'friendly',
        priority: 5,
        whatsappMessage: hasPositive
          ? `Oi ${firstName}! Vi que você gostou de "${positiveText.substring(0, 30)}...", fico feliz! Mas me conta, o que faltou pra ser um 10? Quero muito saber como posso melhorar pra você.`
          : `Oi ${firstName}! Obrigado pela avaliação! Fiquei curioso... o que faltou pra ser um 10? Quero muito saber como posso melhorar sua experiência.`,
        emailSubject: `${firstName}, o que faltou?`,
        emailBody: hasPositive
          ? `Oi ${firstName},\n\nObrigado pela avaliação! Fico feliz que você gostou de "${positiveText}".\n\n${comment ? `Vi também seu comentário: "${comment}"\n\n` : ''}Mas fiquei curioso: o que faltou pra ser um 10?\n\nSua opinião é super importante pra gente. Qualquer detalhe ajuda!\n\nAbraço`
          : `Oi ${firstName},\n\nObrigado pela avaliação!\n\n${comment ? `Li seu comentário: "${comment}"\n\n` : ''}Fiquei pensando... o que faltou pra ser um 10? Quero muito entender como posso melhorar sua experiência.\n\nPode me contar?\n\nAbraço`
      });
      
      // 2. Oferecer algo a mais
      suggestions.push({
        id: 'passive_offer_more',
        type: 'offer',
        title: 'Oferecer Algo a Mais',
        description: 'Surpreenda o cliente',
        icon: '🎁',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: `${firstName}, obrigado pelo feedback! Quero te surpreender... que tal [BENEFÍCIO]? É por nossa conta, pra agradecer sua confiança!`,
        emailSubject: `${firstName}, tenho uma surpresa`,
        emailBody: `Oi ${firstName},\n\nObrigado pela avaliação!\n\nQuero te agradecer de um jeito especial. Preparei [BENEFÍCIO] pra você, sem custo nenhum.\n\nÉ nossa forma de dizer obrigado pela confiança.\n\nO que acha?\n\nAbraço`
      });
      
      // 3. Se tiver sugestão
      if (hasSuggestion) {
        suggestions.push({
          id: 'passive_suggestion',
          type: 'relationship',
          title: 'Agradecer Sugestão',
          description: `Sugestão: ${answers.suggestions!.substring(0, 40)}...`,
          icon: '💡',
          tone: 'friendly',
          priority: 4,
          whatsappMessage: `${firstName}, adorei sua sugestão sobre "${answers.suggestions!.substring(0, 30)}..."! Faz total sentido. Vou levar pro time, valeu demais!`,
          emailSubject: `${firstName}, sua sugestão é ótima!`,
          emailBody: `Oi ${firstName},\n\nLi sua sugestão:\n\n"${answers.suggestions}"\n\nAchei excelente! É exatamente esse tipo de ideia que nos ajuda a melhorar.\n\nJá anotei e vou discutir com o time. Obrigado por compartilhar!\n\nAbraço`
        });
      }
      
    // ============================================
    // PROMOTOR (NPS 9-10)
    // ============================================
    } else {
      
      // 1. Agradecimento caloroso
      suggestions.push({
        id: 'promoter_thanks',
        type: 'relationship',
        title: 'Agradecimento Caloroso',
        description: hasPositive ? `Destacou: ${positiveText.substring(0, 40)}...` : 'Agradeça de coração',
        icon: '🎉',
        tone: 'enthusiastic',
        priority: 5,
        whatsappMessage: hasPositive
          ? `Oi ${firstName}! Que felicidade ver sua nota ${score}! E você ainda destacou "${positiveText.substring(0, 30)}..." - isso me deixa muito feliz! Obrigado de verdade, a gente se esforça muito e é muito bom saber que faz diferença. 💚`
          : `Oi ${firstName}! Que alegria ver sua nota ${score}! Fico muito feliz em saber que conseguimos te atender bem. Obrigado de coração, isso significa muito pra gente! 💚`,
        emailSubject: `${firstName}, muito obrigado! 💚`,
        emailBody: hasPositive
          ? `Oi ${firstName},\n\nQue felicidade receber sua avaliação!\n\nVocê destacou "${positiveText}" e isso me deixou muito feliz. A gente trabalha duro todo dia e saber que faz diferença é o melhor presente.\n\n${comment ? `Seu comentário: "${comment}" - guardei aqui!\n\n` : ''}Muito obrigado pela confiança. Conte sempre com a gente!\n\nUm abraço grande`
          : `Oi ${firstName},\n\nQue alegria receber sua nota ${score}!\n\n${comment ? `Li seu comentário: "${comment}"\n\n` : ''}Fico muito feliz em saber que conseguimos te atender bem. É pra isso que a gente trabalha!\n\nMuito obrigado pela confiança.\n\nUm abraço grande`
      });
      
      // 2. Pedir indicação de forma natural
      suggestions.push({
        id: 'promoter_referral',
        type: 'sales',
        title: 'Pedido de Indicação',
        description: 'Peça de forma natural',
        icon: '👥',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: hasPositive
          ? `${firstName}, fico muito feliz que você gostou! Se você conhecer alguém que também poderia gostar de "${positiveText.substring(0, 25)}...", pode indicar! Vou cuidar bem, prometo 😊`
          : `${firstName}, que bom que você gostou! Se tiver algum amigo ou conhecido que também poderia se beneficiar, pode indicar! Vou tratar super bem, como fiz com você 😊`,
        emailSubject: `${firstName}, conhece alguém?`,
        emailBody: `Oi ${firstName},\n\nFico muito feliz com sua avaliação!\n\n${hasPositive ? `Você gostou de "${positiveText}" e ` : ''}se conhecer alguém que também poderia se beneficiar, ficarei muito grato por uma indicação.\n\nPode ser um amigo, familiar, colega... vou cuidar muito bem, como fiz com você!\n\nE se quiser, posso oferecer [BENEFÍCIO] pra você e pra pessoa que indicar.\n\nO que acha?\n\nAbraço`
      });
      
      // 3. Pedir avaliação no Google
      suggestions.push({
        id: 'promoter_google',
        type: 'relationship',
        title: 'Solicitar Avaliação Google',
        description: 'Peça de forma simpática',
        icon: '⭐',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: `${firstName}, posso te pedir um favor? Você poderia deixar essa avaliação lá no Google também? Ajuda muito a gente a ser encontrado por outras pessoas. É rapidinho! [LINK]`,
        emailSubject: `${firstName}, um favorzinho?`,
        emailBody: `Oi ${firstName},\n\nPosso te pedir um favor?\n\nSua avaliação foi incrível e ajudaria muito se você pudesse compartilhar no Google também. Isso ajuda outras pessoas a nos encontrarem.\n\nÉ bem rapidinho, só clicar aqui: [LINK DO GOOGLE]\n\nSe não puder, tudo bem! Já fico muito grato pela avaliação que você deu.\n\nAbraço`
      });
      
      // 4. Programa de fidelidade
      suggestions.push({
        id: 'promoter_loyalty',
        type: 'offer',
        title: 'Programa de Fidelidade',
        description: 'Convide para benefícios',
        icon: '💎',
        tone: 'friendly',
        priority: 3,
        whatsappMessage: `${firstName}, clientes especiais como você merecem tratamento especial! Quero te convidar pra ter alguns benefícios exclusivos. Posso te contar?`,
        emailSubject: `${firstName}, você é especial`,
        emailBody: `Oi ${firstName},\n\nClientes como você são raros e merecem um tratamento diferenciado.\n\nQuero te convidar pra fazer parte do nosso grupo de clientes especiais, com:\n\n• [BENEFÍCIO 1]\n• [BENEFÍCIO 2]\n• Atendimento prioritário\n\nO que acha? Topa?\n\nAbraço`
      });
    }
    
    return suggestions;
  }
  
  // ============================================
  // SUGESTÕES PARA LEADS - HUMANIZADAS
  // ============================================
  
  private static generateLeadSuggestions(context: ClientContext, answers: ExtractedAnswers): MessageSuggestion[] {
    const suggestions: MessageSuggestion[] = [];
    const firstName = context.name.split(' ')[0];
    const value = context.value || 0;
    const days = context.daysSinceLastContact || 0;
    const status = context.leadStatus || '';
    
    const isHighValue = value >= 1000;
    const isStale = days > 7;
    
    const hasInterest = !!answers.mainInterest;
    const hasBudget = !!answers.budget;
    const hasTimeline = !!answers.timeline;
    
    const interestText = answers.mainInterest || '';
    const budgetText = answers.budget || '';
    const timelineText = answers.timeline || '';
    
    // ============================================
    // VENDAS / LEADS NOVOS
    // ============================================
    if (context.insightType === 'sales' || status === 'Novo' || status === 'Em Contato') {
      
      // 1. Primeiro contato / Follow-up
      suggestions.push({
        id: 'sales_contact',
        type: 'sales',
        title: 'Proposta Final',
        description: hasInterest ? `Interesse: ${interestText.substring(0, 40)}...` : 'Apresente a melhor oferta',
        icon: '🎯',
        tone: 'professional',
        priority: 5,
        whatsappMessage: hasInterest
          ? `Oi ${firstName}! Vi que você tem interesse em "${interestText.substring(0, 30)}...". Preparei uma proposta bem bacana pra você. Posso te mandar?`
          : `Oi ${firstName}! Tudo bem? Preparei uma proposta pensando no seu caso. Quando você tiver um tempinho, posso te apresentar?`,
        emailSubject: `${firstName}, preparei algo pra você`,
        emailBody: hasInterest
          ? `Oi ${firstName},\n\nVi que você demonstrou interesse em "${interestText}".\n\n${hasTimeline ? `Você mencionou prazo de "${timelineText}", então ` : ''}Preparei uma proposta pensando exatamente no que você precisa.\n\n${isHighValue ? `Para o projeto de R$ ${value.toLocaleString('pt-BR')}, inclui:\n\n` : 'Inclui:\n\n'}• [ITEM 1]\n• [ITEM 2]\n• [ITEM 3]\n\nQuando você tiver um tempinho, posso te apresentar os detalhes?\n\nAbraço`
          : `Oi ${firstName},\n\nTudo bem?\n\nPreparei uma proposta pensando no seu caso. Acho que vai gostar!\n\n${isHighValue ? `Para o projeto de R$ ${value.toLocaleString('pt-BR')}, inclui:\n\n` : 'Inclui:\n\n'}• [ITEM 1]\n• [ITEM 2]\n• [ITEM 3]\n\nPosso te apresentar?\n\nAbraço`
      });
      
      // 2. Resolver objeções
      suggestions.push({
        id: 'sales_objections',
        type: 'sales',
        title: 'Resolução de Objeções',
        description: 'Antecipe dúvidas',
        icon: '💡',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, sei que decisões assim precisam de análise. Se tiver qualquer dúvida, pode me perguntar! Tô aqui pra ajudar, sem pressão.`,
        emailSubject: `${firstName}, alguma dúvida?`,
        emailBody: `Oi ${firstName},\n\nSei que uma decisão dessas precisa ser bem pensada.\n\n${hasInterest ? `Sobre "${interestText}", ` : ''}as dúvidas mais comuns são:\n\n**Sobre o investimento:**\n[RESPOSTA]\n\n**Sobre o prazo:**\n[RESPOSTA]\n\n**Sobre os resultados:**\n[RESPOSTA]\n\nSe tiver outras dúvidas, é só me falar! Tô aqui pra ajudar.\n\nAbraço`
      });
      
      // 3. Se tiver prazo mencionado
      if (hasTimeline) {
        suggestions.push({
          id: 'sales_timeline',
          type: 'sales',
          title: 'Urgência pelo Prazo',
          description: `Prazo: ${timelineText.substring(0, 40)}...`,
          icon: '⏰',
          tone: 'professional',
          priority: 5,
          whatsappMessage: `${firstName}, você mencionou que precisa pra "${timelineText.substring(0, 25)}...". Pra gente conseguir entregar no prazo, seria bom começarmos logo. Vamos fechar?`,
          emailSubject: `${firstName}, sobre o prazo`,
          emailBody: `Oi ${firstName},\n\nLembrei que você mencionou o prazo de "${timelineText}".\n\nPra garantir que a gente consiga entregar tudo certinho dentro desse prazo, seria importante começarmos o quanto antes.\n\nO que acha de fecharmos essa semana?\n\nAbraço`
        });
      }
      
    // ============================================
    // LEADS PARADOS / RISCO
    // ============================================
    } else if (context.insightType === 'risk' || isStale) {
      
      // 1. Reativação leve
      suggestions.push({
        id: 'risk_reactivation',
        type: 'followup',
        title: 'Reativação',
        description: `${days} dias sem contato`,
        icon: '👋',
        tone: 'friendly',
        priority: 5,
        whatsappMessage: hasInterest
          ? `Oi ${firstName}! Faz um tempinho que a gente conversou sobre "${interestText.substring(0, 25)}...". Ainda tá pensando nisso? Qualquer coisa, tô por aqui!`
          : `Oi ${firstName}! Sumiu! 😊 Tudo bem por aí? Lembrei de você e queria saber se ainda posso ajudar em algo.`,
        emailSubject: `${firstName}, tudo bem?`,
        emailBody: hasInterest
          ? `Oi ${firstName},\n\nFaz um tempinho que a gente conversou sobre "${interestText}".\n\nQueria saber como você tá e se ainda posso ajudar de alguma forma.\n\nSe mudou de ideia, tudo bem! Mas se ainda tiver interesse, tô por aqui.\n\nAbraço`
          : `Oi ${firstName},\n\nFaz ${days} dias que a gente conversou e queria saber como você tá.\n\nAinda posso ajudar em algo?\n\nSe não for mais o momento, sem problemas! Mas se precisar de qualquer coisa, é só chamar.\n\nAbraço`
      });
      
      // 2. Oferta especial
      suggestions.push({
        id: 'risk_offer',
        type: 'offer',
        title: 'Oferta Especial',
        description: 'Incentive a retomada',
        icon: '🎁',
        tone: 'friendly',
        priority: 4,
        whatsappMessage: hasInterest
          ? `${firstName}, lembrei de você! Sobre "${interestText.substring(0, 20)}...", consegui uma condição especial. Quer saber?`
          : `${firstName}, tava pensando em você e consegui uma condição especial. Quer saber mais?`,
        emailSubject: `${firstName}, tenho uma novidade`,
        emailBody: hasInterest
          ? `Oi ${firstName},\n\nLembrei da nossa conversa sobre "${interestText}" e consegui uma condição especial pra você:\n\n• [BENEFÍCIO 1]\n• [BENEFÍCIO 2]\n\nMas é por tempo limitado. O que acha?\n\nAbraço`
          : `Oi ${firstName},\n\nTava pensando em você e consegui uma condição especial:\n\n• [BENEFÍCIO 1]\n• [BENEFÍCIO 2]\n\nAchei que podia te interessar. O que acha?\n\nAbraço`
      });
      
      // 3. Perguntar se desistiu
      suggestions.push({
        id: 'risk_check',
        type: 'followup',
        title: 'Verificar Interesse',
        description: 'Pergunte com leveza',
        icon: '🤔',
        tone: 'friendly',
        priority: 3,
        whatsappMessage: `${firstName}, sei que a vida é corrida! Só queria saber se ainda faz sentido a gente conversar ou se você já resolveu de outra forma. Sem pressão!`,
        emailSubject: `${firstName}, posso te perguntar uma coisa?`,
        emailBody: `Oi ${firstName},\n\nSei que a vida é corrida e às vezes as prioridades mudam.\n\nQueria só saber: ainda faz sentido a gente conversar ou você já resolveu de outra forma?\n\nSem pressão nenhuma! Só pra eu saber se posso continuar te ajudando ou não.\n\nAbraço`
      });
      
    // ============================================
    // OPORTUNIDADES / NEGOCIAÇÃO
    // ============================================
    } else if (context.insightType === 'opportunity' || status === 'Negociação') {
      
      // 1. Proposta final
      suggestions.push({
        id: 'opportunity_close',
        type: 'sales',
        title: 'Fechar Negócio',
        description: isHighValue ? `Valor: R$ ${value.toLocaleString('pt-BR')}` : 'Hora de fechar!',
        icon: '🎯',
        tone: 'professional',
        priority: 5,
        whatsappMessage: hasInterest
          ? `${firstName}, sobre "${interestText.substring(0, 25)}...", preparei a proposta final com as melhores condições que consegui. Vamos fechar?`
          : `${firstName}, preparei a proposta final pra você com as melhores condições. Vamos fechar?`,
        emailSubject: `${firstName}, proposta final`,
        emailBody: hasInterest
          ? `Oi ${firstName},\n\nSobre "${interestText}", preparei a proposta final:\n\n${isHighValue ? `**Valor:** R$ ${value.toLocaleString('pt-BR')}\n\n` : ''}**Inclui:**\n• [ITEM 1]\n• [ITEM 2]\n• [ITEM 3]\n\n**Condições especiais:**\n• [CONDIÇÃO 1]\n• [CONDIÇÃO 2]\n\nÉ a melhor que consigo fazer. O que acha?\n\nAbraço`
          : `Oi ${firstName},\n\nPreparei a proposta final pra você:\n\n${isHighValue ? `**Valor:** R$ ${value.toLocaleString('pt-BR')}\n\n` : ''}**Inclui:**\n• [ITEM 1]\n• [ITEM 2]\n• [ITEM 3]\n\n**Condições especiais:**\n• [CONDIÇÃO 1]\n• [CONDIÇÃO 2]\n\nVamos fechar?\n\nAbraço`
      });
      
      // 2. Criar urgência
      suggestions.push({
        id: 'opportunity_urgency',
        type: 'sales',
        title: 'Criar Urgência',
        description: 'Incentive a decisão',
        icon: '⏰',
        tone: 'professional',
        priority: 4,
        whatsappMessage: `${firstName}, as condições que te passei são válidas até [DATA]. Depois disso não consigo garantir. Vamos resolver essa semana?`,
        emailSubject: `${firstName}, sobre as condições`,
        emailBody: `Oi ${firstName},\n\nSó pra te avisar: as condições especiais que te passei são válidas até [DATA].\n\nDepois disso, infelizmente não consigo manter os mesmos valores.\n\nSe puder me dar um retorno até lá, agradeço!\n\nAbraço`
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
