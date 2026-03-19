import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, companies, plan: stripePlan, userCount, addons, trial_model, trial_end_at, userName } = body;

    if (!email || !companies || !Array.isArray(companies) || !stripePlan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (trial_model !== 'model_b') {
      return NextResponse.json({ error: 'Invalid trial model for this endpoint' }, { status: 400 });
    }

    const userEmail = email.toLowerCase().trim();
    const defaultPassword = '12345';

    // Map Stripe Plan to System Plan
    let systemPlan = 'client';
    if (stripePlan === 'hello_growth') systemPlan = 'growth';
    else if (stripePlan === 'hello_rating') systemPlan = 'rating';
    else if (stripePlan === 'hello_client') systemPlan = 'client';
    else if (stripePlan === 'growth' || stripePlan === 'rating' || stripePlan === 'client') {
      systemPlan = stripePlan;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'EMAIL_EXISTS',
        message: 'Este e-mail já possui uma conta ativa no sistema. Por favor, faça login para gerenciar suas empresas.' 
      }, { status: 409 });
    }

    // Calculate trial end date (30 days from now if not provided)
    const trialEndDate = trial_end_at 
      ? new Date(trial_end_at) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create new user record
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: userName || userEmail.split('@')[0],
        email: userEmail,
        password: defaultPassword,
        role: 'admin',
        is_owner: true,
        plan: systemPlan,
        settings: {
          adminEmail: userEmail,
          autoRedirect: true,
          addons: addons || {},
          trial_model: 'model_b',
        }
      }])
      .select()
      .single();

    if (createError) throw createError;

    const userId = newUser.id;
    const results = [];

    // Create each company and link to the user
    for (let i = 0; i < companies.length; i++) {
      const companyName = companies[i].trim();
      const companyId = crypto.randomUUID();
      
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: companyName,
          plan: systemPlan,
          plan_addons: addons ? JSON.stringify(addons) : '[]',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_status: 'trialing',
          trial_start_at: new Date().toISOString(),
          trial_end_at: trialEndDate.toISOString(),
          trial_model: 'model_b',
          created_by: userId,
          settings: {
            companyName: companyName,
            adminEmail: userEmail,
            autoRedirect: true,
            addons: addons || {},
            trial_model: 'model_b',
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
      trial_end_at: trialEndDate.toISOString(),
      message: `${results.length} empresa(s) configurada(s) com trial de 30 dias para ${userEmail}.` 
    });
  } catch (error: any) {
    console.error('Trial setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
