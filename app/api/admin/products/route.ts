import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// GET /api/admin/products — lista todos os produtos/serviços dos clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    let query = supabase
      .from('products_services')
      .select('id, name, value, ai_description, tenant_id, keywords, created_at')
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    // Buscar nomes das empresas
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');

    const nameMap: Record<string, string> = {};
    for (const c of companies || []) {
      if (c.id) nameMap[c.id] = c.name || c.id.substring(0, 8);
    }

    // Agrupar por tenant
    const byTenant: Record<string, any> = {};
    for (const p of products || []) {
      const tid = p.tenant_id || 'unknown';
      if (!byTenant[tid]) {
        byTenant[tid] = {
          tenantId: tid,
          companyName: nameMap[tid] || tid.substring(0, 8),
          products: [],
        };
      }
      byTenant[tid].products.push({
        id: p.id,
        name: p.name,
        value: parseFloat(String(p.value || 0)) || 0,
        description: p.ai_description,
        keywords: p.keywords || [],
        createdAt: p.created_at,
      });
    }

    // Calcular estatísticas por tenant
    const tenantStats = Object.values(byTenant).map((t: any) => {
      const values = t.products.map((p: any) => p.value).filter((v: number) => v > 0);
      const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      return {
        ...t,
        stats: {
          count: t.products.length,
          avgValue: Math.round(avg * 100) / 100,
          minValue: min,
          maxValue: max,
          totalValue: Math.round(values.reduce((a: number, b: number) => a + b, 0) * 100) / 100,
        },
      };
    }).sort((a, b) => b.stats.count - a.stats.count);

    // Análise global de preços por segmento (inferido do nome/descrição)
    const allProducts = (products || []).map(p => ({
      name: p.name,
      value: parseFloat(String(p.value || 0)) || 0,
      description: p.ai_description || '',
      tenant: nameMap[p.tenant_id] || '',
    }));

    // Faixas de preço globais
    const allValues = allProducts.map(p => p.value).filter(v => v > 0);
    const globalAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
    const globalMedian = allValues.length > 0
      ? [...allValues].sort((a, b) => a - b)[Math.floor(allValues.length / 2)]
      : 0;

    const priceRanges = {
      ate100: allValues.filter(v => v <= 100).length,
      de100a500: allValues.filter(v => v > 100 && v <= 500).length,
      de500a2000: allValues.filter(v => v > 500 && v <= 2000).length,
      acima2000: allValues.filter(v => v > 2000).length,
    };

    return NextResponse.json({
      stats: {
        totalProducts: allProducts.length,
        tenantsWithProducts: tenantStats.length,
        globalAvgValue: Math.round(globalAvg * 100) / 100,
        globalMedianValue: Math.round(globalMedian * 100) / 100,
        priceRanges,
      },
      tenants: tenantStats,
      allProducts: allProducts.sort((a, b) => b.value - a.value),
    });
  } catch (error: any) {
    console.error('[admin/products] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/products — análise de preços por IA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products, segment } = body;

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto fornecido' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const productList = products
      .slice(0, 80)
      .map((p: any) => `- ${p.name} (${p.tenant}): R$ ${p.value}${p.description ? ` — ${p.description.substring(0, 80)}` : ''}`)
      .join('\n');

    const prompt = `Você é um especialista em precificação e inteligência de mercado brasileiro. Analise os seguintes produtos/serviços cadastrados por empresas clientes de uma plataforma SaaS de gestão e NPS:

${productList}

Retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura exata:
{
  "resumo_executivo": "string — análise geral do portfólio de produtos e serviços",
  "segmentos_identificados": [
    {
      "segmento": "nome do segmento (ex: Clínica Estética, Pet Shop, Jurídico)",
      "quantidade_produtos": número,
      "preco_medio": número,
      "preco_minimo": número,
      "preco_maximo": número,
      "produtos_representativos": ["produto1", "produto2"],
      "insight": "observação sobre precificação deste segmento"
    }
  ],
  "produtos_similares": [
    {
      "grupo": "nome do grupo de produtos similares",
      "produtos": [{"nome": "string", "empresa": "string", "valor": número}],
      "preco_medio_grupo": número,
      "variacao_percentual": número,
      "insight": "análise de por que os preços variam"
    }
  ],
  "oportunidades_precificacao": [
    {
      "observacao": "string",
      "impacto": "alto|médio|baixo"
    }
  ],
  "benchmark_mercado": "análise geral comparando os preços praticados com o mercado brasileiro"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let analysis;
    try {
      const clean = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { error: true, raw: text };
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('[admin/products POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
