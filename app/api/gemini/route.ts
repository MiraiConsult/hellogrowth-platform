import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Timeout de 60 segundos

// Retry com backoff exponencial
async function callGeminiWithRetry(model: any, contents: any, generationConfig: any, maxRetries = 3): Promise<string> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent({ contents, generationConfig });
      const text = result.response.text();
      
      // Verificar se a resposta não está vazia
      if (!text || text.trim().length === 0) {
        throw new Error('Resposta vazia do Gemini');
      }
      
      return text;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || '';
      
      // Erros que valem retry: rate limit, overloaded, timeout, resposta vazia
      const isRetryable = 
        errorMsg.includes('429') ||
        errorMsg.includes('503') ||
        errorMsg.includes('500') ||
        errorMsg.includes('overloaded') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('INTERNAL') ||
        errorMsg.includes('Resposta vazia') ||
        errorMsg.includes('timeout') ||
        error.name === 'AbortError';
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Backoff exponencial: 2s, 4s, 8s
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`Gemini retry ${attempt + 1}/${maxRetries} após ${delay}ms - Erro: ${errorMsg.substring(0, 100)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

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
      model: 'gemini-2.5-flash',
      ...(systemInstruction && { systemInstruction }),
    });

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    
    // Chamar com retry automático (até 3 tentativas)
    const responseText = await callGeminiWithRetry(model, contents, generationConfig, 3);

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('Erro na API Gemini (após retries):', error);

    if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
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
