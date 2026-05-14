import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendWhatsApp(phone: string, message: string) {
  try {
    let normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) normalizedPhone = `55${normalizedPhone}`;
    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });
  } catch (err) {
    console.error('[analyze-lead] Erro ao enviar WhatsApp:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, tenantId, form, answers, whatsappConfig, emailAnalysisConfig } = body;

    if (!leadId || !tenantId || !form || !answers) {
      return NextResponse.json({ ok: false, error: 'Parâmetros obrigatórios faltando.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase não configurado.' }, { status: 500 });
    }

    let aiAnalysis: any = null;
    let updatedValue = 0;

    try {
      // Buscar produtos do tenant
      const { data: products } = await supabase
        .from('products_services')
        .select('*')
        .eq('tenant_id', tenantId);

      // Buscar perfil do negócio
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (products && products.length > 0) {
        // Preparar texto das respostas com o texto das perguntas
        const answersText = Object.entries(answers).map(([qId, ans]: [string, any]) => {
          const question = form.questions?.find((q: any) => q.id === qId);
          const answerValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
          return `Pergunta: ${question?.text || qId}\nResposta: ${answerValue}`;
        }).join('\n\n');

        // Detectar orçamento nas respostas
        let budgetContext = '';
        const budgetEntry = Object.entries(answers).find(([qId, ans]: [string, any]) => {
          const question = form.questions?.find((q: any) => q.id === qId);
          const questionText = question?.text?.toLowerCase() || '';
          return questionText.includes('orçamento') || questionText.includes('investir') ||
                 questionText.includes('valor') || questionText.includes('quanto');
        });
        if (budgetEntry) {
          const [, ans] = budgetEntry as [string, any];
          const budgetValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
          budgetContext = `\n\n⚠️ ORÇAMENTO DO CLIENTE (RESTRIÇÃO OBRIGATÓRIA): ${budgetValue}`;
        }

        // Contexto de produtos
        const productsContext = products.map((p: any) =>
          `- **${p.name}** (R$ ${p.value})\n  Critérios de Indicação: ${p.ai_criteria || p.ai_description || 'Sem critérios definidos'}`
        ).join('\n\n');

        // Contexto do negócio
        let businessContext = '';
        if (businessProfile) {
          businessContext = `\n\nCONTEXTO DO NEGÓCIO:\n- Tipo: ${businessProfile.business_type || 'Não especificado'}\n- Descrição: ${businessProfile.business_description || 'Não especificado'}\n- Público-alvo: ${businessProfile.target_audience || 'Não especificado'}\n- Diferenciais: ${businessProfile.differentials || 'Não especificado'}`;
        }

        // Produtos em foco no formulário
        const formSelectedProducts = form.selected_products || [];
        let focusedProductsContext = '';
        if (formSelectedProducts.length > 0) {
          const focusedProducts = products.filter((p: any) => formSelectedProducts.includes(p.id));
          if (focusedProducts.length > 0) {
            focusedProductsContext = `\n\n🎯 PRODUTOS EM FOCO NESTE FORMULÁRIO (PRIORIDADE ALTA):\n${focusedProducts.map((p: any) => `- **${p.name}** (R$ ${p.value})\n  Critérios de Indicação: ${p.ai_criteria || p.ai_description || 'Sem critérios definidos'}`).join('\n\n')}`;
          }
        }

        const prompt = `Você é um consultor de vendas especializado. Analise as respostas do cliente e forneça uma análise completa de oportunidade de venda.${businessContext}
RESPOSTAS DO CLIENTE:
${answersText}${budgetContext}
PRODUTOS/SERVIÇOS DISPONÍVEIS (com critérios técnicos de indicação):
${productsContext}${focusedProductsContext}
🎯 INSTRUÇÕES:
1. Analise profundamente as respostas do cliente
2. ⚠️ **REGRA OBRIGATÓRIA**: Se o cliente informou um orçamento, recomende APENAS produtos dentro dessa faixa de preço (tolerando no máximo 10% acima)
3. ${focusedProductsContext ? 'PRIORIZE os produtos em foco, mas considere TODOS os produtos disponíveis' : 'Considere TODOS os produtos disponíveis'}
4. Identifique produtos que o cliente pode precisar E que estejam dentro do orçamento
5. Use os CRITÉRIOS DE INDICAÇÃO de cada produto para decidir se ele é adequado para este cliente
6. Sugira apenas produtos cujos critérios se alinhem com o perfil e necessidades do cliente
7. Se nenhum produto estiver no orçamento, sugira o mais próximo e mencione possibilidade de parcelamento
8. Gere um script de vendas personalizado e estratégico
Responda APENAS com JSON válido (sem markdown):
{
  "recommended_products": [
    {"id": "product_id_1", "name": "Nome do Produto 1", "value": 0, "reason": "Por que este produto é adequado"},
    {"id": "product_id_2", "name": "Nome do Produto 2", "value": 0, "reason": "Por que este produto é adequado"}
  ],
  "suggested_product": "Nome do produto principal (para compatibilidade)",
  "suggested_value": 0,
  "classification": "opportunity|risk|monitoring",
  "confidence": 0.85,
  "reasoning": "Explicação detalhada conectando as respostas do cliente com os produtos recomendados",
  "client_insights": [
    "Insight 1 sobre o cliente",
    "Insight 2 sobre necessidades",
    "Insight 3 sobre urgência"
  ],
  "sales_script": "Script de abordagem estratégico: Baseado nas respostas, identifiquei que [necessidade do cliente]. Recomendo [produtos] porque [benefícios específicos].",
  "next_steps": [
    "Ação 1 recomendada",
    "Ação 2 recomendada"
  ]
}`;

        // Chamar Gemini no servidor
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY não configurada');

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        try {
          const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
          aiAnalysis = JSON.parse(cleanResponse);

          if (aiAnalysis.recommended_products && aiAnalysis.recommended_products.length > 0) {
            updatedValue = aiAnalysis.recommended_products.reduce(
              (sum: number, product: any) => sum + (product.value || 0), 0
            );
          } else if (aiAnalysis.suggested_value > 0) {
            updatedValue = aiAnalysis.suggested_value;
          }
        } catch (parseErr) {
          console.error('[analyze-lead] Erro ao parsear resposta da IA:', parseErr);
          aiAnalysis = {
            recommended_products: products.slice(0, 1).map((p: any) => ({
              id: p.id, name: p.name, value: p.value,
              reason: 'Produto sugerido com base no perfil do cliente'
            })),
            suggested_product: products[0]?.name || 'Produto não identificado',
            suggested_value: products[0]?.value || 0,
            classification: 'monitoring',
            confidence: 0.5,
            reasoning: 'Análise automática baseada nas respostas fornecidas.',
            client_insights: ['Cliente demonstrou interesse nos serviços'],
            sales_script: 'Entre em contato para entender melhor as necessidades do cliente.',
            next_steps: ['Fazer contato inicial', 'Agendar reunião']
          };
          updatedValue = products[0]?.value || 0;
        }
      } else {
        aiAnalysis = {
          suggested_product: 'Cadastre produtos para análise automática',
          suggested_value: 0,
          classification: 'monitoring',
          confidence: 0.3,
          reasoning: 'Nenhum produto cadastrado para análise.',
          client_insights: ['Lead capturado aguardando análise'],
          sales_script: 'Entre em contato para qualificar o lead.',
          next_steps: ['Cadastrar produtos', 'Fazer contato inicial']
        };
      }
    } catch (aiError) {
      console.error('[analyze-lead] Erro na análise de IA:', aiError);
      aiAnalysis = {
        recommended_products: [],
        suggested_product: 'Análise indisponível',
        suggested_value: 0,
        classification: 'monitoring',
        confidence: 0.3,
        reasoning: 'Erro ao processar análise de IA.',
        client_insights: ['Lead capturado'],
        sales_script: 'Entre em contato para qualificar o lead.',
        next_steps: ['Fazer contato inicial']
      };
    }

    // Atualizar lead no banco com a análise
    await supabase
      .from('leads')
      .update({
        value: updatedValue,
        answers: {
          ...answers,
          _ai_analysis: aiAnalysis,
          _analyzing: false,
        },
      })
      .eq('id', leadId);

    // Disparar WhatsApp se configurado
    if (whatsappConfig?.enabled && whatsappConfig.recipients) {
      const waNumbers = whatsappConfig.recipients
        .split(',')
        .map((n: string) => n.trim())
        .filter(Boolean);

      if (waNumbers.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth.online';
        const panelLink = `${appUrl}?lead=${leadId}`;
        const patient = whatsappConfig.patientData || {};

        // Classificação
        const classification = aiAnalysis?.classification;
        const classificationEmoji = classification === 'opportunity' ? '🟢' : classification === 'risk' ? '🔴' : '🟡';
        const classificationLabel = classification === 'opportunity' ? 'Oportunidade' : classification === 'risk' ? 'Risco' : 'Monitoramento';
        const confidencePct = aiAnalysis?.confidence ? ` (${Math.round(aiAnalysis.confidence * 100)}%)` : '';

        // Perguntas e respostas (excluindo campos internos)
        const qaLines: string[] = [];
        if (form?.questions && answers) {
          for (const q of form.questions) {
            const ans = answers[q.id];
            if (!ans) continue;
            const value = Array.isArray(ans.value) ? ans.value.join(', ') : (ans.value || '');
            if (!value) continue;
            qaLines.push(`• *${q.text || q.label || q.id}:* ${value}`);
          }
        }

        // Produtos recomendados com valor
        const productLines: string[] = [];
        if (aiAnalysis?.recommended_products?.length > 0) {
          for (const p of aiAnalysis.recommended_products) {
            const val = p.value ? ` — R$ ${Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
            const reason = p.reason ? `\n   _${p.reason}_` : '';
            productLines.push(`• *${p.name}*${val}${reason}`);
          }
        }

        const waMessageParts = [
          `🔔 *Novo Lead Analisado — ${whatsappConfig.formName}*`,
          ``,
          `👤 *Nome:* ${patient.name || 'Não informado'}`,
          patient.phone ? `📞 *Telefone:* ${patient.phone}` : null,
          patient.email ? `📧 *E-mail:* ${patient.email}` : null,
          ``,
          `🤖 *Análise de IA:* ${classificationEmoji} ${classificationLabel}${confidencePct}`,
          updatedValue > 0 ? `💰 *Valor da Oportunidade:* R$ ${updatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null,
          ``,
          qaLines.length > 0 ? `📝 *Respostas do Formulário:*` : null,
          ...qaLines,
          productLines.length > 0 ? `\n🎯 *Produtos a Oferecer:*` : null,
          ...productLines,
          ``,
          `🔗 *Ver análise completa:* ${panelLink}`,
          ``,
          `_HelloGrowth — Análise automática de IA_`,
        ].filter(line => line !== null);

        const waMessage = waMessageParts.join('\n');

        for (const phone of waNumbers) {
          await sendWhatsApp(phone, waMessage);
        }
      }
    }

    // Disparar e-mail de análise após a IA concluir (com dados completos)
    if (emailAnalysisConfig?.enabled && emailAnalysisConfig.recipients?.length > 0) {
      try {
        const patient = emailAnalysisConfig.patientData || {};
        const questionsForEmail = (form?.questions || []).map((q: any) => ({ id: q.id, text: q.text || q.id }));
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth.online';
        const panelLink = `${appUrl}?lead=${leadId}`;
        await fetch(`${appUrl}/api/send-analysis-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: emailAnalysisConfig.recipients,
            leadName: patient.name || 'Lead',
            leadEmail: patient.email || '',
            leadPhone: patient.phone || '',
            formName: emailAnalysisConfig.formName || form?.name || '',
            companyName: emailAnalysisConfig.companyName || '',
            answers,
            questions: questionsForEmail,
            aiAnalysis,
            panelLink,
          }),
        });
      } catch (emailErr) {
        console.error('[analyze-lead] Erro ao disparar e-mail de análise:', emailErr);
      }
    }

    return NextResponse.json({ ok: true, value: updatedValue, classification: aiAnalysis?.classification });
  } catch (err: any) {
    console.error('[analyze-lead] Erro geral:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
