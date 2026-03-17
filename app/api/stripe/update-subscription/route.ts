import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pricing data structure - same as in the pricing page
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
  const planCodeMap: Record<string, string> = { 'hello_client': 'hc', 'hello_rating': 'hr', 'hello_growth': 'hg' };
  const planCode = planCodeMap[plan];
  if (!planCode) return plan;
  if (addons.game && addons.mpd) return `${planCode}_game_mpd`;
  if (addons.game) return `${planCode}_game`;
  if (addons.mpd) return `${planCode}_mpd`;
  return plan;
}

function getPlanName(plan: string, addons: { game: boolean; mpd: boolean }): string {
  const baseNames: Record<string, string> = { hello_client: 'Hello Client', hello_rating: 'Hello Rating', hello_growth: 'Hello Growth' };
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
    const { plan, userCount, addons, userId } = body;

    if (!plan || !userCount || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (userCount < 1 || userCount > 10) {
      return NextResponse.json({ error: 'User count must be between 1 and 10' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get the company's stripe_customer_id and stripe_subscription_id from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id, plan')
      .eq('owner_id', userId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const priceKey = getPriceKey(plan, addons || { game: false, mpd: false });
    const priceBRL = PRICING_DATA[userCount]?.[priceKey];

    if (!priceBRL) {
      return NextResponse.json({ error: `Invalid price configuration for ${priceKey}` }, { status: 400 });
    }

    const totalPriceBRL = priceBRL * userCount;
    const priceCents = Math.round(totalPriceBRL * 100);
    const planName = getPlanName(plan, addons || { game: false, mpd: false });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://hellogrowth.online';

    // If customer has an active subscription, update it
    if (company.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Update existing subscription with new price
          const updatedSubscription = await stripe.subscriptions.update(company.stripe_subscription_id, {
            items: [{
              id: subscription.items.data[0].id,
              price_data: {
                currency: 'brl',
                product_data: {
                  name: planName,
                  description: `${planName} - ${userCount} usuário${userCount > 1 ? 's' : ''}`,
                },
                unit_amount: priceCents,
                recurring: { interval: 'month' },
              },
            }],
            proration_behavior: 'create_prorations',
            metadata: {
              plan,
              userCount: userCount.toString(),
              addons: JSON.stringify(addons || {}),
              priceKey,
            },
          });

          // Update company plan in Supabase
          const planMap: Record<string, string> = {
            'hello_client': 'client',
            'hello_rating': 'rating',
            'hello_growth': 'growth',
          };

          await supabase
            .from('companies')
            .update({
              plan: planMap[plan] || plan,
              plan_addons: JSON.stringify(addons || {}),
              plan_user_count: userCount,
            })
            .eq('owner_id', userId);

          return NextResponse.json({
            success: true,
            subscriptionId: updatedSubscription.id,
            message: 'Assinatura atualizada com sucesso',
          });
        }
      } catch (subError: any) {
        console.error('Error retrieving/updating subscription:', subError.message);
        // Fall through to create new checkout session
      }
    }

    // If no active subscription, create a new checkout session
    // (customer might exist but subscription was canceled)
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: planName,
            description: `${planName} - ${userCount} usuário${userCount > 1 ? 's' : ''} (R$ ${priceBRL.toFixed(2).replace('.', ',')} por usuário/mês)`,
          },
          unit_amount: priceCents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/pricing/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing/canceled`,
      allow_promotion_codes: true,
      metadata: {
        plan,
        userCount: userCount.toString(),
        addons: JSON.stringify(addons || {}),
        priceKey,
        userId,
      },
    };

    // Pre-fill customer if exists
    if (company.stripe_customer_id) {
      sessionParams.customer = company.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url, requiresCheckout: true });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
