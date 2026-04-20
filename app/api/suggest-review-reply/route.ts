import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { businessName, reviewerName, rating, reviewText } = await request.json();

    if (!businessName || !reviewerName || rating == null) {
      return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const isNegative = rating <= 2;
    const isNeutral = rating === 3;

    const tone = isNegative
      ? 'empático, profissional e focado em resolver o problema'
      : isNeutral
      ? 'agradecido, profissional e mostrando abertura para melhorar'
      : 'caloroso, genuinamente agradecido e que reforce os pontos positivos';

    const instruction = isNegative
      ? 'Reconheça o problema, peça desculpas sinceras, ofereça solução ou contato direto. NÃO seja defensivo.'
      : isNeutral
      ? 'Agradeça o feedback, mostre que valoriza a opinião e que está trabalhando para melhorar.'
      : 'Agradeça de forma personalizada, mencione algo específico do comentário se houver, convide para voltar.';

    const prompt = `Você é o responsável pelo atendimento do negócio "${businessName}" no Google.

Escreva UMA resposta para a seguinte avaliação do Google:

Avaliador: ${reviewerName}
Nota: ${rating}/5 estrelas
Comentário: "${reviewText || '(sem comentário)'}"

Tom desejado: ${tone}
Instrução: ${instruction}

Regras:
- Máximo 3 parágrafos curtos
- Comece com "Olá, ${reviewerName}!" ou similar
- Seja específico ao comentário quando possível
- Não use emojis excessivos
- Escreva em português brasileiro
- Assine como a equipe do ${businessName}
- NÃO inclua aspas na resposta, escreva diretamente o texto

Responda apenas com o texto da resposta, sem explicações adicionais.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    } as any);

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('Error generating review reply:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
