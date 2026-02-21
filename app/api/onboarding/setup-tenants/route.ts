import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, email, companies, plan, addons } = body;

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

    // 2. Check if user already exists or create a new one
    let userId: string;
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          name: userEmail.split('@')[0],
          email: userEmail,
          password: defaultPassword,
          role: 'admin',
          is_owner: true,
          plan: plan || 'hello_growth',
          settings: {
            adminEmail: userEmail,
            autoRedirect: true,
            addons: addons || {}
          }
        }])
        .select()
        .single();

      if (createError) throw createError;
      userId = newUser.id;
    }

    // 3. Create each company and link to the user
    const results = [];
    for (let i = 0; i < companies.length; i++) {
      const companyName = companies[i].trim();
      const companyId = crypto.randomUUID();
      
      // Create the company (tenant)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: companyName,
          plan: plan || 'hello_growth',
          plan_addons: addons ? JSON.stringify(addons) : '[]',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          created_by: userId,
          settings: {
            companyName: companyName,
            adminEmail: userEmail,
            autoRedirect: true
          }
        }])
        .select()
        .single();

      if (companyError) {
        console.error(`Error creating company ${companyName}:`, companyError);
        continue;
      }

      // Link user to company in user_companies
      const { error: linkError } = await supabase
        .from('user_companies')
        .insert([{
          user_id: userId,
          company_id: companyId,
          role: 'owner',
          is_default: i === 0, // First company is the default
          status: 'active',
          accepted_at: new Date().toISOString()
        }]);

      if (linkError) {
        console.error(`Error linking user to company ${companyName}:`, linkError);
      } else {
        // Also update the main user record with the first company as tenant_id (legacy support)
        if (i === 0) {
          await supabase
            .from('users')
            .update({ 
              tenant_id: companyId,
              company_name: companyName 
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
