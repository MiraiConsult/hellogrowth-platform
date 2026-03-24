import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return redirectWithPage(appUrl, 'gbp_error', 'Conexão com Google cancelada');
    }

    if (!code || !stateRaw) {
      return redirectWithPage(appUrl, 'gbp_error', 'Parâmetros inválidos');
    }

    let state: { tenantId: string; userId: string };
    try {
      state = JSON.parse(stateRaw);
    } catch {
      return redirectWithPage(appUrl, 'gbp_error', 'State inválido');
    }

    const redirectUri = `${appUrl}/api/gbp/callback`;

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Trocar code por tokens
    let tokens: any;
    try {
      const tokenResponse = await client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (tokenErr: any) {
      console.error('[GBP Callback] Error getting tokens:', tokenErr.message);
      return redirectWithPage(appUrl, 'gbp_error', 'Não foi possível obter token de acesso');
    }

    if (!tokens.access_token) {
      return redirectWithPage(appUrl, 'gbp_error', 'Não foi possível obter token de acesso');
    }

    // ── SALVAR TOKENS NO BANCO ──
    const updateData: Record<string, any> = {
      gbp_access_token: tokens.access_token,
      gbp_refresh_token: tokens.refresh_token || null,
      gbp_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      gbp_connected_at: new Date().toISOString(),
    };

    // Tentar update primeiro
    const { data: updateResult, error: dbError1 } = await supabaseAdmin
      .from('business_profile')
      .update(updateData)
      .eq('tenant_id', state.tenantId)
      .select('tenant_id');

    if (dbError1) {
      console.error('[GBP Callback] Update error:', JSON.stringify(dbError1));
    }

    // Se update não afetou nenhuma linha (registro não existe), tentar insert
    if (!updateResult || updateResult.length === 0) {
      console.log('[GBP Callback] Update matched 0 rows, trying insert...');
      const { error: insertErr } = await supabaseAdmin
        .from('business_profile')
        .insert({
          tenant_id: state.tenantId,
          user_id: state.userId,
          ...updateData,
        });

      if (insertErr) {
        console.error('[GBP Callback] Insert also failed:', JSON.stringify(insertErr));
      }
    }

    // ── BUSCAR LOCATIONS (opcional) ──
    let locations: any[] = [];
    let accountName = '';

    try {
      const accountsResp = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );

      if (accountsResp.ok) {
        const accountsData = await accountsResp.json();
        const accounts = accountsData.accounts || [];

        if (accounts.length > 0) {
          accountName = accounts[0].name;

          const locResp = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
          );

          if (locResp.ok) {
            const locData = await locResp.json();
            locations = locData.locations || [];
          }
        }
      }
    } catch (apiErr: any) {
      console.error('[GBP Callback] API error (non-blocking):', apiErr.message);
    }

    // Atualizar com dados de location
    if (accountName || locations.length > 0) {
      const locUpdate: Record<string, any> = {};
      if (accountName) locUpdate.gbp_account_name = accountName;

      if (locations.length === 1) {
        const loc = locations[0];
        locUpdate.gbp_location_name = loc.name;
        locUpdate.gbp_location_title = loc.title;
        locUpdate.gbp_location_id = loc.name?.split('/').pop();

        if (loc.metadata?.mapsUri) locUpdate.gbp_maps_uri = loc.metadata.mapsUri;
        if (loc.metadata?.newReviewUri) {
          const match = loc.metadata.newReviewUri.match(/placeid=([^&]+)/);
          if (match) locUpdate.google_place_id = match[1];
        }
      }

      if (Object.keys(locUpdate).length > 0) {
        await supabaseAdmin
          .from('business_profile')
          .update(locUpdate)
          .eq('tenant_id', state.tenantId);
      }
    }

    // Redirecionar com página HTML intermediária
    if (locations.length > 1) {
      const locParam = encodeURIComponent(JSON.stringify(
        locations.map(l => ({
          name: l.name,
          title: l.title,
          address: l.storefrontAddress?.addressLines?.join(', '),
          locationId: l.name?.split('/').pop(),
          newReviewUri: l.metadata?.newReviewUri,
        }))
      ));
      return redirectWithPage(appUrl, 'gbp_connected', 'true', `&gbp_select_location=true&locations=${locParam}&tenantId=${state.tenantId}`);
    }

    return redirectWithPage(appUrl, 'gbp_connected', 'true');
  } catch (err: any) {
    console.error('[GBP Callback] Unhandled error:', err.message, err.stack);
    return redirectWithPage(appUrl, 'gbp_error', 'Erro ao conectar com Google Business Profile');
  }
}

/**
 * Retorna uma página HTML intermediária que faz o redirect via JavaScript.
 * Isso resolve o problema do Next.js não conseguir redirecionar para URLs com hash (#).
 * O browser executa o JS e navega para a URL correta com o hash fragment.
 */
function redirectWithPage(appUrl: string, paramKey: string, paramValue: string, extraParams: string = ''): NextResponse {
  const targetUrl = `${appUrl}/#digital-diagnostic?${paramKey}=${encodeURIComponent(paramValue)}${extraParams}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conectando...</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #64748b;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #22c55e;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Conectando ao Google Business Profile...</p>
  </div>
  <script>
    // Redirect via JavaScript para preservar o hash fragment
    window.location.replace("${targetUrl}");
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
