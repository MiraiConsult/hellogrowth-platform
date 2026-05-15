import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente (seguro)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Detectar se estamos no browser (client-side) ou no servidor (server-side)
const isBrowser = typeof window !== 'undefined';

// No browser, usar proxy local para evitar ERR_CONNECTION_RESET
// No servidor (API routes), chamar Supabase diretamente
const getProxyUrl = (): string => {
  if (!isBrowser) return supabaseUrl;
  // No browser, rotear pelo proxy do Vercel
  const origin = window.location.origin;
  return `${origin}/api/supabase-proxy`;
};

// Fetch com retry automático para lidar com falhas intermitentes
const fetchWithRetry = async (
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> => {
  const maxRetries = 3;
  const baseDelay = 1500;

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

export const supabase = createClient(getProxyUrl(), supabaseAnonKey, {
  global: {
    fetch: fetchWithRetry,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

export const isDbConnected = () => {
  return !!supabase;
};
