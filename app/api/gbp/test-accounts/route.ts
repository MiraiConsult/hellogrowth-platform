import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  const results: Record<string, any> = { tenantId, steps: [] };

  try {
    // 1. Buscar profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profile')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found', profileError }, { status: 404 });
    }

    results.profile = {
      has_access_token: !!profile.gbp_access_token,
      has_refresh_token: !!profile.gbp_refresh_token,
      token_expiry: profile.gbp_token_expiry,
      gbp_location_id: profile.gbp_location_id,
      gbp_account_name: profile.gbp_account_name,
      gbp_location_name: profile.gbp_location_name,
      google_place_id: profile.google_place_id,
    };

    if (!profile.gbp_access_token) {
      return NextResponse.json({ ...results, error: 'No access token' }, { status: 400 });
    }

    // 2. Refresh token if expired
    let accessToken = profile.gbp_access_token;
    if (profile.gbp_token_expiry && new Date(profile.gbp_token_expiry) <= new Date() && profile.gbp_refresh_token) {
      try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        client.setCredentials({ refresh_token: profile.gbp_refresh_token });
        const { credentials } = await client.refreshAccessToken();
        accessToken = credentials.access_token || accessToken;
        results.steps.push({ step: 'token_refresh', status: 'success', new_expiry: credentials.expiry_date });

        // Save new token
        await supabaseAdmin.from('business_profile').update({
          gbp_access_token: credentials.access_token,
          gbp_token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        }).eq('tenant_id', tenantId);
      } catch (e: any) {
        results.steps.push({ step: 'token_refresh', status: 'error', message: e.message });
      }
    } else {
      results.steps.push({ step: 'token_refresh', status: 'skipped', reason: 'token still valid or no refresh token' });
    }

    // 3. Buscar accounts
    try {
      const accountsResp = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const accountsText = await accountsResp.text();
      let accountsData: any;
      try { accountsData = JSON.parse(accountsText); } catch { accountsData = accountsText; }

      results.steps.push({
        step: 'fetch_accounts',
        status: accountsResp.ok ? 'success' : 'error',
        http_status: accountsResp.status,
        response: accountsData,
      });

      const accounts = accountsData?.accounts || [];
      results.accounts_count = accounts.length;

      if (accounts.length > 0) {
        const accountName = accounts[0].name;
        results.account_name = accountName;

        // 4. Buscar locations
        try {
          const locResp = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const locText = await locResp.text();
          let locData: any;
          try { locData = JSON.parse(locText); } catch { locData = locText; }

          results.steps.push({
            step: 'fetch_locations',
            status: locResp.ok ? 'success' : 'error',
            http_status: locResp.status,
            response: locData,
          });

          const locations = locData?.locations || [];
          results.locations_count = locations.length;
          results.locations = locations.map((l: any) => ({
            name: l.name,
            title: l.title,
            locationId: l.name?.split('/').pop(),
            address: l.storefrontAddress?.addressLines?.join(', '),
            placeId: l.metadata?.placeId,
            mapsUri: l.metadata?.mapsUri,
            newReviewUri: l.metadata?.newReviewUri,
          }));

          // 5. Se tem location, tentar buscar reviews
          if (locations.length > 0) {
            const loc = locations[0];
            const locationId = loc.name?.split('/').pop();
            try {
              const reviewsUrl = `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/reviews?pageSize=5&orderBy=updateTime desc`;
              const reviewsResp = await fetch(reviewsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
              const reviewsText = await reviewsResp.text();
              let reviewsData: any;
              try { reviewsData = JSON.parse(reviewsText); } catch { reviewsData = reviewsText; }

              results.steps.push({
                step: 'fetch_reviews',
                status: reviewsResp.ok ? 'success' : 'error',
                http_status: reviewsResp.status,
                totalReviewCount: reviewsData?.totalReviewCount,
                averageRating: reviewsData?.averageRating,
                reviews_returned: reviewsData?.reviews?.length || 0,
                first_review: reviewsData?.reviews?.[0] ? {
                  author: reviewsData.reviews[0].reviewer?.displayName,
                  rating: reviewsData.reviews[0].starRating,
                  comment: reviewsData.reviews[0].comment?.substring(0, 100),
                  createTime: reviewsData.reviews[0].createTime,
                } : null,
              });

              // Se tudo funciona, atualizar o banco com account_name e location_id
              if (reviewsResp.ok && !profile.gbp_account_name) {
                const updateData: Record<string, any> = {
                  gbp_account_name: accountName,
                  gbp_location_id: locationId,
                  gbp_location_name: loc.name,
                  gbp_location_title: loc.title,
                };
                if (loc.metadata?.mapsUri) updateData.gbp_maps_uri = loc.metadata.mapsUri;
                if (loc.metadata?.newReviewUri) {
                  const match = loc.metadata.newReviewUri.match(/placeid=([^&]+)/);
                  if (match) updateData.google_place_id = match[1];
                }

                const { error: updateError } = await supabaseAdmin
                  .from('business_profile')
                  .update(updateData)
                  .eq('tenant_id', tenantId);

                results.steps.push({
                  step: 'auto_fix_profile',
                  status: updateError ? 'error' : 'success',
                  updateData,
                  error: updateError,
                });
              }
            } catch (e: any) {
              results.steps.push({ step: 'fetch_reviews', status: 'error', message: e.message });
            }
          }
        } catch (e: any) {
          results.steps.push({ step: 'fetch_locations', status: 'error', message: e.message });
        }
      }
    } catch (e: any) {
      results.steps.push({ step: 'fetch_accounts', status: 'error', message: e.message });
    }

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
