// Message Themes for CustomerJourney component

interface MessageTheme {
  id: string;
  name: string;
  icon: string;
  whatsappTemplate: (name: string, comment?: string) => string;
  emailTemplate: (name: string, comment?: string) => { subject: string; body: string };
  description: string;
}

export const MESSAGE_THEMES: MessageTheme[] = [
  {
    id: 'recovery',
    name: 'Recuperação de Detrator',
    icon: '🔧',
    description: 'Para clientes insatisfeitos que precisam de atenção urgente',
    whatsappTemplate: (name, comment) => 
      `Olá ${name}! Notamos que sua experiência conosco não foi a ideal. Gostaríamos muito de entender o que aconteceu e como podemos melhorar. Podemos conversar?`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, queremos melhorar sua experiência`,
      body: `Olá ${name},\n\nNotamos que sua experiência recente conosco não atendeu suas expectativas, e isso nos preocupa muito.\n\n${comment ? `Vimos seu comentário: "${comment}"\n\n` : ''}Gostaríamos de entender melhor o que aconteceu e encontrar uma solução para você. Sua satisfação é nossa prioridade.\n\nPodemos agendar uma conversa?\n\nAtenciosamente,\nEquipe`
    })
  },
  {
    id: 'thanks_promoter',
    name: 'Agradecimento a Promotor',
    icon: '🎉',
    description: 'Para clientes satisfeitos - solicite indicações',
    whatsappTemplate: (name, comment) =>
      `${name}, muito obrigado pelo seu feedback positivo! 😊 Ficamos muito felizes em saber que você está satisfeito. Você conhece alguém que poderia se beneficiar dos nossos serviços?`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, obrigado por ser nosso promotor!`,
      body: `Olá ${name},\n\nQueremos agradecer imensamente pelo seu feedback positivo! Clientes como você são a razão do nosso sucesso.\n\n${comment ? `Adoramos ler: "${comment}"\n\n` : ''}Se você conhece alguém que poderia se beneficiar dos nossos serviços, ficaríamos muito gratos por uma indicação!\n\nContinue contando conosco!\n\nAtenciosamente,\nEquipe`
    })
  },
  {
    id: 'followup_neutral',
    name: 'Follow-up de Passivo',
    icon: '💬',
    description: 'Para clientes neutros - busque feedback específico',
    whatsappTemplate: (name, comment) =>
      `Oi ${name}! Obrigado pelo seu feedback. Queremos saber: o que poderíamos fazer para tornar sua experiência ainda melhor?`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, como podemos surpreender você?`,
      body: `Olá ${name},\n\nAgradecemos seu feedback! Queremos ir além e transformar sua experiência em algo excepcional.\n\n${comment ? `Sobre seu comentário: "${comment}"\n\n` : ''}O que poderíamos fazer para superar suas expectativas?\n\nEstamos aqui para ouvir!\n\nAtenciosamente,\nEquipe`
    })
  },
  {
    id: 'special_offer',
    name: 'Oferta Especial',
    icon: '🎁',
    description: 'Ofereça benefícios exclusivos para recuperar ou fidelizar',
    whatsappTemplate: (name, comment) =>
      `${name}, preparamos algo especial para você! Como forma de agradecimento (ou para compensar sua experiência), temos uma oferta exclusiva. Posso te contar mais?`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, oferta exclusiva para você!`,
      body: `Olá ${name},\n\nPensando em você, preparamos uma oferta especial!\n\n${comment ? `Levamos em consideração seu feedback: "${comment}"\n\n` : ''}Gostaríamos de oferecer [DESCREVA A OFERTA] como forma de [agradecimento/compensação].\n\nEsta oferta é válida até [DATA]. Entre em contato para saber mais!\n\nAtenciosamente,\nEquipe`
    })
  },
  {
    id: 'feedback_request',
    name: 'Pedido de Feedback Adicional',
    icon: '📝',
    description: 'Solicite mais detalhes sobre a experiência',
    whatsappTemplate: (name, comment) =>
      `Oi ${name}! Seu feedback é muito importante para nós. Você teria alguns minutos para nos contar mais sobre sua experiência? Isso nos ajuda a melhorar continuamente!`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, conte-nos mais sobre sua experiência`,
      body: `Olá ${name},\n\nSeu feedback é extremamente valioso para nós!\n\n${comment ? `Agradecemos por compartilhar: "${comment}"\n\n` : ''}Gostaríamos de entender melhor alguns pontos:\n\n- O que mais te agradou?\n- O que poderia ser melhor?\n- Há algo específico que gostaria de ver?\n\nSuas respostas nos ajudam a evoluir constantemente.\n\nObrigado pelo seu tempo!\n\nAtenciosamente,\nEquipe`
    })
  },
  {
    id: 'google_review',
    name: 'Solicitar Avaliação Google',
    icon: '⭐',
    description: 'Peça avaliação no Google para promotores',
    whatsappTemplate: (name, comment) =>
      `${name}, ficamos muito felizes com seu feedback positivo! 😊 Você poderia nos ajudar deixando uma avaliação no Google? Isso ajuda outras pessoas a nos conhecerem! [LINK DO GOOGLE]`,
    emailTemplate: (name, comment) => ({
      subject: `${name}, compartilhe sua experiência no Google!`,
      body: `Olá ${name},\n\nFicamos muito felizes em saber que você está satisfeito com nossos serviços!\n\n${comment ? `Adoramos seu feedback: "${comment}"\n\n` : ''}Você poderia nos ajudar compartilhando sua experiência no Google? Sua avaliação ajuda outras pessoas a nos conhecerem e é muito importante para nós.\n\nClique aqui para avaliar: [LINK DO GOOGLE BUSINESS]\n\nMuito obrigado!\n\nAtenciosamente,\nEquipe`
    })
  }
];
