import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 1000;

async function fetchAll(table: string, select: string, extraFilters?: (q: any) => any) {
  let all: any[] = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).is('deleted_at', null).range(from, from + PAGE_SIZE - 1);
    if (extraFilters) query = extraFilters(query);
    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    // ─── 1. Buscar todos os dados base ───────────────────────────────────────
    const [npsResponses, leads, products] = await Promise.all([
      fetchAll('nps_responses', 'score, comment, answers, created_at, tenant_id'),
      fetchAll('leads', 'tenant_id, status, value, created_at, answers'),
      fetchAll('products_services', 'id, name, value, ai_description, tenant_id, keywords, created_at'),
    ]);

    // Buscar empresas e usuários
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, plan, subscription_status, created_at, city, state, niche, niche_data');
    const { data: usersForNames } = await supabase
      .from('users')
      .select('tenant_id, company_name, name, plan')
      .neq('email', 'admin@hellogrowth.com');
    const { data: businessProfiles } = await supabase
      .from('business_profile')
      .select('tenant_id, business_type, company_name, city, state');

    // ─── 2. Construir mapas de referência ────────────────────────────────────
    const userCompanyNameMap: Record<string, string> = {};
    const userPlanMap: Record<string, string> = {};
    for (const u of usersForNames || []) {
      if (u.tenant_id) {
        if (!userCompanyNameMap[u.tenant_id]) userCompanyNameMap[u.tenant_id] = u.company_name || u.name || '';
        if (!userPlanMap[u.tenant_id] && u.plan) userPlanMap[u.tenant_id] = u.plan;
      }
    }
    const companyNameMap: Record<string, string> = {};
    const companyNicheMap: Record<string, string> = {};
    const companyNicheDataMap: Record<string, any> = {};
    const companyCityMap: Record<string, string> = {};
    const companyStateMap: Record<string, string> = {};
    const companyPlanMap: Record<string, string> = {};
    for (const c of companies || []) {
      if (c.id) {
        companyNameMap[c.id] = c.name || userCompanyNameMap[c.id] || c.id.substring(0, 8);
        companyNicheMap[c.id] = c.niche || '';
        companyNicheDataMap[c.id] = c.niche_data || {};
        companyCityMap[c.id] = c.city || '';
        companyStateMap[c.id] = c.state || '';
        companyPlanMap[c.id] = c.plan || userPlanMap[c.id] || '';
      }
    }
    const businessTypeMap: Record<string, string> = {};
    const bpCityMap: Record<string, string> = {};
    const bpStateMap: Record<string, string> = {};
    for (const bp of businessProfiles || []) {
      if (bp.tenant_id) {
        if (bp.business_type) businessTypeMap[bp.tenant_id] = bp.business_type.trim();
        if (bp.city) bpCityMap[bp.tenant_id] = bp.city;
        if (bp.state) bpStateMap[bp.tenant_id] = bp.state;
      }
    }

    // ─── 3. Análise de comentários NPS ───────────────────────────────────────
    const allComments: { text: string; score: number; tenantId: string; company: string; niche: string; date: string }[] = [];
    for (const r of npsResponses) {
      const text = (r.comment || '').trim();
      if (text.length > 10 && r.score !== null) {
        allComments.push({
          text,
          score: r.score,
          tenantId: r.tenant_id,
          company: companyNameMap[r.tenant_id] || r.tenant_id?.substring(0, 8) || 'Desconhecido',
          niche: companyNicheMap[r.tenant_id] || businessTypeMap[r.tenant_id] || 'Não informado',
          date: r.created_at,
        });
      }
    }

    // Separar elogios (score >= 9) e reclamações (score <= 6)
    const elogios = allComments
      .filter(c => c.score >= 9)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);
    const reclamacoes = allComments
      .filter(c => c.score <= 6)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);

    // Análise de palavras-chave nos comentários
    const stopWords = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'estão', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'numa', 'pelos', 'elas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'fosse', 'dele', 'tu', 'te', 'vocês', 'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'aquilo', 'estou', 'está', 'estamos', 'estão', 'estive', 'esteve', 'estivemos', 'estiveram', 'estava', 'estávamos', 'estavam', 'estivera', 'estivéramos', 'esteja', 'estejamos', 'estejam', 'estivesse', 'estivéssemos', 'estivessem', 'estiver', 'estivermos', 'estiverem', 'hei', 'há', 'havemos', 'hão', 'houve', 'houvemos', 'houveram', 'houvera', 'houvéramos', 'haja', 'hajamos', 'hajam', 'houvesse', 'houvéssemos', 'houvessem', 'houver', 'houvermos', 'houverem', 'houverei', 'houverá', 'houveremos', 'houverão', 'houveria', 'houveríamos', 'houveriam', 'sou', 'somos', 'são', 'era', 'éramos', 'eram', 'fui', 'foi', 'fomos', 'foram', 'fora', 'fôramos', 'seja', 'sejamos', 'sejam', 'fosse', 'fôssemos', 'fossem', 'for', 'formos', 'forem', 'serei', 'será', 'seremos', 'serão', 'seria', 'seríamos', 'seriam', 'tenho', 'tem', 'temos', 'têm', 'tinha', 'tínhamos', 'tinham', 'tive', 'teve', 'tivemos', 'tiveram', 'tivera', 'tivéramos', 'tenha', 'tenhamos', 'tenham', 'tivesse', 'tivéssemos', 'tivessem', 'tiver', 'tivermos', 'tiverem', 'terei', 'terá', 'teremos', 'terão', 'teria', 'teríamos', 'teriam', 'muito', 'bem', 'bom', 'boa', 'sempre', 'ainda', 'aqui', 'sim', 'não', 'nunca', 'tudo', 'nada', 'cada', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'tanto', 'tanta', 'tantos', 'tantas', 'pouco', 'pouca', 'poucos', 'poucas', 'mais', 'menos', 'melhor', 'pior', 'maior', 'menor', 'primeiro', 'última', 'último', 'novo', 'nova', 'novos', 'novas', 'grande', 'pequeno', 'mesmo', 'mesma', 'mesmos', 'mesmas', 'assim', 'então', 'porque', 'pois', 'porém', 'contudo', 'todavia', 'entretanto', 'portanto', 'logo', 'pois', 'ora', 'quer', 'seja', 'nem', 'não', 'sim', 'já', 'ainda', 'apenas', 'somente', 'só', 'também', 'além', 'inclusive', 'exceto', 'salvo', 'senão', 'mas', 'porém', 'contudo', 'todavia', 'entretanto', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas', 'ao', 'aos', 'à', 'às', 'do', 'da', 'dos', 'das', 'num', 'numa', 'nuns', 'numas', 'dum', 'duma', 'duns', 'dumas', 'com', 'sem', 'sob', 'sobre', 'ante', 'após', 'até', 'desde', 'para', 'per', 'perante', 'por', 'trás', 'via', 'que', 'quem', 'qual', 'quais', 'quanto', 'quanta', 'quantos', 'quantas', 'cujo', 'cuja', 'cujos', 'cujas', 'onde', 'quando', 'como', 'se', 'embora', 'conquanto', 'posto', 'apesar', 'caso', 'desde', 'enquanto', 'conforme', 'consoante', 'segundo', 'logo', 'portanto', 'pois', 'porque', 'visto', 'dado', 'uma', 'umas', 'uns']);

    const countWords = (comments: typeof allComments) => {
      const freq: Record<string, number> = {};
      for (const c of comments) {
        const words = c.text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúüç\s]/g, ' ').split(/\s+/);
        for (const w of words) {
          if (w.length >= 4 && !stopWords.has(w)) {
            freq[w] = (freq[w] || 0) + 1;
          }
        }
      }
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word, count]) => ({ word, count }));
    };

    const topElogioWords = countWords(elogios);
    const topReclamacaoWords = countWords(reclamacoes);

    // ─── 4. Análise de produtos ───────────────────────────────────────────────
    const productFreq: Record<string, { name: string; count: number; totalValue: number; tenants: Set<string>; keywords: string[] }> = {};
    for (const p of products) {
      const normalizedName = (p.name || '').trim().toLowerCase();
      if (!normalizedName) continue;
      if (!productFreq[normalizedName]) {
        productFreq[normalizedName] = { name: p.name, count: 0, totalValue: 0, tenants: new Set(), keywords: p.keywords || [] };
      }
      productFreq[normalizedName].count++;
      productFreq[normalizedName].totalValue += parseFloat(String(p.value || 0)) || 0;
      productFreq[normalizedName].tenants.add(p.tenant_id);
    }
    const topProducts = Object.values(productFreq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
      .map(p => ({ name: p.name, count: p.count, totalValue: Math.round(p.totalValue * 100) / 100, tenantCount: p.tenants.size, keywords: p.keywords }));

    // Valores por faixa de preço
    const allValues = products.map(p => parseFloat(String(p.value || 0)) || 0).filter(v => v > 0);
    const valueRanges = [
      { label: 'Até R$ 500', min: 0, max: 500, count: 0 },
      { label: 'R$ 501 – R$ 1k', min: 501, max: 1000, count: 0 },
      { label: 'R$ 1k – R$ 3k', min: 1001, max: 3000, count: 0 },
      { label: 'R$ 3k – R$ 10k', min: 3001, max: 10000, count: 0 },
      { label: 'Acima de R$ 10k', min: 10001, max: Infinity, count: 0 },
    ];
    for (const v of allValues) {
      const range = valueRanges.find(r => v >= r.min && v <= r.max);
      if (range) range.count++;
    }
    const totalProductValue = allValues.reduce((a, b) => a + b, 0);
    const avgProductValue = allValues.length > 0 ? totalProductValue / allValues.length : 0;

    // ─── 5. Análise de pipeline / leads ──────────────────────────────────────
    const totalLeads = leads.length;
    const totalPipeline = leads.reduce((sum, l) => sum + (parseFloat(String(l.value || 0)) || 0), 0);
    const leadsByStatus: Record<string, number> = {};
    for (const l of leads) {
      const s = l.status || 'Sem status';
      leadsByStatus[s] = (leadsByStatus[s] || 0) + 1;
    }
    const leadStatusRanking = Object.entries(leadsByStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count, pct: Math.round((count / totalLeads) * 100) }));

    // ─── 6. ICP / Persona ────────────────────────────────────────────────────
    // Calcular NPS por tenant para identificar melhores clientes
    const tenantNpsMap: Record<string, { scores: number[]; leads: number; pipeline: number; niche: string; city: string; state: string; nicheData: any; plan: string; company: string }> = {};
    for (const r of npsResponses) {
      const tid = r.tenant_id;
      if (!tid) continue;
      if (!tenantNpsMap[tid]) {
        tenantNpsMap[tid] = {
          scores: [],
          leads: 0,
          pipeline: 0,
          niche: companyNicheMap[tid] || businessTypeMap[tid] || 'Não informado',
          city: companyCityMap[tid] || bpCityMap[tid] || '',
          state: companyStateMap[tid] || bpStateMap[tid] || '',
          nicheData: companyNicheDataMap[tid] || {},
          plan: companyPlanMap[tid] || '',
          company: companyNameMap[tid] || tid.substring(0, 8),
        };
      }
      if (r.score !== null) tenantNpsMap[tid].scores.push(r.score);
    }
    for (const l of leads) {
      const tid = l.tenant_id;
      if (!tid) continue;
      if (!tenantNpsMap[tid]) {
        tenantNpsMap[tid] = {
          scores: [],
          leads: 0,
          pipeline: 0,
          niche: companyNicheMap[tid] || businessTypeMap[tid] || 'Não informado',
          city: companyCityMap[tid] || bpCityMap[tid] || '',
          state: companyStateMap[tid] || bpStateMap[tid] || '',
          nicheData: companyNicheDataMap[tid] || {},
          plan: companyPlanMap[tid] || '',
          company: companyNameMap[tid] || tid.substring(0, 8),
        };
      }
      tenantNpsMap[tid].leads++;
      tenantNpsMap[tid].pipeline += parseFloat(String(l.value || 0)) || 0;
    }

    // Calcular NPS score por tenant
    const tenantProfiles = Object.entries(tenantNpsMap).map(([tid, t]) => {
      const scores = t.scores;
      const promotores = scores.filter(s => s >= 9).length;
      const detratores = scores.filter(s => s <= 6).length;
      const nps = scores.length > 0 ? Math.round(((promotores - detratores) / scores.length) * 100) : null;
      return {
        tenantId: tid,
        company: t.company,
        niche: t.niche,
        city: t.city,
        state: t.state,
        plan: t.plan,
        nicheData: t.nicheData,
        nps,
        responses: scores.length,
        leads: t.leads,
        pipeline: Math.round(t.pipeline * 100) / 100,
      };
    });

    // ICP: clientes com NPS alto (>= 70) e leads altos
    const icpCandidates = tenantProfiles
      .filter(t => t.nps !== null && t.nps >= 70 && t.leads >= 5)
      .sort((a, b) => (b.nps || 0) - (a.nps || 0));

    // Distribuição por nicho
    const nicheMap: Record<string, { count: number; npsScores: number[]; leads: number; pipeline: number; cities: string[]; states: string[] }> = {};
    for (const t of tenantProfiles) {
      const niche = t.niche || 'Não informado';
      if (!nicheMap[niche]) nicheMap[niche] = { count: 0, npsScores: [], leads: 0, pipeline: 0, cities: [], states: [] };
      nicheMap[niche].count++;
      if (t.nps !== null) nicheMap[niche].npsScores.push(t.nps);
      nicheMap[niche].leads += t.leads;
      nicheMap[niche].pipeline += t.pipeline;
      if (t.city) nicheMap[niche].cities.push(t.city);
      if (t.state) nicheMap[niche].states.push(t.state);
    }
    const nicheRanking = Object.entries(nicheMap)
      .map(([niche, d]) => ({
        niche,
        count: d.count,
        avgNps: d.npsScores.length > 0 ? Math.round(d.npsScores.reduce((a, b) => a + b, 0) / d.npsScores.length) : null,
        totalLeads: d.leads,
        totalPipeline: Math.round(d.pipeline * 100) / 100,
        avgLeadsPerClient: d.count > 0 ? Math.round(d.leads / d.count) : 0,
        topStates: [...new Set(d.states)].slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count);

    // Distribuição geográfica
    const stateMap: Record<string, { count: number; npsScores: number[]; leads: number; pipeline: number; niches: string[] }> = {};
    for (const t of tenantProfiles) {
      const state = t.state || 'Não informado';
      if (!stateMap[state]) stateMap[state] = { count: 0, npsScores: [], leads: 0, pipeline: 0, niches: [] };
      stateMap[state].count++;
      if (t.nps !== null) stateMap[state].npsScores.push(t.nps);
      stateMap[state].leads += t.leads;
      stateMap[state].pipeline += t.pipeline;
      if (t.niche) stateMap[state].niches.push(t.niche);
    }
    const stateRanking = Object.entries(stateMap)
      .map(([state, d]) => ({
        state,
        count: d.count,
        avgNps: d.npsScores.length > 0 ? Math.round(d.npsScores.reduce((a, b) => a + b, 0) / d.npsScores.length) : null,
        totalLeads: d.leads,
        totalPipeline: Math.round(d.pipeline * 100) / 100,
        topNiches: [...new Set(d.niches)].slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count);

    // Distribuição por plano
    const planMap: Record<string, { count: number; npsScores: number[]; leads: number }> = {};
    for (const t of tenantProfiles) {
      const plan = t.plan || 'Não informado';
      if (!planMap[plan]) planMap[plan] = { count: 0, npsScores: [], leads: 0 };
      planMap[plan].count++;
      if (t.nps !== null) planMap[plan].npsScores.push(t.nps);
      planMap[plan].leads += t.leads;
    }
    const planDistribution = Object.entries(planMap)
      .map(([plan, d]) => ({
        plan,
        count: d.count,
        avgNps: d.npsScores.length > 0 ? Math.round(d.npsScores.reduce((a, b) => a + b, 0) / d.npsScores.length) : null,
        avgLeads: d.count > 0 ? Math.round(d.leads / d.count) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ─── 7. Odontologia específico ────────────────────────────────────────────
    const odontologiaTenants = tenantProfiles.filter(t =>
      t.niche?.toLowerCase().includes('odontolog') ||
      t.niche?.toLowerCase().includes('dentist') ||
      t.niche?.toLowerCase().includes('clínica') ||
      t.niche?.toLowerCase().includes('clinica')
    );
    const odontoCadeiras: Record<string, number> = { '1-2': 0, '3-5': 0, '6+': 0 };
    const odontoDentistas: Record<string, number> = { '1': 0, '2-3': 0, '4+': 0 };
    const odontoSecretaria: Record<string, number> = { 'Sim': 0, 'Não': 0 };
    for (const t of odontologiaTenants) {
      const nd = t.nicheData || {};
      const cadeiras = parseInt(String(nd.cadeiras || nd.chairs || 0));
      if (cadeiras >= 6) odontoCadeiras['6+']++;
      else if (cadeiras >= 3) odontoCadeiras['3-5']++;
      else if (cadeiras >= 1) odontoCadeiras['1-2']++;
      const dentistas = parseInt(String(nd.dentistas || nd.dentists || 0));
      if (dentistas >= 4) odontoDentistas['4+']++;
      else if (dentistas >= 2) odontoDentistas['2-3']++;
      else if (dentistas >= 1) odontoDentistas['1']++;
      const sec = nd.has_secretary || nd.secretaria;
      if (sec === true || sec === 'sim' || sec === 'Sim') odontoSecretaria['Sim']++;
      else odontoSecretaria['Não']++;
    }

    // ─── 8. Insights automáticos ──────────────────────────────────────────────
    const insights: { type: 'success' | 'warning' | 'info'; title: string; description: string }[] = [];

    // Nicho com maior NPS
    const topNicheByNps = [...nicheRanking].filter(n => n.avgNps !== null).sort((a, b) => (b.avgNps || 0) - (a.avgNps || 0))[0];
    if (topNicheByNps) {
      insights.push({ type: 'success', title: `Nicho com maior NPS: ${topNicheByNps.niche}`, description: `NPS médio de ${topNicheByNps.avgNps} com ${topNicheByNps.count} clientes. Foco ideal para expansão.` });
    }

    // Nicho com mais leads
    const topNicheByLeads = [...nicheRanking].sort((a, b) => b.avgLeadsPerClient - a.avgLeadsPerClient)[0];
    if (topNicheByLeads) {
      insights.push({ type: 'info', title: `Nicho mais produtivo em leads: ${topNicheByLeads.niche}`, description: `Média de ${topNicheByLeads.avgLeadsPerClient} leads/cliente. Pipeline total: R$ ${topNicheByLeads.totalPipeline.toLocaleString('pt-BR')}.` });
    }

    // Estado com maior concentração
    const topState = stateRanking[0];
    if (topState && topState.state !== 'Não informado') {
      insights.push({ type: 'info', title: `Maior concentração geográfica: ${topState.state}`, description: `${topState.count} clientes, NPS médio ${topState.avgNps ?? '—'}, ${topState.totalLeads} leads gerados.` });
    }

    // Produto mais vendido
    if (topProducts[0]) {
      insights.push({ type: 'success', title: `Produto/serviço mais comum: "${topProducts[0].name}"`, description: `Aparece em ${topProducts[0].count} clientes (${topProducts[0].tenantCount} empresas distintas). Valor médio: R$ ${topProducts[0].count > 0 ? Math.round(topProducts[0].totalValue / topProducts[0].count).toLocaleString('pt-BR') : '—'}.` });
    }

    // Alerta de reclamações
    const reclamacaoRate = allComments.length > 0 ? Math.round((reclamacoes.length / allComments.length) * 100) : 0;
    if (reclamacaoRate > 30) {
      insights.push({ type: 'warning', title: `Alta taxa de comentários negativos: ${reclamacaoRate}%`, description: `${reclamacoes.length} de ${allComments.length} comentários com NPS ≤ 6. Revisar principais reclamações.` });
    } else {
      insights.push({ type: 'success', title: `Baixa taxa de comentários negativos: ${reclamacaoRate}%`, description: `${elogios.length} elogios vs ${reclamacoes.length} reclamações. Boa reputação geral.` });
    }

    // ICP insight
    if (icpCandidates.length > 0) {
      const topIcp = icpCandidates[0];
      insights.push({ type: 'success', title: `ICP ideal identificado: ${topIcp.niche || 'Não informado'} em ${topIcp.state || 'BR'}`, description: `Clientes com NPS ≥ 70 e ≥ 5 leads tendem a ser de ${topIcp.niche}. ${icpCandidates.length} clientes se encaixam neste perfil.` });
    }

    return NextResponse.json({
      // Comentários
      elogios: elogios.slice(0, 50),
      reclamacoes: reclamacoes.slice(0, 50),
      topElogioWords,
      topReclamacaoWords,
      totalComments: allComments.length,
      elogioCount: elogios.length,
      reclamacaoCount: reclamacoes.length,

      // Produtos
      topProducts,
      valueRanges,
      totalProductValue: Math.round(totalProductValue * 100) / 100,
      avgProductValue: Math.round(avgProductValue * 100) / 100,
      totalProductCount: products.length,

      // Pipeline / Leads
      totalLeads,
      totalPipeline: Math.round(totalPipeline * 100) / 100,
      leadStatusRanking,

      // ICP / Persona
      icpCandidates: icpCandidates.slice(0, 20),
      tenantProfiles: tenantProfiles.slice(0, 200),

      // Distribuições
      nicheRanking,
      stateRanking,
      planDistribution,

      // Odontologia
      odontologiaCount: odontologiaTenants.length,
      odontoCadeiras,
      odontoDentistas,
      odontoSecretaria,

      // Insights
      insights,
    });
  } catch (err: any) {
    console.error('[market-intelligence] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
