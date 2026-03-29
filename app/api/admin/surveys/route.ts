import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/surveys — lista todas as campanhas/pesquisas NPS dos clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Buscar campanhas
    let query = supabase
      .from('campaigns')
      .select('id, name, description, status, type, questions, response_count, nps_score, created_at, tenant_id, objective, tone')
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    // Buscar nomes das empresas
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');

    const nameMap: Record<string, string> = {};
    for (const c of companies || []) {
      if (c.id) nameMap[c.id] = c.name || c.id.substring(0, 8);
    }

    // Enriquecer campanhas com nome da empresa e estatísticas das perguntas
    const enriched = (campaigns || []).map((c) => {
      const questions = c.questions || [];
      const questionTypes = questions.reduce((acc: Record<string, number>, q: any) => {
        const t = q.type || 'unknown';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        type: c.type,
        tenantId: c.tenant_id,
        companyName: nameMap[c.tenant_id] || c.tenant_id?.substring(0, 8) || '—',
        questionCount: questions.length,
        questionTypes,
        questions: questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options || q.choices || [],
          required: q.required,
        })),
        responseCount: c.response_count || 0,
        npsScore: c.nps_score,
        objective: c.objective,
        tone: c.tone,
        createdAt: c.created_at,
      };
    });

    // Estatísticas globais
    const totalCampaigns = enriched.length;
    const totalResponses = enriched.reduce((s, c) => s + (c.responseCount || 0), 0);
    const activeCampaigns = enriched.filter(c => c.status === 'Ativa').length;
    const avgQuestionsPerCampaign = totalCampaigns > 0
      ? Math.round((enriched.reduce((s, c) => s + c.questionCount, 0) / totalCampaigns) * 10) / 10
      : 0;

    // Tipos de perguntas mais usados globalmente
    const globalTypes: Record<string, number> = {};
    for (const c of enriched) {
      for (const [type, count] of Object.entries(c.questionTypes)) {
        globalTypes[type] = (globalTypes[type] || 0) + (count as number);
      }
    }

    // Tenants com mais campanhas
    const tenantCounts: Record<string, { name: string; count: number; responses: number }> = {};
    for (const c of enriched) {
      const tid = c.tenantId;
      if (!tenantCounts[tid]) tenantCounts[tid] = { name: c.companyName, count: 0, responses: 0 };
      tenantCounts[tid].count++;
      tenantCounts[tid].responses += c.responseCount || 0;
    }

    return NextResponse.json({
      stats: {
        totalCampaigns,
        totalResponses,
        activeCampaigns,
        avgQuestionsPerCampaign,
        globalQuestionTypes: Object.entries(globalTypes)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
        topTenants: Object.entries(tenantCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([tid, data]) => ({ tenantId: tid, ...data })),
      },
      campaigns: enriched,
    });
  } catch (error: any) {
    console.error('[admin/surveys] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
