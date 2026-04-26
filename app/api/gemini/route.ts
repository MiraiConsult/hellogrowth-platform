import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// Preço do Gemini 2.5 Flash (estimativa por 1M tokens)
const PRICING = {
  promptPerMillion: 0.15,    // $0.15 per 1M input tokens
  completionPerMillion: 0.60, // $0.60 per 1M output tokens
};

// Supabase client para logging
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Estimar tokens a partir do texto (aproximação: 1 token ≈ 4 chars em português)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Logar uso de IA no banco
async function logAIUsage(params: {
  tenantId?: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  status: 'success' | 'error';
  errorMessage?: string;
  metadata?: any;
}) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const totalTokens = params.promptTokens + params.completionTokens;
    const estimatedCost = 
      (params.promptTokens / 1_000_000) * PRICING.promptPerMillion +
      (params.completionTokens / 1_000_000) * PRICING.completionPerMillion;

    await supabase.from('ai_usage_logs').insert({
      tenant_id: params.tenantId || null,
      endpoint: params.endpoint,
      model: 'gemini-2.5-flash',
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
      status: params.status,
      error_message: params.errorMessage || null,
      metadata: params.metadata || {},
    });
  } catch (e) {
    // Não falhar a request por erro de logging
    console.warn('Failed to log AI usage:', e);
  }
}

// Retry com backoff exponencial
async function callGeminiWithRetry(model: any, contents: any, generationConfig: any, maxRetries = 3): Promise<{ text: string; usageMetadata?: any }> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent({ contents, generationConfig });
      const text = result.response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Resposta vazia do Gemini');
      }
      
      // Extrair metadata de uso se disponível
      const usageMetadata = result.response.usageMetadata || null;
      
      return { text, usageMetadata };
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || '';
      
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
      
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`Gemini retry ${attempt + 1}/${maxRetries} após ${delay}ms - Erro: ${errorMsg.substring(0, 100)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let promptText = '';
  let tenantId: string | undefined;
  let endpoint = '/api/gemini';
  
  try {
    const body = await request.json();
    const { prompt, systemInstruction, contents: rawContents, temperature } = body;
    tenantId = body.tenantId;
    endpoint = body.endpoint || '/api/gemini';

    if (!prompt && (!rawContents || rawContents.length === 0)) {
      return NextResponse.json(
        { error: 'Prompt ou contents é obrigatório' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || '';

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
      temperature: temperature ?? 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    const contents = rawContents || [{ role: 'user', parts: [{ text: prompt }] }];
    
    // Calcular tokens do prompt para logging
    promptText = contents.map((c: any) => c.parts?.map((p: any) => p.text || '').join('') || '').join('');
    if (systemInstruction) promptText = systemInstruction + '\n' + promptText;
    
    const { text: responseText, usageMetadata } = await callGeminiWithRetry(model, contents, generationConfig, 3);

    // Logar uso com sucesso
    const promptTokens = usageMetadata?.promptTokenCount || estimateTokens(promptText);
    const completionTokens = usageMetadata?.candidatesTokenCount || estimateTokens(responseText);
    
    logAIUsage({
      tenantId,
      endpoint,
      promptTokens,
      completionTokens,
      status: 'success',
      metadata: {
        duration_ms: Date.now() - startTime,
        has_system_instruction: !!systemInstruction,
        is_multi_turn: !!rawContents,
      },
    });

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('Erro na API Gemini (após retries):', error);

    // Logar erro
    logAIUsage({
      tenantId,
      endpoint,
      promptTokens: estimateTokens(promptText),
      completionTokens: 0,
      status: 'error',
      errorMessage: error.message?.substring(0, 500),
      metadata: { duration_ms: Date.now() - startTime },
    });

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
