import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  // Derivar a URL base da própria requisição para funcionar em qualquer ambiente
  const requestUrl = new URL(request.url);
  const appUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[GBP Callback] Starting. code:', !!code, 'state:', !!stateRaw, 'error:', error);

    if (error) {
      console.error('[GBP Callback] OAuth error from Google:', error);
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Conexão com Google cancelada')}`);
    }

    if (!code || !stateRaw) {
      console.error('[GBP Callback] Missing code or state');
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Parâmetros inválidos')}`);
    }

    let state: { tenantId: string; userId: string };
    try {
      state = JSON.parse(stateRaw);
      console.log('[GBP Callback] Parsed state - tenantId:', state.tenantId, 'userId:', state.userId);
    } catch {
      console.error('[GBP Callback] Failed to parse state:', stateRaw);
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('State inválido')}`);
    }

    const redirectUri = `${appUrl}/api/gbp/callback`;
    console.log('[GBP Callback] Using redirectUri:', redirectUri);

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
      console.log('[GBP Callback] Got tokens. access_token:', !!tokens.access_token, 'refresh_token:', !!tokens.refresh_token);
    } catch (tokenErr: any) {
      console.error('[GBP Callback] Error getting tokens:', tokenErr.message);
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Não foi possível obter token de acesso')}`);
    }

    if (!tokens.access_token) {
      console.error('[GBP Callback] No access_token in response');
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Não foi possível obter token de acesso')}`);
    }

    // ── SALVAR TOKENS IMEDIATAMENTE (antes de qualquer chamada à API do GBP) ──
    // Isso garante que os tokens são salvos mesmo se a busca de locations falhar
    const updateData: Record<string, any> = {
      gbp_access_token: tokens.access_token,
      gbp_refresh_token: tokens.refresh_token || null,
      gbp_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      gbp_connected_at: new Date().toISOString(),
    };

    console.log('[GBP Callback] Saving initial tokens for tenant:', state.tenantId);
    const { error: dbError1 } = await supabaseAdmin
      .from('business_profile')
      .update(updateData)
      .eq('tenant_id', state.tenantId);

    if (dbError1) {
      console.error('[GBP Callback] Error saving initial tokens:', JSON.stringify(dbError1));
      // Tentar upsert como fallback
      const { error: dbError2 } = await supabaseAdmin
        .from('business_profile')
        .upsert({
          tenant_id: state.tenantId,
          user_id: state.userId,
          ...updateData,
        }, { onConflict: 'tenant_id' });

      if (dbError2) {
        console.error('[GBP Callback] Upsert also failed:', JSON.stringify(dbError2));
      } else {
        console.log('[GBP Callback] Upsert succeeded');
      }
    } else {
      console.log('[GBP Callback] Initial tokens saved successfully');
    }

    // ── BUSCAR LOCATIONS (opcional, pode falhar sem impedir a conexão) ──
    let locations: any[] = [];
    let accountName = '';

    try {
      client.setCredentials(tokens);
      const locationsResponse = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[GBP Callback] Accounts API status:', locationsResponse.status);

      if (locationsResponse.ok) {
        const accountsData = await locationsResponse.json();
        const accounts = accountsData.accounts || [];
        console.log('[GBP Callback] Found', accounts.length, 'accounts');

        if (accounts.length > 0) {
          accountName = accounts[0].name;
          console.log('[GBP Callback] Using account:', accountName);

          // Buscar locations do primeiro account
          const locResp = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,metadata`,
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('[GBP Callback] Locations API status:', locResp.status);

          if (locResp.ok) {
            const locData = await locResp.json();
            locations = locData.locations || [];
            console.log('[GBP Callback] Found', locations.length, 'locations');
          } else {
            const errText = await locResp.text();
            console.error('[GBP Callback] Locations API error:', errText);
          }
        }
      } else {
        const errText = await locationsResponse.text();
        console.error('[GBP Callback] Accounts API error:', errText);
      }
    } catch (apiErr: any) {
      console.error('[GBP Callback] Error fetching GBP data:', apiErr.message);
      // Não retornar erro — os tokens já foram salvos
    }

    // ── ATUALIZAR COM DADOS DE LOCATION (se disponível) ──
    if (accountName || locations.length > 0) {
      const locationUpdate: Record<string, any> = {};
      if (accountName) locationUpdate.gbp_account_name = accountName;

      // Se houver exatamente 1 location, preencher automaticamente
      if (locations.length === 1) {
        const loc = locations[0];
        const locationId = loc.name?.split('/').pop();

        locationUpdate.gbp_location_name = loc.name;
        locationUpdate.gbp_location_title = loc.title;
        locationUpdate.gbp_location_id = locationId;

        if (loc.metadata?.mapsUri) {
          locationUpdate.gbp_maps_uri = loc.metadata.mapsUri;
        }
        if (loc.metadata?.newReviewUri) {
          const reviewUrl = loc.metadata.newReviewUri;
          const placeIdMatch = reviewUrl.match(/placeid=([^&]+)/);
          if (placeIdMatch) {
            locationUpdate.google_place_id = placeIdMatch[1];
          }
        }
      }

      if (Object.keys(locationUpdate).length > 0) {
        console.log('[GBP Callback] Updating location data:', Object.keys(locationUpdate));
        const { error: locDbErr } = await supabaseAdmin
          .from('business_profile')
          .update(locationUpdate)
          .eq('tenant_id', state.tenantId);

        if (locDbErr) {
          console.error('[GBP Callback] Error saving location data:', JSON.stringify(locDbErr));
        }
      }
    }

    // Se há múltiplas locations, redirecionar para seleção
    if (locations.length > 1) {
      const locationsParam = encodeURIComponent(JSON.stringify(
        locations.map(l => ({
          name: l.name,
          title: l.title,
          address: l.storefrontAddress?.addressLines?.join(', '),
          locationId: l.name?.split('/').pop(),
          newReviewUri: l.metadata?.newReviewUri,
        }))
      ));
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_connected=true&gbp_select_location=true&locations=${locationsParam}&tenantId=${state.tenantId}`);
    }

    console.log('[GBP Callback] Success! Redirecting to digital-diagnostic');
    return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_connected=true`);
  } catch (err: any) {
    console.error('[GBP Callback] Unhandled error:', err.message, err.stack);
    return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Erro ao conectar com Google Business Profile')}`);
  }
}
