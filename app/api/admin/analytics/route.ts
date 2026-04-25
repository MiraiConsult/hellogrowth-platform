import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

// GET /api/admin/analytics — agrega métricas de NPS, leads, MPD e tendências por tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId'); // se fornecido, retorna detalhe de um tenant
    const type = searchParams.get('type') || 'overview'; // overview | tenant | trends | insights

    if (type === 'tenant' && tenantId) {
      return await getTenantDetail(tenantId);
    }

    if (type === 'trends') {
      return await getGlobalTrends();
    }

    if (type === 'insights') {
      return await getMarketInsights();
    }

    // Default: overview de todos os tenants
    return await getOverview();
  } catch (error: any) {
    console.error('[admin/analytics] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: busca paginada para superar o limite de 1000 registros do Supabase
async function fetchAll(table: string, select: string, extraFilters?: (q: any) => any) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    let query = supabase.from(table).select(select).is('deleted_at', null).range(from, from + PAGE_SIZE - 1);
    if (extraFilters) query = extraFilters(query);
    const { data, error } = await query;
    if (error) { console.error(`fetchAll ${table} error:`, error); break; }
    if (!data || data.length === 0) { hasMore = false; break; }
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) { hasMore = false; } else { from += PAGE_SIZE; }
  }
  return allData;
}

