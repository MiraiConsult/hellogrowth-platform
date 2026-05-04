/**
 * Endpoint de TESTE para diagnosticar o webhook Evolution.
 * Simula o processamento do webhook mas retorna detalhes em vez de processar silenciosamente.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const diagnostics: string[] = [];
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    diagnostics.push(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET'}`);
    diagnostics.push(`SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET'}`);
    diagnostics.push(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT_SET'}`);
    
    const body = await req.json();
    const event = body.event;
    diagnostics.push(`Event: ${event}`);
    
    // Simular extração de mensagem
    const rawData = body.data;
    const messages = Array.isArray(rawData) 
      ? rawData 
      : rawData?.key 
        ? [rawData]  // Objeto único com key = mensagem completa
        : Array.isArray(rawData?.messages) 
          ? rawData.messages 
          : [rawData]; // Fallback
    diagnostics.push(`Messages count: ${messages.length}`);
    
    for (const message of messages) {
      if (!message) { diagnostics.push("Message is null"); continue; }
      if (message.key?.fromMe === true) { diagnostics.push("fromMe=true, skipping"); continue; }
      
      const from = message.key?.remoteJid?.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
      diagnostics.push(`From: ${from}`);
      
      if (!from) { diagnostics.push("No from, skipping"); continue; }
      if (from.includes("-")) { diagnostics.push("Group, skipping"); continue; }
      
      const content = message.message?.conversation || message.message?.extendedTextMessage?.text || message.text || "[media]";
      diagnostics.push(`Content: ${content.substring(0, 50)}`);
      
      // Normalizar número
      const normalizedFrom = from.replace(/\D/g, "");
      diagnostics.push(`Normalized: ${normalizedFrom}`);
      
      // Gerar variantes
      const withoutCountry = normalizedFrom.replace(/^55/, "");
      const phoneVariants = [
        normalizedFrom,
        normalizedFrom.startsWith("55") ? normalizedFrom : `55${normalizedFrom}`,
        `+${normalizedFrom}`,
        `+55${withoutCountry}`,
        withoutCountry.length === 10 ? `55${withoutCountry.slice(0,2)}9${withoutCountry.slice(2)}` : "",
        withoutCountry.length === 11 && withoutCountry[2] === "9" ? `55${withoutCountry.slice(0,2)}${withoutCountry.slice(3)}` : "",
      ].filter(Boolean);
      
      diagnostics.push(`Phone variants: ${JSON.stringify(phoneVariants)}`);
      
      // Buscar conversa
      let conversation: any = null;
      for (const phone of phoneVariants) {
        const { data, error } = await supabase
          .from("ai_conversations")
          .select("id, tenant_id, status, flow_type, contact_name, contact_phone, mode")
          .eq("contact_phone", phone)
          .in("status", ["active", "waiting_reply", "draft"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) { 
          conversation = data; 
          diagnostics.push(`Found conversation with phone ${phone}: ${data.id}`);
          break; 
        }
        if (error) {
          diagnostics.push(`No match for ${phone}: ${error.message}`);
        }
      }
      
      if (!conversation) {
        diagnostics.push("NO CONVERSATION FOUND - this is why no response is generated");
      } else {
        diagnostics.push(`Conversation: ${conversation.id}, mode: ${conversation.mode}, status: ${conversation.status}`);
        
        // Testar Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const testRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: "Diga apenas 'OK'" }] }],
                  generationConfig: { maxOutputTokens: 10 },
                }),
              }
            );
            const testData = await testRes.json();
            const testContent = testData.candidates?.[0]?.content?.parts?.[0]?.text || "EMPTY";
            diagnostics.push(`Gemini test: ${testRes.status} - "${testContent}"`);
          } catch (gemErr: any) {
            diagnostics.push(`Gemini error: ${gemErr.message}`);
          }
        } else {
          diagnostics.push("GEMINI_API_KEY not set!");
        }
      }
    }
    
    return NextResponse.json({ diagnostics });
  } catch (error: any) {
    diagnostics.push(`ERROR: ${error.message}`);
    return NextResponse.json({ diagnostics, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "evolution-test endpoint ready", timestamp: new Date().toISOString() });
}
