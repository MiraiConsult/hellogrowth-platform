import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30; // Timeout de 30 segundos

// Criar Supabase client com Service Role Key (acesso total no servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Suporte para webhook do Supabase (envia record completo) ou chamada direta (envia leadId)
    let leadId: string;
    let tenantId: string;
    
    if (body.record) {
      // Chamada via Supabase Database Webhook
      leadId = body.record.id;
      tenantId = body.record.tenant_id;
    } else if (body.leadId) {
      // Chamada direta
      leadId = body.leadId;
      tenantId = body.tenantId || '';
    } else {
      return NextResponse.json({ error: 'leadId ou record é obrigatório' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar lead completo do banco
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead não encontrado:', leadId, leadError);
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const leadAnswers = lead.answers || {};
    tenantId = tenantId || lead.tenant_id;

    // Se já tem análise, não processar novamente
    if (leadAnswers._ai_analysis) {
      console.log('Lead já possui análise IA, ignorando:', leadId);
      return NextResponse.json({ message: 'Lead já analisado', leadId });
    }

    // 2. Buscar formulário para obter as perguntas
    const { data: formData } = await supabase
      .from('forms')
      .select('*')
      .eq('id', lead.form_id)
      .single();

    const formQuestions = formData?.questions || [];
    const formSelectedProducts = formData?.selected_products || [];

    // 3. Buscar produtos e perfil do negócio
    const { data: products } = await supabase
      .from('products_services')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    let aiAnalysis: any = null;
    let updatedValue = 0;

    if (products && products.length > 0) {
      // 4. Preparar contexto para análise da IA
      const answersText = Object.entries(leadAnswers)
        .filter(([key]) => !key.startsWith('_'))
        .map(([qId, ans]: [string, any]) => {
          const question = formQuestions.find((q: any) => q.id === qId);
          const answerValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
          return `Pergunta: ${question?.text || qId}\nResposta: ${answerValue}`;
        }).join('\n\n');

      // Extrair orçamento do cliente
      let budgetContext = '';
      const budgetAnswer = Object.entries(leadAnswers)
        .filter(([key]) => !key.startsWith('_'))
        .find(([qId]: [string, any]) => {
          const question = formQuestions.find((q: any) => q.id === qId);
          const questionText = question?.text?.toLowerCase() || '';
          return questionText.includes('orçamento') ||
                 questionText.includes('investir') ||
                 questionText.includes('valor') ||
                 questionText.includes('quanto');
        });

      if (budgetAnswer) {
        const [, ans] = budgetAnswer as [string, any];
        const budgetValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
        budgetContext = `\n\n⚠️ ORÇAMENTO DO CLIENTE (RESTRIÇÃO OBRIGATÓRIA): ${budgetValue}`;
      }

      // Contexto de produtos
      const productsContext = products.map(p =>
        `- **${p.name}** (R$ ${p.value})\n  Descrição: ${p.ai_description || 'Sem descrição'}`
      ).join('\n\n');

      // Contexto do negócio
      let businessContext = '';
      if (businessProfile) {
        businessContext = `\n\nCONTEXTO DO NEGÓCIO:\n- Tipo: ${businessProfile.business_type || 'Não especificado'}\n- Descrição: ${businessProfile.business_description || 'Não especificado'}\n- Público-alvo: ${businessProfile.target_audience || 'Não especificado'}\n- Diferenciais: ${businessProfile.differentials || 'Não especificado'}`;
      }

      // Produtos em foco
      let focusedProductsContext = '';
      if (formSelectedProducts.length > 0) {
        const focusedProducts = products.filter(p => formSelectedProducts.includes(p.id));
        if (focusedProducts.length > 0) {
          focusedProductsContext = `\n\n🎯 PRODUTOS EM FOCO NESTE FORMULÁRIO (PRIORIDADE ALTA):\n${focusedProducts.map(p => `- **${p.name}** (R$ ${p.value})\n  Descrição: ${p.ai_description || 'Sem descrição'}`).join('\n\n')}`;
        }
      }

      const prompt = `Analise as respostas e recomende produtos.${businessContext}

RESPOSTAS:
${answersText}${budgetContext}

PRODUTOS:
${productsContext}${focusedProductsContext}

REGRAS:
- Respeite o orçamento (máx +10%)
- ${focusedProductsContext ? 'Priorize produtos em foco' : 'Considere todos produtos'}
- Conecte necessidades com soluções

JSON (sem markdown):
{
  "recommended_products": [{"id": "id", "name": "nome", "value": 0, "reason": "motivo"}],
  "suggested_product": "nome",
  "suggested_value": 0,
  "classification": "opportunity",
  "confidence": 0.8,
  "reasoning": "explicação",
  "client_insights": ["insight1", "insight2"],
  "sales_script": "script de abordagem",
  "next_steps": ["ação1", "ação2"]
}`;

      // Chamar IA Gemini
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      
      if (!apiKey) {
        console.error('Gemini API key not found');
        aiAnalysis = {
          suggested_product: 'API Key não configurada',
          suggested_value: 0,
          classification: 'monitoring',
          confidence: 0.1,
          reasoning: 'Chave da API Gemini não configurada.',
          client_insights: ['Lead capturado - análise manual necessária'],
          sales_script: 'Entre em contato para qualificar o lead.',
          next_steps: ['Configurar API Key', 'Fazer contato inicial']
        };
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const generationConfig = {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        };

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        });

        const aiResponseText = result.response.text();

        try {
          const cleanResponse = aiResponseText.replace(/```json\n?|\n?```/g, '').trim();
          aiAnalysis = JSON.parse(cleanResponse);

          if (aiAnalysis.recommended_products && aiAnalysis.recommended_products.length > 0) {
            updatedValue = aiAnalysis.recommended_products.reduce((sum: number, product: any) => sum + (product.value || 0), 0);
          } else if (aiAnalysis.suggested_value > 0) {
            updatedValue = aiAnalysis.suggested_value;
          }
        } catch (e) {
          console.error('Erro ao parsear resposta da IA:', e);
          aiAnalysis = {
            recommended_products: products.slice(0, 1).map(p => ({
              id: p.id, name: p.name, value: p.value,
              reason: 'Produto sugerido com base no perfil do cliente'
            })),
            suggested_product: products[0]?.name || 'Produto não identificado',
            suggested_value: products[0]?.value || 0,
            classification: 'opportunity',
            confidence: 0.5,
            reasoning: 'Análise automática baseada nas respostas fornecidas.',
            client_insights: ['Cliente demonstrou interesse nos serviços'],
            sales_script: 'Entre em contato para entender melhor as necessidades do cliente.',
            next_steps: ['Fazer contato inicial', 'Agendar reunião']
          };
          updatedValue = products[0]?.value || 0;
        }
      }
    } else {
      // Sem produtos cadastrados
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

    // 5. Atualizar lead com análise IA
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        value: updatedValue,
        answers: {
          ...leadAnswers,
          _ai_analysis: aiAnalysis
        }
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Erro ao atualizar lead:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 });
    }

    console.log(`✅ Análise IA concluída para lead ${leadId}. Valor: R$ ${updatedValue}`);

    return NextResponse.json({
      success: true,
      leadId,
      value: updatedValue,
      analysis: aiAnalysis
    });

  } catch (error: any) {
    console.error('Erro na API analyze-lead:', error);

    return NextResponse.json(
      { error: 'Erro ao processar análise', details: error.message },
      { status: 500 }
    );
  }
}
