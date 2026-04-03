import { NextRequest, NextResponse } from 'next/server';

const ASAAS_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE = 'https://api.asaas.com/v3';

async function asaasGet(path: string) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    headers: {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Asaas error ${res.status}: ${await res.text()}`);
  return res.json();
}

// GET /api/admin/asaas?action=overview|subscriptions|payments&customerId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    if (action === 'overview') {
      // Buscar todas as assinaturas (paginado até 100)
      const [subData, payData] = await Promise.all([
        asaasGet('/subscriptions?limit=100&offset=0'),
        asaasGet('/payments?limit=100&offset=0'),
      ]);

      const subs = subData.data || [];
      const pays = payData.data || [];

      // Calcular MRR (assinaturas ativas)
      const activeSubs = subs.filter((s: any) => s.status === 'ACTIVE');
      const mrr = activeSubs.reduce((acc: number, s: any) => acc + (s.value || 0), 0);

      // Status das assinaturas
      const statusCount = subs.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      // Cobranças vencidas (OVERDUE)
      const overdue = pays.filter((p: any) => p.status === 'OVERDUE');
      const overdueAmount = overdue.reduce((acc: number, p: any) => acc + (p.value || 0), 0);

      // Cobranças recebidas no mês atual
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const receivedThisMonth = pays.filter((p: any) =>
        p.status === 'RECEIVED' && p.paymentDate?.startsWith(monthStr)
      );
      const receivedAmount = receivedThisMonth.reduce((acc: number, p: any) => acc + (p.value || 0), 0);

      return NextResponse.json({
        mrr: Math.round(mrr * 100) / 100,
        totalSubscriptions: subData.totalCount || subs.length,
        activeSubscriptions: activeSubs.length,
        statusCount,
        overdueCount: overdue.length,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        receivedThisMonth: Math.round(receivedAmount * 100) / 100,
      });
    }

    if (action === 'subscriptions') {
      // Buscar todas as assinaturas com dados do cliente
      const limit = 100;
      let allSubs: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const data = await asaasGet(`/subscriptions?limit=${limit}&offset=${offset}`);
        allSubs = allSubs.concat(data.data || []);
        hasMore = data.hasMore;
        offset += limit;
        if (offset > 500) break; // segurança
      }

      // Buscar dados dos clientes em paralelo (em lotes)
      const customerIds = [...new Set(allSubs.map((s: any) => s.customer))];
      const customerMap: Record<string, any> = {};

      // Buscar em lotes de 10
      for (let i = 0; i < customerIds.length; i += 10) {
        const batch = customerIds.slice(i, i + 10);
        await Promise.all(
          batch.map(async (id) => {
            try {
              const c = await asaasGet(`/customers/${id}`);
              customerMap[id] = c;
            } catch { /* ignore */ }
          })
        );
      }

      // Montar lista enriquecida
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

    if (action === 'payments') {
      const customerId = searchParams.get('customerId');
      const subscriptionId = searchParams.get('subscriptionId');

      let url = '/payments?limit=20&offset=0';
      if (customerId) url += `&customer=${customerId}`;
      if (subscriptionId) url += `&subscription=${subscriptionId}`;

      const data = await asaasGet(url);
      return NextResponse.json(data);
    }

    if (action === 'customer') {
      const customerId = searchParams.get('customerId');
      if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });
      const data = await asaasGet(`/customers/${customerId}`);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Asaas API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
