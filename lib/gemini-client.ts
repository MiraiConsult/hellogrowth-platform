/**
 * Client-side helper para chamar a API Gemini via /api/gemini (server-side proxy)
 * Inclui retry automático com backoff exponencial
 */

interface GeminiClientOptions {
  systemInstruction?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export async function callGeminiAPI(
  prompt: string,
  options: GeminiClientOptions = {}
): Promise<string> {
  const { systemInstruction, maxRetries = 3, timeoutMs = 55000 } = options;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1500; // 3s, 6s
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemInstruction }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Rate limit - sempre retry
        if (response.status === 429) {
          throw new Error(`Rate limit: ${errorData.error || 'Too many requests'}`);
        }
        // Timeout - sempre retry
        if (response.status === 504) {
          throw new Error(`Timeout: ${errorData.error || 'Request timeout'}`);
        }
        // Server error - retry
        if (response.status >= 500) {
          throw new Error(`Server error ${response.status}: ${errorData.error || 'Internal error'}`);
        }
        // Client error - não retry
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.response || data.text || '';

      if (!text || text.trim().length === 0) {
        throw new Error('Resposta vazia da API');
      }

      return text;
    } catch (error: any) {
      lastError = error;
      const msg = error.message || '';

      // Erros que NÃO devem fazer retry
      const isNonRetryable = 
        msg.includes('HTTP 400') ||
        msg.includes('HTTP 401') ||
        msg.includes('HTTP 403');

      if (isNonRetryable) {
        throw error;
      }

      // Se é a última tentativa, throw
      if (attempt === maxRetries - 1) {
        throw error;
      }

      console.warn(`[GeminiClient] Retry ${attempt + 1}/${maxRetries}: ${msg.substring(0, 100)}`);
    }
  }

  throw lastError;
}

/**
 * Client-side helper para chamadas multi-turn (chat) via /api/gemini
 */
export async function callGeminiChat(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  options: GeminiClientOptions & { temperature?: number } = {}
): Promise<string> {
  const { systemInstruction, maxRetries = 3, timeoutMs = 55000, temperature } = options;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1500;
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction, temperature }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 429) throw new Error(`Rate limit: ${errorData.error}`);
        if (response.status === 504) throw new Error(`Timeout: ${errorData.error}`);
        if (response.status >= 500) throw new Error(`Server error ${response.status}: ${errorData.error}`);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.response || data.text || '';

      if (!text || text.trim().length === 0) {
        throw new Error('Resposta vazia da API');
      }

      return text;
    } catch (error: any) {
      lastError = error;
      const msg = error.message || '';
      const isNonRetryable = msg.includes('HTTP 400') || msg.includes('HTTP 401') || msg.includes('HTTP 403');
      if (isNonRetryable) throw error;
      if (attempt === maxRetries - 1) throw error;
      console.warn(`[GeminiChat] Retry ${attempt + 1}/${maxRetries}: ${msg.substring(0, 100)}`);
    }
  }

  throw lastError;
}

/**
 * Helper para extrair JSON de resposta do Gemini (remove markdown wrappers)
 */
export function parseGeminiJSON<T = any>(text: string): T {
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '').trim();
  
  // Tenta encontrar o JSON no texto
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  // Tenta array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }
  
  // Tenta parse direto
  return JSON.parse(cleaned);
}
