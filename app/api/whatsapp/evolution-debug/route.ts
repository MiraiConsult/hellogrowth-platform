/**
 * Endpoint de diagnóstico temporário para capturar o payload real do Evolution API
 * Remove após confirmar o formato correto
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Salvar payload no banco para diagnóstico
    await supabase.from("webhook_debug_logs").insert({
      payload: JSON.stringify(body),
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Se a tabela não existir, apenas loga
      console.log("[Evolution Debug] Payload:", JSON.stringify(body, null, 2));
    });

    console.log("[Evolution Debug] Evento:", body.event);
    console.log("[Evolution Debug] Keys:", Object.keys(body));
    console.log("[Evolution Debug] Data keys:", body.data ? Object.keys(body.data) : "no data");
    console.log("[Evolution Debug] Full payload:", JSON.stringify(body, null, 2).substring(0, 2000));

    return NextResponse.json({ ok: true, received: body.event });
  } catch (error) {
    console.error("[Evolution Debug] Error:", error);
    return NextResponse.json({ error: "parse error" }, { status: 400 });
  }
}