// ─── Overview: métricas agregadas por tenant ──────────────────────────────────
async function getOverview() {
  // Buscar TODAS as NPS responses (com paginação para superar limite de 1000)
  const npsResponses = await fetchAll('nps_responses', 'score, created_at, tenant_id, comment, answers');

  // Buscar TODOS os leads (com paginação)
  const leads = await fetchAll('leads', 'tenant_id, status, value, created_at, answers');

  // Buscar último diagnóstico MPD por tenant
  const { data: diagnostics } = await supabase
    .from('digital_diagnostics')
    .select('tenant_id, overall_score, created_at, ai_analysis')
    .order('created_at', { ascending: false });

  // Buscar campanhas NPS
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('tenant_id, name, nps_score, response_count, created_at')
    .is('deleted_at', null);

  // Buscar nps_games
  const { data: games } = await supabase
    .from('nps_games')
    .select('tenant_id, type, status, created_at');

  // Buscar nomes das empresas (tenant_id = companies.id = users.id)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, plan, subscription_status, created_at');

  // Buscar business_profile para obter nicho/setor de cada tenant
  const { data: businessProfiles } = await supabase
    .from('business_profile')
    .select('tenant_id, business_type, company_name');

  // Mapa de tenant_id -> nome da empresa
  const companyNameMap: Record<string, string> = {};
  const companyPlanMap: Record<string, string> = {};
  const companyStatusMap: Record<string, string> = {};
  const companyCreatedMap: Record<string, string> = {};
  for (const c of companies || []) {
    if (c.id) {
      companyNameMap[c.id] = c.name || c.id.substring(0, 8);
      companyPlanMap[c.id] = c.plan || '';
      companyStatusMap[c.id] = c.subscription_status || '';
      companyCreatedMap[c.id] = c.created_at || '';
    }
  }

  // Mapa de tenant_id -> business_type (nicho)
  const businessTypeMap: Record<string, string> = {};
  for (const bp of businessProfiles || []) {
    if (bp.tenant_id && bp.business_type) {
      businessTypeMap[bp.tenant_id] = bp.business_type.trim();
    }
  }

  // Normalizar nichos para categorias padrão
  function normalizeBusinessType(raw: string): string {
    if (!raw) return 'Não informado';
    const lower = raw.toLowerCase().trim();
    if (lower.includes('odonto') || lower.includes('dentist') || lower.includes('consultório odonto')) return 'Odontologia';
    if (lower.includes('restaurante') || lower.includes('bar') || lower.includes('boteco') || lower.includes('winebar') || lower.includes('delivery')) return 'Alimentação';
    if (lower.includes('cafeteria') || lower.includes('café')) return 'Alimentação';
    if (lower.includes('hotel') || lower.includes('pousada')) return 'Hotelaria';
    if (lower.includes('estética') || lower.includes('estetica') || lower.includes('procedimentos estéticos')) return 'Estética';
    if (lower.includes('academia') || lower.includes('personal') || lower.includes('studio')) return 'Fitness';
    if (lower.includes('pet') || lower.includes('veterinár')) return 'Pet/Veterinária';
    if (lower.includes('farmácia') || lower.includes('farmacia')) return 'Farmácia';
    if (lower.includes('loja') || lower.includes('roupas') || lower.includes('drones')) return 'Varejo';
    if (lower.includes('escola') || lower.includes('idioma') || lower.includes('inglês')) return 'Educação';
    if (lower.includes('software') || lower.includes('saas') || lower.includes('tecnologia') || lower.includes('técnologia')) return 'Tecnologia';
    if (lower.includes('contabilidade')) return 'Contabilidade';
    if (lower.includes('clínica') || lower.includes('saúde') || lower.includes('hub de saúde') || lower.includes('psicoterapia') || lower.includes('radiologia')) return 'Saúde';
    if (lower.includes('barbearia')) return 'Barbearia';
    if (lower.includes('tiro') || lower.includes('arma')) return 'Outros';
    return 'Outros';
  }

  // Agrupar por tenant
  const tenantMap: Record<string, any> = {};

  const ensureTenant = (tid: string) => {
    if (!tenantMap[tid]) {
      tenantMap[tid] = {
        tenantId: tid,
        npsScores: [],
        npsComments: [],
        npsMonthly: {},
        leads: { total: 0, novo: 0, emContato: 0, negociacao: 0, vendido: 0, perdido: 0, pipelineValue: 0 },
        lastDiagnostic: null,
        diagnosticHistory: [],
        campaignCount: 0,
        gameCount: 0,
        lastActivity: null,
      };
    }
    return tenantMap[tid];
  };

  // Processar NPS
  for (const r of npsResponses || []) {
    if (!r.tenant_id) continue;
    const t = ensureTenant(r.tenant_id);
    if (r.score !== null && r.score !== undefined) {
      t.npsScores.push(r.score);
    }
    if (r.comment && String(r.comment).length > 5) {
      t.npsComments.push(String(r.comment));
    }
    // Respostas de múltipla escolha
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && Array.isArray(ans.answer)) {
          for (const item of ans.answer) {
            if (typeof item === 'string' && item.length > 3) {
              t.npsComments.push(item);
            }
          }
        }
      }
    }
    // Tendência mensal
    if (r.created_at && r.score !== null) {
      const month = r.created_at.substring(0, 7);
      if (!t.npsMonthly[month]) t.npsMonthly[month] = [];
      t.npsMonthly[month].push(r.score);
    }
    // Última atividade
    if (!t.lastActivity || r.created_at > t.lastActivity) {
      t.lastActivity = r.created_at;
    }
  }

  // Processar leads
  for (const l of leads || []) {
    if (!l.tenant_id) continue;
    const t = ensureTenant(l.tenant_id);
    t.leads.total++;
    const val = parseFloat(String(l.value || 0)) || 0;
    t.leads.pipelineValue += val;
    const status = (l.status || '').toLowerCase();
    if (status === 'novo') t.leads.novo++;
    else if (status === 'em contato') t.leads.emContato++;
    else if (status === 'negociação' || status === 'negociacao') t.leads.negociacao++;
    else if (status === 'vendido') t.leads.vendido++;
    else if (status === 'perdido') t.leads.perdido++;
    if (!t.lastActivity || (l.created_at && l.created_at > t.lastActivity)) {
      t.lastActivity = l.created_at;
    }
  }

  // Processar diagnósticos MPD
  const seenDiagnostics: Set<string> = new Set();
  for (const d of diagnostics || []) {
    if (!d.tenant_id) continue;
    const t = ensureTenant(d.tenant_id);
    t.diagnosticHistory.push({ score: d.overall_score, date: d.created_at });
    if (!seenDiagnostics.has(d.tenant_id)) {
      seenDiagnostics.add(d.tenant_id);
      t.lastDiagnostic = { score: d.overall_score, date: d.created_at, aiAnalysis: d.ai_analysis };
    }
  }

  // Processar campanhas
  for (const c of campaigns || []) {
    if (!c.tenant_id) continue;
    const t = ensureTenant(c.tenant_id);
    t.campaignCount++;
  }

  // Processar jogos
  for (const g of games || []) {
    if (!g.tenant_id) continue;
    const t = ensureTenant(g.tenant_id);
    t.gameCount++;
  }

  // Calcular NPS score por tenant
  const tenantAnalytics = Object.values(tenantMap).map((t: any) => {
    const scores = t.npsScores;
    const promotores = scores.filter((s: number) => s >= 9).length;
    const detratores = scores.filter((s: number) => s <= 6).length;
    const npsScore = scores.length > 0 ? Math.round(((promotores - detratores) / scores.length) * 100) : null;
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : null;

    // Tendência NPS (últimos 3 meses vs 3 meses anteriores)
    const months = Object.keys(t.npsMonthly).sort();
    const recentMonths = months.slice(-3);
    const prevMonths = months.slice(-6, -3);
    const recentScores = recentMonths.flatMap((m: string) => t.npsMonthly[m]);
    const prevScores = prevMonths.flatMap((m: string) => t.npsMonthly[m]);
    let npsTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentScores.length > 0 && prevScores.length > 0) {
      const recentAvg = recentScores.reduce((a: number, b: number) => a + b, 0) / recentScores.length;
      const prevAvg = prevScores.reduce((a: number, b: number) => a + b, 0) / prevScores.length;
      if (recentAvg > prevAvg + 0.3) npsTrend = 'up';
      else if (recentAvg < prevAvg - 0.3) npsTrend = 'down';
    }

    // Health score (0-100): NPS (40%) + uso/atividade (30%) + leads ativos (30%)
    const npsHealth = npsScore !== null ? Math.min(100, Math.max(0, (npsScore + 100) / 2)) : 50;
    const leadsHealth = Math.min(100, (t.leads.vendido / Math.max(1, t.leads.total)) * 100);
    const activityHealth = t.lastActivity
      ? Math.max(0, 100 - Math.floor((Date.now() - new Date(t.lastActivity).getTime()) / (1000 * 60 * 60 * 24)) * 3)
      : 0;
    const healthScore = Math.round(npsHealth * 0.4 + leadsHealth * 0.3 + activityHealth * 0.3);

    // Calcular tempo de uso em dias
    const createdAt = companyCreatedMap[t.tenantId];
    const daysAsClient = createdAt
      ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Nicho/setor
    const rawBusinessType = businessTypeMap[t.tenantId] || '';
    const sector = normalizeBusinessType(rawBusinessType);

    return {
      tenantId: t.tenantId,
      companyName: companyNameMap[t.tenantId] || t.tenantId.substring(0, 8),
      plan: companyPlanMap[t.tenantId] || '',
      subscriptionStatus: companyStatusMap[t.tenantId] || '',
      daysAsClient,
      businessType: rawBusinessType,
      sector,
      nps: {
        score: npsScore,
        avgScore,
        totalResponses: scores.length,
        promotores,
        detratores,
        passivos: scores.length - promotores - detratores,
        trend: npsTrend,
        monthly: t.npsMonthly,
        topComments: t.npsComments.filter((c: string) => c.length > 15).slice(0, 10),
      },
      leads: t.leads,
      lastDiagnostic: t.lastDiagnostic,
      diagnosticCount: t.diagnosticHistory.length,
      campaignCount: t.campaignCount,
      gameCount: t.gameCount,
      lastActivity: t.lastActivity,
      healthScore,
    };
  });

  // Métricas globais
  const allScores = (npsResponses || []).map((r: any) => r.score).filter((s: any) => s !== null);
  const globalPromo = allScores.filter((s: number) => s >= 9).length;
  const globalDetr = allScores.filter((s: number) => s <= 6).length;
  const globalNps = allScores.length > 0 ? Math.round(((globalPromo - globalDetr) / allScores.length) * 100) : 0;
  const totalPipeline = (leads || []).reduce((sum: number, l: any) => sum + (parseFloat(String(l.value || 0)) || 0), 0);

  // Métricas por setor
  const sectorMap: Record<string, { tenants: number; npsScores: number[]; leads: number; pipeline: number; responses: number }> = {};
  for (const ta of tenantAnalytics) {
    const sec = ta.sector || 'Não informado';
    if (!sectorMap[sec]) sectorMap[sec] = { tenants: 0, npsScores: [], leads: 0, pipeline: 0, responses: 0 };
    sectorMap[sec].tenants++;
    if (ta.nps.score !== null) sectorMap[sec].npsScores.push(ta.nps.score);
    sectorMap[sec].leads += ta.leads.total;
    sectorMap[sec].pipeline += ta.leads.pipelineValue;
    sectorMap[sec].responses += ta.nps.totalResponses;
  }

  const sectorAnalytics = Object.entries(sectorMap)
    .map(([sector, data]) => ({
      sector,
      tenantCount: data.tenants,
      avgNps: data.npsScores.length > 0 ? Math.round(data.npsScores.reduce((a, b) => a + b, 0) / data.npsScores.length) : null,
      totalLeads: data.leads,
      totalPipeline: data.pipeline,
      totalResponses: data.responses,
      avgResponsesPerTenant: data.tenants > 0 ? Math.round(data.responses / data.tenants) : 0,
    }))
    .sort((a, b) => b.tenantCount - a.tenantCount);

  return NextResponse.json({
    global: {
      npsScore: globalNps,
      totalNpsResponses: allScores.length,
      totalLeads: (leads || []).length,
      totalPipelineValue: totalPipeline,
      totalDiagnostics: (diagnostics || []).length,
      activeTenantsCount: Object.keys(tenantMap).length,
    },
    tenants: tenantAnalytics,
    sectorAnalytics,
  });
}

