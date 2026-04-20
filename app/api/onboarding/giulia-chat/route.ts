import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

// Contexto específico por etapa do onboarding
const STEP_CONTEXTS: Record<string, string> = {
  'Perfil do Negócio': `Você está ajudando o cliente a preencher o Perfil do Negócio.
Campos importantes:
- Nome da empresa e tipo de negócio (ex: clínica, salão, restaurante, academia)
- Descrição do que a empresa faz (usada pela IA para gerar textos personalizados)
- Público-alvo (quem são os clientes ideais)
- Diferenciais competitivos (o que torna a empresa especial)
- Place ID do Google: código único do negócio no Google Maps, usado para redirecionar clientes satisfeitos para deixar avaliações.
Como encontrar o Place ID: acesse maps.google.com, busque o negócio, clique nele e copie o ID da URL após "place/", ou use a ferramenta oficial em developers.google.com/maps/documentation/places/web-service/place-id.`,

  'Pesquisa de NPS': `Você está ajudando o cliente a criar a primeira pesquisa de NPS (Net Promoter Score).
O NPS é uma pesquisa de satisfação com a pergunta principal: "De 0 a 10, quanto você recomendaria nossa empresa?"
- Clientes com nota 9-10 são Promotores (fãs da marca)
- Clientes com nota 7-8 são Neutros
- Clientes com nota 0-6 são Detratores (insatisfeitos)
Dicas:
- Use templates prontos clicando em "Usar Template" ao criar nova pesquisa
- Crie uma pesquisa de pós-venda para enviar logo após o atendimento
- Ative o redirecionamento para o Google para clientes com nota 9-10
- O link da pesquisa pode ser enviado por WhatsApp, e-mail ou QR Code impresso`,

  'Cadastro de Produtos': `Você está ajudando o cliente a cadastrar produtos e serviços.
Por que isso é importante:
- O sistema calcula o valor do pipeline (oportunidades de venda)
- A IA usa os produtos para sugerir o produto certo para cada lead
- Gera relatórios de conversão por produto
Dicas:
- Comece com os 3-5 produtos/serviços mais vendidos
- Use o botão "Gerar com IA" para criar o catálogo automaticamente descrevendo o que você vende
- Coloque o preço real (ou estimado) para que o pipeline seja calculado corretamente
- Adicione uma boa descrição para que a IA entenda o que cada produto resolve`,

  'Formulário de Pré-venda': `Você está ajudando o cliente a criar o primeiro formulário de captação de leads.
O formulário de pré-venda é usado para:
- Captar novos clientes interessados nos serviços
- Qualificar leads antes do atendimento
- Automatizar o processo de triagem com análise de IA
Dicas:
- Use templates prontos clicando em "Usar Template"
- Inclua perguntas sobre orçamento para qualificar melhor os leads
- Ative a análise de IA para que o sistema classifique automaticamente cada lead
- Coloque o link no Instagram (bio), WhatsApp Business e Google Meu Negócio`,

  'Conectar WhatsApp (MBD)': `Você está ajudando o cliente a conectar o WhatsApp via MBD (Message By Device).
O MBD permite:
- Enviar pesquisas de NPS automaticamente após atendimentos
- Disparar formulários para novos leads
- Receber notificações de avaliações negativas em tempo real
Como conectar:
1. Vá em Configurações → Integrações
2. Clique em "Conectar MBD"
3. Escaneie o QR Code com o WhatsApp do número que será usado
4. Aguarde a confirmação de conexão
Importante: use um número de WhatsApp dedicado para o negócio, não o pessoal.`,

  'Alertas e Relatórios': `Você está ajudando o cliente a configurar alertas e relatórios automáticos.
Tipos de alertas:
- Novo lead: notificação quando alguém preenche o formulário
- Lead de alto valor: quando o lead tem potencial de venda acima do limite configurado
- Detrator: quando um cliente deixa nota baixa no NPS (0-6)
- Relatório semanal/mensal: resumo automático dos resultados
Como configurar:
1. Vá em Configurações → Alertas
2. Adicione os números de WhatsApp para receber as notificações
3. Configure o e-mail para relatórios periódicos
Dica: coloque o número do responsável pelo atendimento para receber alertas de detratores em tempo real.`,
};

export async function POST(request: NextRequest) {
  try {
    const { messages, stepTitle, companyName } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: 'Olá! Como posso te ajudar nessa etapa? 😊' }, { status: 200 });
    }

    const stepContext = STEP_CONTEXTS[stepTitle] || '';

    const systemPrompt = `Você é a Giulia, assistente de onboarding do HelloGrowth — uma plataforma de CRM, NPS e gestão de clientes para pequenas e médias empresas brasileiras.

Você está ajudando ${companyName || 'o cliente'} a configurar o sistema pela primeira vez.
Etapa atual: ${stepTitle || 'Configuração inicial'}.

${stepContext}

Seu estilo de comunicação:
- Simples, acolhedor e direto, como se estivesse ensinando uma criança com carinho
- Use linguagem informal mas profissional (você, não tu)
- Use emojis com moderação (1-2 por resposta no máximo)
- Máximo 3 parágrafos curtos por resposta
- Seja encorajador e positivo
- Responda sempre em português brasileiro
- Se não souber algo específico do negócio do cliente, sugira que ele explore a plataforma

Contexto geral do HelloGrowth:
- NPS: pesquisas de satisfação pós-venda, escala 0-10
- Formulários: captação de leads pré-venda com análise de IA
- MBD: integração com WhatsApp para envio automático de pesquisas
- Place ID: código do Google Maps para redirecionar clientes satisfeitos para avaliações
- Planos: rating (só NPS), client (NPS + formulários), growth (tudo + WhatsApp)
- Produtos: catálogo usado pela IA para calcular pipeline e sugerir produtos para leads`;

    // Tentar Gemini primeiro
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    if (geminiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemPrompt,
        });

        const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const lastMessage = messages[messages.length - 1];
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        const text = result.response.text();

        return NextResponse.json({ message: text });
      } catch (geminiError) {
        console.error('Erro no Gemini, tentando OpenAI:', geminiError);
      }
    }

    // Fallback: OpenAI
    const openaiKey = process.env.OPENAI_API_KEY || '';
    if (openaiKey) {
      try {
        const openaiMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: openaiMessages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text) return NextResponse.json({ message: text });
        }
      } catch (openaiError) {
        console.error('Erro no OpenAI:', openaiError);
      }
    }

    // Fallback final: resposta estática
    return NextResponse.json({
      message: 'Desculpe, não consigo responder agora. Continue seguindo as instruções na tela! Se tiver dúvidas, pode me perguntar novamente em alguns instantes. 😊'
    }, { status: 200 });

  } catch (error) {
    console.error('Erro no chat da Giulia:', error);
    return NextResponse.json({
      message: 'Ops! Tive um probleminha técnico. Mas pode continuar — clique em "Ir para o módulo" para começar a configurar! 😊'
    }, { status: 200 });
  }
}
