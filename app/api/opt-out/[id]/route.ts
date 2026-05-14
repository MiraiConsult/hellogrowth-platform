import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { tenantId } = body;
    const { id } = params;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("opt_out_list")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("opt-out DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
