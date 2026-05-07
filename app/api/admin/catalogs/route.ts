import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET — listar todos os catálogos
export async function GET() {
  const { data, error } = await supabase
    .from('product_catalogs')
    .select('*')
    .order('segment_label')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — criar novo catálogo
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { segment, segment_label, segment_icon, products } = body

  if (!segment || !segment_label || !products) {
    return NextResponse.json({ error: 'Campos obrigatórios: segment, segment_label, products' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('product_catalogs')
    .insert({ segment, segment_label, segment_icon, products })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — atualizar catálogo existente
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, segment_label, segment_icon, products } = body

  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('product_catalogs')
    .update({ segment_label, segment_icon, products, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remover catálogo
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('product_catalogs')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
