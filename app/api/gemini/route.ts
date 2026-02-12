import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30; // Timeout de 30 segundos

export async function POST(request: NextRequest) {
  try {
    const { prompt, systemInstruction } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt é obrigatório' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      console.error('Gemini API key not found');
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      ...(systemInstruction && { systemInstruction }),
    });

    // Configuração para respostas mais rápidas e consistentes
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response.text();

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('Erro na API Gemini:', error);

    // Tratamento específico de erros
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'A requisição demorou muito. Tente novamente.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao processar a requisição', details: error.message },
      { status: 500 }
    );
  }
}
