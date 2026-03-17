import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

// =====================================================================
// Helper: Atualizar status da empresa para 'active' quando o pagamento
// for confirmado. Usado para liberar acesso do Modelo B após conversão.
// =====================================================================
async function activateCompanySubscription(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  stripeCustomerEmail?: string
) {
  try {
    // Buscar empresa pelo stripe_customer_id
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, subscription_status, trial_model')
      .eq('stripe_customer_id', stripeCustomerId);

    if (error || !companies || companies.length === 0) {
      // Tentar pelo e-mail do cliente se não encontrar pelo customer_id
      if (stripeCustomerEmail) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('id, tenant_id')
          .eq('email', stripeCustomerEmail.toLowerCase())
          .maybeSingle();

        if (userByEmail?.tenant_id) {
          await supabase
            .from('companies')
            .update({
              subscription_status: 'active',
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              trial_end_at: null,
            })
            .eq('id', userByEmail.tenant_id);

          console.log(`Activated company by email: ${stripeCustomerEmail}`);
          return;
        }
      }
      console.warn('Company not found for customer:', stripeCustomerId);
      return;
    }

    // Atualizar todas as empresas do cliente para 'active'
    for (const company of companies) {
      await supabase
        .from('companies')
        .update({
          subscription_status: 'active',
          stripe_subscription_id: stripeSubscriptionId,
          trial_end_at: null, // Limpar trial_end_at pois agora é assinante
        })
        .eq('id', company.id);

      console.log(`Activated company ${company.name} (${company.id}), was: ${company.subscription_status}`);
    }
  } catch (err) {
    console.error('Error activating company subscription:', err);
  }
}

// =====================================================================
// Helper: Atualizar status para 'canceled' quando assinatura for cancelada
// =====================================================================
async function cancelCompanySubscription(stripeSubscriptionId: string) {
  try {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .eq('stripe_subscription_id', stripeSubscriptionId);

    if (!companies || companies.length === 0) {
      console.warn('Company not found for subscription:', stripeSubscriptionId);
      return;
    }

    for (const company of companies) {
      await supabase
        .from('companies')
        .update({ subscription_status: 'canceled' })
        .eq('id', company.id);

      console.log(`Canceled company ${company.name} (${company.id})`);
    }
  } catch (err) {
    console.error('Error canceling company subscription:', err);
  }
}

// =====================================================================
// Helper: Atualizar status para 'past_due' quando pagamento falhar
// =====================================================================
async function markCompanyPastDue(stripeSubscriptionId: string) {
  try {
    await supabase
      .from('companies')
      .update({ subscription_status: 'past_due' })
      .eq('stripe_subscription_id', stripeSubscriptionId);
  } catch (err) {
    console.error('Error marking company as past_due:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      // ================================================================
      // checkout.session.completed
      // Disparado quando o checkout é concluído com sucesso.
      // Para o Modelo A (trial com cartão), o usuário já foi criado via
      // setup-tenants. Aqui apenas atualizamos o stripe_customer_id.
      // Para assinaturas normais (sem trial), também atualizamos.
      // ================================================================
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        const customerEmail = session.customer_details?.email;
        const metadata = session.metadata;
        const trialModel = metadata?.trial_model || 'none';

        console.log('Checkout completed:', {
          email: customerEmail,
          plan: metadata?.plan,
          userCount: metadata?.userCount,
          trial_model: trialModel,
          payment_status: session.payment_status,
          subscription: session.subscription,
        });

        // Para Modelo A: Atualizar stripe_customer_id e stripe_subscription_id
        // nas empresas criadas via setup-tenants (que ainda não têm esses IDs)
        if (trialModel === 'model_a' && customerEmail) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id, tenant_id')
            .eq('email', customerEmail.toLowerCase())
            .maybeSingle();

          if (userByEmail?.tenant_id) {
            await supabase
              .from('companies')
              .update({
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                subscription_status: 'trialing', // Modelo A: trialing até o dia 31
              })
              .eq('id', userByEmail.tenant_id);

            console.log(`Updated Stripe IDs for Model A trial: ${customerEmail}`);
          }
        }

        // Para assinatura normal (sem trial): Ativar imediatamente
        // (o setup-tenants já cuida da criação, mas pode não ter os IDs do Stripe)
        if (trialModel === 'none' && session.subscription && customerEmail) {
          await activateCompanySubscription(
            session.customer,
            session.subscription,
            customerEmail
          );
        }

        break;
      }

      // ================================================================
      // customer.subscription.updated
      // Disparado quando uma assinatura é atualizada.
      // Importante para detectar quando:
      // - Trial do Modelo A termina e cobrança inicia (status: active)
      // - Assinatura é cancelada (status: canceled)
      // - Pagamento falha (status: past_due)
      // ================================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id, 'status:', subscription.status);

        if (subscription.status === 'active') {
          // Trial terminou e cobrança foi bem-sucedida (Modelo A)
          // OU usuário do Modelo B pagou e ativou assinatura
          await activateCompanySubscription(
            subscription.customer,
            subscription.id
          );
        } else if (subscription.status === 'canceled') {
          await cancelCompanySubscription(subscription.id);
        } else if (subscription.status === 'past_due') {
          await markCompanyPastDue(subscription.id);
        }

        break;
      }

      // ================================================================
      // customer.subscription.deleted
      // Disparado quando uma assinatura é definitivamente cancelada.
      // ================================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription canceled:', subscription.id);
        await cancelCompanySubscription(subscription.id);
        break;
      }

      // ================================================================
      // invoice.payment_succeeded
      // Disparado quando um pagamento de fatura é bem-sucedido.
      // Garante que a empresa esteja ativa após qualquer pagamento.
      // ================================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);

        // Ativar empresa se ainda não estiver ativa
        if (invoice.subscription && invoice.customer) {
          await activateCompanySubscription(
            invoice.customer,
            invoice.subscription
          );
        }

        break;
      }

      // ================================================================
      // invoice.payment_failed
      // Disparado quando um pagamento de fatura falha.
      // ================================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);

        if (invoice.subscription) {
          await markCompanyPastDue(invoice.subscription);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
