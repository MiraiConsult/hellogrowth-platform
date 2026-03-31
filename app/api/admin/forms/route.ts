import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/forms — lista todos os formulários de anamnese dos clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Buscar formulários
    let query = supabase
      .from('forms')
      .select('id, name, description, questions, response_count, active, created_at, tenant_id, product_ids')
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: forms, error } = await query;
    if (error) throw error;

    // Buscar nomes das empresas via business_profile (tenant_id -> company_name)
    const { data: profiles } = await supabase
      .from('business_profile')
      .select('tenant_id, company_name, business_type');

    const nameMap: Record<string, string> = {};
    const businessTypeMap: Record<string, string> = {};
    for (const p of profiles || []) {
      if (p.tenant_id) {
        nameMap[p.tenant_id] = p.company_name || p.tenant_id.substring(0, 8);
        if (p.business_type) businessTypeMap[p.tenant_id] = p.business_type;
      }
    }

    // Enriquecer formulários
    const enriched = (forms || []).map((f) => {
      const questions = f.questions || [];
      return {
        id: f.id,
        name: f.name,
        description: f.description,
        active: f.active,
        tenantId: f.tenant_id,
        companyName: f.tenant_id ? (nameMap[f.tenant_id] || f.tenant_id.substring(0, 8)) : '—',
        businessType: f.tenant_id ? (businessTypeMap[f.tenant_id] || null) : null,
        questionCount: questions.length,
        questions: questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options || q.choices || [],
          required: q.required,
        })),
        responseCount: f.response_count || 0,
        productIds: f.product_ids || [],
        createdAt: f.created_at,
      };
    });

    // Estatísticas
    const totalForms = enriched.length;
    const activeForms = enriched.filter(f => f.active).length;
    const totalResponses = enriched.reduce((s, f) => s + (f.responseCount || 0), 0);

    // Tenants com mais formulários
    const tenantCounts: Record<string, { name: string; count: number; responses: number }> = {};
    for (const f of enriched) {
      const tid = f.tenantId || 'unknown';
      if (!tenantCounts[tid]) tenantCounts[tid] = { name: f.companyName, count: 0, responses: 0 };
      tenantCounts[tid].count++;
      tenantCounts[tid].responses += f.responseCount || 0;
    }

    return NextResponse.json({
      stats: {
        totalForms,
        activeForms,
        totalResponses,
        topTenants: Object.entries(tenantCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([tid, data]) => ({ tenantId: tid, ...data })),
      },
      forms: enriched,
    });
  } catch (error: any) {
    console.error('[admin/forms] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
