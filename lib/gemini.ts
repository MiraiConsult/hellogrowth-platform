import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Preço do Gemini 2.5 Flash (estimativa por 1M tokens)
const PRICING = {
  promptPerMillion: 0.15,
  completionPerMillion: 0.60,
};

// Estimar tokens (1 token ≈ 4 chars em português)
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
  durationMs?: number;
}) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
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
      metadata: { duration_ms: params.durationMs || 0 },
    });
  } catch (e) {
    console.warn('Failed to log AI usage:', e);
  }
}

// Retry com backoff exponencial
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error.message || '';
      
      const isRetryable = 
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('overloaded') ||
        msg.includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('INTERNAL') ||
        msg.includes('Resposta vazia') ||
        msg.includes('timeout') ||
        msg.includes('fetch failed') ||
        error.name === 'AbortError';
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`[Gemini Retry] Tentativa ${attempt + 1}/${maxRetries} após ${delay}ms - Erro: ${msg.substring(0, 100)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

// Helper function to generate content using Gemini API (com retry, maxOutputTokens e logging)
export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  options?: { maxOutputTokens?: number; temperature?: number; tenantId?: string; endpoint?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const startTime = Date.now();
  const endpointName = options?.endpoint || 'server-side';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });

  try {
    const result = await callWithRetry(async () => {
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxOutputTokens ?? 8192,
        },
      });
      const text = res.response.text();
      if (!text || text.trim().length === 0) throw new Error('Resposta vazia do Gemini');
      return { text, usageMetadata: res.response.usageMetadata };
    });

    const promptTokens = result.usageMetadata?.promptTokenCount || estimateTokens(prompt + (systemInstruction || ''));
    const completionTokens = result.usageMetadata?.candidatesTokenCount || estimateTokens(result.text);

    logAIUsage({
      tenantId: options?.tenantId,
      endpoint: endpointName,
      promptTokens,
      completionTokens,
      status: 'success',
      durationMs: Date.now() - startTime,
    });

    return result.text;
  } catch (error: any) {
    logAIUsage({
      tenantId: options?.tenantId,
      endpoint: endpointName,
      promptTokens: estimateTokens(prompt + (systemInstruction || '')),
      completionTokens: 0,
      status: 'error',
      errorMessage: error.message?.substring(0, 500),
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

// Helper for chat-style conversations (com retry, maxOutputTokens e logging)
export async function generateChatContent(
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction?: string,
  temperature: number = 0.4,
  maxOutputTokens: number = 8192,
  options?: { tenantId?: string; endpoint?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const startTime = Date.now();
  const endpointName = options?.endpoint || 'server-chat';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });

  const allText = contents.map(c => c.parts.map(p => p.text).join('')).join('');

  try {
    const result = await callWithRetry(async () => {
      const res = await model.generateContent({
        contents,
        generationConfig: { temperature, maxOutputTokens },
      });
      const text = res.response.text();
      if (!text || text.trim().length === 0) throw new Error('Resposta vazia do Gemini');
      return { text, usageMetadata: res.response.usageMetadata };
    });

    const promptTokens = result.usageMetadata?.promptTokenCount || estimateTokens(allText + (systemInstruction || ''));
    const completionTokens = result.usageMetadata?.candidatesTokenCount || estimateTokens(result.text);

    logAIUsage({
      tenantId: options?.tenantId,
      endpoint: endpointName,
      promptTokens,
      completionTokens,
      status: 'success',
      durationMs: Date.now() - startTime,
    });

    return result.text;
  } catch (error: any) {
    logAIUsage({
      tenantId: options?.tenantId,
      endpoint: endpointName,
      promptTokens: estimateTokens(allText + (systemInstruction || '')),
      completionTokens: 0,
      status: 'error',
      errorMessage: error.message?.substring(0, 500),
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}
