import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: { code: string };
}

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = params;

  try {
    // Buscar o referral pelo código
    const { data: referral, error } = await supabase
      .from('referrals')
      .select(`
        *,
        engagement_campaigns(tenant_id, name, status)
      `)
      .eq('referral_code', code)
      .single();

    if (error || !referral) {
      // Código inválido — redirecionar para página principal
      redirect('/');
    }

    const campaign = referral.engagement_campaigns as any;

    if (!campaign || campaign.status !== 'active') {
      redirect('/');
    }

    const tenantId = campaign.tenant_id;

    // Buscar formulário de pré-venda ativo do tenant
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Redirecionar para o formulário com parâmetros de indicação
    if (form) {
      redirect(`/f/${form.id}?ref=${code}&referrer=${encodeURIComponent(referral.referrer_name || '')}`);
    } else {
      // Sem formulário ativo — redirecionar para página principal
      redirect('/');
    }
  } catch (err) {
    redirect('/');
  }
}
