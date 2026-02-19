import { NextRequest, NextResponse } from 'next/server';

const STRIPE_PRICE_IDS: Record<string, string> = {
  hc_1: "price_1T2Wr90JQvL5ZxK9Rh6W0VK4",
  hr_1: "price_1T2WrB0JQvL5ZxK9taw0TXGO",
  hg_1: "price_1T2WrD0JQvL5ZxK94YyoxT5h",
  hc_2: "price_1T2WrF0JQvL5ZxK9D0MHR96x",
  hr_2: "price_1T2WrH0JQvL5ZxK9rwBIVEV8",
  hg_2: "price_1T2WrJ0JQvL5ZxK91OFsxQrZ",
  hc_3: "price_1T2WrL0JQvL5ZxK9EMrCaCTl",
  hr_3: "price_1T2WrN0JQvL5ZxK9cL3hphlN",
  hg_3: "price_1T2WrQ0JQvL5ZxK9cHlGqxP7",
  hc_4: "price_1T2WrS0JQvL5ZxK9AFFdkUZe",
  hr_4: "price_1T2WrU0JQvL5ZxK9n96REOju",
  hg_4: "price_1T2WrW0JQvL5ZxK9sqchxEhd",
  hc_5: "price_1T2WrY0JQvL5ZxK9EvS9zlc7",
  hr_5: "price_1T2Wra0JQvL5ZxK9pI5B2n4H",
  hg_5: "price_1T2Wrc0JQvL5ZxK94gml1vB5",
  hc_6: "price_1T2Wre0JQvL5ZxK9btoMnK7y",
  hr_6: "price_1T2Wrg0JQvL5ZxK9sG1Szm0B",
  hg_6: "price_1T2Wrh0JQvL5ZxK9cqqlozTq",
  hc_7: "price_1T2Wrj0JQvL5ZxK9mni74lpy",
  hr_7: "price_1T2Wrl0JQvL5ZxK9UgseIy9C",
  hg_7: "price_1T2Wro0JQvL5ZxK9JBJa6xoe",
  hc_8: "price_1T2Wrq0JQvL5ZxK9BhGWwmGO",
  hr_8: "price_1T2Wrs0JQvL5ZxK9ul5NBXYI",
  hg_8: "price_1T2Wru0JQvL5ZxK9Sa5ItDAf",
  hc_9: "price_1T2Wrw0JQvL5ZxK9eXy4oJU6",
  hr_9: "price_1T2Wry0JQvL5ZxK9lfyjkMcD",
  hg_9: "price_1T2Ws00JQvL5ZxK9WMsXxWsY",
  hc_10: "price_1T2Ws20JQvL5ZxK9ioZqVTQz",
  hr_10: "price_1T2Ws40JQvL5ZxK95J3UcFUr",
  hg_10: "price_1T2Ws60JQvL5ZxK9qpXsZa7b",
};

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

    // Get the plan code (hc, hr, hg)
    const planCodeMap: Record<string, string> = {
      hello_client: 'hc',
      hello_rating: 'hr',
      hello_growth: 'hg',
    };

    const planCode = planCodeMap[plan];
    if (!planCode) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Get the price ID
    const priceKey = `${planCode}_${userCount}`;
    const priceId = STRIPE_PRICE_IDS[priceKey];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid price configuration' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get the base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        plan,
        userCount: userCount.toString(),
        addons: JSON.stringify(addons || {}),
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
