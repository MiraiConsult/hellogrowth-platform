/**
 * /api/admin/agent-chat-test
 *
 * POST — Simula uma resposta da IA usando o conhecimento do nicho configurado
 *        Permite testar o agente como se fosse um cliente específico (tenant) ou genérico (nicho)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function callGemini(systemPrompt: string, conversationHistory: Array<{ role: string; content: string }>, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Montar histórico de conversa
  const contents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Entendido. Estou pronto para responder como o agente configurado.' }] },
  ];

  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    contents,
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error: ${resp.status} — ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta da IA.';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      niche_slug,
      agent_mode = 'full',
      tenant_id,
      flow_type = 'pre_sale',
      user_message,
      conversation_history = [],
      // Contexto simulado do cliente
      contact_name = 'Cliente Teste',
      company_name,
    } = body;

    if (!niche_slug || !user_message) {
      return NextResponse.json({ error: 'niche_slug e user_message são obrigatórios' }, { status: 400 });
    }

    // Buscar conhecimento do nicho
    const { data: knowledgeSections } = await supabaseAdmin
      .from('ai_niche_knowledge')
      .select('section_type, title, content')
      .eq('niche_slug', niche_slug)
      .eq('agent_mode', agent_mode)
      .eq('is_active', true)
      .order('position', { ascending: true });

    // Buscar dados do tenant se fornecido
    let tenantContext = '';
    let personaName = 'Maria';
    let personaRole = 'Consultora de Atendimento';
    let companyNameFinal = company_name || 'Clínica Exemplo';

    if (tenant_id) {
      const [{ data: company }, { data: persona }, { data: products }, { data: businessProfile }] = await Promise.all([
        supabaseAdmin.from('companies').select('name, segment').eq('id', tenant_id).single(),
        supabaseAdmin.from('ai_persona_config').select('name, role, tone, personality, custom_instructions').eq('tenant_id', tenant_id).single(),
        supabaseAdmin.from('products_services').select('name, value, ai_description').eq('tenant_id', tenant_id).is('deleted_at', null),
        supabaseAdmin.from('business_profile').select('company_name, business_description, business_type, differentials, target_audience').eq('tenant_id', tenant_id).single(),
      ]);

      if (company) companyNameFinal = company.name;
      if (persona) {
        personaName = persona.name || 'Maria';
        personaRole = persona.role || 'Consultora de Atendimento';
      }

      if (businessProfile) {
        tenantContext += `\n═══════════════════════════════════════\nPERFIL DO NEGÓCIO\n═══════════════════════════════════════\n`;
        if (businessProfile.company_name) tenantContext += `Empresa: ${businessProfile.company_name}\n`;
        if (businessProfile.business_description) tenantContext += `Descrição: ${businessProfile.business_description}\n`;
        if (businessProfile.differentials) tenantContext += `Diferenciais: ${businessProfile.differentials}\n`;
        if (businessProfile.target_audience) tenantContext += `Público-alvo: ${businessProfile.target_audience}\n`;
      }

      if (products && products.length > 0) {
        tenantContext += `\n═══════════════════════════════════════\nPRODUTOS/SERVIÇOS\n═══════════════════════════════════════\n`;
        products.forEach((p: any) => {
          tenantContext += `• ${p.name}${p.value ? ` — R$ ${Number(p.value).toLocaleString('pt-BR')}` : ''}${p.ai_description ? `: ${p.ai_description}` : ''}\n`;
        });
      }

      if (persona?.custom_instructions) {
        tenantContext += `\n═══════════════════════════════════════\nINSTRUÇÕES ESPECIAIS DO GESTOR\n═══════════════════════════════════════\n${persona.custom_instructions}\n`;
      }
    }

    // Montar base de conhecimento do nicho
    let knowledgeText = '';
    if (knowledgeSections && knowledgeSections.length > 0) {
      knowledgeText = '\n═══════════════════════════════════════\nBASE DE CONHECIMENTO DO NICHO\n═══════════════════════════════════════\n';
      for (const section of knowledgeSections) {
        if (section.content?.trim()) {
          knowledgeText += `\n[${section.title.toUpperCase()}]\n${section.content}\n`;
        }
      }
    }

    // Definir modo do agente
    const modeDescription = agent_mode === 'simple'
      ? 'AGENTE SIMPLIFICADO: Foco em tarefas operacionais (confirmar consultas, enviar links, coletar feedback). Para dúvidas complexas, solicite que um humano assuma.'
      : 'AGENTE COMPLETO: Atua como comercial, SDR e CS. Qualifica leads, agenda consultas, responde dúvidas, supera objeções e fideliza clientes.';

    // Definir fluxo
    const flowDescription: Record<string, string> = {
      pre_sale: 'Fluxo de Pré-Venda: qualificar interesse e agendar consulta.',
      nps: 'Fluxo NPS: coletar feedback pós-consulta.',
      promoter: 'Fluxo Promotor: solicitar avaliação no Google ou indicação.',
      detractor: 'Fluxo Detrator: entender insatisfação e reconquistar cliente.',
    };

    // Montar system prompt
    const systemPrompt = `Você é ${personaName}, ${personaRole} da ${companyNameFinal}.
Você é uma PESSOA REAL, não uma IA. Nunca revele que é uma inteligência artificial.
Você conversa pelo WhatsApp com clientes de forma NATURAL e HUMANA.

MODO DE OPERAÇÃO: ${modeDescription}
FLUXO ATUAL: ${flowDescription[flow_type] || flow_type}

[CONTEXTO: Este é um ambiente de TESTE. Você está sendo testado pelo administrador do sistema. Responda como se fosse um cliente real chamado "${contact_name}".]
${tenantContext}${knowledgeText}

═══════════════════════════════════════
ESTILO DE ESCRITA (WhatsApp)
═══════════════════════════════════════
✓ Mensagens curtas e naturais
✓ Linguagem informal ("pra", "vc", "tá")
✓ Máximo 1 emoji por mensagem
✗ PROIBIDO: reticências (...) para conectar mensagens
✗ PROIBIDO: linguagem corporativa ou robótica

═══════════════════════════════════════
FORMATO DA RESPOSTA
═══════════════════════════════════════
Retorne APENAS um JSON válido:
{
  "messages": ["primeira mensagem", "segunda mensagem"],
  "reasoning": "análise breve do que foi respondido e por quê",
  "suggestedNextAction": "wait_reply"
}`;

    const rawResponse = await callGemini(systemPrompt, conversation_history, user_message);

    // Tentar parsear JSON da resposta
    let parsedResponse: any = null;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Se não conseguir parsear, retornar como texto simples
      parsedResponse = {
        messages: [rawResponse],
        reasoning: 'Resposta em texto livre',
        suggestedNextAction: 'wait_reply',
      };
    }

    return NextResponse.json({
      response: parsedResponse,
      raw: rawResponse,
      knowledge_sections_used: knowledgeSections?.length || 0,
    });
  } catch (error: any) {
    console.error('[AgentChatTest] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
