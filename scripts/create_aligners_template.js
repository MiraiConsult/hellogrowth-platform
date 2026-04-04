const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const now = Date.now();

const template = {
  name: 'Anamnese — Alinhadores Invisíveis',
  description: 'Formulário de pré-venda para qualificar pacientes interessados em alinhadores invisíveis. Identifica nível de incômodo, motivação, objeções e prontidão para iniciar tratamento.',
  category: 'Odontologia',
  objective: 'Qualificar leads para tratamento com alinhadores invisíveis, identificando motivação, objeções e prontidão de compra.',
  tone: 'Empático e consultivo',
  tags: ['odontologia', 'alinhadores', 'ortodontia', 'pre-venda', 'qualificacao'],
  tipo_venda: 'pre_venda',
  ramo_negocio: 'odontologia',
  is_active: true,
  use_count: 0,
  questions: [
    {
      id: String(now + 1),
      text: 'Como você avalia seu sorriso hoje?',
      type: 'single',
      required: true,
      options: [
        { label: 'Estou satisfeito', score: 0 },
        { label: 'Poderia melhorar', score: 2 },
        { label: 'Me incomoda bastante', score: 3 },
        { label: 'Evito sorrir', score: 4 },
      ],
    },
    {
      id: String(now + 2),
      text: 'O que mais te incomoda no seu sorriso?',
      type: 'single',
      required: true,
      options: [
        { label: 'Dentes tortos', score: 3 },
        { label: 'Dentes separados', score: 3 },
        { label: 'Mordida errada', score: 3 },
        { label: 'Estética geral', score: 2 },
        { label: 'Nada me incomoda', score: 0 },
      ],
    },
    {
      id: String(now + 3),
      text: 'O quanto seu sorriso impacta sua autoestima?',
      type: 'single',
      required: true,
      options: [
        { label: 'Muito', score: 4 },
        { label: 'Um pouco', score: 2 },
        { label: 'Quase nada', score: 1 },
        { label: 'Nada', score: 0 },
      ],
    },
    {
      id: String(now + 4),
      text: 'Você evita sorrir em fotos ou situações sociais?',
      type: 'single',
      required: true,
      options: [
        { label: 'Sim, frequentemente', score: 4 },
        { label: 'Às vezes', score: 2 },
        { label: 'Raramente', score: 1 },
        { label: 'Nunca', score: 0 },
      ],
    },
    {
      id: String(now + 5),
      text: 'Se pudesse alinhar seus dentes de forma discreta, você faria?',
      type: 'single',
      required: true,
      options: [
        { label: 'Sim, com certeza', score: 4 },
        { label: 'Provavelmente sim', score: 3 },
        { label: 'Talvez', score: 1 },
        { label: 'Não tenho interesse', score: 0 },
      ],
    },
    {
      id: String(now + 6),
      text: 'O que mais te impede de iniciar um tratamento?',
      type: 'single',
      required: true,
      options: [
        { label: 'Preço', score: 2 },
        { label: 'Tempo', score: 2 },
        { label: 'Dor/desconforto', score: 1 },
        { label: 'Aparência do aparelho', score: 2 },
        { label: 'Falta de confiança', score: 1 },
        { label: 'Falta de tempo', score: 2 },
      ],
    },
    {
      id: String(now + 7),
      text: 'Qual sua maior dúvida sobre alinhadores invisíveis?',
      type: 'single',
      required: false,
      options: [
        { label: 'Funciona mesmo?', score: 1 },
        { label: 'Serve para meu caso?', score: 1 },
        { label: 'Quanto custa?', score: 1 },
        { label: 'Quanto tempo demora?', score: 1 },
        { label: 'Como é o acompanhamento?', score: 1 },
      ],
    },
    {
      id: String(now + 8),
      text: 'Você conseguiria usar um alinhador por 20–22h por dia?',
      type: 'single',
      required: true,
      options: [
        { label: 'Sim', score: 4 },
        { label: 'Acho que sim', score: 3 },
        { label: 'Tenho dúvidas', score: 1 },
        { label: 'Não', score: 0 },
      ],
    },
    {
      id: String(now + 9),
      text: 'Você pretende melhorar seu sorriso em quanto tempo?',
      type: 'single',
      required: true,
      options: [
        { label: 'Até 3 meses', score: 4 },
        { label: 'Até 6 meses', score: 3 },
        { label: 'Até 1 ano', score: 2 },
        { label: 'Sem previsão', score: 0 },
      ],
    },
    {
      id: String(now + 10),
      text: 'Se existisse uma condição acessível, você começaria agora?',
      type: 'single',
      required: true,
      options: [
        { label: 'Sim', score: 4 },
        { label: 'Talvez', score: 2 },
        { label: 'Não', score: 0 },
      ],
    },
    {
      id: String(now + 11),
      text: 'Gostaria de receber uma avaliação do seu caso?',
      type: 'single',
      required: true,
      options: [
        { label: 'Sim', score: 4 },
        { label: 'Talvez', score: 2 },
        { label: 'Não', score: 0 },
      ],
    },
  ],
  // Scoring embutido no campo objective (usado pelo FormBuilder para exibir threshold)
  // max_score: 38 | threshold: 22 | Frio: 0-12 | Morno: 13-21 | Quente: 22-38
};

(async () => {
  const { data, error } = await supabase
    .from('campaign_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('ERRO:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('Template criado com sucesso!');
  console.log('ID:', data.id);
  console.log('Nome:', data.name);
  console.log('Perguntas:', data.questions.length);
})();
