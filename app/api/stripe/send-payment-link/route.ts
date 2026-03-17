import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Pricing data (same as checkout)
const PRICING_DATA: Record<number, Record<string, number>> = {
  1: { hello_client: 99.90, hello_rating: 99.90, hello_growth: 149.90, hc_game: 129.90, hc_mpd: 129.90, hc_game_mpd: 149.90, hr_game: 129.90, hr_mpd: 129.90, hr_game_mpd: 149.90, hg_game: 189.90, hg_mpd: 189.90, hg_game_mpd: 199.90 },
  2: { hello_client: 94.90, hello_rating: 94.90, hello_growth: 144.90, hc_game: 124.90, hc_mpd: 124.90, hc_game_mpd: 144.90, hr_game: 124.90, hr_mpd: 124.90, hr_game_mpd: 144.90, hg_game: 184.90, hg_mpd: 184.90, hg_game_mpd: 194.90 },
  3: { hello_client: 89.90, hello_rating: 89.90, hello_growth: 139.90, hc_game: 119.90, hc_mpd: 119.90, hc_game_mpd: 139.90, hr_game: 119.90, hr_mpd: 119.90, hr_game_mpd: 139.90, hg_game: 179.90, hg_mpd: 179.90, hg_game_mpd: 189.90 },
  4: { hello_client: 84.90, hello_rating: 84.90, hello_growth: 134.90, hc_game: 114.90, hc_mpd: 114.90, hc_game_mpd: 134.90, hr_game: 114.90, hr_mpd: 114.90, hr_game_mpd: 134.90, hg_game: 174.90, hg_mpd: 174.90, hg_game_mpd: 184.90 },
  5: { hello_client: 79.90, hello_rating: 79.90, hello_growth: 129.90, hc_game: 109.90, hc_mpd: 109.90, hc_game_mpd: 129.90, hr_game: 109.90, hr_mpd: 109.90, hr_game_mpd: 129.90, hg_game: 169.90, hg_mpd: 169.90, hg_game_mpd: 179.90 },
  6: { hello_client: 74.90, hello_rating: 74.90, hello_growth: 124.90, hc_game: 104.90, hc_mpd: 104.90, hc_game_mpd: 124.90, hr_game: 104.90, hr_mpd: 104.90, hr_game_mpd: 124.90, hg_game: 164.90, hg_mpd: 164.90, hg_game_mpd: 174.90 },
  7: { hello_client: 69.90, hello_rating: 69.90, hello_growth: 119.90, hc_game: 99.90, hc_mpd: 99.90, hc_game_mpd: 119.90, hr_game: 99.90, hr_mpd: 99.90, hr_game_mpd: 119.90, hg_game: 159.90, hg_mpd: 159.90, hg_game_mpd: 169.90 },
  8: { hello_client: 64.90, hello_rating: 64.90, hello_growth: 114.90, hc_game: 94.90, hc_mpd: 94.90, hc_game_mpd: 114.90, hr_game: 94.90, hr_mpd: 94.90, hr_game_mpd: 114.90, hg_game: 154.90, hg_mpd: 154.90, hg_game_mpd: 164.90 },
  9: { hello_client: 59.90, hello_rating: 59.90, hello_growth: 109.90, hc_game: 89.90, hc_mpd: 89.90, hc_game_mpd: 109.90, hr_game: 89.90, hr_mpd: 89.90, hr_game_mpd: 109.90, hg_game: 149.90, hg_mpd: 149.90, hg_game_mpd: 159.90 },
  10: { hello_client: 54.90, hello_rating: 54.90, hello_growth: 104.90, hc_game: 84.90, hc_mpd: 84.90, hc_game_mpd: 104.90, hr_game: 84.90, hr_mpd: 84.90, hr_game_mpd: 104.90, hg_game: 144.90, hg_mpd: 144.90, hg_game_mpd: 154.90 },
};

function getPriceKey(plan: string, addons: { game: boolean; mpd: boolean }): string {
  const planCodeMap: Record<string, string> = {
    hello_client: 'hc',
    hello_rating: 'hr',
    hello_growth: 'hg',
    client: 'hc',
    rating: 'hr',
    growth: 'hg',
  };
  const planCode = planCodeMap[plan];
  if (!planCode) return plan;
  if (addons.game && addons.mpd) return `${planCode}_game_mpd`;
  if (addons.game) return `${planCode}_game`;
  if (addons.mpd) return `${planCode}_mpd`;
  // Base plan keys
  const basePlanMap: Record<string, string> = {
    hc: 'hello_client',
    hr: 'hello_rating',
    hg: 'hello_growth',
  };
  return basePlanMap[planCode] || plan;
}

