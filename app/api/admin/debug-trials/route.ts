import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Testar conexão básica
    const { data: allCompanies, error: allError } = await supabase
      .from('companies')
      .select('id, name, subscription_status, trial_model')
      .limit(5);
    
    // Testar com filtro
    const { data: trialCompanies, error: trialError } = await supabase
      .from('companies')
      .select('id, name, subscription_status, trial_model')
      .in('subscription_status', ['trialing', 'trial_expired', 'active', 'past_due', 'canceled'])
      .not('trial_model', 'is', null)
      .limit(5);
    
    return NextResponse.json({
      allCompanies: allCompanies?.length || 0,
      allError: allError?.message,
      trialCompanies: trialCompanies?.length || 0,
      trialError: trialError?.message,
      sample: allCompanies?.slice(0, 2),
      trialSample: trialCompanies?.slice(0, 2),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
