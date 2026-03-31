/**
 * API Route: /api/gbp/place-data
 * 
 * Busca dados completos do negócio via Google Business Profile API (OAuth).
 * Retorna: nome, endereço, telefone, site, fotos, horários, rating, reviews completas.
 * 
 * Esta rota é a FONTE PRIMÁRIA quando o Google está conectado.
 * O Place ID (Google Places API) é apenas fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return credentials.access_token || null;
  } catch (err) {
    console.error('[GBP PlaceData] Error refreshing token:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
    }

    // Buscar tokens e dados do business_profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profile')
      .select('gbp_access_token, gbp_refresh_token, gbp_token_expiry, gbp_location_id, gbp_account_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado', connected: false }, { status: 404 });
    }

    if (!profile.gbp_access_token && !profile.gbp_refresh_token) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    let accessToken = profile.gbp_access_token;

    // Refresh token se expirado
    if (profile.gbp_token_expiry) {
      const expiry = new Date(profile.gbp_token_expiry);
      if (expiry <= new Date() && profile.gbp_refresh_token) {
        accessToken = await refreshAccessToken(profile.gbp_refresh_token);
        if (accessToken) {
          await supabaseAdmin
            .from('business_profile')
            .update({ gbp_access_token: accessToken })
            .eq('tenant_id', tenantId);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ connected: false, error: 'Token expirado' }, { status: 200 });
    }

    if (!profile.gbp_location_id || !profile.gbp_account_name) {
      return NextResponse.json({ connected: true, error: 'Location ou Account não configurados' }, { status: 200 });
    }

    const accountName = profile.gbp_account_name; // formato: accounts/123456789
    const locationId = profile.gbp_location_id;

    // ── 1. Buscar dados do Location via Business Information API ──
    const locationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations/${locationId}?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,metadata,profile,categories`;
    
    const locationResp = await fetch(locationUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let locationData: any = {};
    if (locationResp.ok) {
      locationData = await locationResp.json();
    } else {
      console.error('[GBP PlaceData] Location fetch error:', locationResp.status, await locationResp.text());
    }

    // ── 2. Buscar TODAS as reviews via GBP API com paginação ──
    const allReviews: any[] = [];
    let nextPageToken: string | undefined;
    let totalReviewCount = 0;
    let averageRating = 0;
    let pageCount = 0;
    const MAX_PAGES = 20;

    do {
      const reviewsUrl = new URL(`https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/reviews`);
      reviewsUrl.searchParams.set('pageSize', '50');
      reviewsUrl.searchParams.set('orderBy', 'updateTime desc');
      if (nextPageToken) {
        reviewsUrl.searchParams.set('pageToken', nextPageToken);
      }

      const reviewsResp = await fetch(reviewsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!reviewsResp.ok) {
        if (reviewsResp.status === 401 && pageCount === 0 && profile.gbp_refresh_token) {
          // Tentar refresh
          accessToken = await refreshAccessToken(profile.gbp_refresh_token);
          if (accessToken) {
            await supabaseAdmin
              .from('business_profile')
              .update({ gbp_access_token: accessToken })
              .eq('tenant_id', tenantId);
            continue;
          }
        }
        console.error('[GBP PlaceData] Reviews fetch error:', reviewsResp.status);
        break;
      }

      const reviewsData = await reviewsResp.json();

      if (pageCount === 0) {
        totalReviewCount = reviewsData.totalReviewCount || 0;
        averageRating = reviewsData.averageRating || 0;
      }

      for (const review of (reviewsData.reviews || [])) {
        allReviews.push({
          author_name: review.reviewer?.displayName || 'Anônimo',
          profile_photo_url: review.reviewer?.profilePhotoUrl || '',
          rating: review.starRating === 'FIVE' ? 5
            : review.starRating === 'FOUR' ? 4
            : review.starRating === 'THREE' ? 3
            : review.starRating === 'TWO' ? 2
            : review.starRating === 'ONE' ? 1 : 0,
          text: review.comment || '',
          time: review.createTime ? new Date(review.createTime).getTime() / 1000 : 0,
          createTime: review.createTime || '',
          updateTime: review.updateTime || '',
          relative_time_description: '',
          reply: review.reviewReply ? {
            comment: review.reviewReply.comment || '',
            updateTime: review.reviewReply.updateTime || '',
          } : null,
        });
      }

      nextPageToken = reviewsData.nextPageToken;
      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

    // ── 3. Buscar fotos via GBP API ──
    let photos: any[] = [];
    try {
      const mediaUrl = `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/media`;
      const mediaResp = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (mediaResp.ok) {
        const mediaData = await mediaResp.json();
        photos = (mediaData.mediaItems || []).map((m: any) => ({
          photo_reference: m.name || '',
          url: m.googleUrl || m.thumbnailUrl || '',
        }));
      }
    } catch (mediaErr) {
      console.warn('[GBP PlaceData] Media fetch error:', mediaErr);
    }

    // ── 4. Montar resposta no formato compatível com GooglePlaceData ──
    const address = locationData.storefrontAddress;
    const formattedAddress = address
      ? [address.addressLines?.join(', '), address.locality, address.administrativeArea, address.postalCode]
          .filter(Boolean).join(', ')
      : '';

    const phoneNumber = locationData.phoneNumbers?.primaryPhone || '';
    const websiteUri = locationData.websiteUri || '';
    const businessName = locationData.title || '';

    // Extrair horários de funcionamento
    let openingHours: any = undefined;
    if (locationData.regularHours?.periods) {
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const weekdayText = locationData.regularHours.periods.map((p: any) => {
        const day = dayNames[['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].indexOf(p.openDay)] || p.openDay;
        const openTime = p.openTime ? `${String(p.openTime.hours || 0).padStart(2, '0')}:${String(p.openTime.minutes || 0).padStart(2, '0')}` : '00:00';
        const closeTime = p.closeTime ? `${String(p.closeTime.hours || 0).padStart(2, '0')}:${String(p.closeTime.minutes || 0).padStart(2, '0')}` : '00:00';
        return `${day}: ${openTime} – ${closeTime}`;
      });
      openingHours = { open_now: false, weekday_text: weekdayText };
    }

    // Extrair tipos/categorias
    const types: string[] = [];
    if (locationData.categories?.primaryCategory?.displayName) {
      types.push(locationData.categories.primaryCategory.displayName);
    }
    if (locationData.categories?.additionalCategories) {
      for (const cat of locationData.categories.additionalCategories) {
        if (cat.displayName) types.push(cat.displayName);
      }
    }

    const mapsUri = locationData.metadata?.mapsUri || '';

    const placeData = {
      name: businessName,
      formatted_address: formattedAddress,
      formatted_phone_number: phoneNumber,
      website: websiteUri,
      rating: averageRating,
      user_ratings_total: totalReviewCount,
      reviews: allReviews,
      opening_hours: openingHours,
      photos: photos.length > 0 ? photos : [],
      types: types.length > 0 ? types : ['establishment'],
      business_status: 'OPERATIONAL',
      url: mapsUri,
      price_level: 0,
    };

    return NextResponse.json({
      connected: true,
      placeData,
      totalReviewCount,
      averageRating,
      reviewPagesFetched: pageCount,
      photoCount: photos.length,
      source: 'gbp_api',
    });

  } catch (err: any) {
    console.error('[GBP PlaceData] Route error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
