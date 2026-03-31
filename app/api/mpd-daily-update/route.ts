/**
 * API Route: /api/mpd-daily-update
 *
 * Executa atualização diária do MPD (Minha Presença Digital) para todas as empresas:
 * 1. Busca dados atualizados do Google Places
 * 2. Calcula novos scores
 * 3. Detecta novas avaliações comparando com o diagnóstico anterior
 * 4. Salva novo diagnóstico no banco
 * 5. Envia alerta WhatsApp se houver novas avaliações (se configurado)
 *
 * Chamado pelo cron job do Vercel às 8h (BRT) todos os dias.
 * Pode ser chamado manualmente: GET /api/mpd-daily-update?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET || 'hellogrowth-cron-2025';
const GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchPlaceData(placeId: string): Promise<any | null> {
  if (!GOOGLE_PLACES_API_KEY || !placeId) return null;
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,reviews,regularOpeningHours,photos,types,businessStatus,googleMapsUri',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      formatted_phone_number: data.nationalPhoneNumber || '',
      website: data.websiteUri || '',
      rating: data.rating || 0,
      user_ratings_total: data.userRatingCount || 0,
      reviews:
        data.reviews?.map((r: any) => ({
          author_name: r.authorAttribution?.displayName || 'Anônimo',
          rating: r.rating || 0,
          text: r.text?.text || '',
          time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : 0,
          relative_time_description: r.relativePublishTimeDescription || '',
        })) || [],
      opening_hours: data.regularOpeningHours
        ? {
            open_now: data.regularOpeningHours.openNow || false,
            weekday_text: data.regularOpeningHours.weekdayDescriptions || [],
          }
        : undefined,
      photos: data.photos?.map((p: any) => ({ photo_reference: p.name || '' })) || [],
      types: data.types || [],
      business_status: data.businessStatus || 'OPERATIONAL',
      url: data.googleMapsUri || '',
    };
  } catch (e) {
    console.error('Error fetching place data:', e);
    return null;
  }
}

function calculateScores(placeData: any) {
  const rating = placeData.rating || 0;
  const totalReviews = placeData.user_ratings_total || 0;
  const photoCount = placeData.photos?.length || 0;
  const hasHours = !!placeData.opening_hours?.weekday_text?.length;
  const hasWebsite = !!placeData.website;
  const hasPhone = !!placeData.formatted_phone_number;

  const reviews = placeData.reviews || [];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentReviews = reviews.filter(
    (r: any) => new Date(r.time * 1000) > sixMonthsAgo
  );

  const reputationScore =
    totalReviews === 0
      ? 0
      : Math.min(
          100,
          Math.round((rating / 5) * 60 + Math.min(40, Math.log10(totalReviews + 1) * 20))
        );
  const visibilityScore = Math.round(
    (photoCount >= 10 ? 30 : photoCount >= 3 ? 20 : photoCount >= 1 ? 10 : 0) +
      (hasHours ? 25 : 0) +
      (hasWebsite ? 25 : 0) +
      (hasPhone ? 20 : 0)
  );
  const engagementScore =
    totalReviews === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            Math.min(50, recentReviews.length * 5) +
              Math.min(50, Math.log10(totalReviews + 1) * 15)
          )
        );
  const overallScore = Math.round(
    reputationScore * 0.4 + visibilityScore * 0.35 + engagementScore * 0.25
  );

  return { reputationScore, visibilityScore, engagementScore, overallScore };
}

async function generateDailyDigest(
  businessName: string,
  placeData: any,
  prevScores: any,
  newScores: any,
  newReviewsCount: number,
  newReviews: any[]
): Promise<string> {
  const scoreDelta =
    newScores.overallScore - (prevScores?.overall ?? newScores.overallScore);
  const deltaStr =
    scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta < 0 ? `${scoreDelta}` : '0';

  if (!GEMINI_API_KEY) {
    return `Score geral: ${newScores.overallScore}/100 (${deltaStr} vs ontem). ${
      newReviewsCount > 0
        ? `${newReviewsCount} nova(s) avaliação(ões) detectada(s).`
        : 'Sem novas avaliações hoje.'
    }`;
  }

  try {
    const prompt = `Você é um assistente de marketing digital. Gere um resumo diário CURTO e MOTIVADOR para o negócio "${businessName}".

DADOS DE HOJE:
- Score Geral: ${newScores.overallScore}/100 (${deltaStr} vs ontem)
- Reputação: ${newScores.reputationScore}/100
- Visibilidade: ${newScores.visibilityScore}/100
- Engajamento: ${newScores.engagementScore}/100
- Nota média: ${placeData.rating || 0}★ (${placeData.user_ratings_total || 0} avaliações totais)
- Novas avaliações detectadas hoje: ${newReviewsCount}
${
  newReviews.length > 0
    ? `- Últimas avaliações: ${newReviews
        .slice(0, 2)
        .map(
          (r: any) =>
            `${r.author_name} (${r.rating}★): "${r.text?.substring(0, 60)}"`
        )
        .join(' | ')}`
    : ''
}

Escreva um resumo em 2-3 frases curtas. Seja específico, use os dados reais. Se houve melhora, comemore. Se piorou, motive a ação. Se há novas avaliações, destaque.
Responda apenas com o texto do resumo, sem títulos ou formatação.`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    } as any);

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Score geral: ${newScores.overallScore}/100 (${deltaStr} vs ontem). ${
      newReviewsCount > 0
        ? `${newReviewsCount} nova(s) avaliação(ões) detectada(s).`
        : 'Sem novas avaliações hoje.'
    }`;
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) return false;
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ phone, message }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function buildWhatsAppAlert(
  businessName: string,
  newReviews: any[],
  newScores: any,
  prevScores: any,
  dailySummary: string
): string {
  const scoreDelta =
    newScores.overallScore - (prevScores?.overall ?? newScores.overallScore);
  const deltaStr =
    scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta < 0 ? `${scoreDelta}` : '=';
  const scoreEmoji = scoreDelta > 0 ? '📈' : scoreDelta < 0 ? '📉' : '➡️';

  let msg = `🌅 *HelloGrowth — Diário do Dia*
📅 ${new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })}
🏢 ${businessName}
━━━━━━━━━━━━━━━━━━━━
${scoreEmoji} *Score Geral: ${newScores.overallScore}/100* (${deltaStr} pts)
⭐ Reputação: ${newScores.reputationScore} | 👁️ Visibilidade: ${newScores.visibilityScore} | 💬 Engajamento: ${newScores.engagementScore}`;

  if (newReviews.length > 0) {
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n🆕 *${newReviews.length} nova(s) avaliação(ões)*`;
    newReviews.slice(0, 3).forEach((r) => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      msg += `\n• ${r.author_name} ${stars}`;
      if (r.text)
        msg += `\n  "${r.text.substring(0, 80)}${r.text.length > 80 ? '...' : ''}"`;
    });
  }

  if (dailySummary) {
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 ${dailySummary}`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n_HelloGrowth — Sua presença digital em dia_`;
  return msg;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  return handleUpdate(request);
}

export async function POST(request: NextRequest) {
  return handleUpdate(request);
}

async function handleUpdate(request: NextRequest) {
  // Verificar secret para segurança
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('x-cron-secret');

  // Vercel Cron passa Authorization header com Bearer token
  const authHeader = request.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isManual = secret === CRON_SECRET;

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any[] = [];
  let processed = 0;
  let errors = 0;

  try {
    // Buscar todas as empresas com Place ID configurado OU GBP conectado
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('business_profile')
      .select('tenant_id, google_place_id, company_name, gbp_access_token, gbp_refresh_token, gbp_token_expiry, gbp_location_id, gbp_account_name');

    if (profilesError) throw profilesError;
    
    // Filtrar: precisa ter Place ID OU GBP conectado
    const eligibleProfiles = (profiles || []).filter(p => 
      (p.google_place_id && p.google_place_id.trim() !== '') || 
      (p.gbp_access_token && p.gbp_location_id && p.gbp_account_name)
    );
    
    if (eligibleProfiles.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma empresa com Place ID ou GBP configurado',
        processed: 0,
      });
    }

    for (const profile of eligibleProfiles) {
      try {
        const tenantId = profile.tenant_id;
        const placeId = profile.google_place_id;
        const companyName = profile.company_name || 'Seu negócio';
        const hasGbp = profile.gbp_access_token && profile.gbp_location_id && profile.gbp_account_name;
        
        let placeData: any = null;
        let dataSource = 'none';

        // FONTE PRIMÁRIA: GBP API (quando Google está conectado)
        if (hasGbp) {
          try {
            let gbpAccessToken = profile.gbp_access_token;
            // Refresh token se expirado
            if (profile.gbp_token_expiry && new Date(profile.gbp_token_expiry) <= new Date() && profile.gbp_refresh_token) {
              const { OAuth2Client } = await import('google-auth-library');
              const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
              client.setCredentials({ refresh_token: profile.gbp_refresh_token });
              const { credentials } = await client.refreshAccessToken();
              gbpAccessToken = credentials.access_token || gbpAccessToken;
              if (credentials.access_token) {
                await supabaseAdmin.from('business_profile').update({ gbp_access_token: credentials.access_token }).eq('tenant_id', tenantId);
              }
            }

            // Buscar dados do Location via Business Information API
            const locationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${profile.gbp_account_name}/locations/${profile.gbp_location_id}?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,metadata,profile,categories`;
            const locationResp = await fetch(locationUrl, { headers: { Authorization: `Bearer ${gbpAccessToken}` } });
            let locationData: any = {};
            if (locationResp.ok) {
              locationData = await locationResp.json();
            }

            // Buscar TODAS as reviews via GBP API com paginação
            const allGbpReviews: any[] = [];
            let nextPageToken: string | undefined;
            let totalReviewCount = 0;
            let averageRating = 0;
            let pageCount = 0;
            do {
              const url = new URL(`https://mybusiness.googleapis.com/v4/${profile.gbp_account_name}/locations/${profile.gbp_location_id}/reviews`);
              url.searchParams.set('pageSize', '50');
              url.searchParams.set('orderBy', 'updateTime desc');
              if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);
              const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${gbpAccessToken}` } });
              if (!resp.ok) break;
              const data = await resp.json();
              if (pageCount === 0) {
                totalReviewCount = data.totalReviewCount || 0;
                averageRating = data.averageRating || 0;
              }
              for (const review of (data.reviews || [])) {
                allGbpReviews.push({
                  author_name: review.reviewer?.displayName || 'Anônimo',
                  rating: review.starRating === 'FIVE' ? 5 : review.starRating === 'FOUR' ? 4 : review.starRating === 'THREE' ? 3 : review.starRating === 'TWO' ? 2 : review.starRating === 'ONE' ? 1 : 0,
                  text: review.comment || '',
                  time: review.createTime ? new Date(review.createTime).getTime() / 1000 : 0,
                  relative_time_description: '',
                });
              }
              nextPageToken = data.nextPageToken;
              pageCount++;
            } while (nextPageToken && pageCount < 20);

            // Buscar fotos via GBP API
            let photos: any[] = [];
            try {
              const mediaUrl = `https://mybusiness.googleapis.com/v4/${profile.gbp_account_name}/locations/${profile.gbp_location_id}/media`;
              const mediaResp = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${gbpAccessToken}` } });
              if (mediaResp.ok) {
                const mediaData = await mediaResp.json();
                photos = (mediaData.mediaItems || []).map((m: any) => ({ photo_reference: m.name || '', url: m.googleUrl || '' }));
              }
            } catch { /* ignore */ }

            // Montar placeData a partir do GBP
            const address = locationData.storefrontAddress;
            const formattedAddress = address
              ? [address.addressLines?.join(', '), address.locality, address.administrativeArea, address.postalCode].filter(Boolean).join(', ')
              : '';

            placeData = {
              name: locationData.title || companyName,
              formatted_address: formattedAddress,
              formatted_phone_number: locationData.phoneNumbers?.primaryPhone || '',
              website: locationData.websiteUri || '',
              rating: averageRating,
              user_ratings_total: totalReviewCount,
              reviews: allGbpReviews,
              opening_hours: locationData.regularHours ? { open_now: false, weekday_text: [] } : undefined,
              photos: photos,
              types: locationData.categories?.primaryCategory?.displayName ? [locationData.categories.primaryCategory.displayName] : ['establishment'],
              business_status: 'OPERATIONAL',
            };
            dataSource = 'gbp_api';
            console.log(`[MPD Daily] Loaded data from GBP API for ${companyName}: ${allGbpReviews.length} reviews, rating ${averageRating}`);
          } catch (gbpErr: any) {
            console.warn(`[MPD Daily] GBP API failed for ${companyName}:`, gbpErr.message);
          }
        }

        // FALLBACK: Google Places API (se GBP não disponível ou falhou)
        if (!placeData && placeId) {
          placeData = await fetchPlaceData(placeId);
          if (placeData) dataSource = 'places_api';
        }

        if (!placeData) {
          results.push({
            tenantId,
            status: 'skipped',
            reason: 'Failed to fetch data from both GBP and Places API',
          });
          continue;
        }

        // Buscar diagnóstico mais recente para comparação
        const { data: prevDiagnostics } = await supabaseAdmin
          .from('digital_diagnostics')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1);

        const prevDiagnostic = prevDiagnostics?.[0];
        const prevScores = prevDiagnostic?.ai_analysis?.scores || null;
        const prevTotalReviews = prevDiagnostic?.place_data?.user_ratings_total || 0;

        // Calcular novos scores
        const scores = calculateScores(placeData);

        // Detectar novas avaliações
        const currentTotalReviews = placeData.user_ratings_total || 0;
        const newReviewsCount = Math.max(0, currentTotalReviews - prevTotalReviews);

        // Pegar as avaliações mais recentes como "novas" (aproximação)
        const newReviews =
          newReviewsCount > 0 ? (placeData.reviews || []).slice(0, newReviewsCount) : [];

        // Gerar resumo diário com IA
        const dailySummary = await generateDailyDigest(
          companyName,
          placeData,
          prevScores,
          {
            overallScore: scores.overallScore,
            reputationScore: scores.reputationScore,
            visibilityScore: scores.visibilityScore,
            engagementScore: scores.engagementScore,
          },
          newReviewsCount,
          newReviews
        );

        // Montar ai_analysis
        const aiAnalysis = {
          summary: dailySummary,
          scores: {
            reputation: scores.reputationScore,
            visibility: scores.visibilityScore,
            engagement: scores.engagementScore,
            overall: scores.overallScore,
          },
          strengths: [],
          weaknesses: [],
          recommendations: prevDiagnostic?.ai_analysis?.recommendations || [],
          todoItems: prevDiagnostic?.ai_analysis?.todoItems || [],
          dailyDigest: {
            summary: dailySummary,
            newReviewsCount,
            newReviews,
            scoreDelta: prevScores ? scores.overallScore - prevScores.overall : 0,
            generatedAt: new Date().toISOString(),
          },
          ...(prevScores && {
            evolution: {
              summary: dailySummary,
              improved:
                scores.overallScore > prevScores.overall
                  ? [`Score geral subiu ${scores.overallScore - prevScores.overall} pontos`]
                  : [],
              declined:
                scores.overallScore < prevScores.overall
                  ? [`Score geral caiu ${prevScores.overall - scores.overallScore} pontos`]
                  : [],
            },
          }),
        };

        // Salvar novo diagnóstico
        const { error: saveError } = await supabaseAdmin
          .from('digital_diagnostics')
          .insert({
            tenant_id: tenantId,
            user_id: tenantId,
            place_data: placeData,
            ai_analysis: aiAnalysis,
            score_reputation: scores.reputationScore,
            score_information: scores.visibilityScore,
            score_engagement: scores.engagementScore,
            overall_score: scores.overallScore,
            details: placeData,
            recommendations: aiAnalysis.recommendations,
          });

        if (saveError) throw saveError;

        // Enviar alerta WhatsApp se houver novas avaliações e estiver configurado
        let whatsappSent = false;
        if (newReviewsCount > 0) {
          const { data: alertSettings } = await supabaseAdmin
            .from('alert_settings')
            .select('whatsapp_numbers, whatsapp_number, alert_new_google_review')
            .eq('company_id', tenantId)
            .single();

          const shouldAlert = alertSettings?.alert_new_google_review !== false;
          const numbers: string[] =
            alertSettings?.whatsapp_numbers ||
            (alertSettings?.whatsapp_number ? [alertSettings.whatsapp_number] : []);

          if (shouldAlert && numbers.length > 0) {
            const message = buildWhatsAppAlert(
              companyName,
              newReviews,
              {
                overallScore: scores.overallScore,
                reputationScore: scores.reputationScore,
                visibilityScore: scores.visibilityScore,
                engagementScore: scores.engagementScore,
              },
              prevScores,
              dailySummary
            );
            for (const num of numbers) {
              await sendWhatsApp(num, message);
            }
            whatsappSent = true;
          }
        }

        results.push({
          tenantId,
          companyName,
          status: 'success',
          scores: { overall: scores.overallScore },
          newReviewsCount,
          whatsappSent,
        });
        processed++;
      } catch (e: any) {
        console.error(`Error processing tenant ${profile.tenant_id}:`, e);
        results.push({
          tenantId: profile.tenant_id,
          status: 'error',
          error: e.message,
        });
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Atualização diária concluída',
      processed,
      errors,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('Fatal error in mpd-daily-update:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
