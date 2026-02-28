import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, email, companies, plan: stripePlan, addons: stripeAddons } = body;

    if (!sessionId || !email || !companies || !Array.isArray(companies)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify Stripe session again for security
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.amount_total > 0) {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const userEmail = email.toLowerCase().trim();
    const defaultPassword = '12345';

    // 2. Map Stripe Plan to System Plan
    let systemPlan = 'client';
    if (stripePlan === 'hello_growth') systemPlan = 'growth';
    else if (stripePlan === 'hello_rating') systemPlan = 'rating';
    else if (stripePlan === 'hello_client') systemPlan = 'client';
    else if (stripePlan === 'growth' || stripePlan === 'rating' || stripePlan === 'client') {
      systemPlan = stripePlan;
    }

    // 3. TRAVA DE E-MAIL ÚNICO: Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .maybeSingle();

    // Se o usuário já existe, bloqueamos a criação de uma nova conta "do zero"
    // No futuro, poderíamos apenas adicionar as novas empresas a esta conta,
    // mas por segurança e organização, vamos impedir a duplicidade agora.
    if (existingUser) {
      return NextResponse.json({ 
        error: 'EMAIL_EXISTS',
        message: 'Este e-mail já possui uma conta ativa no sistema. Por favor, faça login para gerenciar suas empresas.' 
      }, { status: 409 }); // 409 Conflict
    }

    // 4. Create new user record
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: userEmail.split('@')[0],
        email: userEmail,
        password: defaultPassword,
        role: 'admin',
        is_owner: true,
        plan: systemPlan,
        settings: {
          adminEmail: userEmail,
          autoRedirect: true,
          addons: stripeAddons || {}
        }
      }])
      .select()
      .single();

    if (createError) throw createError;
    const userId = newUser.id;

    // 5. Create each company and link to the user
    const results = [];
    for (let i = 0; i < companies.length; i++) {
      const companyName = companies[i].trim();
      const companyId = crypto.randomUUID();
      
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: companyName,
          plan: systemPlan,
          plan_addons: stripeAddons ? JSON.stringify(stripeAddons) : '[]',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          created_by: userId,
          settings: {
            companyName: companyName,
            adminEmail: userEmail,
            autoRedirect: true,
            addons: stripeAddons || {}
          }
        }])
        .select()
        .single();

      if (companyError) {
        console.error(`Error creating company ${companyName}:`, companyError);
        continue;
      }

      const { error: linkError } = await supabase
        .from('user_companies')
        .insert([{
          user_id: userId,
          company_id: companyId,
          role: 'owner',
          is_default: i === 0,
          status: 'active',
          accepted_at: new Date().toISOString()
        }]);

      if (linkError) {
        console.error(`Error linking user to company ${companyName}:`, linkError);
      } else {
        if (i === 0) {
          await supabase
            .from('users')
            .update({ 
              tenant_id: companyId,
              company_name: companyName,
              plan: systemPlan
            })
            .eq('id', userId);
        }
        results.push(companyData);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: `${results.length} empresas configuradas com sucesso para o usuário ${userEmail}.` 
    });

  } catch (error: any) {
    console.error('Onboarding setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
