import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy admin client (service role).
// A criação é deferida até o primeiro uso para evitar que o "collect page data"
// do Next.js falhe quando alguma env não estiver presente nesse estágio do build.
let _client: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return (_client as any)[prop];
  },
});
