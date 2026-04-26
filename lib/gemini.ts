import { GoogleGenerativeAI } from "@google/generative-ai";

// Retry com backoff exponencial para chamadas ao Gemini
async function callWithRetry(
  fn: () => Promise<string>,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (!result || result.trim().length === 0) {
        throw new Error('Resposta vazia do Gemini');
      }
      return result;
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
      
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      console.log(`[Gemini Retry] Tentativa ${attempt + 1}/${maxRetries} após ${delay}ms - Erro: ${msg.substring(0, 100)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

// Helper function to generate content using Gemini API (com retry e maxOutputTokens)
export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  options?: { maxOutputTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });

  return callWithRetry(async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 8192,
      },
    });
    return result.response.text();
  });
}

// Helper for chat-style conversations (com retry e maxOutputTokens)
export async function generateChatContent(
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction?: string,
  temperature: number = 0.4,
  maxOutputTokens: number = 8192
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });

  return callWithRetry(async () => {
    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });
    return result.response.text();
  });
}