// ─── Detalhe de um tenant específico ─────────────────────────────────────────
async function getTenantDetail(tenantId: string) {
  // Usar paginação para buscar todas as respostas NPS do tenant
  const npsResponses = await fetchAll('nps_responses', '*', (q: any) => q.eq('tenant_id', tenantId).order('created_at', { ascending: false }));
  const leads = await fetchAll('leads', '*', (q: any) => q.eq('tenant_id', tenantId).order('created_at', { ascending: false }));

  const { data: diagnosticsRaw } = await supabase
    .from('digital_diagnostics')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  const diagnostics = diagnosticsRaw || [];

  const { data: campaignsRaw } = await supabase
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  const campaigns = campaignsRaw || [];

  // NPS mensal
  const monthly: Record<string, number[]> = {};
  for (const r of npsResponses) {
    if (r.created_at && r.score !== null) {
      const m = r.created_at.substring(0, 7);
      if (!monthly[m]) monthly[m] = [];
      monthly[m].push(r.score);
    }
  }
  const monthlyNps = Object.entries(monthly).sort().map(([month, scores]) => {
    const promo = scores.filter(s => s >= 9).length;
    const detr = scores.filter(s => s <= 6).length;
    return {
      month,
      nps: Math.round(((promo - detr) / scores.length) * 100),
      avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    };
  });

  // Extrair todos os textos de respostas
  const allTexts: string[] = [];
  for (const r of npsResponses) {
    if (r.comment && String(r.comment).length > 5) allTexts.push(String(r.comment));
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && typeof ans.answer === 'string' && ans.answer.length > 5) {
          allTexts.push(ans.answer);
        }
        if (ans?.answer && Array.isArray(ans.answer)) {
          for (const item of ans.answer) {
            if (typeof item === 'string' && item.length > 3) allTexts.push(item);
          }
        }
      }
    }
  }

  // Leads por status
  const leadsByStatus: Record<string, number> = {};
  let pipelineValue = 0;
  for (const l of leads) {
    const s = l.status || 'Novo';
    leadsByStatus[s] = (leadsByStatus[s] || 0) + 1;
    pipelineValue += parseFloat(String(l.value || 0)) || 0;
  }

  return NextResponse.json({
    tenantId,
    nps: {
      responses: npsResponses.slice(0, 50),
      monthly: monthlyNps,
      allTexts: allTexts.filter(t => t.length > 15).slice(0, 100),
      totalResponses: npsResponses.length,
    },
    leads: {
      items: leads.slice(0, 50),
      byStatus: leadsByStatus,
      pipelineValue,
      total: leads.length,
    },
    diagnostics: diagnostics.slice(0, 20),
    campaigns,
  });
}

