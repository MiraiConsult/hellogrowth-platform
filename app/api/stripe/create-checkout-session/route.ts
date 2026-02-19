import { NextRequest, NextResponse } from 'next/server';

// Pricing data structure - same as in the pricing page
const PRICING_DATA: Record<number, Record<string, number>> = {
  1: {
    hello_client: 99.90, hello_rating: 99.90, hello_growth: 149.90,
    hc_mpd: 129.90, hr_game: 129.90, hr_mpd: 129.90, hr_game_mpd: 149.90,
    hg_game: 189.90, hg_mpd: 189.90, hg_game_mpd: 199.90,
  },
  2: {
    hello_client: 94.90, hello_rating: 94.90, hello_growth: 144.90,
    hc_mpd: 124.90, hr_game: 124.90, hr_mpd: 124.90, hr_game_mpd: 144.90,
    hg_game: 184.90, hg_mpd: 184.90, hg_game_mpd: 194.90,
  },
  3: {
    hello_client: 89.90, hello_rating: 89.90, hello_growth: 139.90,
    hc_mpd: 119.90, hr_game: 119.90, hr_mpd: 119.90, hr_game_mpd: 139.90,
    hg_game: 179.90, hg_mpd: 179.90, hg_game_mpd: 189.90,
  },
  4: {
    hello_client: 84.90, hello_rating: 84.90, hello_growth: 134.90,
    hc_mpd: 114.90, hr_game: 114.90, hr_mpd: 114.90, hr_game_mpd: 134.90,
    hg_game: 174.90, hg_mpd: 174.90, hg_game_mpd: 184.90,
  },
  5: {
    hello_client: 79.90, hello_rating: 79.90, hello_growth: 129.90,
    hc_mpd: 109.90, hr_game: 109.90, hr_mpd: 109.90, hr_game_mpd: 129.90,
    hg_game: 169.90, hg_mpd: 169.90, hg_game_mpd: 179.90,
  },
  6: {
    hello_client: 74.90, hello_rating: 74.90, hello_growth: 124.90,
    hc_mpd: 104.90, hr_game: 104.90, hr_mpd: 104.90, hr_game_mpd: 124.90,
    hg_game: 164.90, hg_mpd: 164.90, hg_game_mpd: 174.90,
  },
  7: {
    hello_client: 69.90, hello_rating: 69.90, hello_growth: 119.90,
    hc_mpd: 99.90, hr_game: 99.90, hr_mpd: 99.90, hr_game_mpd: 119.90,
    hg_game: 159.90, hg_mpd: 159.90, hg_game_mpd: 169.90,
  },
  8: {
    hello_client: 64.90, hello_rating: 64.90, hello_growth: 114.90,
    hc_mpd: 94.90, hr_game: 94.90, hr_mpd: 94.90, hr_game_mpd: 114.90,
    hg_game: 154.90, hg_mpd: 154.90, hg_game_mpd: 164.90,
  },
  9: {
    hello_client: 59.90, hello_rating: 59.90, hello_growth: 109.90,
    hc_mpd: 89.90, hr_game: 89.90, hr_mpd: 89.90, hr_game_mpd: 109.90,
    hg_game: 149.90, hg_mpd: 149.90, hg_game_mpd: 159.90,
  },
  10: {
    hello_client: 54.90, hello_rating: 54.90, hello_growth: 104.90,
    hc_mpd: 84.90, hr_game: 84.90, hr_mpd: 84.90, hr_game_mpd: 104.90,
    hg_game: 144.90, hg_mpd: 144.90, hg_game_mpd: 154.90,
  },
};

// Helper function to get the price key based on plan and addons
function getPriceKey(plan: string, addons: { game: boolean; mpd: boolean }): string {
  const planCode = plan.replace('hello_', '').substring(0, 2); // hc, hr, hg
  
  if (addons.game && addons.mpd) {
    return `${planCode}_game_mpd`;
  } else if (addons.game) {
    return `${planCode}_game`;
  } else if (addons.mpd) {
    return `${planCode}_mpd`;
  } else {
    return plan;
  }
}

// Helper function to get plan name for display
function getPlanName(plan: string, addons: { game: boolean; mpd: boolean }): string {
  const baseNames: Record<string, string> = {
    hello_client: 'Hello Client',
    hello_rating: 'Hello Rating',
    hello_growth: 'Hello Growth',
  };
  
  let name = baseNames[plan] || plan;
  const addonNames: string[] = [];
  
  if (addons.game) addonNames.push('Game');
  if (addons.mpd) addonNames.push('MPD');
  
  if (addonNames.length > 0) {
    name += ' + ' + addonNames.join(' + ');
  }
  
  return name;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userCount, addons } = body;

    if (!plan || !userCount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate user count
    if (userCount < 1 || userCount > 10) {
      return NextResponse.json(
        { error: 'User count must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Get the price key
    const priceKey = getPriceKey(plan, addons || { game: false, mpd: false });
    const priceBRL = PRICING_DATA[userCount][priceKey];

    if (!priceBRL) {
      return NextResponse.json(
        { error: 'Invalid price configuration' },
        { status: 400 }
      );
    }

    // Convert BRL to cents
    const priceCents = Math.round(priceBRL * 100);

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get the base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';

    // Get plan name for display
    const planName = getPlanName(plan, addons || { game: false, mpd: false });
    const description = `${planName} - ${userCount} usuário${userCount > 1 ? 's' : ''}`;

    // Create Checkout Session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
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
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        plan,
        userCount: userCount.toString(),
        addons: JSON.stringify(addons || {}),
        priceKey,
        priceBRL: priceBRL.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
