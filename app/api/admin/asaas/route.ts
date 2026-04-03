import { NextRequest, NextResponse } from 'next/server';

const ASAAS_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE = 'https://api.asaas.com/v3';

async function asaasGet(path: string) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    headers: { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Asaas error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllPages(endpoint: string, extraParams = '') {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const data = await asaasGet(`${endpoint}?limit=100&offset=${offset}${extraParams}`);
    all.push(...(data.data || []));
    if (!data.hasMore || offset > 2000) break;
    offset += 100;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // ── OVERVIEW ──────────────────────────────────────────────────────────────
    if (action === 'overview') {
      const [allSubs, allPays] = await Promise.all([
        fetchAllPages('/subscriptions'),
        fetchAllPages('/payments'),
      ]);

      // Filtrar por período se informado
      const filterPay = (p: any) => {
        const d = p.dueDate || p.dateCreated || '';
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      };
      const pays = dateFrom || dateTo ? allPays.filter(filterPay) : allPays;

      const activeSubs = allSubs.filter((s: any) => s.status === 'ACTIVE');
      const mrr = activeSubs.reduce((acc: number, s: any) => acc + (s.value || 0), 0);
      const arr = mrr * 12;
      const ticketMedio = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

      const statusCount = allSubs.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      const overdue = pays.filter((p: any) => p.status === 'OVERDUE');
      const overdueAmount = overdue.reduce((acc: number, p: any) => acc + (p.value || 0), 0);

      // Recebido no período (ou mês atual se sem filtro)
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const receivedPays = pays.filter((p: any) => {
        const isReceived = p.status === 'RECEIVED' || p.status === 'CONFIRMED';
        if (!isReceived) return false;
        if (dateFrom || dateTo) return true;
        return (p.paymentDate || p.dueDate || '').startsWith(monthStr);
      });
      const receivedAmount = receivedPays.reduce((acc: number, p: any) => acc + (p.value || 0), 0);

      // Taxa de inadimplência
      const inadimplenciaRate = allSubs.length > 0 ? (overdue.length / allSubs.length) * 100 : 0;

      // LTV estimado (ticket médio / churn rate estimado)
      // Churn: assinaturas inativas / total
      const inactiveSubs = allSubs.filter((s: any) => s.status !== 'ACTIVE');
      const churnRate = allSubs.length > 0 ? (inactiveSubs.length / allSubs.length) * 100 : 0;
      const ltv = churnRate > 0 ? ticketMedio / (churnRate / 100) : ticketMedio * 24;

      // Distribuição formas de pagamento (assinaturas ativas)
      const billingDist = activeSubs.reduce((acc: any, s: any) => {
        const bt = s.billingType || 'UNDEFINED';
        acc[bt] = (acc[bt] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        churnRate: Math.round(churnRate * 10) / 10,
        inadimplenciaRate: Math.round(inadimplenciaRate * 10) / 10,
        totalSubscriptions: allSubs.length,
        activeSubscriptions: activeSubs.length,
        statusCount,
        overdueCount: overdue.length,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        receivedThisMonth: Math.round(receivedAmount * 100) / 100,
        billingDist,
      });
    }

    // ── CHARTS ────────────────────────────────────────────────────────────────
    if (action === 'charts') {
      const [allSubs, allPays] = await Promise.all([
        fetchAllPages('/subscriptions'),
        fetchAllPages('/payments'),
      ]);

      // 1. MRR acumulado por mês (baseado em assinaturas criadas)
      const mrrByMonth: Record<string, number> = {};
      // Calcular MRR cumulativo: para cada mês, soma assinaturas ativas criadas até aquele mês
      const sortedSubs = [...allSubs].sort((a, b) => (a.dateCreated || '').localeCompare(b.dateCreated || ''));
      const allMonths = new Set<string>();
      sortedSubs.forEach(s => { if (s.dateCreated) allMonths.add(s.dateCreated.substring(0, 7)); });
      allPays.forEach(p => { if (p.dueDate) allMonths.add(p.dueDate.substring(0, 7)); });

      const sortedMonths = [...allMonths].sort();
      const mrrData: { month: string; mrr: number; newSubs: number }[] = [];

      for (const month of sortedMonths) {
        // Assinaturas ativas criadas até este mês
        const subsUntilMonth = allSubs.filter(s =>
          s.status === 'ACTIVE' && (s.dateCreated || '').substring(0, 7) <= month
        );
        const mrr = subsUntilMonth.reduce((acc: number, s: any) => acc + (s.value || 0), 0);
        const newSubs = allSubs.filter(s => (s.dateCreated || '').substring(0, 7) === month).length;
        mrrData.push({ month, mrr: Math.round(mrr * 100) / 100, newSubs });
      }

      // 2. Pagamentos recebidos vs esperados por mês
      const paysByMonth: Record<string, { received: number; overdue: number; pending: number; total: number }> = {};
      for (const p of allPays) {
        const m = (p.dueDate || p.dateCreated || '').substring(0, 7);
        if (!m) continue;
        if (!paysByMonth[m]) paysByMonth[m] = { received: 0, overdue: 0, pending: 0, total: 0 };
        paysByMonth[m].total += p.value || 0;
        if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') paysByMonth[m].received += p.value || 0;
        else if (p.status === 'OVERDUE') paysByMonth[m].overdue += p.value || 0;
        else if (p.status === 'PENDING') paysByMonth[m].pending += p.value || 0;
      }
      const paymentsData = Object.entries(paysByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          received: Math.round(d.received * 100) / 100,
          overdue: Math.round(d.overdue * 100) / 100,
          pending: Math.round(d.pending * 100) / 100,
          total: Math.round(d.total * 100) / 100,
        }));

      // 3. Distribuição de status das assinaturas
      const statusDist = allSubs.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      // 4. Distribuição de forma de pagamento
      const billingDist = allSubs.reduce((acc: any, s: any) => {
        const bt = s.billingType || 'UNDEFINED';
        acc[bt] = (acc[bt] || 0) + 1;
        return acc;
      }, {});

      // 5. Novos clientes por mês
      const newSubsByMonth = allSubs.reduce((acc: any, s: any) => {
        const m = (s.dateCreated || '').substring(0, 7);
        if (m) acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});
      const newSubsData = Object.entries(newSubsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      return NextResponse.json({
        mrrData,
        paymentsData,
        statusDist,
        billingDist,
        newSubsData,
      });
    }

    // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
    if (action === 'subscriptions') {
      const allSubs = await fetchAllPages('/subscriptions');

      const customerIds = [...new Set(allSubs.map((s: any) => s.customer))];
      const customerMap: Record<string, any> = {};

      for (let i = 0; i < customerIds.length; i += 10) {
        const batch = customerIds.slice(i, i + 10);
        await Promise.all(
          batch.map(async (id) => {
            try {
              const c = await asaasGet(`/customers/${id}`);
              customerMap[id as string] = c;
            } catch { /* ignore */ }
          })
        );
      }

      const enriched = allSubs.map((sub: any) => {
        const customer = customerMap[sub.customer] || {};
        return {
          id: sub.id,
          customerId: sub.customer,
          customerName: customer.name || '—',
          customerEmail: customer.email || '—',
          customerPhone: customer.mobilePhone || customer.phone || '—',
          value: sub.value,
          status: sub.status,
          billingType: sub.billingType,
          cycle: sub.cycle,
          nextDueDate: sub.nextDueDate,
          dateCreated: sub.dateCreated,
          description: sub.description,
          deleted: sub.deleted,
        };
      });

      return NextResponse.json({ data: enriched, total: enriched.length });
    }

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    if (action === 'payments') {
      const customerId = searchParams.get('customerId');
      const subscriptionId = searchParams.get('subscriptionId');

      let url = '/payments?limit=20&offset=0';
      if (customerId) url += `&customer=${customerId}`;
      if (subscriptionId) url += `&subscription=${subscriptionId}`;

      const data = await asaasGet(url);
      return NextResponse.json(data);
    }

    // ── EXPORT CSV ────────────────────────────────────────────────────────────
    if (action === 'export') {
      const allSubs = await fetchAllPages('/subscriptions');
      const allPays = await fetchAllPages('/payments');

      const customerIds = [...new Set(allSubs.map((s: any) => s.customer))];
      const customerMap: Record<string, any> = {};
      for (let i = 0; i < customerIds.length; i += 10) {
        const batch = customerIds.slice(i, i + 10);
        await Promise.all(
          batch.map(async (id) => {
            try {
              const c = await asaasGet(`/customers/${id}`);
              customerMap[id as string] = c;
            } catch { /* ignore */ }
          })
        );
      }

      const exportType = searchParams.get('type') || 'subscriptions';

      if (exportType === 'subscriptions') {
        const rows = [
          ['Cliente', 'Email', 'Telefone', 'Valor', 'Status', 'Forma Pagamento', 'Próx. Vencimento', 'Data Criação'].join(';'),
          ...allSubs.map((s: any) => {
            const c = customerMap[s.customer] || {};
            const billingMap: Record<string, string> = { BOLETO: 'Boleto', CREDIT_CARD: 'Cartão', PIX: 'PIX', UNDEFINED: 'N/D' };
            const statusMap: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', OVERDUE: 'Inadimplente', EXPIRED: 'Expirado' };
            return [
              c.name || '—', c.email || '—', c.mobilePhone || c.phone || '—',
              String(s.value).replace('.', ','),
              statusMap[s.status] || s.status,
              billingMap[s.billingType] || s.billingType,
              s.nextDueDate || '—', s.dateCreated || '—'
            ].join(';');
          })
        ].join('\n');

        return new NextResponse('\uFEFF' + rows, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="assinaturas.csv"',
          },
        });
      }

      if (exportType === 'payments') {
        const rows = [
          ['Cliente', 'Email', 'Valor', 'Status', 'Vencimento', 'Pagamento', 'Forma'].join(';'),
          ...allPays.map((p: any) => {
            const sub = allSubs.find((s: any) => s.id === p.subscription);
            const c = sub ? (customerMap[sub.customer] || {}) : {};
            const statusMap: Record<string, string> = { RECEIVED: 'Recebido', CONFIRMED: 'Confirmado', OVERDUE: 'Inadimplente', PENDING: 'Pendente' };
            const billingMap: Record<string, string> = { BOLETO: 'Boleto', CREDIT_CARD: 'Cartão', PIX: 'PIX', UNDEFINED: 'N/D' };
            return [
              c.name || '—', c.email || '—',
              String(p.value).replace('.', ','),
              statusMap[p.status] || p.status,
              p.dueDate || '—', p.paymentDate || '—',
              billingMap[p.billingType] || p.billingType
            ].join(';');
          })
        ].join('\n');

        return new NextResponse('\uFEFF' + rows, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cobranças.csv"',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Asaas API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
