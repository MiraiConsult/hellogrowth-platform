import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — buscar catálogo por segmento ou listar todos
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const segment = searchParams.get('segment')

  if (segment) {
    const { data, error } = await supabase
      .from('product_catalogs')
      .select('*')
      .eq('segment', segment)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  }

  // Listar todos os segmentos disponíveis (sem os produtos, só metadados)
  const { data, error } = await supabase
    .from('product_catalogs')
    .select('id, segment, segment_label, segment_icon')
    .order('segment_label')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
