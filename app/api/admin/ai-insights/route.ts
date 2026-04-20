import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API key configurada dinamicamente por função

// POST /api/admin/ai-insights — gera análise de IA sobre os dados da base
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, tenantId, data } = body;

    if (type === 'market-overview') {
      return await generateMarketOverview(data);
    }

    if (type === 'tenant-analysis' && tenantId) {
      return await generateTenantAnalysis(tenantId, data);
    }

    if (type === 'comment-themes') {
      return await analyzeCommentThemes(data);
    }

    if (type === 'template_description') {
      return await generateTemplateDescription(body);
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin/ai-insights] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Visão geral de mercado ───────────────────────────────────────────────────
async function generateMarketOverview(data: any) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const { globalNps, totalResponses, topThemes, promoterTexts, detractorTexts, trendData } = data;

  const prompt = `Você é um analista de inteligência de mercado especializado em experiência do cliente para pequenas e médias empresas brasileiras.

Analise os dados abaixo coletados de ${totalResponses} respostas NPS de múltiplos negócios que usam o HelloGrowth (plataforma de gestão de clientes):

**NPS Global da base:** ${globalNps}

**Tendência mensal (últimos meses):**
${trendData?.slice(-5).map((t: any) => `- ${t.month}: NPS ${t.nps} (${t.count} respostas)`).join('\n') || 'Sem dados'}

**Temas mais mencionados pelos clientes finais (múltipla escolha):**
${topThemes?.slice(0, 15).map((t: any) => `- "${t.theme}": ${t.count}x (${t.promoterRate}% promotores)`).join('\n') || 'Sem dados'}

**Amostra de comentários positivos (promotores):**
${promoterTexts?.slice(0, 15).map((t: string) => `- "${t}"`).join('\n') || 'Sem dados'}

**Amostra de comentários negativos (detratores):**
${detractorTexts?.slice(0, 10).map((t: string) => `- "${t}"`).join('\n') || 'Sem dados'}

Gere uma análise estratégica em JSON com a seguinte estrutura:
{
  "resumo_executivo": "2-3 frases resumindo o estado geral da base",
  "tendencia_geral": "up | down | stable",
  "principais_forcas": ["força 1", "força 2", "força 3"],
  "principais_riscos": ["risco 1", "risco 2"],
  "oportunidades_mercado": [
    {
      "titulo": "Nome da oportunidade",
      "descricao": "Explicação em 1-2 frases",
      "segmentos_afetados": ["segmento1", "segmento2"],
      "potencial": "alto | médio | baixo"
    }
  ],
  "temas_emergentes": [
    {
      "tema": "Nome do tema",
      "frequencia": "alta | média | baixa",
      "sentimento": "positivo | negativo | neutro",
      "insight": "O que isso significa para os negócios"
    }
  ],
  "recomendacoes_para_clientes": [
    {
      "recomendacao": "Ação específica",
      "justificativa": "Por que fazer isso",
      "impacto_esperado": "Resultado esperado"
    }
  ],
  "alertas": ["alerta 1 se houver", "alerta 2 se houver"]
}

Responda APENAS com o JSON, sem markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  let analysis;
  try {
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    analysis = JSON.parse(clean);
  } catch {
    analysis = { raw: text, error: 'parse_failed' };
  }

  return NextResponse.json({ analysis, generatedAt: new Date().toISOString() });
}

// ─── Gerar descrição de template ─────────────────────────────────────────────
async function generateTemplateDescription(body: any) {
  const { templateName, tipoVenda, ramoNegocio, questions, objective } = body;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const tipoLabel = tipoVenda === 'pre_venda' ? 'pré-venda (antes da compra/contratação)' : 'pós-venda (após a compra/atendimento)';

  const prompt = `Você é especialista em pesquisas de satisfação e NPS para pequenas e médias empresas brasileiras.\n\nCrie uma descrição concisa e persuasiva (máximo 2 frases) para um template de pesquisa:\n- Nome: ${templateName}\n- Tipo: ${tipoLabel}\n- Ramo: ${ramoNegocio || 'não especificado'}\n- Perguntas: ${questions || 'não especificadas'}\n\nExplique QUANDO usar e QUAL benefício traz. Português brasileiro, tom profissional. Responda APENAS com a descrição.`;

  const result = await model.generateContent(prompt);
  const description = result.response.text().trim();

  return NextResponse.json({ description });
}

// ─── Análise de um tenant específico ─────────────────────────────────────────
async function generateTenantAnalysis(tenantId: string, data: any) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const { companyName, npsScore, totalResponses, comments, leads, lastDiagnostic, monthlyTrend } = data;

  const prompt = `Você é um consultor de negócios especializado em experiência do cliente.

Analise os dados do cliente "${companyName || tenantId}" que usa o HelloGrowth:

**NPS atual:** ${npsScore ?? 'N/A'}
**Total de respostas NPS:** ${totalResponses || 0}
**Tendência mensal:**
${monthlyTrend?.slice(-4).map((t: any) => `- ${t.month}: NPS ${t.nps} (${t.count} respostas)`).join('\n') || 'Sem dados'}

**Comentários dos clientes finais:**
${comments?.slice(0, 20).map((c: string) => `- "${c}"`).join('\n') || 'Sem comentários'}

**Pipeline de leads:**
- Total: ${leads?.total || 0}
- Vendidos: ${leads?.vendido || 0}
- Em negociação: ${leads?.negociacao || 0}
- Perdidos: ${leads?.perdido || 0}
- Valor em pipeline: R$ ${leads?.pipelineValue?.toFixed(2) || '0,00'}

**Último diagnóstico MPD:** ${lastDiagnostic ? `Score ${lastDiagnostic.score}/100 em ${lastDiagnostic.date?.substring(0, 10)}` : 'Não realizado'}

Gere uma análise em JSON:
{
  "saude_geral": "ótima | boa | regular | crítica",
  "resumo": "2-3 frases sobre o estado do cliente",
  "pontos_fortes": ["ponto 1", "ponto 2"],
  "pontos_atencao": ["ponto 1", "ponto 2"],
  "o_que_clientes_elogiam": ["elogio 1", "elogio 2", "elogio 3"],
  "o_que_clientes_reclamam": ["reclamação 1", "reclamação 2"],
  "oportunidades_para_cliente": [
    {
      "acao": "Ação recomendada",
      "motivo": "Por que fazer",
      "resultado_esperado": "O que vai melhorar"
    }
  ],
  "script_abordagem": "Script curto de como abordar esse cliente em uma reunião de CS (2-3 frases)"
}

Responda APENAS com o JSON, sem markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  let analysis;
  try {
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    analysis = JSON.parse(clean);
  } catch {
    analysis = { raw: text, error: 'parse_failed' };
  }

  return NextResponse.json({ analysis, generatedAt: new Date().toISOString() });
}
