-- ============================================================
-- Migration 005: AI Agent Knowledge Base
-- Tabelas para a base de conhecimento do Agente de IA
-- ============================================================

-- Tabela principal: conhecimento global por nicho
-- Cada nicho tem seções de conhecimento que são injetadas no prompt
CREATE TABLE IF NOT EXISTS public.ai_niche_knowledge (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  niche_slug    TEXT NOT NULL,           -- ex: 'clinica_odontologica', 'estetica'
  agent_mode    TEXT NOT NULL DEFAULT 'full', -- 'full' (completo) | 'simple' (simplificado)
  section_type  TEXT NOT NULL,           -- 'presentation', 'faq', 'objections', 'scripts', 'terms', 'rules'
  title         TEXT NOT NULL,           -- Título da seção
  content       TEXT NOT NULL DEFAULT '', -- Conteúdo em texto livre (markdown)
  position      INTEGER NOT NULL DEFAULT 50,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por nicho + modo
CREATE INDEX IF NOT EXISTS idx_ai_niche_knowledge_niche_mode
  ON public.ai_niche_knowledge (niche_slug, agent_mode, is_active);

-- Tabela de configuração do modo do agente por tenant
-- Define se o tenant usa IA Completa ou Simplificada
CREATE TABLE IF NOT EXISTS public.ai_agent_config (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     TEXT NOT NULL UNIQUE,
  agent_mode    TEXT NOT NULL DEFAULT 'full', -- 'full' | 'simple'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_tenant
  ON public.ai_agent_config (tenant_id);

-- ============================================================
-- Dados iniciais: conhecimento base para Clínica Odontológica
-- ============================================================

-- MODO COMPLETO — Clínica Odontológica
INSERT INTO public.ai_niche_knowledge (niche_slug, agent_mode, section_type, title, content, position) VALUES
('clinica_odontologica', 'full', 'presentation', 'Apresentação do Segmento', 
'Clínicas odontológicas oferecem serviços de saúde bucal que vão desde consultas preventivas até procedimentos estéticos e reabilitadores. O atendimento é altamente personalizado e o relacionamento com o paciente é fundamental para fidelização.

O processo de decisão do paciente geralmente envolve:
1. Necessidade percebida (dor, estética, indicação)
2. Pesquisa e comparação de clínicas
3. Contato inicial e agendamento de avaliação
4. Consulta de avaliação (geralmente gratuita ou com valor simbólico)
5. Apresentação do plano de tratamento e orçamento
6. Decisão de fechar o tratamento', 10),

('clinica_odontologica', 'full', 'faq', 'Perguntas Frequentes', 
'**Quanto custa uma consulta de avaliação?**
A maioria das clínicas oferece avaliação gratuita ou por um valor simbólico (R$ 50-150). Confirme sempre com a clínica.

**O plano de saúde cobre tratamentos odontológicos?**
Depende do plano. Planos odontológicos cobrem procedimentos básicos. Procedimentos estéticos (facetas, lentes, clareamento) geralmente não são cobertos.

**Quanto tempo dura um tratamento de canal?**
Em geral 1 a 3 sessões de 1-2 horas cada, dependendo da complexidade.

**O clareamento dental dói?**
Pode causar sensibilidade temporária. O dentista avalia o caso antes de indicar o procedimento.

**Implante dental é para todo mundo?**
Não. É necessário ter osso suficiente e saúde bucal adequada. A avaliação determina a viabilidade.

**Quanto tempo dura um implante?**
Com cuidado adequado, pode durar a vida toda. A taxa de sucesso é superior a 95%.

**Facetas de porcelana vs resina: qual a diferença?**
Porcelana: mais durável, mais natural, mais cara. Resina: mais acessível, pode precisar de manutenção.', 20),

('clinica_odontologica', 'full', 'objections', 'Objeções Comuns e Como Responder', 
'**"Está muito caro"**
Entenda: o paciente está comparando com outras clínicas ou simplesmente não tem o valor disponível agora.
Resposta: Apresente o parcelamento disponível. Explique o custo-benefício a longo prazo. Ofereça um plano de tratamento escalonado (começar pelo mais urgente).

**"Vou pensar"**
Entenda: o paciente não está convencido ou precisa de mais informações.
Resposta: Pergunte o que está travando a decisão. Ofereça uma consulta de avaliação gratuita para tirar dúvidas sem compromisso.

**"Tenho medo de dentista"**
Entenda: ansiedade dental é muito comum (30-40% da população).
Resposta: Valide o sentimento. Mencione sedação consciente se disponível. Explique que a clínica tem protocolo para pacientes ansiosos.

**"Preciso consultar meu marido/esposa"**
Entenda: decisão compartilhada, especialmente para tratamentos caros.
Resposta: Ofereça trazer o cônjuge na consulta de avaliação. Envie o orçamento por escrito para facilitar a conversa.

**"Vou esperar melhorar"**
Entenda: o paciente está adiando por medo, custo ou prioridade.
Resposta: Explique os riscos de adiar (tratamento mais complexo e caro no futuro). Crie urgência genuína baseada no caso clínico.', 30),

('clinica_odontologica', 'full', 'scripts', 'Scripts de Abordagem', 
'**Primeira mensagem — Lead que preencheu formulário de interesse:**
"Oi [nome]! Aqui é a [persona] da [clínica] 😊 Vi que você tem interesse em [serviço]. Posso te contar mais sobre como funciona?"

**Após o cliente confirmar interesse:**
"Ótimo! A gente costuma começar com uma avaliação para entender exatamente o que você precisa. Você prefere vir [dia 1] ou [dia 2]?"

**Quando o cliente pergunta sobre preço antes da avaliação:**
"O valor varia bastante dependendo do caso de cada pessoa. Na avaliação a gente consegue te dar um orçamento certinho. Quer agendar?"

**Quando o cliente some após mostrar interesse:**
"Oi [nome], tudo bem? Queria saber se você ainda tem interesse na avaliação. Qualquer dúvida pode perguntar 😊"

**Confirmação de agendamento:**
"Perfeito! Agendado para [dia] às [horário]. Te esperamos! Qualquer dúvida é só falar 😊"', 40),

('clinica_odontologica', 'full', 'terms', 'Termos Técnicos Importantes', 
'**Implante dentário**: Substituto artificial para a raiz do dente, feito de titânio.
**Prótese sobre implante**: Coroa ou dentadura fixada sobre implantes.
**Faceta de porcelana**: Lâmina fina de porcelana colada na frente do dente para estética.
**Lente de contato dental**: Faceta ultra-fina (0,3mm), menos desgaste do dente.
**Clareamento a laser**: Clareamento com gel ativado por luz LED/laser, resultado mais rápido.
**Tratamento de canal (endodontia)**: Remoção da polpa infectada do dente para salvá-lo.
**Gengivoplastia**: Cirurgia para remodelar a gengiva (sorriso gengival).
**Bruxismo**: Ranger/apertar os dentes, geralmente durante o sono.
**Placa de bruxismo**: Protetor bucal para bruxismo.
**Ortodontia**: Tratamento com aparelho para alinhar os dentes.
**Alinhador transparente (Invisalign/similares)**: Aparelho removível e invisível.
**Periodontia**: Especialidade que trata gengiva e osso de suporte dos dentes.', 50),

('clinica_odontologica', 'full', 'rules', 'Regras de Negócio', 
'1. NUNCA confirme preços sem que o paciente passe por avaliação — os valores variam por caso.
2. NUNCA prometa resultados específicos (ex: "vai ficar perfeito") — cada caso é único.
3. Se o paciente relatar dor intensa, priorize agendamento urgente.
4. Não discuta diagnósticos — apenas o dentista pode diagnosticar.
5. Se o paciente perguntar sobre convênio/plano, confirme com a clínica antes de responder.
6. Respeite o horário de funcionamento da clínica ao sugerir agendamentos.
7. Se o paciente mencionar urgência (dor, dente quebrado), ofereça o horário mais próximo disponível.', 60);

-- MODO SIMPLIFICADO — Clínica Odontológica
INSERT INTO public.ai_niche_knowledge (niche_slug, agent_mode, section_type, title, content, position) VALUES
('clinica_odontologica', 'simple', 'presentation', 'Missão do Agente Simplificado',
'O agente simplificado tem como missão principal realizar tarefas operacionais de forma eficiente:
- Confirmar consultas agendadas
- Enviar formulários de anamnese
- Enviar pesquisa NPS após consulta
- Solicitar avaliação no Google ou indicação

Para qualquer dúvida clínica, comercial complexa ou situação fora do roteiro, o agente deve solicitar que um humano assuma a conversa.', 10),

('clinica_odontologica', 'simple', 'scripts', 'Scripts Operacionais',
'**Confirmação de consulta:**
"Oi [nome]! Aqui é a [persona] da [clínica]. Sua consulta está agendada para [dia] às [horário]. Você confirma presença? 😊"

**Se confirmar:**
"Ótimo! Te esperamos. Qualquer dúvida é só falar!"

**Se cancelar:**
"Tudo bem! Posso reagendar para outro dia? Qual seria o melhor horário pra você?"

**Envio de anamnese:**
"Antes da sua consulta, pedimos que preencha esse formulário rapidinho. Leva menos de 2 minutos: [LINK]"

**Envio de NPS:**
"Oi [nome]! Como foi sua consulta? Sua opinião é muito importante pra gente 😊 [LINK]"

**Pedido de avaliação Google:**
"Oi [nome]! Ficamos felizes que você gostou! Você toparia deixar uma avaliação no Google? Ajuda muito: [LINK]"

**Quando não souber responder:**
"Boa pergunta! Vou chamar alguém da nossa equipe para te ajudar melhor 😊"', 20),

('clinica_odontologica', 'simple', 'rules', 'Regras do Modo Simplificado',
'1. Foco total nas tarefas operacionais: confirmar, enviar links, coletar feedback.
2. Para qualquer pergunta clínica, comercial ou complexa: escalar para humano imediatamente.
3. Não tente vender ou explicar tratamentos — isso é função do modo completo.
4. Se o paciente demonstrar insatisfação, escalar para humano imediatamente.
5. Manter tom amigável e eficiente — sem enrolação.
6. Máximo 3 tentativas de confirmação antes de escalar para humano.', 30);

-- ============================================================
-- Dados iniciais: conhecimento base para Estética
-- ============================================================

INSERT INTO public.ai_niche_knowledge (niche_slug, agent_mode, section_type, title, content, position) VALUES
('estetica', 'full', 'presentation', 'Apresentação do Segmento',
'Clínicas de estética oferecem procedimentos para melhoria da aparência e bem-estar. Os serviços variam de tratamentos faciais e corporais a procedimentos minimamente invasivos.

O processo de decisão do cliente geralmente envolve:
1. Desejo de melhoria estética ou bem-estar
2. Pesquisa de procedimentos e clínicas
3. Contato para tirar dúvidas e agendar avaliação
4. Consulta de avaliação (muitas vezes gratuita)
5. Apresentação do protocolo e orçamento
6. Início do tratamento', 10),

('estetica', 'full', 'objections', 'Objeções Comuns',
'**"É muito caro"**
Apresente o parcelamento. Explique que é um investimento em autoestima e bem-estar. Compare com o custo de não tratar.

**"Tenho medo de procedimentos"**
Explique que os procedimentos são seguros e realizados por profissionais certificados. Ofereça uma consulta para esclarecer dúvidas.

**"Vou pensar"**
Pergunte o que está impedindo a decisão. Ofereça uma avaliação gratuita sem compromisso.

**"Já tentei outros tratamentos e não funcionou"**
Valide a frustração. Explique a diferença do protocolo da clínica. Ofereça uma avaliação personalizada.', 30),

('estetica', 'full', 'rules', 'Regras de Negócio',
'1. Nunca prometa resultados específicos sem avaliação.
2. Não discuta procedimentos médicos invasivos (botox, preenchimento) — apenas médicos podem indicar.
3. Se o cliente relatar reação adversa a procedimento anterior, escalar para humano imediatamente.
4. Respeite os horários de funcionamento da clínica.', 60);

-- MODO SIMPLIFICADO — Estética
INSERT INTO public.ai_niche_knowledge (niche_slug, agent_mode, section_type, title, content, position) VALUES
('estetica', 'simple', 'presentation', 'Missão do Agente Simplificado',
'Confirmar agendamentos, enviar formulários de anamnese, coletar NPS e solicitar avaliações/indicações. Para dúvidas sobre procedimentos ou situações complexas, escalar para humano.', 10),

('estetica', 'simple', 'rules', 'Regras do Modo Simplificado',
'1. Foco em tarefas operacionais: confirmar, enviar links, coletar feedback.
2. Qualquer pergunta sobre procedimentos: escalar para humano.
3. Insatisfação do cliente: escalar imediatamente.', 30);
