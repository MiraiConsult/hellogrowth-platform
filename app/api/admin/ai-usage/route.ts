import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const tenantId = searchParams.get('tenantId');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Query base
    let query = supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching AI usage logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calcular métricas agregadas
    const totalCalls = logs?.length || 0;
    const totalTokens = logs?.reduce((sum, l) => sum + (l.total_tokens || 0), 0) || 0;
    const totalPromptTokens = logs?.reduce((sum, l) => sum + (l.prompt_tokens || 0), 0) || 0;
    const totalCompletionTokens = logs?.reduce((sum, l) => sum + (l.completion_tokens || 0), 0) || 0;
    const totalCostUSD = logs?.reduce((sum, l) => sum + parseFloat(l.estimated_cost_usd || '0'), 0) || 0;
    const errorCount = logs?.filter(l => l.status === 'error').length || 0;
    const successRate = totalCalls > 0 ? ((totalCalls - errorCount) / totalCalls * 100).toFixed(1) : '100';

    // Agrupar por endpoint
    const byEndpoint: Record<string, { calls: number; tokens: number; cost: number; errors: number }> = {};
    logs?.forEach(l => {
      const ep = l.endpoint || 'unknown';
      if (!byEndpoint[ep]) byEndpoint[ep] = { calls: 0, tokens: 0, cost: 0, errors: 0 };
      byEndpoint[ep].calls++;
      byEndpoint[ep].tokens += l.total_tokens || 0;
      byEndpoint[ep].cost += parseFloat(l.estimated_cost_usd || '0');
      if (l.status === 'error') byEndpoint[ep].errors++;
    });

    // Agrupar por tenant
    const byTenant: Record<string, { name: string; calls: number; tokens: number; cost: number }> = {};
    logs?.forEach(l => {
      const tid = l.tenant_id || 'unknown';
      if (!byTenant[tid]) byTenant[tid] = { name: '', calls: 0, tokens: 0, cost: 0 };
      byTenant[tid].calls++;
      byTenant[tid].tokens += l.total_tokens || 0;
      byTenant[tid].cost += parseFloat(l.estimated_cost_usd || '0');
    });

    // Buscar nomes dos tenants
    const tenantIds = Object.keys(byTenant).filter(id => id !== 'unknown');
    if (tenantIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', tenantIds);
      
      companies?.forEach(c => {
        if (byTenant[c.id]) byTenant[c.id].name = c.name;
      });
    }

    // Agrupar por dia (para gráfico de tendência)
    const byDay: Record<string, { calls: number; tokens: number; cost: number }> = {};
    logs?.forEach(l => {
      const day = new Date(l.created_at).toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, cost: 0 };
      byDay[day].calls++;
      byDay[day].tokens += l.total_tokens || 0;
      byDay[day].cost += parseFloat(l.estimated_cost_usd || '0');
    });

    // Converter para arrays ordenados
    const dailyTrend = Object.entries(byDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const endpointBreakdown = Object.entries(byEndpoint)
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.calls - a.calls);

    const tenantBreakdown = Object.entries(byTenant)
      .map(([id, data]) => ({ tenantId: id, ...data }))
      .sort((a, b) => b.calls - a.calls);

    return NextResponse.json({
      summary: {
        totalCalls,
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        totalCostUSD: totalCostUSD.toFixed(4),
        totalCostBRL: (totalCostUSD * 5.5).toFixed(2), // Estimativa USD -> BRL
        errorCount,
        successRate,
        avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
        avgCostPerCall: totalCalls > 0 ? (totalCostUSD / totalCalls).toFixed(6) : '0',
      },
      dailyTrend,
      endpointBreakdown,
      tenantBreakdown,
      recentLogs: logs?.slice(0, 50) || [],
    });
  } catch (error: any) {
    console.error('Error in AI usage API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
