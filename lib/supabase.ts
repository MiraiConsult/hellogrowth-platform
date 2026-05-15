import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente (seguro)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Fetch com retry automático para lidar com ERR_CONNECTION_RESET intermitente
const fetchWithRetry = async (
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, cache: 'no-store' });
      return response;
    } catch (error: any) {
      const isNetworkError =
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('ERR_CONNECTION_RESET') ||
        error?.message?.includes('ERR_QUIC_PROTOCOL_ERROR') ||
        error?.message?.includes('net::') ||
        error?.name === 'TypeError';

      if (!isNetworkError || attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `[Supabase] Tentativa ${attempt}/${maxRetries} falhou (${error?.message}). Retentando em ${baseDelay * attempt}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, baseDelay * attempt));
    }
  }

  // Fallback (nunca deve chegar aqui)
  return fetch(url, { ...options, cache: 'no-store' });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithRetry,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 0, // Desabilitar realtime completamente
    },
  },
});

export const isDbConnected = () => {
  return !!supabase;
};
