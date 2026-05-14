import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/report-history?tenantId=xxx&page=1&pageSize=15
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "15");

  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("report_send_log")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data || [] });
}
