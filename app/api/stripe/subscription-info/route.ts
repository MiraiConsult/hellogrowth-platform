import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mapeamento de produto Stripe para nome do plano
const PLAN_NAMES: Record<string, string> = {
  'prod_U0XvnEFkIv72SB': 'Hello Client',
  'prod_U0XwVWr2AKlQQ7': 'Hello Rating',
  'prod_U0XwV8F55iDvd3': 'Hello Growth',
  'prod_U0XwdkknxN91r5': 'Minha Presença Digital',
  'prod_U0XwnB8BK3rUEd': 'Game',
  'prod_TX7pcIXdRyYE8q': 'HelloGrowth',
  'prod_TRWrzuONqzRy0M': 'Plano Starter',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Buscar tenant_id do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar dados da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id, plan, plan_addons, subscription_status, max_users')
      .eq('id', userData.tenant_id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Se não tem Stripe, retornar dados básicos do banco
    if (!company.stripe_subscription_id) {
      return NextResponse.json({
        plan: company.plan || 'trial',
        status: company.subscription_status || 'trial',
        addons: company.plan_addons || {},
        maxUsers: company.max_users || 1,
        stripeConnected: false,
      });
    }

    // Buscar dados da assinatura no Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(
        company.stripe_subscription_id,
        { expand: ['items.data.price.product', 'latest_invoice'] }
      );

      const items = subscription.items.data;
      const mainItem = items[0];
      const product = mainItem?.price?.product as Stripe.Product;
      const planName = product ? (PLAN_NAMES[product.id] || product.name) : company.plan;

      // Addons
      const addons = items.slice(1).map(item => {
        const addonProduct = item.price?.product as Stripe.Product;
        return {
          id: addonProduct?.id,
          name: PLAN_NAMES[addonProduct?.id] || addonProduct?.name || 'Add-on',
          amount: item.price?.unit_amount ? item.price.unit_amount / 100 : 0,
          quantity: item.quantity || 1,
        };
      });

      const nextBilling = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')
        : null;

      const amount = mainItem?.price?.unit_amount
        ? mainItem.price.unit_amount / 100
        : null;

      return NextResponse.json({
        plan: planName,
        planId: product?.id,
        status: subscription.status,
        nextBilling,
        amount,
        currency: mainItem?.price?.currency || 'brl',
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toLocaleDateString('pt-BR')
          : null,
        addons,
        maxUsers: company.max_users || 1,
        stripeConnected: true,
        subscriptionId: subscription.id,
      });
    } catch (stripeError: any) {
      console.error('Erro ao buscar assinatura no Stripe:', stripeError);
      // Retornar dados do banco como fallback
      return NextResponse.json({
        plan: company.plan || 'trial',
        status: company.subscription_status || 'active',
        addons: [],
        maxUsers: company.max_users || 1,
        stripeConnected: false,
        error: 'Não foi possível buscar dados do Stripe',
      });
    }
  } catch (error: any) {
    console.error('Erro ao buscar informações da assinatura:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
