import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/notification-settings?tenantId=xxx
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || {});
}

// POST /api/notification-settings — upsert
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tenantId, ...settings } = body;

  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("notification_settings")
    .upsert(
      {
        tenant_id: tenantId,
        escalation_enabled: settings.escalation_enabled ?? true,
        escalation_whatsapp_phone: settings.escalation_whatsapp_phone || null,
        escalation_email: settings.escalation_email || null,
        weekly_report_enabled: settings.weekly_report_enabled ?? false,
        weekly_report_email: settings.weekly_report_email || null,
        weekly_report_day: settings.weekly_report_day ?? 1,
        weekly_report_hour: settings.weekly_report_hour ?? 8,
        optout_notify_enabled: settings.optout_notify_enabled ?? false,
        optout_notify_email: settings.optout_notify_email || null,
        new_conversation_notify: settings.new_conversation_notify ?? false,
        new_conversation_email: settings.new_conversation_email || null,
        business_name: settings.business_name || null,
        timezone: settings.timezone || "America/Sao_Paulo",
      },
      { onConflict: "tenant_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