function getPlanDisplayName(plan: string, addons: { game: boolean; mpd: boolean }): string {
  const baseNames: Record<string, string> = {
    hello_client: 'Hello Client',
    hello_rating: 'Hello Rating',
    hello_growth: 'Hello Growth',
    client: 'Hello Client',
    rating: 'Hello Rating',
    growth: 'Hello Growth',
  };
  let name = baseNames[plan] || plan;
  const addonNames: string[] = [];
  if (addons.game) addonNames.push('Game');
  if (addons.mpd) addonNames.push('MPD');
  if (addonNames.length > 0) name += ' + ' + addonNames.join(' + ');
  return name;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,         // ID do usuário no banco
      companyId,      // ID da empresa no banco
      plan,           // Plano escolhido (hello_client, hello_rating, hello_growth)
      userCount,      // Número de usuários
      addons,         // { game: boolean, mpd: boolean }
      customNote,     // Nota personalizada para o e-mail (opcional)
    } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId e plan são obrigatórios' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, tenant_id, company_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Calcular preço
    const count = userCount || 1;
    const planAddons = addons || { game: false, mpd: false };
    const priceKey = getPriceKey(plan, planAddons);
    const pricePerUser = PRICING_DATA[count]?.[priceKey] || PRICING_DATA[1]?.[priceKey] || 0;
    const totalPrice = pricePerUser * count;
    const priceCents = Math.round(totalPrice * 100);

    if (priceCents <= 0) {
      return NextResponse.json({ error: 'Preço inválido para o plano selecionado' }, { status: 400 });
    }

    const planName = getPlanDisplayName(plan, planAddons);
    const description = `${planName} - ${count} usuário${count > 1 ? 's' : ''} (R$ ${pricePerUser.toFixed(2).replace('.', ',')} por usuário/mês)`;

    // Criar ou recuperar Stripe Customer para o usuário
    let stripeCustomerId: string | null = null;

    // Verificar se já tem customer_id na empresa
    const targetCompanyId = companyId || user.tenant_id;
    if (targetCompanyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('stripe_customer_id')
        .eq('id', targetCompanyId)
        .single();
      stripeCustomerId = company?.stripe_customer_id || null;
    }

    if (!stripeCustomerId) {
      // Criar novo customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: {
          userId: user.id,
          companyId: targetCompanyId || '',
          source: 'model_b_trial',
        },
      });
      stripeCustomerId = customer.id;

      // Salvar customer_id na empresa
      if (targetCompanyId) {
        await supabase
          .from('companies')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', targetCompanyId);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth.online';

    // Criar Payment Link do Stripe (para assinatura recorrente)
    // Usamos price_data dinâmico via Checkout Session (Payment Link não suporta price_data)
    // Então criamos um Checkout Session com prefilled_email e sem trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: planName,
              description: description,
            },
            unit_amount: priceCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      success_url: `${baseUrl}/pricing/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing/canceled`,
      metadata: {
        plan,
        userCount: count.toString(),
        addons: JSON.stringify(planAddons),
        priceKey,
        pricePerUserBRL: pricePerUser.toString(),
        totalPriceBRL: totalPrice.toString(),
        trial_model: 'model_b_conversion',
        userId: user.id,
        companyId: targetCompanyId || '',
      },
      // Expirar em 30 dias
      expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    });

    const paymentUrl = session.url;

    // Salvar o link gerado na empresa para referência
    if (targetCompanyId) {
      await supabase
        .from('companies')
        .update({
          settings: {
            payment_link_url: paymentUrl,
            payment_link_session_id: session.id,
            payment_link_sent_at: new Date().toISOString(),
            payment_link_plan: plan,
            payment_link_user_count: count,
            payment_link_addons: planAddons,
          },
        })
        .eq('id', targetCompanyId);
    }

    // Enviar e-mail com o link de pagamento via Resend ou SMTP
    // Por ora, retornamos o link para o admin enviar manualmente
    // (pode ser integrado com Resend/SendGrid futuramente)
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailBody = `
Olá, ${user.name || user.email.split('@')[0]}!

Seu período de trial gratuito de 30 dias está chegando ao fim. Para continuar aproveitando todos os recursos da plataforma HelloGrowth, clique no link abaixo para ativar sua assinatura:

${paymentUrl}

**Detalhes do plano:**
- Plano: ${planName}
- Usuários: ${count}
- Valor: R$ ${totalPrice.toFixed(2).replace('.', ',')} / mês

${customNote ? `\n${customNote}\n` : ''}

Se tiver dúvidas, entre em contato conosco pelo e-mail contato@miraiconsult.com.

Atenciosamente,
Equipe HelloGrowth
        `.trim();

        await resend.emails.send({
          from: 'HelloGrowth <noreply@hellogrowth.online>',
          to: user.email,
          subject: `Ative sua assinatura HelloGrowth - ${planName}`,
          text: emailBody,
        });
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Não falhar a requisição se o e-mail não for enviado
      }
    }

    return NextResponse.json({
      success: true,
      paymentUrl,
      sessionId: session.id,
      emailSent,
      planName,
      totalPrice,
      userEmail: user.email,
    });
  } catch (error: any) {
    console.error('Error generating payment link:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
