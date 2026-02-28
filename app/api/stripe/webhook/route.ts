import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

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
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        // TODO: Create user account in database
        // - Extract customer email from session.customer_details.email
        // - Extract plan details from session.metadata
        // - Create user in Supabase
        // - Send welcome email

        const customerEmail = session.customer_details?.email;
        const metadata = session.metadata;

        console.log('New subscription:', {
          email: customerEmail,
          plan: metadata?.plan,
          userCount: metadata?.userCount,
          addons: metadata?.addons,
        });

        // TODO: Implement user creation logic here
        // Example:
        // await createUserInDatabase({
        //   email: customerEmail,
        //   plan: metadata.plan,
        //   userCount: parseInt(metadata.userCount),
        //   addons: JSON.parse(metadata.addons || '{}'),
        //   stripeCustomerId: session.customer,
        //   stripeSubscriptionId: session.subscription,
        // });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);

        // TODO: Update user subscription status in database
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription canceled:', subscription.id);

        // TODO: Deactivate user account or downgrade plan
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);

        // TODO: Update payment status in database
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);

        // TODO: Notify user about payment failure
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
