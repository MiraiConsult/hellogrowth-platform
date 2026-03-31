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
    console.error('[GBP Reviews] Error refreshing token:', err);
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
      return NextResponse.json({ connected: false, reviews: [], totalReviewCount: 0 }, { status: 200 });
    }

    let accessToken = profile.gbp_access_token;

    // Verificar se o token expirou
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
      return NextResponse.json({ connected: false, reviews: [], totalReviewCount: 0, error: 'Token expirado' }, { status: 200 });
    }

    if (!profile.gbp_location_id || !profile.gbp_account_name) {
      return NextResponse.json({ connected: true, reviews: [], totalReviewCount: 0, error: 'Location ou Account não configurados' }, { status: 200 });
    }

    // Buscar TODAS as reviews com paginação
    const allReviews: any[] = [];
    let nextPageToken: string | undefined;
    let totalReviewCount = 0;
    let averageRating = 0;
    let pageCount = 0;
    const MAX_PAGES = 20; // Segurança: máximo 20 páginas × 50 = 1000 reviews

    const accountName = profile.gbp_account_name; // formato: accounts/123456789
    const locationId = profile.gbp_location_id;

    do {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/reviews`);
      url.searchParams.set('pageSize', '50');
      url.searchParams.set('orderBy', 'updateTime desc');
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[GBP Reviews] API error:', response.status, errData);

        if (response.status === 401) {
          // Tentar refresh do token
          if (profile.gbp_refresh_token && pageCount === 0) {
            accessToken = await refreshAccessToken(profile.gbp_refresh_token);
            if (accessToken) {
              await supabaseAdmin
                .from('business_profile')
                .update({ gbp_access_token: accessToken })
                .eq('tenant_id', tenantId);
              continue; // Retry com novo token
            }
          }
          return NextResponse.json({ connected: false, reviews: [], totalReviewCount: 0, error: 'Token inválido. Reconecte o Google.' }, { status: 200 });
        }

        // Se já temos algumas reviews, retornar o que temos
        if (allReviews.length > 0) break;

        return NextResponse.json({ connected: true, reviews: [], totalReviewCount: 0, error: 'Erro ao buscar reviews', details: errData }, { status: 200 });
      }

      const data = await response.json();
      const reviews = data.reviews || [];

      // Na primeira página, capturar os totais
      if (pageCount === 0) {
        totalReviewCount = data.totalReviewCount || 0;
        averageRating = data.averageRating || 0;
      }

      // Transformar reviews para formato compatível com o frontend
      for (const review of reviews) {
        allReviews.push({
          author_name: review.reviewer?.displayName || 'Anônimo',
          profile_photo_url: review.reviewer?.profilePhotoUrl || '',
          rating: review.starRating === 'FIVE' ? 5
            : review.starRating === 'FOUR' ? 4
            : review.starRating === 'THREE' ? 3
            : review.starRating === 'TWO' ? 2
            : review.starRating === 'ONE' ? 1
            : 0,
          text: review.comment || '',
          time: review.createTime ? new Date(review.createTime).getTime() / 1000 : 0,
          updateTime: review.updateTime || '',
          createTime: review.createTime || '',
          reviewId: review.reviewId || review.name || '',
          reply: review.reviewReply ? {
            comment: review.reviewReply.comment || '',
            updateTime: review.reviewReply.updateTime || '',
          } : null,
        });
      }

      nextPageToken = data.nextPageToken;
      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

    return NextResponse.json({
      connected: true,
      reviews: allReviews,
      totalReviewCount,
      averageRating,
      pagesFetched: pageCount,
    });

  } catch (err: any) {
    console.error('[GBP Reviews] Route error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
