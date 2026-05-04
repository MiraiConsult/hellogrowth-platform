import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || "NOT_SET",
    hasBaseUrl: !!process.env.OPENAI_BASE_URL,
    baseUrl: process.env.OPENAI_BASE_URL || "NOT_SET",
    hasApiBase: !!process.env.OPENAI_API_BASE,
    apiBase: process.env.OPENAI_API_BASE || "NOT_SET",
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
