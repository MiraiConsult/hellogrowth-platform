import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Métricas disponíveis na GBP Performance API
const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_CONVERSATIONS',
];

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
    console.error('Error refreshing token:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const months = parseInt(searchParams.get('months') || '6');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
    }

    // Buscar tokens do business_profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profile')
      .select('gbp_access_token, gbp_refresh_token, gbp_token_expiry, gbp_location_id, gbp_account_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado', connected: false }, { status: 404 });
    }

    if (!profile.gbp_access_token && !profile.gbp_refresh_token) {
      return NextResponse.json({ connected: false, error: 'Google Business Profile não conectado' }, { status: 200 });
    }

    let accessToken = profile.gbp_access_token;

    // Verificar se o token expirou
    if (profile.gbp_token_expiry) {
      const expiry = new Date(profile.gbp_token_expiry);
      if (expiry <= new Date() && profile.gbp_refresh_token) {
        accessToken = await refreshAccessToken(profile.gbp_refresh_token);
        if (accessToken) {
          // Atualizar token no banco
          await supabaseAdmin
            .from('business_profile')
            .update({ gbp_access_token: accessToken })
            .eq('tenant_id', tenantId);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ connected: false, error: 'Token expirado. Reconecte o Google Business Profile.' }, { status: 200 });
    }

    if (!profile.gbp_location_id) {
      return NextResponse.json({ connected: true, error: 'Location ID não configurado', needsLocationSelect: true }, { status: 200 });
    }

    const locationName = `locations/${profile.gbp_location_id}`;

    // Calcular range de datas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const formatDate = (d: Date) => ({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });

    // Buscar múltiplas métricas de uma vez (fetchMultiDailyMetricsTimeSeries)
    const metricsUrl = `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`;
    const metricsParams = new URLSearchParams();

    DAILY_METRICS.forEach(m => metricsParams.append('dailyMetrics', m));

    const sd = formatDate(startDate);
    const ed = formatDate(endDate);
    metricsParams.set('dailyRange.start_date.year', sd.year.toString());
    metricsParams.set('dailyRange.start_date.month', sd.month.toString());
    metricsParams.set('dailyRange.start_date.day', sd.day.toString());
    metricsParams.set('dailyRange.end_date.year', ed.year.toString());
    metricsParams.set('dailyRange.end_date.month', ed.month.toString());
    metricsParams.set('dailyRange.end_date.day', ed.day.toString());

    const metricsResponse = await fetch(`${metricsUrl}?${metricsParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!metricsResponse.ok) {
      const errData = await metricsResponse.json();
      console.error('GBP metrics error:', errData);

      // Token inválido
      if (metricsResponse.status === 401) {
        return NextResponse.json({ connected: false, error: 'Token inválido. Reconecte o Google Business Profile.' }, { status: 200 });
      }

      return NextResponse.json({ connected: true, error: 'Erro ao buscar métricas do Google', details: errData }, { status: 200 });
    }

    const metricsData = await metricsResponse.json();

    // Buscar palavras-chave mensais
    const keywordsUrl = `https://businessprofileperformance.googleapis.com/v1/${locationName}/searchkeywords/impressions/monthly`;
    const keywordsParams = new URLSearchParams({
      'monthlyRange.start_month.year': sd.year.toString(),
      'monthlyRange.start_month.month': sd.month.toString(),
      'monthlyRange.end_month.year': ed.year.toString(),
      'monthlyRange.end_month.month': ed.month.toString(),
    });

    const keywordsResponse = await fetch(`${keywordsUrl}?${keywordsParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let keywords: any[] = [];
    if (keywordsResponse.ok) {
      const kwData = await keywordsResponse.json();
      keywords = kwData.searchKeywordsCounts || [];
    }

    // Processar e agregar métricas por mês
    const monthlyAggregated: Record<string, Record<string, number>> = {};

    const multiSeries = metricsData.multiDailyMetricTimeSeries || [];
    for (const series of multiSeries) {
      const metricName = series.dailyMetric;
      const timeSeries = series.dailyMetricTimeSeries?.timeSeries?.datedValues || [];

      for (const dv of timeSeries) {
        if (!dv.date) continue;
        const monthKey = `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}`;
        if (!monthlyAggregated[monthKey]) monthlyAggregated[monthKey] = {};
        if (!monthlyAggregated[monthKey][metricName]) monthlyAggregated[monthKey][metricName] = 0;
        monthlyAggregated[monthKey][metricName] += dv.value || 0;
      }
    }

    // Converter para array ordenado
    const monthlyData = Object.entries(monthlyAggregated)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, metrics]) => {
        const [year, m] = month.split('-');
        const date = new Date(parseInt(year), parseInt(m) - 1, 1);
        const totalImpressions =
          (metrics['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0) +
          (metrics['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'] || 0) +
          (metrics['BUSINESS_IMPRESSIONS_MOBILE_MAPS'] || 0) +
          (metrics['BUSINESS_IMPRESSIONS_MOBILE_SEARCH'] || 0);

        return {
          month,
          label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          fullLabel: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          totalImpressions,
          impressionsMaps: (metrics['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0) + (metrics['BUSINESS_IMPRESSIONS_MOBILE_MAPS'] || 0),
          impressionsSearch: (metrics['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'] || 0) + (metrics['BUSINESS_IMPRESSIONS_MOBILE_SEARCH'] || 0),
          callClicks: metrics['CALL_CLICKS'] || 0,
          websiteClicks: metrics['WEBSITE_CLICKS'] || 0,
          directionRequests: metrics['BUSINESS_DIRECTION_REQUESTS'] || 0,
          conversations: metrics['BUSINESS_CONVERSATIONS'] || 0,
        };
      });

    return NextResponse.json({
      connected: true,
      monthlyData,
      keywords: keywords.slice(0, 20),
      rawMetrics: metricsData,
    });
  } catch (err: any) {
    console.error('GBP metrics route error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
