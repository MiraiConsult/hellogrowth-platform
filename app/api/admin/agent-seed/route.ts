/**
 * /api/admin/agent-seed
 * Cria as tabelas e popula a base de conhecimento do Agente IA para todos os nichos.
 * Requer header x-migration-secret: hg-agent-seed-2026
 */
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_DATA: Array<{
  niche_slug: string;
  agent_mode: 'full' | 'simple';
  section_type: string;
  title: string;
  content: string;
  position: number;
}> = [
  // ══════════════════════════════════════════════════════════════════════════
  // CLÍNICA ODONTOLÓGICA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento Odontológico',
    position: 1,
    content: `Clínicas odontológicas oferecem serviços de saúde bucal que vão desde consultas preventivas até procedimentos estéticos e reabilitadores. O mercado odontológico brasileiro é um dos maiores do mundo, com mais de 300 mil cirurgiões-dentistas registrados.

O ticket médio varia bastante por especialidade:
- Consulta e avaliação: R$ 100 a R$ 300
- Limpeza/profilaxia: R$ 150 a R$ 350
- Clareamento dental: R$ 800 a R$ 2.500
- Aparelho ortodôntico: R$ 3.000 a R$ 8.000
- Implante dentário: R$ 2.500 a R$ 6.000 por elemento
- Facetas de porcelana: R$ 1.500 a R$ 4.000 por dente
- Prótese total: R$ 2.000 a R$ 8.000

O ciclo de decisão do paciente costuma ser de 1 a 7 dias para procedimentos simples, e de 7 a 30 dias para procedimentos de alto valor. A principal barreira é o preço, seguida de medo/ansiedade e falta de tempo.`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Odontologia',
    position: 2,
    content: `**P: Vocês atendem pelo plano odontológico?**
R: Verificar com a clínica quais convênios são aceitos. Se não aceitar plano, destacar que os valores são acessíveis e há opções de parcelamento.

**P: Qual o valor da consulta?**
R: A avaliação inicial é o primeiro passo — nela o dentista examina a boca, identifica as necessidades e apresenta um plano de tratamento personalizado com os valores detalhados. Assim você sabe exatamente o que precisa e quanto vai custar.

**P: Vocês parcelam?**
R: Sim, a maioria das clínicas oferece parcelamento. Confirmar as condições específicas da clínica (cartão de crédito, boleto, financiamento próprio).

**P: Tenho medo de dentista, como funciona?**
R: É muito comum! Os dentistas são treinados para atender pacientes ansiosos. Técnicas de sedação consciente e anestesia local garantem que o procedimento seja confortável e sem dor.

**P: Quanto tempo dura o tratamento?**
R: Depende do procedimento. Uma limpeza dura 30-60 min. Implantes levam 3-6 meses (incluindo osseointegração). Aparelhos ortodônticos de 12 a 36 meses. Na avaliação, o dentista apresenta o cronograma completo.

**P: Preciso marcar consulta ou posso ir sem hora marcada?**
R: Recomendamos agendar para garantir o horário e evitar espera. O agendamento pode ser feito por WhatsApp, telefone ou online.

**P: O clareamento dental machuca?**
R: O clareamento moderno é seguro. Pode haver sensibilidade temporária nos primeiros dias, que passa naturalmente. O dentista avalia se você é candidato ideal antes de iniciar.

**P: Implante dói?**
R: O procedimento é feito com anestesia local, portanto não dói durante. Após, pode haver desconforto leve por 2-3 dias, controlado com medicação.`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Odontologia',
    position: 3,
    content: `**Objeção: "Está muito caro"**
Resposta: Entendo sua preocupação com o investimento. Saúde bucal é um investimento que evita gastos muito maiores no futuro — um dente que precisa de extração hoje pode custar muito mais em implante amanhã. Além disso, temos condições de parcelamento que cabem no seu orçamento. Posso verificar as opções disponíveis para você?

**Objeção: "Vou pensar"**
Resposta: Claro, é uma decisão importante! Posso te ajudar com alguma dúvida específica que esteja impedindo a decisão? Muitas vezes o que parece complicado se resolve com uma conversa rápida. Além disso, quanto mais cedo iniciar o tratamento, melhor o resultado e menor o custo total.

**Objeção: "Tenho medo"**
Resposta: Medo de dentista é muito mais comum do que você imagina — quase 1 em cada 3 pessoas tem essa sensação. Nossa equipe é especializada em atender pacientes ansiosos, com técnicas que tornam o tratamento confortável. Que tal marcar só uma avaliação, sem compromisso com nenhum procedimento? Você conhece a clínica e a equipe antes de decidir qualquer coisa.

**Objeção: "Não tenho tempo"**
Resposta: Temos horários flexíveis, incluindo manhã cedo, almoço e final do dia. A avaliação inicial dura apenas 30 minutos. Posso verificar qual horário se encaixa melhor na sua rotina?

**Objeção: "Quero pesquisar mais"**
Resposta: Ótimo! Pesquisar é importante. Posso te enviar informações sobre os procedimentos que você tem interesse? Assim você chega na avaliação já bem informado e pode aproveitar melhor o tempo com o dentista.

**Objeção: "Já tenho dentista"**
Resposta: Que ótimo que você cuida da saúde bucal! Muitos dos nossos pacientes vieram para uma segunda opinião ou para procedimentos específicos que o dentista anterior não realizava. Se quiser, posso apresentar nossas especialidades.`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'scripts',
    title: 'Scripts de Abordagem — Odontologia',
    position: 4,
    content: `**Script de Primeiro Contato (Lead Novo)**
"Olá, [Nome]! Vi que você demonstrou interesse em [procedimento/clínica]. Sou [nome da IA/persona] e estou aqui para ajudar! 😊 Para começar, posso te fazer algumas perguntas rápidas para entender melhor o que você precisa e apresentar as melhores opções para você?"

**Script de Qualificação**
"Ótimo! Me conta: você está buscando [procedimento específico] ou ainda está avaliando o que precisa? Tem alguma queixa específica ou é mais uma questão estética?"

**Script de Apresentação de Valor**
"Perfeito! Com base no que você me contou, o ideal seria começar com uma avaliação completa — ela é o primeiro passo para qualquer tratamento. Nela, o dentista examina toda a boca, identifica o que precisa ser feito e apresenta um plano personalizado com os valores. Tudo transparente, sem surpresas."

**Script de Agendamento**
"Que tal agendarmos sua avaliação? Temos horários disponíveis [dias/horários]. Qual seria melhor para você?"

**Script de Follow-up (Não respondeu)**
"Oi [Nome]! Tudo bem? Passando para ver se ficou alguma dúvida sobre [procedimento/clínica]. Estou à disposição para ajudar! 😊"

**Script de Recuperação (Desistiu)**
"[Nome], entendo que a decisão não é fácil. Quero te ajudar a encontrar a melhor solução. Tem alguma preocupação específica que posso esclarecer? Às vezes um detalhe faz toda a diferença."`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'terms',
    title: 'Termos Técnicos — Odontologia',
    position: 5,
    content: `**Implante dentário**: Pino de titânio inserido no osso da mandíbula/maxila para substituir a raiz de um dente perdido. Sobre ele é colocada uma coroa protética.

**Osseointegração**: Processo de fusão do implante com o osso, que leva de 3 a 6 meses.

**Prótese**: Restauração artificial que substitui dentes perdidos. Pode ser fixa (coroa, ponte) ou removível (dentadura, parcial removível).

**Faceta**: Lâmina fina de porcelana ou resina colada na face frontal do dente para melhorar estética.

**Lente de contato dental**: Faceta ultrafina (0,2 a 0,5mm), menos invasiva, preserva mais estrutura dental.

**Clareamento**: Procedimento para clarear a cor dos dentes usando agentes oxidantes (peróxido de hidrogênio ou carbamida).

**Ortodontia**: Especialidade que corrige posição dos dentes e mordida. Usa aparelhos fixos (metálico, cerâmico, safira) ou removíveis (alinhadores).

**Alinhadores invisíveis**: Aparelhos removíveis e transparentes (ex: Invisalign, ClearCorrect) que movem os dentes gradualmente.

**Periodontia**: Especialidade que trata gengiva e estruturas de suporte dos dentes. Trata gengivite e periodontite.

**Endodontia**: Tratamento de canal — remove polpa infectada e sela o dente por dentro.

**Profilaxia**: Limpeza profissional para remover tártaro e placa bacteriana.

**Bruxismo**: Hábito de ranger ou apertar os dentes, geralmente durante o sono. Tratado com placa de mordida.

**Placa de mordida**: Dispositivo de acrílico usado à noite para proteger os dentes do bruxismo.`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Odontologia',
    position: 6,
    content: `**Agendamento**
- Sempre oferecer pelo menos 2 opções de horário
- Confirmar agendamento 24h antes via WhatsApp
- Reagendamento deve ser feito com pelo menos 2h de antecedência
- Primeira consulta é sempre uma avaliação/diagnóstico

**Preços e Pagamento**
- Nunca dar preço fechado sem avaliação — sempre apresentar como estimativa
- Destacar que o valor exato é definido após avaliação personalizada
- Mencionar parcelamento quando o paciente demonstrar preocupação com valor
- Não fazer descontos sem autorização da clínica

**Comunicação**
- Sempre usar linguagem acessível, sem jargão técnico excessivo
- Demonstrar empatia com medo/ansiedade — é uma barreira real
- Não pressionar para fechar — orientar e facilitar a decisão
- Se o paciente mencionar emergência (dor intensa), priorizar atendimento imediato

**Escalada para Humano**
- Reclamações sobre atendimento anterior
- Solicitação de orçamento detalhado por escrito
- Casos complexos que exigem avaliação especializada
- Quando o paciente pede para falar com o dentista diretamente`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CLÍNICA ODONTOLÓGICA — MODO SIMPLIFICADO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'simple',
    section_type: 'presentation',
    title: 'Missão do Agente Simplificado — Odontologia',
    position: 1,
    content: `O Agente Simplificado para clínicas odontológicas tem foco operacional:

**Objetivos principais:**
1. Confirmar consultas agendadas
2. Enviar link de anamnese pré-consulta
3. Enviar NPS após consulta
4. Solicitar avaliação no Google após atendimento positivo
5. Pedir indicação de amigos/familiares

**Comportamento esperado:**
- Respostas curtas e diretas
- Tom amigável mas objetivo
- Não entrar em discussões técnicas sobre procedimentos
- Se o paciente fizer perguntas complexas, informar que vai chamar alguém da equipe`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'simple',
    section_type: 'scripts',
    title: 'Scripts Operacionais — Odontologia Simplificado',
    position: 2,
    content: `**Confirmação de Consulta**
"Olá, [Nome]! 😊 Passando para confirmar sua consulta na [Clínica] amanhã, [data], às [horário]. Você confirma presença?"

**Envio de Anamnese**
"Oi [Nome]! Para otimizar seu atendimento, pedimos que preencha nossa ficha de saúde antes da consulta. Leva apenas 2 minutinhos: [link]. Qualquer dúvida, estou aqui!"

**NPS Pós-Consulta**
"Olá [Nome]! Esperamos que sua consulta tenha sido ótima! 😊 Sua opinião é muito importante para nós. Em uma escala de 0 a 10, o quanto você indicaria nossa clínica para um amigo ou familiar? [link]"

**Pedido de Avaliação Google**
"[Nome], ficamos muito felizes que você gostou do atendimento! Você poderia nos ajudar deixando uma avaliação no Google? Leva menos de 1 minuto e ajuda muito outras pessoas a nos encontrarem: [link]"

**Pedido de Indicação**
"Oi [Nome]! Você conhece alguém que também precisa de cuidados odontológicos? Indicações são sempre bem-vindas! Quem vier indicado por você ganha [benefício, se houver]. 😊"

**Reagendamento**
"Oi [Nome]! Vi que sua consulta está marcada para [data/hora]. Precisa reagendar? Me avisa que verifico os horários disponíveis para você!"`,
  },
  {
    niche_slug: 'clinica_odontologica',
    agent_mode: 'simple',
    section_type: 'rules',
    title: 'Regras do Agente Simplificado — Odontologia',
    position: 3,
    content: `**O que fazer:**
- Confirmar consultas 24h antes
- Enviar anamnese quando solicitado pelo sistema
- Enviar NPS 2-4h após a consulta
- Pedir avaliação Google para pacientes com NPS >= 9
- Pedir indicação para pacientes satisfeitos

**O que NÃO fazer:**
- Dar informações sobre preços ou procedimentos
- Fazer diagnósticos ou recomendações clínicas
- Discutir reclamações sobre atendimento
- Prometer horários sem verificar disponibilidade

**Quando escalar para humano:**
- Paciente com dor ou emergência
- Reclamação sobre atendimento
- Perguntas sobre procedimentos específicos
- Solicitação de orçamento
- Qualquer situação que fuja do fluxo operacional`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CLÍNICA MÉDICA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Clínicas Médicas',
    position: 1,
    content: `Clínicas médicas oferecem atendimento ambulatorial em diversas especialidades, desde clínica geral até especialidades como cardiologia, dermatologia, ortopedia, ginecologia, entre outras.

**Ticket médio por tipo de serviço:**
- Consulta clínica geral: R$ 150 a R$ 400
- Consulta especialista: R$ 250 a R$ 600
- Exames laboratoriais: R$ 50 a R$ 500
- Exames de imagem: R$ 200 a R$ 1.500
- Procedimentos ambulatoriais: R$ 500 a R$ 5.000
- Check-up completo: R$ 800 a R$ 3.000

**Perfil do paciente:**
- Busca por conveniência, agilidade e qualidade
- Preocupação com tempo de espera
- Valoriza comunicação clara e humanizada
- Cada vez mais pesquisa online antes de escolher`,
  },
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Clínica Médica',
    position: 2,
    content: `**P: Vocês atendem pelo plano de saúde?**
R: Verificar com a clínica quais convênios são aceitos. Se particular, destacar agilidade no atendimento e qualidade.

**P: Preciso de encaminhamento?**
R: Depende da especialidade e do convênio. Para consultas particulares, geralmente não é necessário. Confirmar com a clínica.

**P: Qual o tempo de espera para consulta?**
R: Temos horários disponíveis para [prazo]. Para urgências, verificar disponibilidade do mesmo dia.

**P: Os exames são feitos na própria clínica?**
R: Depende da clínica. Muitas têm laboratório e imagem próprios, o que facilita o acompanhamento.

**P: Como recebo os resultados dos exames?**
R: Os resultados ficam disponíveis no portal do paciente ou são enviados por e-mail/WhatsApp, geralmente em 24-72h.

**P: Posso marcar consulta online?**
R: Sim! Você pode agendar por WhatsApp, telefone ou pelo nosso sistema online.`,
  },
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Clínica Médica',
    position: 3,
    content: `**Objeção: "Está caro"**
Resposta: Entendo. Investir na saúde preventivamente é sempre mais econômico do que tratar doenças avançadas. Temos opções de parcelamento e pacotes de check-up com custo-benefício excelente.

**Objeção: "Vou esperar melhorar"**
Resposta: Compreendo, mas muitas condições pioram sem tratamento adequado. Uma consulta rápida pode trazer tranquilidade — ou identificar algo que precisa de atenção antes de se agravar.

**Objeção: "Meu plano não cobre"**
Resposta: Entendo. Nossa consulta particular tem preço acessível e você tem a vantagem de escolher o melhor horário sem burocracia de autorização. Posso verificar os valores para você?

**Objeção: "Não tenho tempo"**
Resposta: Temos horários no início da manhã, horário de almoço e final do dia. A consulta dura em média 30-40 minutos. Qual horário seria mais conveniente?`,
  },
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Clínica Médica',
    position: 4,
    content: `**Importante — Ética Médica:**
- Nunca fazer diagnósticos ou sugerir medicamentos
- Nunca minimizar sintomas — sempre orientar a buscar atendimento
- Em caso de emergência, orientar a ligar para SAMU (192) ou ir à UPA/pronto-socorro

**Agendamento:**
- Sempre confirmar especialidade desejada
- Verificar se há necessidade de exames prévios
- Confirmar consulta 24h antes

**Comunicação:**
- Linguagem clara e empática
- Respeitar privacidade — não perguntar detalhes clínicos desnecessários
- Escalar para humano em casos de urgência ou complexidade`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CLÍNICA MÉDICA — MODO SIMPLIFICADO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'simple',
    section_type: 'presentation',
    title: 'Missão do Agente Simplificado — Clínica Médica',
    position: 1,
    content: `Foco operacional: confirmar consultas, enviar lembretes de exames, coletar NPS e pedir avaliações. Não discutir sintomas, diagnósticos ou medicamentos. Escalar para humano em qualquer dúvida clínica.`,
  },
  {
    niche_slug: 'clinica_medica',
    agent_mode: 'simple',
    section_type: 'scripts',
    title: 'Scripts Operacionais — Clínica Médica Simplificado',
    position: 2,
    content: `**Confirmação de Consulta**
"Olá, [Nome]! Confirmando sua consulta com [Dr./Dra. Nome] na [Clínica], [data] às [horário]. Confirma presença? 😊"

**Lembrete de Exames**
"Oi [Nome]! Lembrete: seus exames estão prontos. Você pode acessá-los pelo portal [link] ou retirar na recepção. Qualquer dúvida, estamos aqui!"

**NPS Pós-Consulta**
"[Nome], esperamos que sua consulta tenha sido ótima! De 0 a 10, como foi sua experiência conosco? [link]"

**Pedido de Avaliação Google**
"Que bom que você gostou! Poderia nos ajudar com uma avaliação no Google? [link] Obrigado! 🙏"`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ESTÉTICA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'estetica',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Estética',
    position: 1,
    content: `Clínicas e estúdios de estética oferecem tratamentos para beleza e bem-estar, desde procedimentos faciais e corporais até tratamentos capilares e relaxamento.

**Principais serviços e ticket médio:**
- Limpeza de pele: R$ 150 a R$ 400
- Peeling químico: R$ 200 a R$ 600
- Botox: R$ 800 a R$ 2.500
- Preenchimento labial/facial: R$ 800 a R$ 3.000
- Depilação a laser (sessão): R$ 150 a R$ 800
- Radiofrequência: R$ 200 a R$ 500/sessão
- Drenagem linfática: R$ 100 a R$ 250/sessão
- Massagem relaxante: R$ 100 a R$ 200/sessão

**Perfil do cliente:**
- Majoritariamente feminino (70-80%)
- Busca resultados visíveis e rápidos
- Valoriza ambiente agradável e atendimento personalizado
- Fidelidade alta quando satisfeito com resultados`,
  },
  {
    niche_slug: 'estetica',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Estética',
    position: 2,
    content: `**P: Quantas sessões preciso?**
R: Depende do tratamento e do objetivo. Na avaliação, a esteticista apresenta um protocolo personalizado com o número de sessões recomendado para o seu caso.

**P: Os resultados são permanentes?**
R: Depende do procedimento. Botox dura 4-6 meses. Depilação a laser reduz permanentemente após o protocolo completo. Tratamentos corporais exigem manutenção.

**P: Tem contraindicações?**
R: Sim, alguns tratamentos têm contraindicações (gestantes, doenças autoimunes, etc.). A avaliação inicial identifica se você é candidata ideal.

**P: Dói?**
R: A maioria dos tratamentos é confortável. Alguns procedimentos como depilação a laser causam sensação de calor/picada. Usamos técnicas para minimizar o desconforto.

**P: Posso ir ao sol após o tratamento?**
R: Alguns tratamentos exigem proteção solar rigorosa. A profissional orienta os cuidados pós-procedimento específicos para cada tratamento.`,
  },
  {
    niche_slug: 'estetica',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Estética',
    position: 3,
    content: `**Objeção: "Está caro"**
Resposta: Entendo! Muitos de nossos tratamentos podem ser divididos em pacotes com valor por sessão mais acessível. Além disso, investir em cuidados estéticos é investir em autoestima e bem-estar. Posso apresentar as opções de pacotes?

**Objeção: "Tenho medo de resultado ruim"**
Resposta: Compreendo a preocupação! Por isso fazemos uma avaliação detalhada antes de qualquer procedimento. Trabalhamos com profissionais certificados e produtos de qualidade. Posso te mostrar resultados de clientes anteriores?

**Objeção: "Vou pensar"**
Resposta: Claro! Que tal começar com uma avaliação sem compromisso? Assim você conhece a clínica, a profissional e recebe um protocolo personalizado para decidir com mais segurança.

**Objeção: "Já fiz em outro lugar e não gostei"**
Resposta: Lamento que a experiência anterior não foi boa. Cada profissional e técnica é diferente. Na nossa avaliação, você pode conversar sobre o que não funcionou antes e entender como nossa abordagem é diferente.`,
  },
  {
    niche_slug: 'estetica',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Estética',
    position: 4,
    content: `**Agendamento:**
- Primeira visita sempre inclui avaliação/anamnese
- Confirmar 24h antes
- Orientar sobre preparo pré-procedimento quando necessário

**Comunicação:**
- Tom empático e motivador
- Não prometer resultados milagrosos
- Destacar que resultados variam por pessoa
- Escalar para humano em casos de reações adversas ou reclamações`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ESTÉTICA — MODO SIMPLIFICADO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'estetica',
    agent_mode: 'simple',
    section_type: 'scripts',
    title: 'Scripts Operacionais — Estética Simplificado',
    position: 1,
    content: `**Confirmação de Sessão**
"Oi [Nome]! 💆‍♀️ Confirmando sua sessão de [tratamento] amanhã, [data] às [horário]. Confirma presença?"

**Lembrete de Preparo**
"[Nome], lembrete: para sua sessão de [tratamento] amanhã, [instruções de preparo, ex: não usar hidratante, vir com a pele limpa, etc.]. Qualquer dúvida, me chama! 😊"

**NPS Pós-Sessão**
"[Nome], esperamos que tenha adorado sua sessão! ✨ De 0 a 10, como foi sua experiência? [link]"

**Pedido de Avaliação**
"Que lindo que você amou! 🥰 Poderia nos ajudar com uma avaliação no Google? Ajuda muito outras pessoas a nos encontrarem: [link]"

**Lembrete de Retorno**
"Oi [Nome]! Sua próxima sessão de [tratamento] está marcada para [data]. Confirma? 😊"`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACADEMIA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'academia',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Academias',
    position: 1,
    content: `Academias oferecem estrutura e orientação para atividade física, desde musculação e cardio até aulas coletivas e personal training.

**Modelos de negócio e preços:**
- Mensalidade básica: R$ 60 a R$ 200/mês
- Plano trimestral: 10-15% de desconto
- Plano semestral: 15-20% de desconto
- Plano anual: 20-30% de desconto
- Personal trainer: R$ 60 a R$ 200/hora
- Aulas coletivas avulsas: R$ 30 a R$ 80

**Perfil do cliente:**
- Motivação principal: emagrecimento, condicionamento, saúde
- Alta taxa de churn nos primeiros 3 meses
- Fidelização por resultados, comunidade e conveniência
- Sazonalidade: pico em janeiro e pré-verão (setembro/outubro)`,
  },
  {
    niche_slug: 'academia',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Academia',
    position: 2,
    content: `**P: Preciso de atestado médico?**
R: Para iniciar os treinos, recomendamos uma avaliação física. Atestado médico pode ser exigido dependendo da academia e do tipo de atividade.

**P: Tem aula experimental?**
R: Muitas academias oferecem aula ou semana experimental gratuita. Confirmar com a academia.

**P: Posso cancelar quando quiser?**
R: Depende do plano contratado. Planos mensais geralmente têm mais flexibilidade. Planos longos podem ter multa por cancelamento antecipado.

**P: Tem estacionamento?**
R: Verificar com a academia específica.

**P: Quais aulas coletivas têm?**
R: Depende da academia. Comuns: musculação, spinning, zumba, yoga, pilates, funcional, crossfit.

**P: Tem personal trainer?**
R: Sim, a maioria das academias tem personal trainers disponíveis para contratação separada.`,
  },
  {
    niche_slug: 'academia',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Academia',
    position: 3,
    content: `**Objeção: "Está caro"**
Resposta: Entendo! Se dividirmos o plano anual por dia, o investimento é menor do que um café. E o retorno em saúde, disposição e qualidade de vida é imensurável. Temos planos para todos os bolsos — posso apresentar as opções?

**Objeção: "Não tenho tempo"**
Resposta: A academia fica aberta de [horário]. Muitos alunos treinam 30-45 minutos antes do trabalho ou na hora do almoço. Com consistência, resultados aparecem mesmo com treinos curtos.

**Objeção: "Já tentei e desisti"**
Resposta: É muito comum! A chave é encontrar o tipo de exercício que você gosta e ter acompanhamento profissional. Nossos professores ajudam a criar uma rotina realista para o seu estilo de vida.

**Objeção: "Tenho vergonha de ir à academia"**
Resposta: Todo mundo começa do zero! Nossa academia tem um ambiente acolhedor e sem julgamentos. Que tal fazer uma visita para conhecer o espaço antes de decidir?`,
  },
  {
    niche_slug: 'academia',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Academia',
    position: 4,
    content: `**Matrículas e Planos:**
- Sempre apresentar pelo menos 3 opções de plano
- Destacar o custo-benefício do plano anual
- Oferecer período de teste quando disponível

**Comunicação:**
- Tom motivador e encorajador
- Não prometer resultados específicos (ex: "emagrecer X kg em Y dias")
- Escalar para humano em caso de lesão ou problema de saúde
- Reativar alunos inativos com abordagem empática, não agressiva`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SALÃO DE BELEZA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'salao_beleza',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Salões de Beleza',
    position: 1,
    content: `Salões de beleza oferecem serviços de cabelo, unhas, maquiagem e estética, sendo um dos segmentos com maior frequência de retorno de clientes.

**Principais serviços e ticket médio:**
- Corte feminino: R$ 60 a R$ 250
- Coloração/tintura: R$ 150 a R$ 600
- Progressiva/alisamento: R$ 200 a R$ 800
- Hidratação capilar: R$ 80 a R$ 250
- Manicure/pedicure: R$ 40 a R$ 120
- Maquiagem: R$ 150 a R$ 500
- Penteado para evento: R$ 150 a R$ 400

**Perfil do cliente:**
- Alta frequência de retorno (a cada 30-60 dias)
- Fidelidade ao profissional, não apenas ao salão
- Valoriza agendamento fácil e pontualidade
- Sensível a promoções e pacotes`,
  },
  {
    niche_slug: 'salao_beleza',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Salão de Beleza',
    position: 2,
    content: `**P: Preciso agendar ou posso ir sem hora marcada?**
R: Recomendamos agendar para garantir o horário com seu profissional preferido. Mas aceitamos encaixes quando há disponibilidade.

**P: Quanto tempo dura o serviço?**
R: Corte simples: 30-60 min. Coloração: 2-4h. Progressiva: 3-5h. Manicure: 45-60 min. Informar o tempo específico ao agendar.

**P: Posso levar referência de foto?**
R: Sim! Sempre recomendamos trazer fotos de referência para o profissional entender melhor o resultado desejado.

**P: Vocês usam produtos de qualidade?**
R: Sim, trabalhamos com marcas profissionais [citar marcas se disponível]. A qualidade dos produtos é fundamental para o resultado e saúde do cabelo.

**P: Tem estacionamento?**
R: Verificar com o salão específico.`,
  },
  {
    niche_slug: 'salao_beleza',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Salão de Beleza',
    position: 3,
    content: `**Objeção: "Está caro"**
Resposta: Entendo! Trabalhamos com profissionais especializados e produtos de qualidade que garantem resultado e saúde do cabelo. Um serviço mal feito pode custar muito mais para corrigir. Temos opções para diferentes orçamentos.

**Objeção: "Já tenho minha cabeleireira"**
Resposta: Que ótimo que você tem alguém de confiança! Se quiser experimentar um serviço específico que ela não faz, ou se precisar de um horário que ela não tem disponível, estamos aqui.

**Objeção: "Tenho medo de estragar o cabelo"**
Resposta: Compreendo! Por isso fazemos uma consulta antes de qualquer procedimento químico para avaliar o estado do cabelo e garantir que o resultado será seguro e bonito.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PET SHOP — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'pet_shop',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Pet Shop',
    position: 1,
    content: `Pet shops oferecem produtos e serviços para animais de estimação, incluindo banho e tosa, veterinária, venda de rações e acessórios.

**Principais serviços e ticket médio:**
- Banho simples: R$ 40 a R$ 150
- Banho e tosa: R$ 60 a R$ 250
- Consulta veterinária: R$ 100 a R$ 300
- Vacinação: R$ 50 a R$ 200 por vacina
- Internação: R$ 200 a R$ 600/dia
- Cirurgia: R$ 500 a R$ 5.000+
- Hotel para pets: R$ 60 a R$ 200/dia

**Perfil do cliente:**
- Vínculo emocional forte com o pet
- Dispostos a gastar bem com saúde e bem-estar do animal
- Alta fidelidade quando confiam no profissional
- Sensíveis a qualquer percepção de descuido com o animal`,
  },
  {
    niche_slug: 'pet_shop',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Pet Shop',
    position: 2,
    content: `**P: Com que frequência devo dar banho no meu pet?**
R: Depende da raça e do estilo de vida. Em geral, cães de pelo curto: a cada 15-30 dias. Pelo longo: a cada 7-15 dias. Gatos: raramente precisam de banho.

**P: Posso acompanhar o banho?**
R: Depende da política do estabelecimento. Muitos preferem que o tutor não fique presente para o pet não ficar agitado.

**P: O pet fica sozinho durante o banho?**
R: Não, sempre há um profissional responsável. Confirmar com o pet shop.

**P: Vocês têm veterinário?**
R: Verificar com o pet shop específico.

**P: Aceitam todas as raças?**
R: Sim, mas raças braquicefálicas (Pug, Bulldog, etc.) podem ter cuidados especiais durante o banho.`,
  },
  {
    niche_slug: 'pet_shop',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Pet Shop',
    position: 3,
    content: `**Objeção: "Está caro"**
Resposta: Entendo! O preço reflete o cuidado e a segurança que seu pet merece. Trabalhamos com produtos de qualidade e profissionais treinados. Seu pet é parte da família — merece o melhor!

**Objeção: "Meu pet fica estressado"**
Resposta: É muito comum! Nossos profissionais são treinados para lidar com pets ansiosos. Usamos técnicas de manejo gentil. Na primeira vez, podemos fazer uma visita de adaptação.

**Objeção: "Já tive problema em outro pet shop"**
Resposta: Lamento muito! A segurança e bem-estar dos pets é nossa prioridade absoluta. Posso explicar nosso protocolo de segurança?`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RESTAURANTE — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'restaurante',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Restaurantes',
    position: 1,
    content: `Restaurantes atendem desde refeições rápidas até experiências gastronômicas completas, com modelos de negócio variados (à la carte, self-service, delivery, etc.).

**Ticket médio por tipo:**
- Fast food/lanchonete: R$ 25 a R$ 60/pessoa
- Restaurante casual: R$ 50 a R$ 120/pessoa
- Restaurante fine dining: R$ 150 a R$ 500/pessoa
- Delivery: R$ 30 a R$ 80/pedido

**Perfil do cliente:**
- Busca conveniência, sabor e experiência
- Avaliações online são decisivas na escolha
- Fidelidade por qualidade consistente e atendimento
- Sensível a tempo de espera e atendimento`,
  },
  {
    niche_slug: 'restaurante',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Restaurante',
    position: 2,
    content: `**P: Precisa de reserva?**
R: Para fins de semana e datas especiais, recomendamos reservar. Em dias de semana, geralmente há disponibilidade.

**P: Tem opções vegetarianas/veganas?**
R: Verificar com o restaurante específico.

**P: Aceitam eventos e confraternizações?**
R: Muitos restaurantes têm espaço para grupos e eventos. Verificar disponibilidade e condições.

**P: Qual o horário de funcionamento?**
R: Verificar com o restaurante específico.

**P: Fazem delivery?**
R: Verificar com o restaurante específico.`,
  },
  {
    niche_slug: 'restaurante',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Restaurante',
    position: 3,
    content: `**Reservas:**
- Confirmar disponibilidade antes de garantir
- Informar política de cancelamento
- Para grupos grandes, solicitar sinal/confirmação

**Comunicação:**
- Tom acolhedor e hospitaleiro
- Escalar para humano em reclamações sobre qualidade da comida
- Não prometer descontos sem autorização`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADVOCACIA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'advocacia',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento de Advocacia',
    position: 1,
    content: `Escritórios de advocacia oferecem serviços jurídicos em diversas áreas, desde direito do consumidor e trabalhista até direito empresarial e imobiliário.

**Áreas comuns e honorários:**
- Direito do consumidor: honorários de êxito (20-30% do valor ganho)
- Direito trabalhista: honorários de êxito (20-30%)
- Direito de família (divórcio): R$ 2.000 a R$ 15.000
- Direito imobiliário: R$ 3.000 a R$ 20.000+
- Direito empresarial: R$ 5.000 a R$ 50.000+
- Consultoria jurídica: R$ 200 a R$ 600/hora

**Perfil do cliente:**
- Busca segurança e confiança
- Preocupado com custos e prazo do processo
- Valoriza comunicação clara e atualizações frequentes
- Decisão de contratação baseada em reputação e indicação`,
  },
  {
    niche_slug: 'advocacia',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Advocacia',
    position: 2,
    content: `**P: Quanto custa uma consulta?**
R: A consulta inicial é [gratuita/valor]. Nela, o advogado avalia o caso e apresenta as opções e honorários.

**P: Quanto tempo dura o processo?**
R: Depende da área e da complexidade. Processos trabalhistas: 1-3 anos. Divórcio consensual: 1-6 meses. Não é possível garantir prazo sem avaliar o caso.

**P: Vocês cobram só se ganhar?**
R: Em algumas áreas (consumidor, trabalhista), trabalhamos com honorários de êxito. Em outras, há honorários fixos. O advogado explica na consulta.

**P: Preciso ir pessoalmente?**
R: Para a consulta inicial, recomendamos presencialmente ou por videoconferência. Muitos documentos podem ser enviados digitalmente.`,
  },
  {
    niche_slug: 'advocacia',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras de Negócio — Advocacia',
    position: 3,
    content: `**Importante — Ética da OAB:**
- Nunca dar parecer jurídico ou opinião sobre casos específicos
- Não garantir resultados ou vitórias em processos
- Não fazer publicidade com promessas de resultados
- Escalar para o advogado em qualquer questão jurídica específica

**Agendamento:**
- Sempre coletar uma breve descrição do caso para direcionar ao advogado correto
- Confirmar consulta 24h antes`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // IMOBILIÁRIA — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'imobiliaria',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Sobre o Segmento Imobiliário',
    position: 1,
    content: `Imobiliárias intermediam compra, venda e locação de imóveis residenciais e comerciais.

**Modelos de negócio:**
- Venda: comissão de 5-6% sobre o valor do imóvel
- Locação: taxa de administração de 8-12% do aluguel mensal + taxa de locação (1 aluguel)
- Lançamentos: comissão de 4-6%

**Ticket médio:**
- Imóvel residencial: R$ 200.000 a R$ 2.000.000+
- Imóvel comercial: R$ 300.000 a R$ 5.000.000+
- Aluguel residencial: R$ 800 a R$ 10.000/mês

**Perfil do cliente:**
- Decisão de alto valor e alto envolvimento emocional
- Ciclo de decisão longo (semanas a meses)
- Pesquisa intensiva antes de contato
- Valoriza confiança, transparência e conhecimento do mercado local`,
  },
  {
    niche_slug: 'imobiliaria',
    agent_mode: 'full',
    section_type: 'faq',
    title: 'Perguntas Frequentes — Imobiliária',
    position: 2,
    content: `**P: Qual a comissão de vocês?**
R: Nossa comissão é de [X]% sobre o valor da venda, conforme tabela CRECI. É paga pelo vendedor na maioria dos casos.

**P: Posso financiar pelo banco?**
R: Sim! Trabalhamos com todos os bancos e podemos indicar o melhor financiamento para o seu perfil. Fazemos toda a assessoria de crédito.

**P: Quanto tempo leva para vender meu imóvel?**
R: Depende do preço, localização e condições do mercado. Em média, imóveis bem precificados vendem em 30-90 dias.

**P: Preciso pagar para anunciar?**
R: Não cobramos taxa para anunciar. Nossa remuneração é a comissão na venda.

**P: Vocês fazem avaliação do imóvel?**
R: Sim! Fazemos avaliação gratuita para proprietários que querem vender ou alugar.`,
  },
  {
    niche_slug: 'imobiliaria',
    agent_mode: 'full',
    section_type: 'objections',
    title: 'Objeções e Respostas — Imobiliária',
    position: 3,
    content: `**Objeção: "Vou tentar vender por conta própria"**
Resposta: Entendo! Muitos proprietários tentam isso. Mas estatisticamente, imóveis vendidos com imobiliária vendem mais rápido e por valores maiores, pois temos carteira de compradores qualificados e expertise em negociação. E você só paga se vender.

**Objeção: "A comissão está alta"**
Resposta: A comissão cobre toda a estrutura de divulgação, qualificação de compradores, assessoria jurídica e negociação. Considerando o valor do imóvel, é um investimento que se paga com uma negociação mais eficiente.

**Objeção: "Já tentei com outra imobiliária e não vendeu"**
Resposta: Lamento que não deu certo! Podemos fazer uma análise do que pode ter impedido a venda — preço, divulgação, apresentação — e propor uma estratégia diferente.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OUTROS — MODO COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  {
    niche_slug: 'outros',
    agent_mode: 'full',
    section_type: 'presentation',
    title: 'Conhecimento Geral para Outros Segmentos',
    position: 1,
    content: `Para empresas que não se enquadram nos nichos específicos, o Agente IA usa o perfil do negócio cadastrado pelo próprio cliente como base principal de conhecimento.

**Princípios gerais de atendimento:**
- Sempre apresentar o negócio de forma clara e positiva
- Focar nos benefícios para o cliente, não apenas nas características do produto/serviço
- Demonstrar empatia e interesse genuíno nas necessidades do cliente
- Ser transparente sobre o que pode e não pode responder
- Facilitar o próximo passo (agendamento, visita, orçamento)`,
  },
  {
    niche_slug: 'outros',
    agent_mode: 'full',
    section_type: 'rules',
    title: 'Regras Gerais para Outros Segmentos',
    position: 2,
    content: `**Comunicação:**
- Usar as informações do perfil do negócio como base
- Tom profissional e cordial
- Escalar para humano quando não souber responder
- Nunca inventar informações sobre o negócio

**Escalada para humano:**
- Qualquer pergunta técnica específica sobre o negócio
- Reclamações
- Negociações de preço
- Situações não previstas no perfil do negócio`,
  },
];

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migration-secret');
  if (secret !== 'hg-agent-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectRef = 'vwkzrcfewxekcowbhvzf';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const steps: { step: string; success: boolean; error?: string }[] = [];

  const execSQL = async (label: string, sql: string) => {
    try {
      const resp = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        }
      );
      const text = await resp.text();
      if (!resp.ok) {
        steps.push({ step: label, success: false, error: `${resp.status}: ${text.slice(0, 300)}` });
        return false;
      }
      steps.push({ step: label, success: true });
      return true;
    } catch (e: any) {
      steps.push({ step: label, success: false, error: e.message });
      return false;
    }
  };

  // 1. Criar tabelas
  await execSQL('Create ai_niche_knowledge', `
    CREATE TABLE IF NOT EXISTS public.ai_niche_knowledge (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      niche_slug TEXT NOT NULL,
      agent_mode TEXT NOT NULL DEFAULT 'full',
      section_type TEXT NOT NULL DEFAULT 'presentation',
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await execSQL('Create index on ai_niche_knowledge', `
    CREATE INDEX IF NOT EXISTS idx_ai_niche_knowledge_slug
    ON public.ai_niche_knowledge(niche_slug, agent_mode)
  `);

  await execSQL('Create ai_agent_mode_config', `
    CREATE TABLE IF NOT EXISTS public.ai_agent_mode_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL UNIQUE,
      agent_mode TEXT NOT NULL DEFAULT 'full',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      custom_instructions TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await execSQL('Create index on ai_agent_mode_config', `
    CREATE INDEX IF NOT EXISTS idx_ai_agent_mode_config_tenant
    ON public.ai_agent_mode_config(tenant_id)
  `);

  // 2. Limpar dados existentes e inserir seed
  await execSQL('Clear existing seed data', `DELETE FROM public.ai_niche_knowledge`);

  // 3. Inserir em lotes de 10
  const batchSize = 10;
  for (let i = 0; i < SEED_DATA.length; i += batchSize) {
    const batch = SEED_DATA.slice(i, i + batchSize);
    const values = batch
      .map((row) => {
        const content = row.content.replace(/'/g, "''");
        const title = row.title.replace(/'/g, "''");
        return `('${row.niche_slug}', '${row.agent_mode}', '${row.section_type}', '${title}', '${content}', true, ${row.position})`;
      })
      .join(',\n');

    await execSQL(`Insert seed batch ${Math.floor(i / batchSize) + 1}`, `
      INSERT INTO public.ai_niche_knowledge
        (niche_slug, agent_mode, section_type, title, content, is_active, position)
      VALUES ${values}
    `);
  }

  const allSuccess = steps.every((s) => s.success);
  const inserted = steps.filter((s) => s.step.startsWith('Insert') && s.success).length * batchSize;

  return NextResponse.json({
    success: allSuccess,
    steps,
    summary: {
      tables_created: 2,
      records_seeded: SEED_DATA.length,
      niches_covered: [...new Set(SEED_DATA.map((d) => d.niche_slug))].length,
    },
  });
}