// ─── Tendências globais da base ───────────────────────────────────────────────
async function getGlobalTrends() {
  // Usar paginação para buscar todas as respostas
  const npsResponses = await fetchAll('nps_responses', 'score, created_at, comment, answers, tenant_id');

  // Tendência mensal global
  const monthly: Record<string, { scores: number[]; comments: string[]; choices: Record<string, number> }> = {};

  for (const r of npsResponses || []) {
    if (!r.created_at || r.score === null) continue;
    const m = r.created_at.substring(0, 7);
    if (!monthly[m]) monthly[m] = { scores: [], comments: [], choices: {} };
    monthly[m].scores.push(r.score);

    if (r.comment && String(r.comment).length > 5) {
      monthly[m].comments.push(String(r.comment));
    }

    // Múltipla escolha
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && Array.isArray(ans.answer)) {
          for (const item of ans.answer) {
            if (typeof item === 'string' && item.length > 3) {
              monthly[m].choices[item] = (monthly[m].choices[item] || 0) + 1;
            }
          }
        }
      }
    }
  }

  const trend = Object.entries(monthly).sort().map(([month, data]) => {
    const promo = data.scores.filter(s => s >= 9).length;
    const detr = data.scores.filter(s => s <= 6).length;
    return {
      month,
      nps: Math.round(((promo - detr) / data.scores.length) * 100),
      avg: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
      count: data.scores.length,
      promotores: promo,
      detratores: detr,
      passivos: data.scores.length - promo - detr,
      topChoices: Object.entries(data.choices).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  });

  // Top temas mencionados (múltipla escolha global)
  const globalChoices: Record<string, number> = {};
  for (const r of npsResponses || []) {
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && Array.isArray(ans.answer)) {
          for (const item of ans.answer) {
            if (typeof item === 'string' && item.length > 3) {
              globalChoices[item] = (globalChoices[item] || 0) + 1;
            }
          }
        }
      }
    }
  }

  const topThemes = Object.entries(globalChoices)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([theme, count]) => ({ theme, count }));

  return NextResponse.json({ trend, topThemes });
}

