import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
      status: session.status,
      payment_status: session.payment_status,
    });
  } catch (error: any) {
    console.error('Error retrieving stripe session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
