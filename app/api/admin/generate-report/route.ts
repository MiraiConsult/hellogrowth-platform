import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

// POST /api/admin/generate-report — gera um relatório HTML completo com IA para um cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, healthScore, tenantData, aiAnalysis, content } = body;

    // Se receber apenas content (modo legado), gerar HTML simples
    if (content && !tenantData) {
      return generateLegacyReport(content, clientName, healthScore);
    }

    // Gerar análise de IA se não foi fornecida
    let aiInsights = aiAnalysis;
    if (!aiInsights && tenantData) {
      aiInsights = await generateAIInsights(tenantData, clientName);
    }

    const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : healthScore >= 40 ? '#f97316' : '#ef4444';
    const scoreLabel = healthScore >= 80 ? 'Saudável' : healthScore >= 60 ? 'Atenção' : healthScore >= 40 ? 'Risco' : 'Crítico';
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Dados do tenant
    const npsScore = tenantData?.nps?.score ?? 'N/A';
    const npsResponses = tenantData?.nps?.totalResponses || 0;
    const promotores = tenantData?.nps?.promotores || 0;
    const detratores = tenantData?.nps?.detratores || 0;
    const passivos = tenantData?.nps?.passivos || 0;
    const leadsTotal = tenantData?.leads?.total || 0;
    const leadsVendidos = tenantData?.leads?.vendido || 0;
    const leadsNegociacao = tenantData?.leads?.negociacao || 0;
    const leadsPerdidos = tenantData?.leads?.perdido || 0;
    const pipelineValue = tenantData?.leads?.pipelineValue || 0;
    const campaignCount = tenantData?.campaignCount || 0;
    const diagnosticCount = tenantData?.diagnosticCount || 0;
    const lastDiagScore = tenantData?.lastDiagnostic?.score || null;
    const sector = tenantData?.sector || 'Não informado';
    const plan = tenantData?.plan || '';
    const daysAsClient = tenantData?.daysAsClient || null;

    const npsColor = npsScore >= 70 ? '#10b981' : npsScore >= 30 ? '#f59e0b' : '#ef4444';
    const conversionRate = leadsTotal > 0 ? Math.round((leadsVendidos / leadsTotal) * 100) : 0;

    // Gerar seções de IA
    const aiSections = aiInsights ? `
      <div class="section">
        <h2>🤖 Análise de Inteligência Artificial</h2>
        ${aiInsights.saude_geral ? `<div class="ai-badge" style="background:${aiInsights.saude_geral === 'ótima' ? '#10b98122' : aiInsights.saude_geral === 'boa' ? '#3b82f622' : aiInsights.saude_geral === 'regular' ? '#f59e0b22' : '#ef444422'}; color:${aiInsights.saude_geral === 'ótima' ? '#10b981' : aiInsights.saude_geral === 'boa' ? '#3b82f6' : aiInsights.saude_geral === 'regular' ? '#f59e0b' : '#ef4444'};">Saúde: ${aiInsights.saude_geral.charAt(0).toUpperCase() + aiInsights.saude_geral.slice(1)}</div>` : ''}
        ${aiInsights.resumo ? `<p class="ai-summary">${aiInsights.resumo}</p>` : ''}
      </div>

      ${aiInsights.o_que_clientes_elogiam?.length > 0 ? `
      <div class="section">
        <h2>👍 O que os clientes elogiam</h2>
        <ul class="list-green">
          ${aiInsights.o_que_clientes_elogiam.map((e: string) => `<li>${e}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${aiInsights.o_que_clientes_reclamam?.length > 0 ? `
      <div class="section">
        <h2>⚠️ Pontos de atenção</h2>
        <ul class="list-red">
          ${aiInsights.o_que_clientes_reclamam.map((r: string) => `<li>${r}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${aiInsights.oportunidades_para_cliente?.length > 0 ? `
      <div class="section">
        <h2>🎯 Oportunidades e Recomendações</h2>
        ${aiInsights.oportunidades_para_cliente.map((op: any) => `
          <div class="opportunity-card">
            <div class="opp-action">${op.acao}</div>
            <div class="opp-reason">${op.motivo}</div>
            ${op.resultado_esperado ? `<div class="opp-result">→ ${op.resultado_esperado}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      ${aiInsights.script_abordagem ? `
      <div class="section">
        <h2>💬 Script de Abordagem CS</h2>
        <div class="script-box">"${aiInsights.script_abordagem}"</div>
      </div>` : ''}
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 13px; line-height: 1.6; }
    .page { padding: 40px 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 20px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; }
    .logo span { color: #1e293b; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    .info-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .info-tag { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    
    .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
    .score-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .score-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .score-value { font-size: 24px; font-weight: 800; color: ${scoreColor}; }
    .score-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${scoreColor}22; color: ${scoreColor}; }
    .score-bar-bg { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .score-bar-fill { height: 6px; border-radius: 3px; background: ${scoreColor}; width: ${Math.min(100, healthScore || 0)}%; }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .metric-value { font-size: 20px; font-weight: 800; }
    .metric-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .metric-sub { font-size: 10px; color: #94a3b8; }

    .section { margin-bottom: 20px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }

    .pipeline-bar { display: flex; height: 24px; border-radius: 6px; overflow: hidden; gap: 2px; margin: 8px 0; }
    .pipeline-seg { display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; }

    .ai-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 8px; }
    .ai-summary { font-size: 13px; color: #374151; line-height: 1.7; }

    .list-green li { color: #059669; margin: 4px 0 4px 16px; font-size: 12px; }
    .list-red li { color: #dc2626; margin: 4px 0 4px 16px; font-size: 12px; }

    .opportunity-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
    .opp-action { font-size: 12px; font-weight: 700; color: #166534; }
    .opp-reason { font-size: 11px; color: #4b5563; margin-top: 2px; }
    .opp-result { font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600; }

    .script-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px; font-style: italic; color: #5b21b6; font-size: 12px; line-height: 1.7; }

    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }

    @media print { .page { padding: 20px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">Hello<span>Growth</span></div>
      <div class="meta">
        <div style="font-weight:600;">Relatório de Valor</div>
        <div>${dateStr}</div>
      </div>
    </div>

    <div class="title">Relatório — ${clientName || 'Cliente'}</div>
    <div class="subtitle">Análise completa de resultados e uso da plataforma HelloGrowth</div>

    <div class="info-row">
      ${sector && sector !== 'Não informado' ? `<span class="info-tag" style="background:#e0e7ff;color:#4338ca;">${sector}</span>` : ''}
      ${plan ? `<span class="info-tag" style="background:#faf5ff;color:#7c3aed;">Plano: ${plan.replace('hello_', '').replace('_', ' ').charAt(0).toUpperCase() + plan.replace('hello_', '').replace('_', ' ').slice(1)}</span>` : ''}
      ${daysAsClient ? `<span class="info-tag" style="background:#f0fdf4;color:#166534;">${daysAsClient} dias como cliente</span>` : ''}
    </div>

    <div class="score-card">
      <div class="score-header">
        <span class="score-label">Health Score</span>
        <span class="score-badge">${scoreLabel}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span class="score-value">${healthScore || 0}</span>
        <span style="font-size:14px;color:#94a3b8;">/100</span>
      </div>
      <div class="score-bar-bg"><div class="score-bar-fill"></div></div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value" style="color:${npsColor};">${npsScore}</div>
        <div class="metric-label">NPS</div>
        <div class="metric-sub">${npsResponses} respostas</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#3b82f6;">${leadsTotal}</div>
        <div class="metric-label">Leads</div>
        <div class="metric-sub">${leadsVendidos} vendidos</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#8b5cf6;">${pipelineValue > 0 ? `R$${(pipelineValue / 1000).toFixed(1)}k` : 'R$0'}</div>
        <div class="metric-label">Pipeline</div>
        <div class="metric-sub">${conversionRate}% conversão</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:#f59e0b;">${campaignCount}</div>
        <div class="metric-label">Campanhas</div>
        <div class="metric-sub">${diagnosticCount} diagnósticos</div>
      </div>
    </div>

    <div class="section">
      <h2>📊 Distribuição NPS</h2>
      <div style="display:flex;gap:16px;margin:8px 0;">
        <div style="text-align:center;flex:1;background:#f0fdf4;border-radius:8px;padding:8px;">
          <div style="font-size:18px;font-weight:800;color:#10b981;">${promotores}</div>
          <div style="font-size:10px;color:#64748b;">Promotores</div>
        </div>
        <div style="text-align:center;flex:1;background:#fefce8;border-radius:8px;padding:8px;">
          <div style="font-size:18px;font-weight:800;color:#f59e0b;">${passivos}</div>
          <div style="font-size:10px;color:#64748b;">Passivos</div>
        </div>
        <div style="text-align:center;flex:1;background:#fef2f2;border-radius:8px;padding:8px;">
          <div style="font-size:18px;font-weight:800;color:#ef4444;">${detratores}</div>
          <div style="font-size:10px;color:#64748b;">Detratores</div>
        </div>
      </div>
    </div>

    ${leadsTotal > 0 ? `
    <div class="section">
      <h2>📈 Pipeline de Vendas</h2>
      <div class="pipeline-bar">
        ${leadsVendidos > 0 ? `<div class="pipeline-seg" style="background:#10b981;flex:${leadsVendidos};">${leadsVendidos}</div>` : ''}
        ${leadsNegociacao > 0 ? `<div class="pipeline-seg" style="background:#f59e0b;flex:${leadsNegociacao};">${leadsNegociacao}</div>` : ''}
        ${leadsPerdidos > 0 ? `<div class="pipeline-seg" style="background:#ef4444;flex:${leadsPerdidos};">${leadsPerdidos}</div>` : ''}
        ${(leadsTotal - leadsVendidos - leadsNegociacao - leadsPerdidos) > 0 ? `<div class="pipeline-seg" style="background:#94a3b8;flex:${leadsTotal - leadsVendidos - leadsNegociacao - leadsPerdidos};">${leadsTotal - leadsVendidos - leadsNegociacao - leadsPerdidos}</div>` : ''}
      </div>
      <div style="display:flex;gap:12px;font-size:10px;color:#64748b;">
        <span>🟢 Vendidos: ${leadsVendidos}</span>
        <span>🟡 Negociação: ${leadsNegociacao}</span>
        <span>🔴 Perdidos: ${leadsPerdidos}</span>
        <span>⚪ Outros: ${leadsTotal - leadsVendidos - leadsNegociacao - leadsPerdidos}</span>
      </div>
    </div>` : ''}

    ${lastDiagScore !== null ? `
    <div class="section">
      <h2>🔍 Diagnóstico de Presença Digital (MPD)</h2>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:28px;font-weight:800;color:${lastDiagScore >= 70 ? '#10b981' : lastDiagScore >= 40 ? '#f59e0b' : '#ef4444'};">${lastDiagScore}<span style="font-size:14px;color:#94a3b8;">/100</span></span>
        <span style="font-size:11px;color:#64748b;">${diagnosticCount} diagnóstico(s) realizado(s)</span>
      </div>
    </div>` : ''}

    ${aiSections}

    <div class="footer">
      HelloGrowth — Plataforma de Crescimento &bull; Relatório gerado automaticamente em ${dateStr}
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${(clientName || 'cliente').replace(/\s+/g, '-').toLowerCase()}.html"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Gerar insights de IA para o relatório
async function generateAIInsights(tenantData: any, clientName: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Você é um consultor de negócios especializado em experiência do cliente.

Analise os dados do cliente "${clientName}" e gere insights para um relatório PDF:

**NPS:** ${tenantData.nps?.score ?? 'N/A'} (${tenantData.nps?.totalResponses || 0} respostas)
**Promotores:** ${tenantData.nps?.promotores || 0} | Passivos: ${tenantData.nps?.passivos || 0} | Detratores: ${tenantData.nps?.detratores || 0}
**Leads:** ${tenantData.leads?.total || 0} total, ${tenantData.leads?.vendido || 0} vendidos
**Pipeline:** R$ ${tenantData.leads?.pipelineValue?.toFixed(2) || '0'}
**Campanhas:** ${tenantData.campaignCount || 0}
**Diagnósticos MPD:** ${tenantData.diagnosticCount || 0}
**Comentários:** ${tenantData.nps?.topComments?.slice(0, 10).join(' | ') || 'Sem comentários'}

Gere JSON:
{
  "saude_geral": "ótima | boa | regular | crítica",
  "resumo": "2-3 frases sobre o estado do cliente e valor gerado pela plataforma",
  "o_que_clientes_elogiam": ["elogio 1", "elogio 2"],
  "o_que_clientes_reclamam": ["reclamação 1"],
  "oportunidades_para_cliente": [{"acao": "Ação", "motivo": "Por que", "resultado_esperado": "Resultado"}],
  "script_abordagem": "Script curto de CS"
}

Responda APENAS com o JSON, sem markdown.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    });
    const text = result.response.text().trim();
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('AI insights error:', err);
    return null;
  }
}

// Modo legado (compatibilidade)
function generateLegacyReport(content: string, clientName: string, healthScore: number) {
  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : healthScore >= 40 ? '#f97316' : '#ef4444';
  const scoreLabel = healthScore >= 80 ? 'Saudável' : healthScore >= 60 ? 'Atenção' : healthScore >= 40 ? 'Risco' : 'Crítico';
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const htmlContent = content
    .split('\n')
    .map((line: string) => {
      if (!line.trim()) return '<br/>';
      if (line.startsWith('📊') || line.startsWith('📈') || line.startsWith('📌') || line.startsWith('📋') || line.startsWith('📣') || line.startsWith('📝')) {
        return `<p style="font-weight:700;color:#1e293b;margin:16px 0 8px;font-size:14px;">${line}</p>`;
      }
      if (line.startsWith('•') || line.startsWith('✅') || line.startsWith('⚠️')) {
        return `<p style="margin:4px 0 4px 16px;font-size:13px;color:#374151;">${line}</p>`;
      }
      return `<p style="margin:6px 0;font-size:13px;color:#374151;">${line}</p>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1e293b; }
.page { padding: 48px 56px; max-width: 800px; margin: 0 auto; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
.logo { font-size: 22px; font-weight: 800; color: #16a34a; }
.logo span { color: #1e293b; }
.meta { text-align: right; font-size: 11px; color: #64748b; }
.title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.subtitle { font-size: 12px; color: #64748b; margin-bottom: 28px; }
.score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
.score-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.score-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
.score-value { font-size: 28px; font-weight: 800; color: ${scoreColor}; }
.score-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${scoreColor}22; color: ${scoreColor}; }
.score-bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.score-bar-fill { height: 8px; border-radius: 4px; background: ${scoreColor}; width: ${Math.min(100, healthScore || 0)}%; }
.content { line-height: 1.7; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
</style></head>
<body><div class="page">
<div class="header"><div class="logo">Hello<span>Growth</span></div><div class="meta"><div>Relatório de Uso</div><div>${dateStr}</div></div></div>
<div class="title">Relatório de Uso — ${clientName || 'Cliente'}</div>
<div class="subtitle">Análise de engajamento e uso da plataforma HelloGrowth</div>
<div class="score-card"><div class="score-header"><span class="score-label">Health Score</span><span class="score-badge">${scoreLabel}</span></div><div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;"><span class="score-value">${healthScore || 0}</span><span style="font-size:16px;color:#94a3b8;">/100</span></div><div class="score-bar-bg"><div class="score-bar-fill"></div></div></div>
<div class="content">${htmlContent}</div>
<div class="footer">HelloGrowth — Plataforma de Crescimento &bull; ${dateStr}</div>
</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${(clientName || 'cliente').replace(/\s+/g, '-').toLowerCase()}.html"`,
    },
  });
}
