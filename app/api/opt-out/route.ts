import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const search = searchParams.get("search") || "";

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("opt_out_list")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("opted_out_at", { ascending: false });

    if (search) {
      query = query.or(`phone.ilike.%${search}%,contact_name.ilike.%${search}%`);
    }

    const { data: entries, error } = await query;

    if (error) {
      // Tabela pode não existir ainda — retornar vazio
      console.error("opt_out_list query error:", error.message);
      return NextResponse.json({ entries: [], stats: { total: 0, this_month: 0, by_flow: {} } });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const this_month = (entries || []).filter(
      (e: any) => new Date(e.opted_out_at) >= startOfMonth
    ).length;

    const by_flow: Record<string, number> = {};
    (entries || []).forEach((e: any) => {
      const flow = e.flow_type || "unknown";
      by_flow[flow] = (by_flow[flow] || 0) + 1;
    });

    return NextResponse.json({
      entries: entries || [],
      stats: {
        total: (entries || []).length,
        this_month,
        by_flow,
      },
    });
  } catch (err: any) {
    console.error("opt-out GET error:", err);
    return NextResponse.json({ entries: [], stats: { total: 0, this_month: 0, by_flow: {} } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, phone, contact_name, reason, flow_type } = body;

    if (!tenantId || !phone) {
      return NextResponse.json({ error: "tenantId and phone required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Verificar se já existe
    const { data: existing } = await supabase
      .from("opt_out_list")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", cleanPhone)
      .single();

    if (existing) {
      return NextResponse.json({ message: "Already opted out", id: existing.id });
    }

    const { data, error } = await supabase
      .from("opt_out_list")
      .insert({
        tenant_id: tenantId,
        phone: cleanPhone,
        contact_name: contact_name || null,
        reason: reason || "Manual",
        flow_type: flow_type || null,
        opted_out_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    console.error("opt-out POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
