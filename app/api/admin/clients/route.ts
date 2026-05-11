import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Client com service_role para contornar RLS nas operações admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/clients — lista todos os usuários com suas empresas e dados de trial
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const search = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const modelFilter = searchParams.get('model') || 'all';

    // Buscar contatos extras de um cliente
    if (action === 'contacts') {
      const userId = searchParams.get('userId');
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ contacts: data || [] });
    }

    // Buscar dados extras de pipeline e NPS para o perfil do cliente
    if (action === 'profile_extras') {
      const userId = searchParams.get('userId');
      const tenantId = searchParams.get('tenantId');
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

      // Buscar card do kanban pelo email ou nome do cliente
      const { data: userRow } = await supabase
        .from('users')
        .select('email, name, company_name, tenant_id')
        .eq('id', userId)
        .single();

      let kanbanCard: any = null;
      if (userRow) {
        // Buscar por email primeiro
        let cardQuery = supabase
          .from('kanban_cards')
          .select('id, client_name, company_name, stage_id, board_id, cs_name, sdr_name, fup_date, next_contact_date, health_status, notes, created_at')
          .is('deleted_at', null);
        if (userRow.email) {
          const { data: cardByEmail } = await cardQuery.eq('client_email', userRow.email).limit(1);
          if (cardByEmail && cardByEmail.length > 0) kanbanCard = cardByEmail[0];
        }
        // Fallback por nome da empresa
        if (!kanbanCard && (userRow.company_name || userRow.name)) {
          const searchName = userRow.company_name || userRow.name;
          const { data: cardByName } = await supabase
            .from('kanban_cards')
            .select('id, client_name, company_name, stage_id, board_id, cs_name, sdr_name, fup_date, next_contact_date, health_status, notes, created_at')
            .is('deleted_at', null)
            .or(`company_name.ilike.%${searchName}%,client_name.ilike.%${searchName}%`)
            .limit(1);
          if (cardByName && cardByName.length > 0) kanbanCard = cardByName[0];
        }
      }

      // Buscar etapa e board do card
      let stageName: string | null = null;
      let boardName: string | null = null;
      if (kanbanCard) {
        const { data: stageRow } = await supabase.from('kanban_stages').select('name, color, emoji').eq('id', kanbanCard.stage_id).single();
        const { data: boardRow } = await supabase.from('kanban_boards').select('name').eq('id', kanbanCard.board_id).single();
        stageName = stageRow ? `${stageRow.emoji} ${stageRow.name}` : null;
        boardName = boardRow?.name || null;
      }

      // Buscar NPS do tenant
      const effectiveTenantId = tenantId || userRow?.tenant_id || userId;
      let npsData: any = { total: 0, avg: null, promoters: 0, detractors: 0, neutrals: 0 };
      if (effectiveTenantId) {
        const { data: npsRows } = await supabase
          .from('nps_responses')
          .select('score, status')
          .eq('tenant_id', effectiveTenantId)
          .is('deleted_at', null);
        if (npsRows && npsRows.length > 0) {
          const total = npsRows.length;
          const avg = npsRows.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / total;
          const promoters = npsRows.filter((r: any) => r.score >= 9).length;
          const detractors = npsRows.filter((r: any) => r.score <= 6).length;
          const neutrals = total - promoters - detractors;
          npsData = { total, avg: Math.round(avg * 10) / 10, promoters, detractors, neutrals };
        }
      }

      return NextResponse.json({
        kanbanCard: kanbanCard ? { ...kanbanCard, stageName, boardName } : null,
        nps: npsData,
      });
    }

    // Buscar nichos disponíveis
    if (action === 'niches') {
      const { data, error } = await supabase
        .from('client_niches')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ niches: data || [] });
    }

    // Buscar todos os usuários (exceto admin)
    let usersQuery = supabase
      .from('users')
      .select('id, name, email, phone, plan, company_name, created_at, settings, tenant_id, role, last_login, sdr_name, cs_name, internal_notes, city, state, niche, niche_data')
      .neq('email', 'admin@hellogrowth.com')
      .order('created_at', { ascending: false });

    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    // Buscar CS/SDR dos kanban_cards em lote (fallback para quem não tem na tabela users)
    const userEmails = (users || []).map((u: any) => u.email).filter(Boolean);
    let kanbanCsMap: Record<string, { cs_name: string | null; sdr_name: string | null }> = {};
    if (userEmails.length > 0) {
      const { data: kanbanCardsBatch } = await supabaseAdmin
        .from('kanban_cards')
        .select('client_email, cs_name, sdr_name')
        .in('client_email', userEmails)
        .is('deleted_at', null);
      for (const kc of (kanbanCardsBatch || [])) {
        if (kc.client_email && (kc.cs_name || kc.sdr_name)) {
          kanbanCsMap[kc.client_email.toLowerCase()] = { cs_name: kc.cs_name, sdr_name: kc.sdr_name };
        }
      }
    }

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
          tenantId: (user as any).tenant_id || null,
          sdrName: (user as any).sdr_name || kanbanCsMap[(user.email || '').toLowerCase()]?.sdr_name || null,
          csName: (user as any).cs_name || kanbanCsMap[(user.email || '').toLowerCase()]?.cs_name || null,
          internalNotes: (user as any).internal_notes || null,
          city: (user as any).city || null,
          state: (user as any).state || null,
          niche: (user as any).niche || null,
          nicheData: (user as any).niche_data || null,
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

    if (statusFilter === 'never_login') {
      filtered = filtered.filter(u => !u.lastLogin);
    } else if (statusFilter !== 'all') {
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
    const { userId, userData, companyUpdates, addCompany, removeCompanyId, action, contacts } = body;

    // Salvar contatos extras (action: save_contacts)
    if (action === 'save_contacts') {
      await supabase.from('client_contacts').delete().eq('user_id', userId);
      if (contacts && contacts.length > 0) {
        const toInsert = contacts.map((c: any, idx: number) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          notes: c.role || null,
          is_primary: idx === 0,
          position: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from('client_contacts').insert(toInsert);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }

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
          ...(userData.sdrName !== undefined ? { sdr_name: userData.sdrName } : {}),
          ...(userData.csName !== undefined ? { cs_name: userData.csName } : {}),
          ...(userData.internalNotes !== undefined ? { internal_notes: userData.internalNotes } : {}),
          ...(userData.city !== undefined ? { city: userData.city } : {}),
          ...(userData.state !== undefined ? { state: userData.state } : {}),
          ...(userData.niche !== undefined ? { niche: userData.niche } : {}),
          ...(userData.nicheData !== undefined ? { niche_data: userData.nicheData } : {}),
        })
        .eq('id', userId);
      if (error) throw error;
    }

    // Gerenciar contatos extras do cliente
    if (userData?.contacts !== undefined) {
      // Deletar contatos existentes e reinserir
      await supabase.from('client_contacts').delete().eq('user_id', userId);
      if (userData.contacts.length > 0) {
        const contactsToInsert = userData.contacts.map((c: any, idx: number) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          notes: c.notes || null,
          is_primary: idx === 0,
          position: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: contactsError } = await supabase.from('client_contacts').insert(contactsToInsert);
        if (contactsError) throw contactsError;
      }
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
