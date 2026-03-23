import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/clients — lista todos os usuários com suas empresas e dados de trial
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const modelFilter = searchParams.get('model') || 'all';

    // Buscar todos os usuários (exceto admin)
    let usersQuery = supabase
      .from('users')
      .select('id, name, email, phone, plan, company_name, created_at, settings, tenant_id, role, last_login')
      .neq('email', 'admin@hellogrowth.com')
      .order('created_at', { ascending: false });

    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    // Para cada usuário, buscar as empresas vinculadas
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        const { data: userCompanies } = await supabase
          .from('user_companies')
          .select(`
            role,
            is_default,
            status,
            company_id,
            companies (
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
              max_users,
              settings,
              created_at
            )
          `)
          .eq('user_id', user.id);

        const companies = (userCompanies || [])
          .map((uc: any) => ({
            ...uc.companies,
            userRole: uc.role,
            isDefault: uc.is_default,
            userStatus: uc.status,
          }))
          .filter(Boolean);

        // Calcular status consolidado do cliente
        const primaryCompany = companies.find((c: any) => c.isDefault) || companies[0];
        
        // Calcular dias restantes do trial
        const now = new Date();
        const enrichedCompanies = companies.map((c: any) => {
          const trialEnd = c.trial_end_at ? new Date(c.trial_end_at) : null;
          const daysRemaining = trialEnd
            ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : null;
          return {
            ...c,
            daysRemaining,
            paymentLinkSentAt: c.settings?.payment_link_sent_at || null,
            paymentLinkUrl: c.settings?.payment_link_url || null,
          };
        });

        // Status consolidado
        let consolidatedStatus = 'active';
        let consolidatedTrialModel: string | null = null;
        let consolidatedDaysRemaining: number | null = null;

        if (primaryCompany) {
          consolidatedStatus = primaryCompany.subscription_status || user.plan;
          consolidatedTrialModel = primaryCompany.trial_model || null;
          const trialEnd = primaryCompany.trial_end_at ? new Date(primaryCompany.trial_end_at) : null;
          consolidatedDaysRemaining = trialEnd
            ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : null;
        } else {
          // Usuário sem empresa vinculada — usar dados do usuário
          consolidatedStatus = user.plan === 'trial' ? 'trialing' : user.plan;
          consolidatedTrialModel = user.settings?.trial_model || null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: (user as any).phone || null,
          plan: user.plan,
          companyName: user.company_name,
          createdAt: user.created_at,
          lastLogin: (user as any).last_login || null,
          settings: user.settings,
          companies: enrichedCompanies,
          primaryCompany: enrichedCompanies.find((c: any) => c.isDefault) || enrichedCompanies[0] || null,
          consolidatedStatus,
          consolidatedTrialModel,
          consolidatedDaysRemaining,
        };
      })
    );

    // Aplicar filtros
    let filtered = enrichedUsers;

    if (planFilter !== 'all') {
      filtered = filtered.filter(u => u.plan === planFilter || u.primaryCompany?.plan === planFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.consolidatedStatus === statusFilter);
    }

    if (modelFilter !== 'all') {
      if (modelFilter === 'no_model') {
        filtered = filtered.filter(u => !u.consolidatedTrialModel);
      } else {
        filtered = filtered.filter(u => u.consolidatedTrialModel === modelFilter);
      }
    }

    // Estatísticas
    const stats = {
      total: enrichedUsers.length,
      active: enrichedUsers.filter(u => u.consolidatedStatus === 'active').length,
      trialing: enrichedUsers.filter(u => u.consolidatedStatus === 'trialing').length,
      trial_expired: enrichedUsers.filter(u => u.consolidatedStatus === 'trial_expired').length,
      model_a: enrichedUsers.filter(u => u.consolidatedTrialModel === 'model_a').length,
      model_b: enrichedUsers.filter(u => u.consolidatedTrialModel === 'model_b').length,
      urgent_b: enrichedUsers.filter(u => 
        u.consolidatedTrialModel === 'model_b' && 
        u.consolidatedStatus === 'trialing' && 
        (u.consolidatedDaysRemaining ?? 999) <= 7
      ).length,
      mrr: enrichedUsers.filter(u => u.consolidatedStatus === 'active').length * 149.90,
    };

    return NextResponse.json({ clients: filtered, stats, total: filtered.length });
  } catch (error: any) {
    console.error('Error in clients API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/clients — atualiza dados de um usuário e suas empresas
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userData, companyUpdates, addCompany, removeCompanyId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Atualizar dados do usuário
    if (userData) {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          email: userData.email,
          ...(userData.phone !== undefined ? { phone: userData.phone } : {}),
          plan: userData.plan,
          company_name: userData.companyName,
          ...(userData.password ? { password: userData.password } : {}),
        })
        .eq('id', userId);
      if (error) throw error;
    }

    // Atualizar empresa específica
    if (companyUpdates && companyUpdates.companyId) {
      const { companyId, ...updates } = companyUpdates;
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.plan !== undefined) updateData.plan = updates.plan;
      if (updates.planAddons !== undefined) updateData.plan_addons = updates.planAddons;
      if (updates.subscriptionStatus !== undefined) updateData.subscription_status = updates.subscriptionStatus;
      if (updates.trialModel !== undefined) updateData.trial_model = updates.trialModel;
      if (updates.trialEndAt !== undefined) updateData.trial_end_at = updates.trialEndAt;
      if (updates.maxUsers !== undefined) updateData.max_users = updates.maxUsers;
      if (updates.stripeCustomerId !== undefined) updateData.stripe_customer_id = updates.stripeCustomerId;
      if (updates.stripeSubscriptionId !== undefined) updateData.stripe_subscription_id = updates.stripeSubscriptionId;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);
      if (error) throw error;
    }

    // Adicionar nova empresa ao usuário
    if (addCompany) {
      const companyId = crypto.randomUUID();
      const { error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: addCompany.name,
          plan: addCompany.plan || 'growth',
          plan_addons: addCompany.planAddons || JSON.stringify({ game: false, mpd: false }),
          subscription_status: addCompany.subscriptionStatus || 'trialing',
          trial_start_at: new Date().toISOString(),
          trial_end_at: addCompany.trialEndAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trial_model: addCompany.trialModel || null,
          max_users: addCompany.maxUsers || 1,
          created_by: userId,
          settings: {
            companyName: addCompany.name,
            autoRedirect: true,
            addons: addCompany.planAddons || { game: false, mpd: false },
          }
        }]);
      if (companyError) throw companyError;

      const { error: linkError } = await supabase
        .from('user_companies')
        .insert([{
          user_id: userId,
          company_id: companyId,
          role: 'owner',
          is_default: false,
          status: 'active',
          accepted_at: new Date().toISOString(),
        }]);
      if (linkError) throw linkError;
    }

    // Remover empresa do usuário
    if (removeCompanyId) {
      await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', removeCompanyId);
      
      // Verificar se a empresa tem outros usuários antes de deletar
      const { data: otherUsers } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', removeCompanyId);
      
      if (!otherUsers || otherUsers.length === 0) {
        await supabase.from('companies').delete().eq('id', removeCompanyId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/clients — exclui um usuário e seus dados
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Buscar empresas do usuário onde ele é o único owner
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', userId)
      .eq('role', 'owner');

    // Para cada empresa, verificar se tem outros usuários
    for (const uc of userCompanies || []) {
      const { data: otherUsers } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', uc.company_id)
        .neq('user_id', userId);
      
      if (!otherUsers || otherUsers.length === 0) {
        // Deletar empresa sem outros usuários
        await supabase.from('companies').delete().eq('id', uc.company_id);
      }
    }

    // Deletar vínculos do usuário
    await supabase.from('user_companies').delete().eq('user_id', userId);

    // Deletar usuário
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
