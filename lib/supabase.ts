import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente (seguro)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Usar cache: 'no-store' para evitar ERR_QUIC_PROTOCOL_ERROR em tablets/redes instáveis
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      return fetch(url, { ...options, cache: 'no-store' });
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isDbConnected = () => {
  return !!supabase;
};
