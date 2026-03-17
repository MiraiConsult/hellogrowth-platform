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

export async function POST(request: NextRequest) {
  try {
    const { userId, returnUrl } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Buscar tenant_id do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.tenant_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar stripe_customer_id da empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id, plan, name')
      .eq('id', userData.tenant_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    if (!company.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Esta conta não possui assinatura ativa no Stripe' },
        { status: 400 }
      );
    }

    // Criar sessão do Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth.online'}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Erro ao criar sessão do portal:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