// ─── Insights de mercado (agrega comentários para análise) ────────────────────
async function getMarketInsights() {
  const npsResponses = await fetchAll('nps_responses', 'score, comment, answers, tenant_id, created_at');

  // Coletar todos os textos ricos
  const richTexts: { text: string; score: number; date: string; tenantId: string }[] = [];

  for (const r of npsResponses || []) {
    const score = r.score ?? 0;
    const date = r.created_at || '';
    const tid = r.tenant_id || '';

    if (r.comment && String(r.comment).length > 15) {
      richTexts.push({ text: String(r.comment), score, date, tenantId: tid });
    }
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && typeof ans.answer === 'string' && ans.answer.length > 15) {
          richTexts.push({ text: ans.answer, score, date, tenantId: tid });
        }
      }
    }
  }

  // Separar por sentimento
  const promoterTexts = richTexts.filter(t => t.score >= 9).map(t => t.text);
  const detractorTexts = richTexts.filter(t => t.score <= 6).map(t => t.text);
  const neutralTexts = richTexts.filter(t => t.score >= 7 && t.score <= 8).map(t => t.text);

  // Múltipla escolha global
  const choiceMap: Record<string, { count: number; promoter: number; detractor: number }> = {};
  for (const r of npsResponses || []) {
    if (r.answers && Array.isArray(r.answers)) {
      for (const ans of r.answers) {
        if (ans?.answer && Array.isArray(ans.answer)) {
          for (const item of ans.answer) {
            if (typeof item === 'string' && item.length > 3) {
              if (!choiceMap[item]) choiceMap[item] = { count: 0, promoter: 0, detractor: 0 };
              choiceMap[item].count++;
              if ((r.score ?? 0) >= 9) choiceMap[item].promoter++;
              if ((r.score ?? 0) <= 6) choiceMap[item].detractor++;
            }
          }
        }
      }
    }
  }

  const themes = Object.entries(choiceMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)
    .map(([theme, data]) => ({
      theme,
      count: data.count,
      promoterRate: Math.round((data.promoter / data.count) * 100),
      detractorRate: Math.round((data.detractor / data.count) * 100),
      sentiment: data.promoter > data.detractor ? 'positive' : data.detractor > data.promoter ? 'negative' : 'neutral',
    }));

  return NextResponse.json({
    totalTexts: richTexts.length,
    promoterTexts: promoterTexts.slice(0, 50),
    detractorTexts: detractorTexts.slice(0, 50),
    neutralTexts: neutralTexts.slice(0, 30),
    themes,
  });
}
