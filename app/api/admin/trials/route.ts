import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Buscar todas as empresas em trial (model_a ou model_b)
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        plan,
        plan_addons,
        subscription_status,
        trial_model,
        trial_start_at,
        trial_end_at,
        stripe_customer_id,
        stripe_subscription_id,
        created_at,
        settings,
        created_by
      `)
      .in('subscription_status', ['trialing', 'trial_expired', 'active', 'past_due', 'canceled'])
      .not('trial_model', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trials:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Para cada empresa, buscar o usuário dono
    const enrichedCompanies = await Promise.all(
      (companies || []).map(async (company) => {
        // Buscar usuário dono via user_companies
        const { data: userCompany } = await supabase
          .from('user_companies')
          .select('user_id, role')
          .eq('company_id', company.id)
          .eq('role', 'owner')
          .maybeSingle();

        let ownerUser = null;
        if (userCompany?.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('id, name, email, plan')
            .eq('id', userCompany.user_id)
            .maybeSingle();
          ownerUser = user;
        }

        // Se não encontrou via user_companies, tentar pelo created_by
        if (!ownerUser && company.created_by) {
          const { data: user } = await supabase
            .from('users')
            .select('id, name, email, plan')
            .eq('id', company.created_by)
            .maybeSingle();
          ownerUser = user;
        }

        // Calcular dias restantes
        const now = new Date();
        const trialEnd = company.trial_end_at ? new Date(company.trial_end_at) : null;
        const daysRemaining = trialEnd
          ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null;

        // Verificar se o link de pagamento já foi enviado
        const paymentLinkSentAt = company.settings?.payment_link_sent_at || null;
        const paymentLinkUrl = company.settings?.payment_link_url || null;

        return {
          ...company,
          owner: ownerUser,
          daysRemaining,
          paymentLinkSentAt,
          paymentLinkUrl,
        };
      })
    );

    return NextResponse.json({ trials: enrichedCompanies });
  } catch (error: any) {
    console.error('Error in trials API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
