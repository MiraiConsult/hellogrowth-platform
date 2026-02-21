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

    // 2. Create users/tenants in Supabase
    // Note: In this architecture, a "user" record represents a tenant/company.
    // If multiple companies were purchased, we create multiple user records with the same email
    // but different tenant_ids and company_names.
    
    const results = [];
    for (const companyName of companies) {
      const newTenantId = crypto.randomUUID();
      
      const userData = {
        name: email.split('@')[0], // Default name from email
        email: email,
        company_name: companyName,
        plan: plan || 'hello_growth',
        tenant_id: newTenantId,
        role: 'admin',
        is_owner: true,
        password: '12345', // Default password for new users
        settings: {
          companyName: companyName,
          adminEmail: email,
          phone: '',
          website: '',
          autoRedirect: true,
          addons: addons || {}
        }
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error(`Error creating company ${companyName}:`, error);
        // If it's a unique constraint error on email, we might need a different strategy
        // but for now we follow the existing AdminUserManagement logic.
      } else {
        results.push(data);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: `${results.length} empresas configuradas com sucesso.` 
    });

  } catch (error: any) {
    console.error('Onboarding setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
