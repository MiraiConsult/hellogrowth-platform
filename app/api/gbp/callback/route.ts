import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');
    const error = searchParams.get('error');

    // Derivar a URL base da própria requisição para funcionar em qualquer ambiente
    const requestUrl = new URL(request.url);
    const appUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    if (error) {
      console.error('GBP OAuth error:', error);
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Conexão com Google cancelada')}`);
    }

    if (!code || !stateRaw) {
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Parâmetros inválidos')}`);
    }

    let state: { tenantId: string; userId: string };
    try {
      state = JSON.parse(stateRaw);
    } catch {
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('State inválido')}`);
    }

    const redirectUri = `${appUrl}/api/gbp/callback`; // appUrl derivado da requisição

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Trocar code por tokens
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Não foi possível obter token de acesso')}`);
    }

    // Buscar as locations do Google Business Profile
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

    let locations: any[] = [];
    let accountName = '';

    if (locationsResponse.ok) {
      const accountsData = await locationsResponse.json();
      const accounts = accountsData.accounts || [];

      if (accounts.length > 0) {
        accountName = accounts[0].name; // ex: "accounts/123456789"

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

        if (locResp.ok) {
          const locData = await locResp.json();
          locations = locData.locations || [];
        }
      }
    }

    // Salvar tokens e dados no business_profiles
    const updateData: Record<string, any> = {
      gbp_access_token: tokens.access_token,
      gbp_refresh_token: tokens.refresh_token || null,
      gbp_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      gbp_account_name: accountName || null,
      gbp_connected_at: new Date().toISOString(),
    };

    // Se houver exatamente 1 location, preencher automaticamente
    if (locations.length === 1) {
      const loc = locations[0];
      const locationId = loc.name?.split('/').pop(); // ex: "locations/123" -> "123"

      // Tentar obter o Place ID via Places API usando o nome do negócio
      updateData.gbp_location_name = loc.name;
      updateData.gbp_location_title = loc.title;
      updateData.gbp_location_id = locationId;

      // Se tiver metadata com o placeId do Google Maps
      if (loc.metadata?.mapsUri) {
        updateData.gbp_maps_uri = loc.metadata.mapsUri;
      }
      if (loc.metadata?.newReviewUri) {
        // Extrair place_id da URL de review se disponível
        const reviewUrl = loc.metadata.newReviewUri;
        const placeIdMatch = reviewUrl.match(/placeid=([^&]+)/);
        if (placeIdMatch) {
          updateData.google_place_id = placeIdMatch[1];
        }
      }
    }

    // Salvar no business_profiles
    const { error: dbError } = await supabaseAdmin
      .from('business_profile')
      .update(updateData)
      .eq('tenant_id', state.tenantId);

    if (dbError) {
      console.error('Error saving GBP tokens:', dbError);
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

    return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_connected=true`);
  } catch (err: any) {
    console.error('GBP callback error:', err);
    // Derivar a URL base da própria requisição para funcionar em qualquer ambiente
    const requestUrl = new URL(request.url);
    const appUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    return NextResponse.redirect(`${appUrl}/#digital-diagnostic?gbp_error=${encodeURIComponent('Erro ao conectar com Google Business Profile')}`);
  }
}
